import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

/**
 * Admins do ByteUP (moderação da divulgação e loja).
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

/** ID do admin logado, ou null. */
export async function getAdminUserId(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  return isAdmin(userId) ? userId! : null;
}