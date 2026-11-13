import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import type { DefaultSession, NextAuthOptions } from "next-auth"

declare module "next-auth" {
  interface Session {
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      // O Discord passou a mandar o parâmetro "iss" no retorno do login.
      // Sem declarar o issuer aqui, o next-auth v4 recusa todo login com
      // "issuer must be configured on the issuer".
      issuer: "https://discord.com",
      // "email": usado só para criar o Pix na loja (o Mercado Pago exige o e-mail do pagador)
      authorization: { params: { scope: "identify email guilds" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
        // Quando o token do Discord expira (em segundos). O token dura
        // cerca de 7 dias; depois disso o painel manda para o /login
        // (ver src/lib/discordToken.ts) em vez de mostrar o painel vazio.
        token.expiresAt = account.expires_at
      }
      return token
    },
    async session({ session, token }) {
      // O accessToken do Discord NÃO vai para a sessão: /api/auth/session
      // é lido pelo navegador. Ele fica só no JWT (cookie criptografado)
      // e é lido no servidor por src/lib/discordToken.ts.
      if (session.user) {
        session.user.id = token.sub!
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Volta para a página de onde a pessoa veio (ex.: produto da loja);
      // sem página definida, vai para o dashboard.
      if (url.startsWith("/")) url = `${baseUrl}${url}`
      if (url.startsWith(baseUrl)) {
        const path = url.slice(baseUrl.length)
        if (!path || path === "/" || path.startsWith("/login")) return `${baseUrl}/dashboard`
        return url
      }
      return `${baseUrl}/dashboard`
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }