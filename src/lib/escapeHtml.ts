/**
 * Escapa HTML antes de aplicar o markdown das pré-visualizações.
 * Sem isso, um texto como <img src=x onerror=alert(1)> salvo no banco
 * vira código rodando no navegador de quem abrir o painel.
 */
export function escapeHtml(text: string): string {
  return String(text ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}