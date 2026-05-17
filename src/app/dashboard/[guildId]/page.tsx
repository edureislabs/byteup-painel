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
      },
    })
  }
  return config
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

  console.log("Salvando configuracao:", { guildId, prefix, modules, logEnabled, logChannelId })

  try {
    const existing = await prisma.guildConfig.findUnique({ where: { guildId } })
    if (existing) {
      await prisma.guildConfig.update({
        where: { guildId },
        data: { prefix, modules, logEnabled, logChannelId },
      })
    } else {
      await prisma.guildConfig.create({
        data: { guildId, prefix, modules, logEnabled, logChannelId },
      })
    }
    console.log("Salvo com sucesso:", { logEnabled, logChannelId })
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
      }}
      channels={channels.map(c => ({ id: c.id, name: c.name }))}
      saveAction={saveConfigAction.bind(null, guildId)}
    />
  )
}