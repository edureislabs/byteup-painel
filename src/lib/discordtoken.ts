import { cookies } from "next/headers";
import { decode } from "next-auth/jwt";

/**
 * Lê o token OAuth do Discord direto do cookie criptografado do NextAuth.
 * Esse token NÃO vai mais para a sessão (que o navegador consegue ler em
 * /api/auth/session); ele só existe aqui, no servidor.
 */
export async function getDiscordAccessToken(): Promise<string | null> {
  const store = await cookies();

  const baseNames = [
    "__Secure-next-auth.session-token",
    "next-auth.session-token",
  ];

  for (const name of baseNames) {
    // Cookie inteiro
    const whole = store.get(name)?.value;

    // Cookie dividido em pedaços (name.0, name.1, ...) quando passa de 4KB
    const chunks = store
      .getAll()
      .filter((c) => c.name.startsWith(`${name}.`))
      .sort(
        (a, b) =>
          Number(a.name.split(".").pop()) - Number(b.name.split(".").pop())
      )
      .map((c) => c.value);

    const raw = whole ?? (chunks.length > 0 ? chunks.join("") : undefined);
    if (!raw) continue;

    try {
      const token = await decode({
        token: raw,
        secret: process.env.NEXTAUTH_SECRET!,
      });
      const accessToken = token?.accessToken;
      if (typeof accessToken === "string" && accessToken) return accessToken;
    } catch {
      // cookie inválido ou segredo trocado: trata como deslogado
    }
  }

  return null;
}