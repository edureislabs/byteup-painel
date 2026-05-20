import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import HugForm from "./HugForm";

type Props = { params: Promise<{ guildId: string }> };

async function getConfig(guildId: string) {
  let config = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (!config) {
    config = await prisma.guildConfig.create({ data: { guildId } });
  }
  return config;
}

async function saveHugAction(guildId: string, formData: FormData) {
  "use server";
  const hugEnabled = formData.get("hugEnabled") === "true";
  const hugTitle = (formData.get("hugTitle") as string) || "Abraco";
  const hugColor = (formData.get("hugColor") as string) || "#F472B6";
  const hugMessage = (formData.get("hugMessage") as string) || "{user} deu um abraco em {target}";
  const hugImageUrl = (formData.get("hugImageUrl") as string) || "https://usagif.com/wp-content/uploads/gif/anime-hug-38.gif";
  const hugThumbnail = (formData.get("hugThumbnail") as string) || null;
  const hugFooter = (formData.get("hugFooter") as string) || null;
  const hugTimestamp = formData.get("hugTimestamp") === "true";

  try {
    // Garante que a Guild existe (sem upsert)
    let guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      guild = await prisma.guild.create({ data: { id: guildId } });
    }

    // Atualiza ou cria a configuração (sem upsert)
    const existing = await prisma.guildConfig.findUnique({ where: { guildId } });
    if (existing) {
      await prisma.guildConfig.update({
        where: { guildId },
        data: { hugEnabled, hugTitle, hugColor, hugMessage, hugImageUrl, hugThumbnail, hugFooter, hugTimestamp },
      });
    } else {
      await prisma.guildConfig.create({
        data: { guildId, hugEnabled, hugTitle, hugColor, hugMessage, hugImageUrl, hugThumbnail, hugFooter, hugTimestamp },
      });
    }
  } catch (error) {
    console.error(error);
    throw new Error("Falha ao salvar configuração de abraço.");
  }
  revalidatePath(`/dashboard/${guildId}/hug`);
}

export default async function HugPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { guildId } = await params;
  const config = await getConfig(guildId);

  return (
    <HugForm
      guildId={guildId}
      config={{
        hugEnabled: config.hugEnabled ?? true,
        hugTitle: config.hugTitle || "Abraco",
        hugColor: config.hugColor || "#F472B6",
        hugMessage: config.hugMessage || "{user} deu um abraco em {target}",
        hugImageUrl: config.hugImageUrl || "https://usagif.com/wp-content/uploads/gif/anime-hug-38.gif",
        hugThumbnail: config.hugThumbnail || "",
        hugFooter: config.hugFooter || "",
        hugTimestamp: config.hugTimestamp ?? true,
      }}
      saveAction={saveHugAction.bind(null, guildId)}
    />
  );
}