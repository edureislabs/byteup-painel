import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"
import ConfigForm from "./ConfigForm"

type Props = {
  params: Promise<{ guildId: string }>
}

type DiscordChannel = {
  id: string
  name: string
  type: number
}

async function getConfig(guildId: string) {
  let config = await prisma.guildConfig.findUnique({ where: { guildId } })
  if (!config) {
    config = await prisma.guildConfig.create({
      data: {
        guildId,
        prefix: '/',
        modules: 'fun,utility',
        logEnabled: false,
        logChannelId: null,
        birthdayEnabled: false,
        birthdayChannelId: null,
        birthdayMessage: 'Feliz aniversario, {user}!',
      },
    })
  }
  return config
}

async function getGuildInfo(guildId: string) {
  try {
    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
      headers: {
        Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      },
      next: { revalidate: 60 },
    })
    return res.ok
  } catch {
    return false
  }
}

async function getChannels(guildId: string) {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
    },
    next: { revalidate: 60 },
  })

  if (!res.ok) return []
  const channels: DiscordChannel[] = await res.json()
  return channels.filter(c => c.type === 0 || c.type === 5)
}

async function saveConfigAction(guildId: string, formData: FormData) {
  "use server"

  const prefix = formData.get("prefix") as string
  const modules = formData.get("modules") as string
  const logEnabled = formData.get("logEnabled") === "true"
  const logChannelId = formData.get("logChannelId") as string || null
  const birthdayEnabled = formData.get("birthdayEnabled") === "true"
  const birthdayChannelId = formData.get("birthdayChannelId") as string || null
  const birthdayMessage = formData.get("birthdayMessage") as string || 'Feliz aniversario, {user}!'
  const gamesEnabled = formData.get("gamesEnabled") === "true"

  try {
    await prisma.guild.upsert({
      where: { id: guildId },
      update: {},
      create: { id: guildId },
    })

    const existing = await prisma.guildConfig.findUnique({ where: { guildId } })
    if (existing) {
      await prisma.guildConfig.update({
        where: { guildId },
        data: { prefix, modules, logEnabled, logChannelId, birthdayEnabled, birthdayChannelId, birthdayMessage, gamesEnabled }
      })
    } else {
      await prisma.guildConfig.create({
        data: { guildId, prefix, modules, logEnabled, logChannelId, birthdayEnabled, birthdayChannelId, birthdayMessage },
      })
    }
  } catch (error: any) {
    console.error("Erro ao salvar:", error)
    throw new Error("Falha ao salvar configuracao.")
  }

  revalidatePath(`/dashboard/${guildId}`)
}

export default async function GuildConfigPage({ params }: Props) {
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const { guildId } = await params

  const botInGuild = await getGuildInfo(guildId)

  if (!botInGuild) {
    return (
      <main style={{ padding: "2rem", fontFamily: "sans-serif", color: "#dbdee1", background: "#0e0f11", minHeight: "100vh" }}>
        <div style={{ maxWidth: "520px", margin: "0 auto" }}>
          <h1 style={{ color: "#f2f3f5" }}>Bot nao esta no servidor</h1>
          <p style={{ color: "#72767d" }}>
            Para configurar este servidor, o ByteUP BOT precisa estar presente nele.
          </p>
          <a href="/dashboard" style={{ color: "#5865f2", textDecoration: "none" }}>Voltar para a lista de servidores</a>
        </div>
      </main>
    )
  }

  const config = await getConfig(guildId)
  const channels = await getChannels(guildId)

  return (
    <ConfigForm
      guildId={guildId}
      config={{
  prefix: config.prefix,
  modules: config.modules,
  logEnabled: config.logEnabled,
  logChannelId: config.logChannelId,
  birthdayEnabled: config.birthdayEnabled,
  birthdayMessage: config.birthdayMessage,
  birthdayChannelId: config.birthdayChannelId,
  gamesEnabled: config.gamesEnabled,   // ← ADICIONE ESTA LINHA
}}
      channels={channels.map(c => ({ id: c.id, name: c.name }))}
      saveAction={saveConfigAction.bind(null, guildId)}
    />
  )
}