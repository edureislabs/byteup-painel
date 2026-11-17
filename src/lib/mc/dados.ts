/** Validação do que a ByteUpCore manda (tudo vem de servidores de terceiros: nada é confiável). */

export const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const SLUG = /^[a-z0-9][a-z0-9-]{1,40}$/;
/** Ping a cada 30 min: servidor "online" = falou nos últimos 70 min. */
export const ONLINE_MS = 70 * 60_000;
/** Servidor que conta no limite da licença: falou nos últimos 7 dias. */
export const ATIVO_LICENCA_MS = 7 * 86_400_000;
/** Plugins por ping (proteção contra corpo gigante). */
export const MAX_PLUGINS = 30;

export const texto = (v: unknown, max: number): string =>
  typeof v === "string" ? v.replace(/[\u0000-\u001f\u007f]/g, "").trim().slice(0, max) : "";

export const inteiro = (v: unknown, min: number, max: number): number => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.max(min, Math.min(max, Math.round(n))) : min;
};

/** ID de licença aceito: o ID do item do pedido (UUID) ou a prévia do admin. */
export const licencaIdValido = (v: unknown): v is string =>
  typeof v === "string" && (UUID.test(v) || /^previa-\d{15,22}$/.test(v));

/** País em 2 letras (cabeçalho da Vercel), ou "". */
export function paisDaRequisicao(req: Request): string {
  const p = (req.headers.get("x-vercel-ip-country") || "").toUpperCase();
  return /^[A-Z]{2}$/.test(p) ? p : "";
}

/** Dia de hoje em São Paulo, como data UTC à meia-noite (para a coluna @db.Date). */
export function diaDeHoje(agora = new Date()): Date {
  const s = agora.toLocaleDateString("en-CA", { timeZone: "America/Sao_Paulo" }); // AAAA-MM-DD
  return new Date(`${s}T00:00:00.000Z`);
}

export type DadosServidor = {
  software: string;
  mcVersion: string;
  javaVersion: string;
  coreVersion: string;
  onlineMode: boolean;
  players: number;
  maxPlayers: number;
};

export function lerServidor(c: Record<string, unknown>): DadosServidor {
  return {
    software: texto(c.software, 40),
    mcVersion: texto(c.mc, 20),
    javaVersion: texto(c.java, 20),
    coreVersion: texto(c.core, 20),
    onlineMode: c.online !== false,
    players: inteiro(c.jogadores, 0, 100_000),
    maxPlayers: inteiro(c.max, 0, 100_000),
  };
}

export type PluginNoPing = { id: string; versao: string; edicao: "free" | "premium"; licenca: string | null };

export function lerPlugins(v: unknown): PluginNoPing[] {
  if (!Array.isArray(v)) return [];
  const vistos = new Set<string>();
  const out: PluginNoPing[] = [];
  for (const p of v.slice(0, MAX_PLUGINS)) {
    if (!p || typeof p !== "object") continue;
    const o = p as Record<string, unknown>;
    const id = texto(o.id, 41).toLowerCase();
    if (!SLUG.test(id) || vistos.has(id)) continue;
    vistos.add(id);
    out.push({
      id,
      versao: texto(o.versao, 20),
      edicao: o.edicao === "premium" ? "premium" : "free",
      licenca: licencaIdValido(o.licenca) ? o.licenca : null,
    });
  }
  return out;
}
