import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

// 1. (Opcional, mas recomendado) Extensão de tipos para TypeScript
declare module "next-auth" {
  interface Session {
    accessToken?: string
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

import { DefaultSession } from "next-auth"

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify guilds" } },
    }),
  ],
  callbacks: {
    // 2. Callback JWT: salva o access token no token JWT
    async jwt({ token, account }) {
      // O objeto 'account' está disponível apenas no momento do login
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    // 3. Callback Session: transfere o access token do JWT para a sessão
    async session({ session, token }) {
      // @ts-ignore - O token.accessToken existe, mas os tipos podem não refletir
      session.accessToken = token.accessToken as string
      if (session.user) {
        session.user.id = token.sub!
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true, // Útil para depuração; remova em produção
})

export { handler as GET, handler as POST }