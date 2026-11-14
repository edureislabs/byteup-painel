import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/admin";
import { getUsersCached } from "@/lib/discordCache";
import { readBuilderOptions } from "@/lib/builder/catalog";
import { lerEstado } from "@/lib/builder/licencaEstado";
import { alternarBloqueio } from "./actions";

export const dynamic = "force-dynamic";

const fmt = (d: string | Date) => new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export default async function LicencasPage({ searchParams }: { searchParams: Promise<{ bloqueada?: string; liberada?: string; q?: string }> }) {
  if (!(await getAdminUserId())) notFound();
  const { bloqueada, liberada, q } = await searchParams;

  const itens = await prisma.storeOrderItem.findMany({
    where: { productId: null, order: { status: "paid" } },
    select: { id: true, options: true, order: { select: { userId: true, createdAt: true, provider: true } } },
    orderBy: { order: { createdAt: "desc" } },
    take: 500,
  });
  const bots = itens
    .map((i) => ({ ...i, bot: readBuilderOptions(i.options), estado: lerEstado(i.options) }))
    .filter((i) => i.bot)
    .filter((i) => !q || i.id.includes(q) || i.order.userId.includes(q) || i.bot!.nome.toLowerCase().includes(q.toLowerCase()) || i.estado.ativacoes.some((a) => a.app.includes(q)));
  const users = await getUsersCached([...new Set(bots.map((b) => b.order.userId))]);

  return (
    <main className="min-h-screen bg-[#08070a] p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin/loja" className="text-sm text-[#7d7588] hover:text-white">← Voltar para a loja</Link>
        <h1 className="mt-3 text-3xl font-black">🔒 Licenças dos bots</h1>
        <p className="mt-2 text-sm leading-6 text-[#aaa3b5]">
          Cada bot vendido só liga com um aplicativo do Discord criado na conta de quem comprou, e confere a licença no site ao ligar e a cada 12 horas.
          Aqui aparecem os aplicativos que ligaram cada bot. <strong>Bloquear</strong> desliga o bot em até 12 horas (ou na hora, se ele for religado) e
          impede que ligue de novo.
        </p>
        {bloqueada && <p className="mt-4 rounded-2xl border border-[#f07878]/30 bg-[#f07878]/[0.08] px-4 py-3 text-sm text-[#f7c4c4]">🔒 Licença bloqueada.</p>}
        {liberada && <p className="mt-4 rounded-2xl border border-[#7ee2a8]/30 bg-[#7ee2a8]/[0.08] px-4 py-3 text-sm text-[#bff3d4]">✅ Licença liberada.</p>}

        <form className="mt-6 flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Procurar por nome do bot, ID do comprador, ID do aplicativo ou da licença"
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm placeholder:text-[#7d7588] focus:border-[#b64cff] focus:outline-none"
          />
          <button className="rounded-2xl bg-[#b64cff] px-5 py-3 text-sm font-bold">Procurar</button>
        </form>

        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10">
          {bots.length === 0 && <p className="p-6 text-sm text-[#7d7588]">Nenhum bot vendido{q ? " com essa busca" : ""}.</p>}
          {bots.map((b) => {
            const apps = b.estado.ativacoes;
            return (
              <div key={b.id} className={`border-b border-white/5 px-5 py-4 last:border-b-0 ${b.estado.bloqueada ? "bg-[#f07878]/[0.05]" : ""}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">
                      {b.bot!.nome}
                      {b.estado.bloqueada && <span className="ml-2 rounded-full bg-[#f07878]/20 px-2 py-0.5 text-xs text-[#f7c4c4]">BLOQUEADA</span>}
                      {b.order.provider === "teste" && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-[#aaa3b5]">TESTE</span>}
                      {apps.length > 1 && <span className="ml-2 rounded-full bg-[#f0b878]/20 px-2 py-0.5 text-xs text-[#f0d4b8]">{apps.length} aplicativos</span>}
                    </div>
                    <div className="truncate text-xs text-[#7d7588]">
                      {users[b.order.userId]?.username ?? "(usuário)"} · {b.order.userId} · comprado em {fmt(b.order.createdAt)} · licença {b.id}
                    </div>
                  </div>
                  <form action={alternarBloqueio}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="bloquear" value={b.estado.bloqueada ? "0" : "1"} />
                    <button
                      className={`rounded-xl border px-3 py-1.5 text-xs ${b.estado.bloqueada ? "border-[#7ee2a8]/40 text-[#7ee2a8]" : "border-white/10 text-[#f07878] hover:border-[#f07878]/50"}`}
                    >
                      {b.estado.bloqueada ? "Liberar" : "Bloquear"}
                    </button>
                  </form>
                </div>
                {apps.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-[#aaa3b5]">
                    {apps.map((a) => (
                      <li key={a.app}>
                        🤖 <strong className="text-white">{a.nome || "(sem nome)"}</strong> · app {a.app} · ligou {a.vezes}x · primeira {fmt(a.primeira)} · última {fmt(a.ultima)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-[#7d7588]">Ainda não foi ligado.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
