import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/admin";
import { estatisticasPlugins, type Contagem } from "@/lib/mc/estatisticas";
import { chavePublicaMc } from "@/lib/mc/assinatura";
import { salvarPlugin } from "./actions";

export const dynamic = "force-dynamic";

const campo = "rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2 text-sm placeholder:text-[#7d7588] focus:border-[#b64cff] focus:outline-none";

function Lista({ titulo, itens }: { titulo: string; itens: Contagem[] }) {
  const max = Math.max(1, ...itens.map((i) => i.n));
  return (
    <div>
      <div className="text-xs font-bold uppercase tracking-wide text-[#7d7588]">{titulo}</div>
      {itens.length === 0 && <div className="mt-1 text-xs text-[#7d7588]">—</div>}
      <ul className="mt-1 space-y-1">
        {itens.map((i) => (
          <li key={i.nome} className="text-xs">
            <div className="flex justify-between gap-2"><span className="truncate">{i.nome}</span><span className="text-[#aaa3b5]">{i.n}</span></div>
            <div className="mt-0.5 h-1 rounded bg-white/5"><div className="h-1 rounded bg-[#b64cff]" style={{ width: `${(i.n / max) * 100}%` }} /></div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default async function PluginsAdminPage({ searchParams }: { searchParams: Promise<{ salvo?: string; erro?: string }> }) {
  if (!(await getAdminUserId())) notFound();
  const { salvo, erro } = await searchParams;
  const [estat, catalogo] = await Promise.all([estatisticasPlugins(), prisma.mcPlugin.findMany({ orderBy: { nome: "asc" } })]);
  const nomes = new Map(catalogo.map((p) => [p.slug, p.nome]));
  let chave = "";
  try {
    chave = chavePublicaMc();
  } catch {
    chave = "(configure BYTEUP_LICENCA_SEGREDO ou NEXTAUTH_SECRET)";
  }
  const totalOnline = estat.reduce((s, e) => s + e.online, 0);

  return (
    <main className="min-h-screen bg-[#08070a] p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap gap-4 text-sm text-[#7d7588]">
          <Link href="/admin/loja" className="hover:text-white">← Voltar para a loja</Link>
          <Link href="/admin/plugins/licencas" className="font-bold text-[#d9b4ff] hover:text-white">🔑 Licenças dos plugins</Link>
        </div>
        <h1 className="mt-3 text-3xl font-black">🧱 Plugins de Minecraft</h1>
        <p className="mt-2 text-sm leading-6 text-[#aaa3b5]">
          Servidores que usam os seus plugins com a ByteUpCore. Cada servidor avisa o site ao ligar e a cada 30 minutos.
          <strong> Online</strong> = falou na última hora; o país vem do IP (o IP não é guardado).
        </p>
        {salvo && <p className="mt-4 rounded-2xl border border-[#7ee2a8]/30 bg-[#7ee2a8]/[0.08] px-4 py-3 text-sm text-[#bff3d4]">✅ Plugin salvo.</p>}
        {erro && (
          <p className="mt-4 rounded-2xl border border-[#f07878]/30 bg-[#f07878]/[0.08] px-4 py-3 text-sm text-[#f7c4c4]">
            {erro === "slug" ? "O ID do plugin só pode ter letras minúsculas, números e hífen (2 a 41)." : "O link de download precisa começar com https://"}
          </p>
        )}

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><div className="text-xs text-[#7d7588]">Servidores online (todos os plugins)</div><div className="mt-1 text-3xl font-black">{totalOnline}</div></div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><div className="text-xs text-[#7d7588]">Plugins com servidores no mês</div><div className="mt-1 text-3xl font-black">{estat.length}</div></div>
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-5"><div className="text-xs text-[#7d7588]">Plugins no catálogo</div><div className="mt-1 text-3xl font-black">{catalogo.length}</div></div>
        </div>

        {estat.length === 0 && <p className="mt-6 rounded-3xl border border-white/10 p-6 text-sm text-[#7d7588]">Nenhum servidor falou com o site ainda.</p>}
        {estat.map((e) => {
          const maxDia = Math.max(1, ...e.porDia.map((d) => d.n));
          return (
            <section key={e.slug} className="mt-6 rounded-3xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex flex-wrap items-baseline gap-3">
                <h2 className="text-xl font-black">{nomes.get(e.slug) ?? e.slug}</h2>
                <code className="text-xs text-[#7d7588]">{e.slug}</code>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-3 text-sm sm:grid-cols-5">
                <div><div className="text-2xl font-black text-[#7ee2a8]">{e.online}</div><div className="text-xs text-[#7d7588]">online agora</div></div>
                <div><div className="text-2xl font-black">{e.dia}</div><div className="text-xs text-[#7d7588]">últimas 24 h</div></div>
                <div><div className="text-2xl font-black">{e.mes}</div><div className="text-xs text-[#7d7588]">últimos 30 dias</div></div>
                <div><div className="text-2xl font-black">{e.jogadores}</div><div className="text-xs text-[#7d7588]">jogadores online</div></div>
                <div><div className="text-2xl font-black text-[#d9b4ff]">{e.premium}</div><div className="text-xs text-[#7d7588]">com versão paga (30 dias)</div></div>
              </div>
              <div className="mt-4">
                <div className="text-xs font-bold uppercase tracking-wide text-[#7d7588]">Servidores por dia (30 dias)</div>
                <div className="mt-2 flex h-24 items-end gap-[3px]">
                  {e.porDia.map((d) => (
                    <div key={d.dia} title={`${d.dia}: ${d.n}`} className="flex-1 rounded-t bg-[#b64cff]/70" style={{ height: `${Math.max(2, (d.n / maxDia) * 100)}%` }} />
                  ))}
                </div>
                <div className="mt-1 flex justify-between text-[10px] text-[#7d7588]"><span>{e.porDia[0]?.dia}</span><span>hoje</span></div>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-4">
                <Lista titulo="Versão do plugin" itens={e.versoes} />
                <Lista titulo="Minecraft" itens={e.mc} />
                <Lista titulo="Servidor" itens={e.software} />
                <Lista titulo="País" itens={e.paises} />
              </div>
            </section>
          );
        })}

        <h2 className="mt-10 text-2xl font-black">Catálogo</h2>
        <p className="mt-1 text-sm text-[#aaa3b5]">
          A <strong>última versão</strong> aparece como aviso de atualização nos servidores. O <strong>limite</strong> vale para cada licença dos plugins pagos
          (0 = sem limite). Plugin pago = produto da loja (categoria plugin) com o <strong>mesmo ID</strong> (slug).
        </p>
        <div className="mt-4 space-y-3">
          {[...catalogo, null].map((p) => (
            <form key={p?.slug ?? "novo"} action={salvarPlugin} className="grid gap-2 rounded-2xl border border-white/10 p-4 sm:grid-cols-[1fr_1fr_0.7fr_1.6fr_0.6fr_auto]">
              <input name="slug" defaultValue={p?.slug ?? ""} readOnly={!!p} placeholder="ID (ex.: byteuphud)" className={`${campo} ${p ? "opacity-60" : ""}`} />
              <input name="nome" defaultValue={p?.nome ?? ""} placeholder="Nome" className={campo} />
              <input name="ultimaVersao" defaultValue={p?.ultimaVersao ?? ""} placeholder="Versão" className={campo} />
              <input name="urlDownload" defaultValue={p?.urlDownload ?? ""} placeholder="https://… (página de download)" className={campo} />
              <input name="maxServidores" type="number" min={0} defaultValue={p?.maxServidores ?? 3} title="Servidores por licença" className={campo} />
              <button className="rounded-xl bg-[#b64cff] px-4 py-2 text-sm font-bold">{p ? "Salvar" : "Adicionar"}</button>
            </form>
          ))}
        </div>

        <details className="mt-8 rounded-2xl border border-white/10 p-4 text-sm text-[#aaa3b5]">
          <summary className="cursor-pointer font-bold text-white">Chave pública da ByteUpCore</summary>
          <p className="mt-2">Vai dentro da lib para conferir licenças e passes. É a mesma dos bots (muda se o segredo do site mudar).</p>
          <code className="mt-2 block break-all rounded-xl bg-black/30 p-3 text-xs">{chave}</code>
        </details>
      </div>
    </main>
  );
}
