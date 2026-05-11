import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"

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

// 🟢 Server action com tratamento de erro e logs detalhados
async function saveConfigAction(guildId: string, formData: FormData) {
  "use server"
  const prefix = formData.get("prefix") as string
  const modules = formData.get("modules") as string
  // ✅ Agora sempre recebemos "true" ou "false" graças ao campo hidden
  const logEnabled = formData.get("logEnabled") === "true"
  const logChannelId = formData.get("logChannelId") as string || null

  console.log("📥 Salvando configuração:", { guildId, prefix, modules, logEnabled, logChannelId })

  try {
    const existing = await prisma.guildConfig.findUnique({ where: { guildId } })
    if (existing) {
      await prisma.guildConfig.update({
        where: { guildId },
        data: { prefix, modules, logEnabled, logChannelId },
      })
      console.log("✅ Configuração atualizada no banco")
    } else {
      await prisma.guildConfig.create({
        data: { guildId, prefix, modules, logEnabled, logChannelId },
      })
      console.log("✅ Configuração criada no banco")
    }
  } catch (error: any) {
    console.error("❌ Erro ao salvar no banco:", error)
    throw new Error("Falha ao salvar configuração. Verifique os logs do servidor.")
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
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Configurar Servidor</h1>
      <form action={saveConfigAction.bind(null, guildId)}>
        <label>
          Prefixo:
          <input name="prefix" defaultValue={config.prefix} style={{ marginLeft: "8px" }} />
        </label>
        <br /><br />

        <label>
          Módulos (csv):
          <input name="modules" defaultValue={config.modules} style={{ marginLeft: "8px", width: "300px" }} />
        </label>
        <br /><br />

        {/* 🔧 CAMPO HIDDEN + CHECKBOX: garante que o valor sempre seja enviado */}
        <input type="hidden" name="logEnabled" value="false" />
        <label>
          <input
            type="checkbox"
            name="logEnabled"
            value="true"
            defaultChecked={config.logEnabled === true}
          />
          Ativar Logs Detalhados
        </label>
        <br /><br />

        <label>
          Canal de Logs:
          <select name="logChannelId" defaultValue={config.logChannelId || ''} style={{ marginLeft: "8px" }}>
            <option value="">Selecione um canal</option>
            {channels.map(channel => (
              <option key={channel.id} value={channel.id}>
                # {channel.name}
              </option>
            ))}
          </select>
        </label>
        <br /><br />

        <button type="submit" style={{ padding: "10px 20px" }}>Salvar</button>
      </form>
      <p style={{ marginTop: "20px", color: "gray" }}>Servidor ID: {guildId}</p>
    </main>
  )
}