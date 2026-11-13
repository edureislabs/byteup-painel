import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { REPORT_REASONS } from "@/lib/listingshared";
import { isAdmin } from "@/lib/admin";

export const dynamic = "force-dynamic";

/**
 * Moderação da divulgação: só para os IDs em ADMIN_USER_IDS (variável de
 * ambiente, separados por vírgula). Para todo o resto, a página "não existe".
 */
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!isAdmin(userId)) notFound();
  return userId!;
}

// ===== Ações (cada uma confere o admin de novo: server actions são públicas) =====

async function hideListing(formData: FormData) {
  "use server";
  await requireAdmin();
  const guildId = String(formData.get("guildId") || "");
  const reason = String(formData.get("reason") || "").slice(0, 300) || "Removido pela moderação";
  await prisma.serverListing.update({ where: { guildId }, data: { hidden: true, hiddenReason: reason } });
  await prisma.serverListingReport.updateMany({ where: { guildId, resolved: false }, data: { resolved: true } });
  revalidatePath("/admin/divulgacao");
}

async function unhideListing(formData: FormData) {
  "use server";
  await requireAdmin();
  const guildId = String(formData.get("guildId") || "");
  await prisma.serverListing.update({ where: { guildId }, data: { hidden: false, hiddenReason: null } });
  revalidatePath("/admin/divulgacao");
}

async function markAdult(formData: FormData) {
  "use server";
  await requireAdmin();
  const guildId = String(formData.get("guildId") || "");
  await prisma.serverListing.update({ where: { guildId }, data: { nsfw: true } });
  await prisma.serverListingReport.updateMany({ where: { guildId, resolved: false }, data: { resolved: true } });
  revalidatePath("/admin/divulgacao");
}

async function dismissReports(formData: FormData) {
  "use server";
  await requireAdmin();
  const guildId = String(formData.get("guildId") || "");
  await prisma.serverListingReport.updateMany({ where: { guildId, resolved: false }, data: { resolved: true } });
  revalidatePath("/admin/divulgacao");
}

const reasonLabel = (v: string) => REPORT_REASONS.find((r) => r.value === v)?.label ?? v;

export default async function AdminDivulgacaoPage() {
  await requireAdmin();

  const [reports, hidden, stats] = await Promise.all([
    prisma.serverListingReport.findMany({
      where: { resolved: false },
      include: { listing: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.serverListing.findMany({ where: { hidden: true }, orderBy: { updatedAt: "desc" } }),
    prisma.serverListing.groupBy({ by: ["enabled"], _count: { _all: true } }),
  ]);

  // Agrupa as denúncias por servidor
  const byGuild = new Map<string, typeof reports>();
  for (const r of reports) byGuild.set(r.guildId, [...(byGuild.get(r.guildId) ?? []), r]);

  const ativos = stats.find((s) => s.enabled)?._count._all ?? 0;

  const btn = "rounded-xl px-3 py-2 text-xs font-bold";

  return (
    <main className="min-h-screen bg-[#08070a] p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm text-[#7d7588] hover:text-white">← Voltar para o painel</Link>
        <h1 className="mt-3 text-3xl font-black">Moderação da divulgação</h1>
        <p className="mt-2 text-sm text-[#aaa3b5]">
          {ativos} servidores na lista • {byGuild.size} com denúncias abertas • {hidden.length} ocultos
        </p>

        <h2 className="mt-10 text-lg font-black">Denúncias abertas</h2>
        {byGuild.size === 0 && <p className="mt-3 text-sm text-[#7d7588]">Nenhuma denúncia aberta. 🎉</p>}

        <div className="mt-4 space-y-4">
          {[...byGuild.entries()].map(([guildId, list]) => {
            const l = list[0].listing;
            return (
              <div key={guildId} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <Link href={`/servidores/${guildId}`} target="_blank" className="text-lg font-black hover:text-[#d9b4ff]">
                      {l.name ?? guildId} ↗
                    </Link>
                    <p className="text-xs text-[#7d7588]">
                      {guildId} • {l.nsfw ? "+18" : "livre"} • {list.length} denúncia(s)
                      {l.inviteCode && <> • discord.gg/{l.inviteCode}</>}
                    </p>
                  </div>
                </div>

                <ul className="mt-3 space-y-1 text-sm text-[#aaa3b5]">
                  {list.map((r) => (
                    <li key={r.id}>
                      <strong className="text-white">{reasonLabel(r.reason)}</strong>
                      {r.details && <> — {r.details}</>}{" "}
                      <span className="text-xs text-[#7d7588]">
                        (por {r.reporterId}, {r.createdAt.toLocaleString("pt-BR")})
                      </span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <form action={hideListing} className="flex gap-2">
                    <input type="hidden" name="guildId" value={guildId} />
                    <input
                      name="reason"
                      placeholder="Motivo (o dono vê no painel)"
                      className="w-64 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs"
                    />
                    <button className={`${btn} bg-[#f07878] text-black`}>Ocultar da lista</button>
                  </form>
                  {!l.nsfw && (
                    <form action={markAdult}>
                      <input type="hidden" name="guildId" value={guildId} />
                      <button className={`${btn} border border-[#f07878]/50 text-[#f07878]`}>Marcar como +18</button>
                    </form>
                  )}
                  <form action={dismissReports}>
                    <input type="hidden" name="guildId" value={guildId} />
                    <button className={`${btn} border border-white/15 text-[#aaa3b5]`}>Ignorar denúncias</button>
                  </form>
                </div>
              </div>
            );
          })}
        </div>

        <h2 className="mt-12 text-lg font-black">Servidores ocultos</h2>
        {hidden.length === 0 && <p className="mt-3 text-sm text-[#7d7588]">Nenhum servidor oculto.</p>}
        <div className="mt-4 space-y-2">
          {hidden.map((l) => (
            <div key={l.guildId} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div>
                <div className="font-bold">{l.name ?? l.guildId}</div>
                <div className="text-xs text-[#7d7588]">{l.hiddenReason}</div>
              </div>
              <form action={unhideListing}>
                <input type="hidden" name="guildId" value={l.guildId} />
                <button className={`${btn} border border-white/15 text-[#aaa3b5]`}>Mostrar de novo</button>
              </form>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}