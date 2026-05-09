import { getServerSession } from "next-auth"
import { redirect } from "next/navigation"

export default async function DashboardPage() {
  const session = await getServerSession()

  if (!session) {
    redirect("/api/auth/signin")
  }

  // Busca os servidores do usuário via Discord API
  const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
    headers: {
      Authorization: `Bearer ${(session as { accessToken?: string }).accessToken}`,
    },
  })

  const guilds: { id: string; name: string; icon: string; owner: boolean }[] =
    await res.json()

  // Filtra servidores onde o usuário é dono (pode ajustar)
  const ownedGuilds = guilds.filter((g) => g.owner)

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Seus Servidores</h1>
      {ownedGuilds.length === 0 ? (
        <p>Você não é dono de nenhum servidor.</p>
      ) : (
        <ul>
          {ownedGuilds.map((guild) => (
            <li key={guild.id}>
              <a href={`/dashboard/${guild.id}`}>
                {guild.name}
              </a>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}