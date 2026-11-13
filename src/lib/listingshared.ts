/**
 * Regras da divulgação de servidores que podem rodar no navegador
 * (sem acesso ao banco). As consultas ao banco ficam em listing.ts.
 */

export const BUMP_COOLDOWN_MS = 2 * 60 * 60 * 1000; // 2 horas
export const VOTE_COOLDOWN_MS = 12 * 60 * 60 * 1000; // 1 voto a cada 12h por servidor
export const VOTE_WINDOW_DAYS = 30; // "Populares" = votos dos últimos 30 dias
export const MAX_TAGS = 5;
export const PAGE_SIZE = 24;

// Cookie que guarda a confirmação "tenho 18 anos"
export const ADULT_COOKIE = "byteup_18";

export const CATEGORIES: { value: string; label: string; emoji: string }[] = [
  { value: "comunidade", label: "Comunidade", emoji: "💬" },
  { value: "jogos", label: "Jogos", emoji: "🎮" },
  { value: "anime", label: "Anime e mangá", emoji: "🌸" },
  { value: "musica", label: "Música", emoji: "🎵" },
  { value: "tecnologia", label: "Tecnologia", emoji: "💻" },
  { value: "estudos", label: "Estudos", emoji: "📚" },
  { value: "roleplay", label: "Roleplay", emoji: "🎭" },
  { value: "memes", label: "Memes", emoji: "😂" },
  { value: "arte", label: "Arte", emoji: "🎨" },
  { value: "loja", label: "Lojas e serviços", emoji: "🛒" },
  { value: "outros", label: "Outros", emoji: "✨" },
];

export const REPORT_REASONS: { value: string; label: string }[] = [
  { value: "nsfw_nao_marcado", label: "Conteúdo +18 sem estar marcado como +18" },
  { value: "golpe", label: "Golpe, phishing ou venda ilegal" },
  { value: "odio", label: "Discurso de ódio ou assédio" },
  { value: "convite_invalido", label: "Convite não funciona" },
  { value: "spam", label: "Spam ou informações falsas" },
  { value: "outro", label: "Outro motivo" },
];

export const categoryLabel = (value: string) =>
  CATEGORIES.find((c) => c.value === value) ?? CATEGORIES[CATEGORIES.length - 1];

/**
 * Limpa as hashtags: minúsculas, sem "#", só letras/números/_ e -,
 * de 2 a 24 caracteres, sem repetir, no máximo 5.
 */
export function normalizeTags(input: unknown): string[] {
  const list = Array.isArray(input)
    ? input
    : typeof input === "string"
      ? input.split(/[\s,]+/)
      : [];

  const out: string[] = [];
  for (const raw of list) {
    const tag = String(raw)
      .trim()
      .toLowerCase()
      .replace(/^#+/, "")
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "") // tira acentos: "música" -> "musica"
      .replace(/[^a-z0-9_-]/g, "");
    if (tag.length >= 2 && tag.length <= 24 && !out.includes(tag)) out.push(tag);
    if (out.length >= MAX_TAGS) break;
  }
  return out;
}

export const guildIconUrl = (guildId: string, icon: string | null, size = 128) =>
  icon
    ? `https://cdn.discordapp.com/icons/${guildId}/${icon}.${icon.startsWith("a_") ? "gif" : "png"}?size=${size}`
    : null;

export const guildBannerUrl = (guildId: string, banner: string | null) =>
  banner ? `https://cdn.discordapp.com/banners/${guildId}/${banner}.png?size=1024` : null;