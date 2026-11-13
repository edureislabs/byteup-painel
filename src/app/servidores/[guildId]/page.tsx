import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import LandingNavbar from "../../components/LandingNavbar";
import LandingFooter from "../../components/LandingFooter";
import AdultGate from "../adultgate";
import ServerActions from "../serveractions";
import { prisma } from "@/lib/prisma";
import { isSnowflake } from "@/lib/apiGuard";
import { getViewer } from "@/lib/adultGate";
import { categoryLabel, countRecentVotes, guildBannerUrl, guildIconUrl } from "@/lib/listing";

export const dynamic = "force-dynamic";

type Params = Promise<{ guildId: string }>;

async function getListing(guildId: string) {
  if (!isSnowflake(guildId)) return null;
  return prisma.serverListing.findFirst({
    where: { guildId, enabled: true, hidden: false, inviteCode: { not: null } },
  });
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { guildId } = await params;
  const listing = await getListing(guildId);
  if (!listing || listing.nsfw) return { title: "Servidor | ByteUP" };
  return {
    title: `${listing.name} | Servidores ByteUP`,
    description: listing.shortDescription ?? undefined,
  };
}

const LANGS: Record<string, string> = { "pt-BR": "Português", en: "Inglês", es: "Espanhol", outro: "Outro" };

export default async function ServidorPage({ params }: { params: Params }) {
  const { guildId } = await params;
  const listing = await getListing(guildId);
  if (!listing) notFound();

  const viewer = await getViewer();

  // Servidor +18: só mostra depois do login + confirmação de idade
  if (listing.nsfw && !viewer.canSeeAdult) {
    return (
      <main className="min-h-screen text-white">
        <LandingNavbar />
        <section className="site-section-sm">
          <div className="site-container max-w-2xl">
            <AdultGate loggedIn={viewer.loggedIn} />
            <p className="mt-6 text-center text-sm">
              <Link href="/servidores" className="text-[#7d7588] underline hover:text-white">← Voltar para a lista</Link>
            </p>
          </div>
        </section>
        <LandingFooter />
      </main>
    );
  }

  const votes = await countRecentVotes(guildId);

  const icon = guildIconUrl(guildId, listing.icon, 256);
  const banner = guildBannerUrl(guildId, listing.banner);
  const category = categoryLabel(listing.category);

  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container max-w-4xl">
          <Link href="/servidores" className="text-sm text-[#7d7588] hover:text-white">← Todos os servidores</Link>

          <div className="site-card mt-4 overflow-hidden">
            {/* Banner (ou faixa com a cor do site) */}
            <div
              className="h-36 w-full bg-gradient-to-r from-[#7330a3] to-[#b64cff] md:h-48"
              style={banner ? { backgroundImage: `url(${banner})`, backgroundSize: "cover", backgroundPosition: "center" } : undefined}
            />

            <div className="p-6 md:p-8">
              <div className="-mt-16 flex flex-col gap-4 md:-mt-20 md:flex-row md:items-end">
                {icon ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={icon} alt="" width={112} height={112} className="h-24 w-24 rounded-3xl border-4 border-[#111014] md:h-28 md:w-28" />
                ) : (
                  <div className="grid h-24 w-24 place-items-center rounded-3xl border-4 border-[#111014] bg-[#1e1b25] text-4xl font-black md:h-28 md:w-28">
                    {(listing.name ?? "?").charAt(0)}
                  </div>
                )}
                <div className="min-w-0 pb-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h1 className="site-title text-3xl font-black md:text-4xl">{listing.name}</h1>
                    {listing.nsfw && <span className="rounded-full bg-[#f07878] px-2.5 py-0.5 text-xs font-black text-black">+18</span>}
                  </div>
                  <p className="mt-1 text-sm text-[#7d7588]">
                    {category.emoji} {category.label} • {LANGS[listing.language] ?? listing.language}
                  </p>
                </div>
              </div>

              <div className="mt-6 grid grid-cols-2 gap-3 md:grid-cols-4">
                {[
                  ["👥 Membros", listing.memberCount.toLocaleString("pt-BR")],
                  ["🟢 Online", listing.onlineCount.toLocaleString("pt-BR")],
                  ["⭐ Votos (30 dias)", votes.toLocaleString("pt-BR")],
                  ["🚀 Bumps", listing.bumpCount.toLocaleString("pt-BR")],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                    <div className="text-xs text-[#7d7588]">{label}</div>
                    <div className="mt-1 text-xl font-black">{value}</div>
                  </div>
                ))}
              </div>

              {listing.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {listing.tags.map((t) => (
                    <Link
                      key={t}
                      href={`/servidores?tag=${encodeURIComponent(t)}`}
                      className="rounded-full bg-[#b64cff]/10 px-3 py-1 text-sm font-semibold text-[#d9b4ff] hover:bg-[#b64cff]/20"
                    >
                      #{t}
                    </Link>
                  ))}
                </div>
              )}

              {listing.shortDescription && (
                <p className="mt-6 text-lg leading-8 text-[#f4f1f6]">{listing.shortDescription}</p>
              )}

              {listing.description && (
                // Texto puro: o React escapa tudo, então não tem como injetar HTML
                <div className="mt-4 whitespace-pre-line break-words text-sm leading-7 text-[#aaa3b5]">
                  {listing.description}
                </div>
              )}

              <div className="mt-8 border-t border-white/10 pt-6">
                <ServerActions guildId={guildId} initialVotes={votes} loggedIn={viewer.loggedIn} />
              </div>
            </div>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}