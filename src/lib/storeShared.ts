/**
 * Constantes e helpers da loja que podem ir para o navegador.
 */

export const STORE_CATEGORIES = [
  { value: "bot", label: "Bots", emoji: "🤖" },
  { value: "plugin", label: "Plugins", emoji: "🧩" },
  { value: "app", label: "Aplicativos", emoji: "💻" },
  { value: "servico", label: "Serviços", emoji: "🛠️" },
] as const;

export type StoreCategory = (typeof STORE_CATEGORIES)[number]["value"];

export const PRODUCT_KINDS = [
  { value: "download", label: "Download (entrega automática)" },
  { value: "servico", label: "Serviço (atendido por ticket)" },
] as const;

export const storeCategoryLabel = (v: string) =>
  STORE_CATEGORIES.find((c) => c.value === v) ?? { value: v, label: v, emoji: "📦" };

export function formatPrice(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** "49,90" | "49.90" | "R$ 1.249,90" -> centavos. null se inválido. */
export function parsePrice(input: string): number | null {
  let s = input.replace(/[^\d.,]/g, "");
  if (!s) return null;
  // Se tem vírgula, ela é o decimal e os pontos são milhar
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  const n = Number(s);
  if (!Number.isFinite(n) || n < 0 || n > 1_000_000) return null;
  return Math.round(n * 100);
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let v = bytes / 1024;
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${v.toLocaleString("pt-BR", { maximumFractionDigits: v < 10 ? 1 : 0 })} ${units[i]}`;
}

export const productImageUrl = (productId: string, imageKey: string | null) =>
  imageKey ? `/api/store/image/${productId}?v=${encodeURIComponent(imageKey.slice(-12))}` : null;

/** Data de N dias atrás (fora dos componentes, por causa da regra de pureza do React). */
export const daysAgo = (days: number) => new Date(Date.now() - days * 24 * 60 * 60 * 1000);
