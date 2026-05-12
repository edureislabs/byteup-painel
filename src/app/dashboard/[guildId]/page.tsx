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

async function saveConfigAction(guildId: string, formData: FormData) {
  "use server"
  const prefix = formData.get("prefix") as string
  const modules = formData.get("modules") as string
  const logEnabled = formData.get("logEnabled") === "true"
  const logChannelId = formData.get("logChannelId") as string || null

  console.log("📥 Salvando configuração:", { 
    guildId, 
    prefix, 
    modules, 
    logEnabled,
    logChannelId 
  })

  try {
    const existing = await prisma.guildConfig.findUnique({ where: { guildId } })
    if (existing) {
      await prisma.guildConfig.update({
        where: { guildId },
        data: { prefix, modules, logEnabled, logChannelId },
      })
      console.log("✅ Configuração atualizada:", { logEnabled, logChannelId })
    } else {
      await prisma.guildConfig.create({
        data: { guildId, prefix, modules, logEnabled, logChannelId },
      })
      console.log("✅ Configuração criada:", { logEnabled, logChannelId })
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
    <main style={{ padding: "2rem", fontFamily: "sans-serif", maxWidth: "600px" }}>
      <h1>⚙️ Configurar Servidor</h1>
      
      <form action={saveConfigAction.bind(null, guildId)}>
        {/* ========== PREFIXO ========== */}
        <div style={{ marginBottom: "2rem" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
            Prefixo:
          </label>
          <input 
            name="prefix" 
            defaultValue={config.prefix} 
            style={{ 
              padding: "8px 12px",
              fontSize: "16px",
              border: "2px solid #ddd",
              borderRadius: "6px",
              width: "100%",
              boxSizing: "border-box"
            }} 
          />
        </div>

        {/* ========== MÓDULOS ========== */}
        <div style={{ marginBottom: "2rem" }}>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold" }}>
            Módulos (csv):
          </label>
          <input 
            name="modules" 
            defaultValue={config.modules} 
            style={{ 
              padding: "8px 12px",
              fontSize: "16px",
              border: "2px solid #ddd",
              borderRadius: "6px",
              width: "100%",
              boxSizing: "border-box"
            }} 
            placeholder="fun,utility,moderation"
          />
        </div>

        {/* ========== TOGGLE SWITCH PARA LOGS ========== */}
        <div style={{ marginBottom: "2rem" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <div style={{ flex: 1 }}>
              <p style={{ margin: "0 0 8px 0", fontWeight: "bold" }}>
                🔔 Ativar Logs Detalhados
              </p>
              <p style={{ margin: "0", fontSize: "14px", color: "#666" }}>
                {config.logEnabled ? "✅ Logs LIGADOS" : "❌ Logs DESLIGADOS"}
              </p>
            </div>

            {/* TOGGLE SWITCH */}
            <label style={{
              position: "relative",
              display: "inline-block",
              width: "60px",
              height: "34px",
              cursor: "pointer"
            }}>
              <input
                type="checkbox"
                id="logToggle"
                name="logToggle"
                defaultChecked={config.logEnabled}
                style={{
                  opacity: 0,
                  width: 0,
                  height: 0,
                }}
                onChange={(e) => {
                  // Atualiza o input hidden
                  const hidden = document.getElementById('logEnabledHidden') as HTMLInputElement
                  if (hidden) {
                    hidden.value = e.currentTarget.checked ? 'true' : 'false'
                  }
                  // Desabilita/habilita o select
                  const select = document.getElementById('logChannelSelect') as HTMLSelectElement
                  if (select) {
                    select.disabled = !e.currentTarget.checked
                  }
                }}
              />
              
              {/* Slider do toggle */}
              <span style={{
                position: "absolute",
                cursor: "pointer",
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: config.logEnabled ? "#4CAF50" : "#ccc",
                transition: "0.4s",
                borderRadius: "34px",
              } as React.CSSProperties}>
                <span style={{
                  position: "absolute",
                  content: '""',
                  height: "26px",
                  width: "26px",
                  left: config.logEnabled ? "31px" : "4px",
                  bottom: "4px",
                  backgroundColor: "white",
                  transition: "0.4s",
                  borderRadius: "50%",
                }} />
              </span>
            </label>
          </div>

          {/* Input hidden para enviar o valor */}
          <input 
            type="hidden"
            id="logEnabledHidden"
            name="logEnabled"
            defaultValue={config.logEnabled ? "true" : "false"}
          />
        </div>

        {/* ========== SELETOR DE CANAL (DESABILITADO SE LOGS OFF) ========== */}
        <div style={{ marginBottom: "2rem" }}>
          <label style={{ 
            display: "block", 
            marginBottom: "8px", 
            fontWeight: "bold",
            opacity: config.logEnabled ? 1 : 0.5
          }}>
            📁 Canal de Logs:
          </label>
          <select 
            id="logChannelSelect"
            name="logChannelId" 
            defaultValue={config.logChannelId || ''} 
            disabled={!config.logEnabled}
            style={{ 
              padding: "8px 12px",
              fontSize: "16px",
              border: "2px solid " + (config.logEnabled ? "#ddd" : "#ddd"),
              borderRadius: "6px",
              width: "100%",
              boxSizing: "border-box",
              backgroundColor: config.logEnabled ? "white" : "#f5f5f5",
              cursor: config.logEnabled ? "pointer" : "not-allowed",
              opacity: config.logEnabled ? 1 : 0.6,
              transition: "0.3s"
            }}
          >
            <option value="">
              {config.logEnabled ? "Selecione um canal" : "Ative os logs primeiro"}
            </option>
            {channels.map(channel => (
              <option key={channel.id} value={channel.id}>
                # {channel.name}
              </option>
            ))}
          </select>
        </div>

        {/* ========== BOTÃO SALVAR ========== */}
        <button 
          type="submit" 
          style={{ 
            padding: "12px 24px",
            fontSize: "16px",
            fontWeight: "bold",
            backgroundColor: "#5865F2",
            color: "white",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
            width: "100%",
            transition: "0.3s"
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#4752C4"
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLButtonElement).style.backgroundColor = "#5865F2"
          }}
        >
          💾 Salvar Configurações
        </button>
      </form>

      <p style={{ marginTop: "2rem", color: "#999", fontSize: "14px" }}>
        Server ID: <code style={{ backgroundColor: "#f0f0f0", padding: "2px 6px", borderRadius: "3px" }}>{guildId}</code>
      </p>
    </main>
  )
}