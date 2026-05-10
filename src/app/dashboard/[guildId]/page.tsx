import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"

async function getConfig(guildId: string) {
  return await prisma.guildConfig.upsert({
    where: { guildId },
    update: {},
    create: { guildId },
  })
}

export default async function GuildConfigPage({
  params,
}: {
  params: { guildId: string }
}) {
  const config = await getConfig(params.guildId)

  async function saveConfig(formData: FormData) {
    "use server"
    const prefix = formData.get("prefix") as string
    const modules = formData.get("modules") as string
    const logEnabled = formData.get('logEnabled') === 'on';
const logChannelId = formData.get('logChannelId') as string;

    await prisma.guildConfig.upsert({
  where: { guildId: params.guildId },
  update: { prefix, modules, logEnabled, logChannelId },
  create: { guildId: params.guildId, prefix, modules, logEnabled, logChannelId },
});

    revalidatePath(`/dashboard/${params.guildId}`)
  }

  return (
    <main style={{ padding: "2rem", fontFamily: "sans-serif" }}>
      <h1>Configurar Servidor</h1>
      <form action={saveConfig}>
        <label>
          Prefixo:
          <input
            name="prefix"
            defaultValue={config.prefix}
            style={{ marginLeft: "8px" }}
          />
        </label>
        <br /><br />
        <label>
          Módulos (csv):
          <input
            name="modules"
            defaultValue={config.modules}
            style={{ marginLeft: "8px", width: "300px" }}
          />
        </label>
        <label>
  <input type="checkbox" name="logEnabled" defaultChecked={config.logEnabled} />
  Ativar Logs
</label>
<br /><br />
<label>
  Canal de Logs (ID):
  <input name="logChannelId" defaultValue={config.logChannelId || ''} />
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