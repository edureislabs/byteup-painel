import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import SlapForm from "./SlapForm";

type Props = { params: Promise<{ guildId: string }> };

async function getConfig(guildId: string) {
  let config = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (!config) {
    config = await prisma.guildConfig.create({ data: { guildId } });
  }
  return config;
}

async function saveSlapAction(guildId: string, formData: FormData) {
  "use server";
  const slapEnabled = formData.get("slapEnabled") === "true";
  const slapTitle = (formData.get("slapTitle") as string) || "Tapa";
  const slapColor = (formData.get("slapColor") as string) || "#ED4245";
  const slapMessage = (formData.get("slapMessage") as string) || "{user} deu um tapa em {target}";
  const slapImageUrl = (formData.get("slapImageUrl") as string) || "https://gifdb.com/images/high/up-close-angry-anime-slap-lf84tjs2sgx8obdr.gif";
  const slapThumbnail = (formData.get("slapThumbnail") as string) || null;
  const slapFooter = (formData.get("slapFooter") as string) || null;
  const slapTimestamp = formData.get("slapTimestamp") === "true";

  try {
    let guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      guild = await prisma.guild.create({ data: { id: guildId } });
    }

    const existing = await prisma.guildConfig.findUnique({ where: { guildId } });
    if (existing) {
      await prisma.guildConfig.update({
        where: { guildId },
        data: { slapEnabled, slapTitle, slapColor, slapMessage, slapImageUrl, slapThumbnail, slapFooter, slapTimestamp },
      });
    } else {
      await prisma.guildConfig.create({
        data: { guildId, slapEnabled, slapTitle, slapColor, slapMessage, slapImageUrl, slapThumbnail, slapFooter, slapTimestamp },
      });
    }
  } catch (error) {
    console.error(error);
    throw new Error("Falha ao salvar configuração de tapa.");
  }
  revalidatePath(`/dashboard/${guildId}/slap`);
}

export default async function SlapPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { guildId } = await params;
  const config = await getConfig(guildId);

  return (
    <SlapForm
      guildId={guildId}
      config={{
        slapEnabled: config.slapEnabled ?? true,
        slapTitle: config.slapTitle || "Tapa",
        slapColor: config.slapColor || "#ED4245",
        slapMessage: config.slapMessage || "{user} deu um tapa em {target}",
        slapImageUrl: config.slapImageUrl || "https://gifdb.com/images/high/up-close-angry-anime-slap-lf84tjs2sgx8obdr.gif",
        slapThumbnail: config.slapThumbnail || "",
        slapFooter: config.slapFooter || "",
        slapTimestamp: config.slapTimestamp ?? true,
      }}
      saveAction={saveSlapAction.bind(null, guildId)}
    />
  );
}