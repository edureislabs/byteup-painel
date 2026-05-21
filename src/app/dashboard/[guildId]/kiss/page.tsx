import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import KissForm from "./KissForm";

type Props = { params: Promise<{ guildId: string }> };

async function getConfig(guildId: string) {
  let config = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (!config) {
    config = await prisma.guildConfig.create({ data: { guildId } });
  }
  return config;
}

async function saveKissAction(guildId: string, formData: FormData) {
  "use server";
  const kissEnabled = formData.get("kissEnabled") === "true";
  const kissTitle = (formData.get("kissTitle") as string) || "Beijo";
  const kissColor = (formData.get("kissColor") as string) || "#F472B6";
  const kissMessage = (formData.get("kissMessage") as string) || "{user} deu um beijo em {target}";
  const kissImageUrl = (formData.get("kissImageUrl") as string) || "https://i.pinimg.com/originals/37/df/fe/37dffeecf1a6162e5c6526bfa65b1ca1.gif";
  const kissThumbnail = (formData.get("kissThumbnail") as string) || null;
  const kissFooter = (formData.get("kissFooter") as string) || null;
  const kissTimestamp = formData.get("kissTimestamp") === "true";

  try {
    let guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      guild = await prisma.guild.create({ data: { id: guildId } });
    }

    const existing = await prisma.guildConfig.findUnique({ where: { guildId } });
    if (existing) {
      await prisma.guildConfig.update({
        where: { guildId },
        data: { kissEnabled, kissTitle, kissColor, kissMessage, kissImageUrl, kissThumbnail, kissFooter, kissTimestamp },
      });
    } else {
      await prisma.guildConfig.create({
        data: { guildId, kissEnabled, kissTitle, kissColor, kissMessage, kissImageUrl, kissThumbnail, kissFooter, kissTimestamp },
      });
    }
  } catch (error) {
    console.error(error);
    throw new Error("Falha ao salvar configuração de beijo.");
  }
  revalidatePath(`/dashboard/${guildId}/kiss`);
}

export default async function KissPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { guildId } = await params;
  const config = await getConfig(guildId);

  return (
    <KissForm
      guildId={guildId}
      config={{
        kissEnabled: config.kissEnabled ?? true,
        kissTitle: config.kissTitle || "Beijo",
        kissColor: config.kissColor || "#F472B6",
        kissMessage: config.kissMessage || "{user} deu um beijo em {target}",
        kissImageUrl: config.kissImageUrl || "https://i.pinimg.com/originals/37/df/fe/37dffeecf1a6162e5c6526bfa65b1ca1.gif",
        kissThumbnail: config.kissThumbnail || "",
        kissFooter: config.kissFooter || "",
        kissTimestamp: config.kissTimestamp ?? true,
      }}
      saveAction={saveKissAction.bind(null, guildId)}
    />
  );
}