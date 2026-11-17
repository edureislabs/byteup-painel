import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/admin";
import { getUsersCached } from "@/lib/discordCache";
import { ATIVO_LICENCA_MS, ONLINE_MS } from "@/lib/mc/dados";
import { alternarBloqueioPlugin, definirLimite } from "../actions";

export const dynamic = "force-dynamic";

/** Agora, em ms (fora do componente: a página é dinâmica e é montada a cada visita). */
const instante = () => Date.now();

const fmt = (d: string | Date) => new Date(d).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export default async function LicencasPluginsPage({
  searchParams,
}: {
  searchParams: Promise<{ bloqueada?: string; liberada?: string; limite?: string; q?: string }>;
}) {
  if (!(await getAdminUserId())) notFound();
  const { bloqueada, liberada, limite, q } = await searchParams;

  const itens = await prisma.storeOrderItem.findMany({
    where: { product: { category: "plugin" }, order: { status: "paid" } },
    select: {
      id: true,
      nameSnapshot: true,
      product: { select: { slug: true } },
      order: { select: { userId: true, createdAt: true, provider: true } },
    },
    orderBy: { order: { createdAt: "desc" } },
    take: 500,
  });
  const ids = itens.map((i) => i.id);
  const [estados, instalacoes, catalogo] = await Promise.all([
    prisma.mcLicenca.findMany({ where: { itemId: { in: ids } } }),
    prisma.mcInstalacao.findMany({
      where: { licencaId: { in: ids } },
      select: {
        licencaId: true, versao: true, firstSeen: true, lastSeen: true,
        servidor: { select: { id: true, software: true, mcVersion: true, players: true, maxPlayers: true, country: true, onlineMode: true } },
      },
      orderBy: { lastSeen: "desc" },
    }),
    prisma.mcPlugin.findMany({ select: { slug: true, maxServidores: true } }),
  ]);
  const estado = new Map(estados.map((e) => [e.itemId, e]));
  const padrao = new Map(catalogo.map((c) => [c.slug, c.maxServidores]));
  const porLicenca = new Map<string, typeof instalacoes>();
  for (const i of instalacoes) {
    const l = porLicenca.get(i.licencaId!) ?? [];
    l.push(i);
    porLicenca.set(i.licencaId!, l);
  }
  const agora = instante();
  const lista = itens.filter((i) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return i.id.includes(s) || i.order.userId.includes(s) || i.nameSnapshot.toLowerCase().includes(s) || (porLicenca.get(i.id) ?? []).some((x) => x.servidor.id.includes(s));
  });
  const users = await getUsersCached([...new Set(lista.map((b) => b.order.userId))]);

  return (
    <main className="min-h-screen bg-[#08070a] p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin/plugins" className="text-sm text-[#7d7588] hover:text-white">← Voltar para os plugins</Link>
        <h1 className="mt-3 text-3xl font-black">🔑 Licenças dos plugins</h1>
        <p className="mt-2 text-sm leading-6 text-[#aaa3b5]">
          Cada plugin pago confere a licença no site quando o servidor liga. Aqui aparecem os servidores que usaram cada licença.
          Servidores que falaram nos últimos 7 dias contam no <strong>limite</strong>. <strong>Bloquear</strong> faz o plugin parar de ligar
          (os servidores que já estão ligados param em até 7 dias, quando o passe vence).
        </p>
        {bloqueada && <p className="mt-4 rounded-2xl border border-[#f07878]/30 bg-[#f07878]/[0.08] px-4 py-3 text-sm text-[#f7c4c4]">🔒 Licença bloqueada.</p>}
        {liberada && <p className="mt-4 rounded-2xl border border-[#7ee2a8]/30 bg-[#7ee2a8]/[0.08] px-4 py-3 text-sm text-[#bff3d4]">✅ Licença liberada.</p>}
        {limite && <p className="mt-4 rounded-2xl border border-[#7ee2a8]/30 bg-[#7ee2a8]/[0.08] px-4 py-3 text-sm text-[#bff3d4]">✅ Limite atualizado.</p>}

        <form className="mt-6 flex gap-2">
          <input
            name="q"
            defaultValue={q ?? ""}
            placeholder="Procurar por plugin, ID do comprador, da licença ou do servidor"
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm placeholder:text-[#7d7588] focus:border-[#b64cff] focus:outline-none"
          />
          <button className="rounded-2xl bg-[#b64cff] px-5 py-3 text-sm font-bold">Procurar</button>
        </form>

        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10">
          {lista.length === 0 && <p className="p-6 text-sm text-[#7d7588]">Nenhum plugin vendido{q ? " com essa busca" : ""}.</p>}
          {lista.map((b) => {
            const e = estado.get(b.id);
            const servidores = porLicenca.get(b.id) ?? [];
            const ativos = servidores.filter((s) => s.lastSeen.getTime() > agora - ATIVO_LICENCA_MS).length;
            const max = e?.maxServidores ?? padrao.get(b.product?.slug ?? "") ?? 3;
            const passou = max > 0 && ativos > max;
            return (
              <div key={b.id} className={`border-b border-white/5 px-5 py-4 last:border-b-0 ${e?.bloqueada ? "bg-[#f07878]/[0.05]" : ""}`}>
                <div className="flex flex-wrap items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="font-bold">
                      {b.nameSnapshot}
                      {e?.bloqueada && <span className="ml-2 rounded-full bg-[#f07878]/20 px-2 py-0.5 text-xs text-[#f7c4c4]">BLOQUEADA</span>}
                      {b.order.provider === "teste" && <span className="ml-2 rounded-full bg-white/10 px-2 py-0.5 text-xs text-[#aaa3b5]">TESTE</span>}
                      <span className={`ml-2 rounded-full px-2 py-0.5 text-xs ${passou ? "bg-[#f0b878]/20 text-[#f0d4b8]" : "bg-white/10 text-[#aaa3b5]"}`}>
                        {ativos}/{max === 0 ? "∞" : max} servidores
                      </span>
                    </div>
                    <div className="truncate text-xs text-[#7d7588]">
                      {users[b.order.userId]?.username ?? "(usuário)"} · {b.order.userId} · comprado em {fmt(b.order.createdAt)} · licença {b.id}
                    </div>
                  </div>
                  <form action={definirLimite} className="flex items-center gap-1">
                    <input type="hidden" name="id" value={b.id} />
                    <input
                      name="maxServidores"
                      type="number"
                      min={0}
                      defaultValue={e?.maxServidores ?? ""}
                      placeholder={`${padrao.get(b.product?.slug ?? "") ?? 3}`}
                      title="Limite de servidores desta licença (vazio = padrão do plugin)"
                      className="w-16 rounded-xl border border-white/10 bg-white/[0.04] px-2 py-1.5 text-xs"
                    />
                    <button className="rounded-xl border border-white/10 px-3 py-1.5 text-xs text-[#d9b4ff]">Limite</button>
                  </form>
                  <form action={alternarBloqueioPlugin}>
                    <input type="hidden" name="id" value={b.id} />
                    <input type="hidden" name="bloquear" value={e?.bloqueada ? "0" : "1"} />
                    <button className={`rounded-xl border px-3 py-1.5 text-xs ${e?.bloqueada ? "border-[#7ee2a8]/40 text-[#7ee2a8]" : "border-white/10 text-[#f07878] hover:border-[#f07878]/50"}`}>
                      {e?.bloqueada ? "Liberar" : "Bloquear"}
                    </button>
                  </form>
                </div>
                {servidores.length > 0 ? (
                  <ul className="mt-2 space-y-1 text-xs text-[#aaa3b5]">
                    {servidores.map((s) => {
                      const on = s.lastSeen.getTime() > agora - ONLINE_MS;
                      return (
                        <li key={s.servidor.id}>
                          {on ? "🟢" : "⚪"} <code className="text-white">{s.servidor.id.slice(0, 8)}</code> · {s.servidor.software} {s.servidor.mcVersion} ·{" "}
                          {s.servidor.players}/{s.servidor.maxPlayers} jogadores · {s.servidor.country || "?"} · {s.servidor.onlineMode ? "original" : "pirata"} · v{s.versao || "?"} ·
                          primeira {fmt(s.firstSeen)} · última {fmt(s.lastSeen)}
                        </li>
                      );
                    })}
                  </ul>
                ) : (
                  <p className="mt-2 text-xs text-[#7d7588]">Ainda não foi usado em nenhum servidor.</p>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
