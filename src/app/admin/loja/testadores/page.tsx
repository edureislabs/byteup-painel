import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/admin";
import { getUsersCached } from "@/lib/discordCache";
import { addTester, removeTester } from "./actions";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date) => d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export default async function TestadoresPage({ searchParams }: { searchParams: Promise<{ salvo?: string; erro?: string }> }) {
  if (!(await getAdminUserId())) notFound();
  const { salvo, erro } = await searchParams;

  let testers: { userId: string; note: string; createdAt: Date }[] = [];
  let tabelaOk = true;
  try {
    testers = await prisma.storeTester.findMany({ orderBy: { createdAt: "desc" } });
  } catch {
    tabelaOk = false;
  }
  const [users, pedidos] = await Promise.all([
    getUsersCached(testers.map((t) => t.userId)),
    prisma.storeOrder.groupBy({ by: ["userId"], where: { provider: "teste", status: "paid" }, _count: { _all: true } }),
  ]);
  const qtd = Object.fromEntries(pedidos.map((p) => [p.userId, p._count._all]));

  return (
    <main className="min-h-screen bg-[#08070a] p-6 text-white md:p-10">
      <div className="mx-auto max-w-3xl">
        <Link href="/admin/loja" className="text-sm text-[#7d7588] hover:text-white">← Voltar para a loja</Link>
        <h1 className="mt-3 text-3xl font-black">🧪 Testadores da loja</h1>
        <p className="mt-2 text-sm leading-6 text-[#aaa3b5]">
          Quem estiver aqui compra sem pagar, no site e no Discord: ao clicar em <strong>Pix</strong>, o pedido é aprovado na hora e a entrega
          (DM, .zip, Minhas compras) acontece como numa compra real. Esses pedidos aparecem como <strong>TESTE</strong> e não contam no faturamento.
        </p>

        {!tabelaOk && (
          <p className="mt-4 rounded-2xl border border-[#f0b878]/30 bg-[#f0b878]/[0.06] px-4 py-3 text-sm text-[#f0d4b8]">
            ⚠️ Falta criar a tabela no banco: rode <code>npx prisma db push</code> na pasta do painel.
          </p>
        )}
        {salvo && <p className="mt-4 rounded-2xl border border-[#7ee2a8]/30 bg-[#7ee2a8]/[0.08] px-4 py-3 text-sm text-[#bff3d4]">✅ Testador salvo.</p>}
        {erro && <p className="mt-4 rounded-2xl border border-[#f07878]/30 bg-[#f07878]/[0.08] px-4 py-3 text-sm text-[#f7c4c4]">❌ {erro}</p>}

        <form action={addTester} className="mt-6 grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
          <input
            name="userId"
            required
            placeholder="ID do Discord (ex.: 123456789012345678)"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm placeholder:text-[#7d7588] focus:border-[#b64cff] focus:outline-none"
          />
          <input
            name="note"
            maxLength={100}
            placeholder="Anotação (opcional)"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm placeholder:text-[#7d7588] focus:border-[#b64cff] focus:outline-none"
          />
          <button className="rounded-2xl bg-[#b64cff] px-5 py-3 text-sm font-bold">+ Adicionar</button>
        </form>
        <p className="mt-2 text-xs text-[#7d7588]">
          Para pegar o ID: no Discord, ative Configurações → Avançado → Modo desenvolvedor, clique com o botão direito na pessoa e em &quot;Copiar ID do usuário&quot;.
        </p>

        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10">
          {testers.length === 0 && <p className="p-6 text-sm text-[#7d7588]">Nenhum testador ainda.</p>}
          {testers.map((t) => (
            <div key={t.userId} className="flex items-center gap-4 border-b border-white/5 px-5 py-4 last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="font-bold">{users[t.userId]?.username ?? "(usuário não encontrado)"}</div>
                <div className="truncate text-xs text-[#7d7588]">
                  {t.userId} • desde {fmtDate(t.createdAt)} • {qtd[t.userId] ?? 0} compra(s) de teste{t.note ? ` • ${t.note}` : ""}
                </div>
              </div>
              <form action={removeTester}>
                <input type="hidden" name="userId" value={t.userId} />
                <button className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-[#f07878] hover:border-[#f07878]/50">Remover</button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
