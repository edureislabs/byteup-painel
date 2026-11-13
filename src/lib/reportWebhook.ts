import { REPORT_REASONS } from "@/lib/listingshared";

/**
 * Avisa num canal do Discord quando chega uma denúncia nova.
 * Configure na Vercel: REPORTS_WEBHOOK_URL = URL do webhook do canal
 * (Configurações do canal > Integrações > Webhooks > Novo webhook > Copiar URL).
 * Sem a variável, não faz nada.
 */
export async function notifyNewReport(data: {
  guildId: string;
  serverName: string | null;
  reason: string;
  details: string | null;
  reporterId: string;
  openReports: number;
  nsfw: boolean;
}) {
  const url = process.env.REPORTS_WEBHOOK_URL;
  if (!url || !/^https:\/\/(discord|discordapp)\.com\/api\/webhooks\//.test(url)) return;

  const siteUrl = (process.env.NEXTAUTH_URL || "https://byteup-painel.vercel.app").replace(/\/$/, "");
  const reasonLabel = REPORT_REASONS.find((r) => r.value === data.reason)?.label ?? data.reason;

  const body = {
    username: "ByteUP • Denúncias",
    // Não marca ninguém, mesmo que o texto da denúncia tenha @everyone
    allowed_mentions: { parse: [] },
    embeds: [
      {
        title: "🚩 Nova denúncia na divulgação",
        color: 0xed4245,
        url: `${siteUrl}/admin/divulgacao`,
        fields: [
          { name: "Servidor", value: `${data.serverName ?? "Sem nome"}${data.nsfw ? " (+18)" : ""}\n\`${data.guildId}\``, inline: true },
          { name: "Denúncias abertas", value: String(data.openReports), inline: true },
          { name: "Motivo", value: reasonLabel },
          ...(data.details ? [{ name: "Detalhes", value: data.details.slice(0, 1000) }] : []),
          { name: "Denunciado por", value: `<@${data.reporterId}> (\`${data.reporterId}\`)` },
        ],
        footer: { text: "Clique no título para abrir a moderação" },
        timestamp: new Date().toISOString(),
      },
    ],
  };

  try {
    await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  } catch (error) {
    // Falha no aviso não pode impedir a denúncia de ser registrada
    console.error("[denúncias] Erro ao enviar webhook:", error);
  }
}