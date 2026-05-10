import NextAuth from "next-auth"
import DiscordProvider from "next-auth/providers/discord"

const handler = NextAuth({
  providers: [
    DiscordProvider({
      clientId: process.env.DISCORD_CLIENT_ID!,
      clientSecret: process.env.DISCORD_CLIENT_SECRET!,
      authorization: { params: { scope: "identify guilds" } },
    }),
  ],
  callbacks: {
    async session({ session, token }) {
      if (session.user) {
        (session.user as { id: string }).id = token.sub!
      }
      return session
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
  debug: true,
})

export { handler as GET, handler as POST }