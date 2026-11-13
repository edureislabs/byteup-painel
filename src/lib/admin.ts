/**
 * Admins do ByteUP (moderação da divulgação).
 * Configurado na Vercel em ADMIN_USER_IDS, com os IDs separados por vírgula.
 */
export function getAdminIds(): string[] {
  return (process.env.ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isAdmin(userId: string | null | undefined): boolean {
  return Boolean(userId) && getAdminIds().includes(String(userId));
}