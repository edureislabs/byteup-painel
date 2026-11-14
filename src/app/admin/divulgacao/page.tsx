import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { REPORT_REASONS } from "@/lib/listingShared";
import { isAdmin } from "@/lib/admin";
import { getUsersCached } from "@/lib/discordCache";

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

// Registra no histórico quem fez o quê
async function logAction(guildId: string, adminId: string, action: string, reason?: string | null) {
  await prisma.listingModerationLog.create({
    data: { guildId, adminId, action, reason: reason || null },
  });
}

async function resolveReports(guildId: string, adminId: string, resolution: string) {
  await prisma.serverListingReport.updateMany({
    where: { guildId, resolved: false },
    data: { resolved: true, resolution, resolvedBy: adminId, resolvedAt: new Date() },
  });
}

// ===== Ações (cada uma confere o admin de novo: server actions são públicas) =====

async function hideListing(formData: FormData) {
  "use server";
  const adminId = await requireAdmin();
  const guildId = String(formData.get("guildId") || "");
  const reason = String(formData.get("reason") || "").trim().slice(0, 300) || "Removido pela moderação";
  await prisma.serverListing.update({
    where: { guildId },
    data: { hidden: true, hiddenReason: reason, hiddenBy: adminId, hiddenAt: new Date() },
  });
  await resolveReports(guildId, adminId, "ocultado");
  await logAction(guildId, adminId, "ocultou", reason);
  revalidatePath("/admin/divulgacao");
}

async function unhideListing(formData: FormData) {
  "use server";
  const adminId = await requireAdmin();
  const guildId = String(formData.get("guildId") || "");
  await prisma.serverListing.update({
    where: { guildId },
    data: { hidden: false, hiddenReason: null, hiddenBy: null, hiddenAt: null },
  });
  await logAction(guildId, adminId, "mostrou");
  revalidatePath("/admin/divulgacao");
}

async function markAdult(formData: FormData) {
  "use server";
  const adminId = await requireAdmin();
  const guildId = String(formData.get("guildId") || "");
  await prisma.serverListing.update({ where: { guildId }, data: { nsfw: true } });
  await resolveReports(guildId, adminId, "marcado_18");
  await logAction(guildId, adminId, "marcou_18");
  revalidatePath("/admin/divulgacao");
}

async function dismissReports(formData: FormData) {
  "use server";
  const adminId = await requireAdmin();
  const guildId = String(formData.get("guildId") || "");
  await resolveReports(guildId, adminId, "ignorado");
  await logAction(guildId, adminId, "ignorou");
  revalidatePath("/admin/divulgacao");
}

const reasonLabel = (v: string) => REPORT_REASONS.find((r) => r.value === v)?.label ?? v;

const ACTION_LABEL: Record<string, { text: string; color: string }> = {
  ocultou: { text: "ocultou", color: "#f07878" },
  mostrou: { text: "voltou a mostrar", color: "#7ee2a8" },
  marcou_18: { text: "marcou como +18", color: "#f0b878" },
  ignorou: { text: "ignorou as denúncias de", color: "#aaa3b5" },
};

