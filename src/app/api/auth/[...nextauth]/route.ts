// src/app/api/auth/[...nextauth]/route.ts
import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"
import type { DefaultSession } from "next-auth"

declare module "next-auth" {
  interface Session {
    accessToken?: string
    user: {
      id: string
    } & DefaultSession["user"]
  }
}

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify guilds" } },
    }),
  ],
  callbacks: {
    async jwt({ token, account }) {
      if (account) {
        token.accessToken = account.access_token
      }
      return token
    },
    async session({ session, token }) {
      session.accessToken = token.accessToken as string
      if (session.user) {
        session.user.id = token.sub!
      }
      return session
    },
    async redirect({ url, baseUrl }) {
      // Após o login, sempre vá para /dashboard
      if (url.startsWith(baseUrl)) return `${baseUrl}/dashboard`
      // Se a URL for relativa, garanta que ela está no domínio correto
      if (url.startsWith("/")) return `${baseUrl}${url}`
      return url
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
})

export { handler as GET, handler as POST }