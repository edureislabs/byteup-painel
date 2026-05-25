import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import CommandsForm from "./CommandsForm";

type Props = { params: Promise<{ guildId: string }> };

async function getConfig(guildId: string) {
  let config = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (!config) {
    config = await prisma.guildConfig.create({ data: { guildId } });
  }
  return config;
}

async function getChannels(guildId: string) {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const channels = await res.json();
  return channels.filter((c: any) => c.type === 0 || c.type === 5);
}

async function saveCommandsAction(guildId: string, formData: FormData) {
  "use server";
  const blockedCommandChannels = (formData.get("blockedCommandChannels") as string) || '[]';
  const blockedCommandMessage = (formData.get("blockedCommandMessage") as string) || "Voce nao pode executar comandos neste canal!";
  const blockedCommandNotify = formData.get("blockedCommandNotify") === "true";

  try {
    let guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      guild = await prisma.guild.create({ data: { id: guildId } });
    }

    const existing = await prisma.guildConfig.findUnique({ where: { guildId } });
    if (existing) {
      await prisma.guildConfig.update({
        where: { guildId },
        data: { blockedCommandChannels, blockedCommandMessage, blockedCommandNotify },
      });
    } else {
      await prisma.guildConfig.create({
        data: { guildId, blockedCommandChannels, blockedCommandMessage, blockedCommandNotify },
      });
    }
  } catch (error) {
    console.error(error);
    throw new Error("Falha ao salvar configurações.");
  }
  revalidatePath(`/dashboard/${guildId}/commands`);
}

export default async function CommandsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { guildId } = await params;
  const config = await getConfig(guildId);
  const channels = await getChannels(guildId);

  return (
    <CommandsForm
      guildId={guildId}
      config={{
        blockedCommandChannels: config.blockedCommandChannels || '[]',
        blockedCommandMessage: config.blockedCommandMessage || "Voce nao pode executar comandos neste canal!",
        blockedCommandNotify: config.blockedCommandNotify ?? true,
      }}
      channels={channels.map((c: any) => ({ id: c.id, name: c.name }))}
      saveAction={saveCommandsAction.bind(null, guildId)}
    />
  );
}