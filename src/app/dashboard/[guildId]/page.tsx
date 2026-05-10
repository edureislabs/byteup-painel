import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { getServerSession } from "next-auth"
import { authOptions } from "@/app/api/auth/[...nextauth]/route"
import { redirect } from "next/navigation"

// Tipagem para a página
type Props = {
  params: { guildId: string }
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

// Server action separada que recebe guildId e os dados do formulário
async function saveConfigAction(guildId: string, formData: FormData) {
  "use server"
  const prefix = formData.get("prefix") as string
  const modules = formData.get("modules") as string
  const logEnabled = formData.get("logEnabled") === "on"
  const logChannelId = formData.get("logChannelId") as string | null

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

  revalidatePath(`/dashboard/${guildId}`)
}

export default async function GuildConfigPage({ params }: Props) {
  // Verifica autenticação
  const session = await getServerSession(authOptions)
  if (!session) redirect("/login")

  const config = await getConfig(params.guildId)

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Configurar Servidor</h1>
      <form action={saveConfigAction.bind(null, params.guildId)}>
        {/* Prefixo */}
        <label>
          Prefixo:
          <input
            name="prefix"
            defaultValue={config.prefix}
            style={{ marginLeft: "8px" }}
          />
        </label>
        <br /><br />

        {/* Módulos */}
        <label>
          Módulos (csv):
          <input
            name="modules"
            defaultValue={config.modules}
            style={{ marginLeft: "8px", width: "300px" }}
          />
        </label>
        <br /><br />

        {/* Checkbox de logs */}
        <label>
          <input
            type="checkbox"
            name="logEnabled"
            defaultChecked={config.logEnabled}
          />
          Ativar Logs Detalhados
        </label>
        <br /><br />

        {/* Canal de logs */}
        <label>
          Canal de Logs (ID):
          <input
            name="logChannelId"
            defaultValue={config.logChannelId || ''}
            placeholder="Ex: 1234567890123456789"
            style={{ marginLeft: "8px" }}
          />
        </label>
        <br /><br />

        <button type="submit" style={{ padding: "10px 20px" }}>
          Salvar
        </button>
      </form>
      <p style={{ marginTop: "20px", color: "gray" }}>
        Servidor ID: {params.guildId}
      </p>
    </main>
  )
}