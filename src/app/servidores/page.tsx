import type { Metadata } from "next";
import Link from "next/link";
import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";
import ServerCard from "./servercard";
import AdultGate, { LeaveAdultMode } from "./adultgate";
import { CATEGORIES, getPopularTags, getPublicListings } from "@/lib/listing";
import { getViewer } from "@/lib/adultgate";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Descobrir servidores | ByteUP",
  description: "Encontre comunidades no Discord: jogos, anime, música, tecnologia e muito mais.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const SORTS = [
  { value: "recentes", label: "🚀 Recentes" },
  { value: "populares", label: "⭐ Populares" },
  { value: "membros", label: "👥 Mais membros" },
] as const;

export default async function ServidoresPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

  const q = one(sp.q);
  const tag = one(sp.tag);
  const categoria = one(sp.categoria);
  const ordemRaw = one(sp.ordem);
  const ordem = (SORTS.some((s) => s.value === ordemRaw) ? ordemRaw : "recentes") as "recentes" | "populares" | "membros";
  const page = Math.max(1, Number(one(sp.pagina)) || 1);
  const wantsAdult = one(sp.mais18) === "1";

  const viewer = await getViewer();
  const showAdult = wantsAdult && viewer.canSeeAdult;

  const [result, popularTags] = await Promise.all([
    getPublicListings({
      q,
      tag,
      category: CATEGORIES.some((c) => c.value === categoria) ? categoria : undefined,
      sort: ordem,
      includeAdult: showAdult,
      page,
    }),
    getPopularTags(),
  ]);

  // Monta links mantendo os filtros atuais
  const href = (changes: Record<string, string | null>) => {
    const params = new URLSearchParams();
    const base: Record<string, string> = { q, tag, categoria, ordem: ordem === "recentes" ? "" : ordem, mais18: wantsAdult ? "1" : "" };
    for (const [k, v] of Object.entries({ ...base, ...changes })) if (v) params.set(k, v);
    const s = params.toString();
    return `/servidores${s ? `?${s}` : ""}`;
  };

  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <span className="site-pill">Divulgação</span>
          <h1 className="site-title mt-4 text-4xl font-black md:text-5xl">Descobrir servidores</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#aaa3b5]">
            Comunidades que usam o ByteUP. Os servidores sobem para o topo quando alguém usa{" "}
            <code className="rounded-lg bg-black/25 px-2 py-0.5 text-[#ead9ff]">/bump</code>, e você pode votar nos seus favoritos.
          </p>

          {/* Busca e filtros (funciona sem JavaScript) */}
          <form action="/servidores" method="get" className="mt-8 grid gap-3 md:grid-cols-[1fr_220px_auto]">
            <input
              name="q"
              defaultValue={q}
              placeholder="Buscar por nome, descrição ou #hashtag"
              className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-white placeholder:text-[#7d7588] focus:border-[#b64cff] focus:outline-none"
            />
            <select
              name="categoria"
              defaultValue={categoria}
              className="rounded-2xl border border-white/10 bg-[#111014] px-4 py-3 text-sm text-white focus:border-[#b64cff] focus:outline-none"
            >
              <option value="">Todas as categorias</option>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
              ))}
            </select>
            {tag && <input type="hidden" name="tag" value={tag} />}
            {ordem !== "recentes" && <input type="hidden" name="ordem" value={ordem} />}
            {wantsAdult && <input type="hidden" name="mais18" value="1" />}
            <button type="submit" className="site-button-primary justify-center px-6 py-3">Buscar</button>
          </form>

          {/* Ordenação + hashtags */}
          <div className="mt-5 flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex flex-wrap gap-2">
              {SORTS.map((s) => (
                <Link
                  key={s.value}
                  href={href({ ordem: s.value === "recentes" ? null : s.value, pagina: null })}
                  className={`rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
                    ordem === s.value ? "bg-[#b64cff] text-white" : "border border-white/10 text-[#aaa3b5] hover:text-white"
                  }`}
                >
                  {s.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center gap-3 text-sm">
              {showAdult ? (
                <LeaveAdultMode />
              ) : (
                <Link href={href({ mais18: "1", pagina: null })} className="text-xs font-semibold text-[#7d7588] underline hover:text-white">
                  Mostrar servidores +18
                </Link>
              )}
            </div>
          </div>

          {popularTags.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {popularTags.map((t) => (
                <Link
                  key={t}
                  href={href({ tag: tag === t ? null : t, pagina: null })}
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    tag === t ? "bg-[#b64cff] text-white" : "bg-[#b64cff]/10 text-[#d9b4ff] hover:bg-[#b64cff]/20"
                  }`}
                >
                  #{t}
                </Link>
              ))}
            </div>
          )}

          {(q || tag || categoria) && (
            <p className="mt-4 text-sm text-[#7d7588]">
              {result.total} servidor(es) encontrado(s){tag && <> com <strong className="text-[#d9b4ff]">#{tag}</strong></>}.{" "}
              <Link href="/servidores" className="underline hover:text-white">Limpar filtros</Link>
            </p>
          )}
        </div>
      </section>

      <section className="pb-20">
        <div className="site-container">
          {wantsAdult && !viewer.canSeeAdult && (
            <div className="mb-8">
              <AdultGate loggedIn={viewer.loggedIn} compact />
            </div>
          )}

          {result.items.length === 0 ? (
            <div className="site-card p-10 text-center">
              <p className="text-lg font-bold">Nenhum servidor encontrado.</p>
              <p className="mt-2 text-sm text-[#aaa3b5]">
                Tem um servidor? Ative a divulgação no{" "}
                <Link href="/dashboard" className="text-[#d9b4ff] underline">dashboard</Link> e use /bump.
              </p>
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {result.items.map((server) => (
                <ServerCard key={server.guildId} server={server} />
              ))}
            </div>
          )}

          {result.pages > 1 && (
            <div className="mt-10 flex items-center justify-center gap-3 text-sm">
              {page > 1 && (
                <Link href={href({ pagina: String(page - 1) })} className="site-button-secondary px-4 py-2">← Anterior</Link>
              )}
              <span className="text-[#7d7588]">Página {page} de {result.pages}</span>
              {page < result.pages && (
                <Link href={href({ pagina: String(page + 1) })} className="site-button-secondary px-4 py-2">Próxima →</Link>
              )}
            </div>
          )}
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}