const fmtDate = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export default async function AdminDivulgacaoPage() {
  await requireAdmin();

  const [reports, hidden, stats, logs] = await Promise.all([
    prisma.serverListingReport.findMany({
      where: { resolved: false },
      include: { listing: true },
      orderBy: { createdAt: "desc" },
      take: 200,
    }),
    prisma.serverListing.findMany({ where: { hidden: true }, orderBy: { hiddenAt: "desc" } }),
    prisma.serverListing.groupBy({ by: ["enabled"], _count: { _all: true } }),
    prisma.listingModerationLog.findMany({ orderBy: { createdAt: "desc" }, take: 30 }),
  ]);

  // Nomes dos servidores do histórico
  const logGuilds = await prisma.serverListing.findMany({
    where: { guildId: { in: [...new Set(logs.map((l) => l.guildId))] } },
    select: { guildId: true, name: true },
  });
  const serverName = new Map(logGuilds.map((g) => [g.guildId, g.name]));

  // Nomes dos admins (busca no Discord, com cache)
  const adminIds = [
    ...new Set([...logs.map((l) => l.adminId), ...hidden.map((h) => h.hiddenBy).filter(Boolean) as string[]]),
  ];
  const adminUsers = await getUsersCached(adminIds);
  const adminName = (id: string | null) => (id ? adminUsers[id]?.username ?? id : "desconhecido");

  // Agrupa as denúncias por servidor
  const byGuild = new Map<string, typeof reports>();
  for (const r of reports) byGuild.set(r.guildId, [...(byGuild.get(r.guildId) ?? []), r]);

  const ativos = stats.find((s) => s.enabled)?._count._all ?? 0;
  const webhookOn = Boolean(process.env.REPORTS_WEBHOOK_URL);

  const btn = "rounded-xl px-3 py-2 text-xs font-bold";

  return (
    <main className="min-h-screen bg-[#08070a] p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/dashboard" className="text-sm text-[#7d7588] hover:text-white">← Voltar para o painel</Link>
        <h1 className="mt-3 text-3xl font-black">Moderação da divulgação</h1>
        <p className="mt-2 text-sm text-[#aaa3b5]">
          {ativos} servidores na lista • {byGuild.size} com denúncias abertas • {hidden.length} ocultos
        </p>
        {!webhookOn && (
          <p className="mt-3 rounded-2xl border border-[#f0b878]/30 bg-[#f0b878]/[0.06] px-4 py-3 text-xs text-[#f0d4b8]">
            💡 Para receber um aviso no Discord a cada denúncia nova, configure a variável{" "}
            <code className="rounded bg-black/30 px-1">REPORTS_WEBHOOK_URL</code> na Vercel.
          </p>
        )}

        {/* ===== Denúncias abertas ===== */}
        <h2 className="mt-10 text-lg font-black">Denúncias abertas</h2>
        {byGuild.size === 0 && <p className="mt-3 text-sm text-[#7d7588]">Nenhuma denúncia aberta. 🎉</p>}

        <div className="mt-4 space-y-4">
          {[...byGuild.entries()].map(([guildId, list]) => {
            const l = list[0].listing;
            return (
              <div key={guildId} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                <Link href={`/servidores/${guildId}`} target="_blank" className="text-lg font-black hover:text-[#d9b4ff]">
                  {l.name ?? guildId} ↗
                </Link>
                <p className="text-xs text-[#7d7588]">
                  {guildId} • {l.nsfw ? "+18" : "livre"} • {list.length} denúncia(s)
                  {l.hidden && " • já está oculto"}
                  {l.inviteCode && <> • discord.gg/{l.inviteCode}</>}
                </p>

                <ul className="mt-3 space-y-1 text-sm text-[#aaa3b5]">
                  {list.map((r) => (
                    <li key={r.id}>
                      <strong className="text-white">{reasonLabel(r.reason)}</strong>
                      {r.details && <> — {r.details}</>}{" "}
                      <span className="text-xs text-[#7d7588]">(por {r.reporterId}, {fmtDate(r.createdAt)})</span>
                    </li>
                  ))}
                </ul>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  {!l.hidden && (
                    <form action={hideListing} className="flex gap-2">
                      <input type="hidden" name="guildId" value={guildId} />
                      <input
                        name="reason"
                        placeholder="Motivo (o dono vê no painel)"
                        className="w-64 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs"
                      />
                      <button className={`${btn} bg-[#f07878] text-black`}>Ocultar da lista</button>
                    </form>
                  )}
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

        {/* ===== Ocultos ===== */}
        <h2 className="mt-12 text-lg font-black">Servidores ocultos</h2>
        {hidden.length === 0 && <p className="mt-3 text-sm text-[#7d7588]">Nenhum servidor oculto.</p>}
        <div className="mt-4 space-y-2">
          {hidden.map((l) => (
            <div key={l.guildId} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.03] p-4">
              <div className="min-w-0">
                <div className="font-bold">{l.name ?? l.guildId}</div>
                <div className="text-xs text-[#aaa3b5]">{l.hiddenReason}</div>
                <div className="mt-1 text-xs text-[#7d7588]">
                  Ocultado por <strong className="text-[#d9b4ff]">{adminName(l.hiddenBy)}</strong>
                  {l.hiddenAt && <> em {fmtDate(l.hiddenAt)}</>}
                </div>
              </div>
              <form action={unhideListing}>
                <input type="hidden" name="guildId" value={l.guildId} />
                <button className={`${btn} border border-white/15 text-[#aaa3b5]`}>Mostrar de novo</button>
              </form>
            </div>
          ))}
        </div>

        {/* ===== Histórico ===== */}
        <h2 className="mt-12 text-lg font-black">Últimas decisões</h2>
        {logs.length === 0 && <p className="mt-3 text-sm text-[#7d7588]">Nenhuma decisão registrada ainda.</p>}
        <div className="mt-4 overflow-hidden rounded-2xl border border-white/10">
          {logs.map((log) => {
            const a = ACTION_LABEL[log.action] ?? { text: log.action, color: "#aaa3b5" };
            return (
              <div key={log.id} className="border-b border-white/5 px-4 py-3 text-sm last:border-b-0">
                <strong className="text-[#d9b4ff]">{adminName(log.adminId)}</strong>{" "}
                <span style={{ color: a.color }}>{a.text}</span>{" "}
                <strong className="text-white">{serverName.get(log.guildId) ?? log.guildId}</strong>
                {log.reason && <span className="text-[#aaa3b5]"> — {log.reason}</span>}
                <span className="ml-2 text-xs text-[#7d7588]">{fmtDate(log.createdAt)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
