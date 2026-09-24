import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import GeneralForm from "./GeneralForm";

type Props = {
  params: Promise<{ guildId: string }>;
};

type DiscordChannel = {
  id: string;
  name: string;
  type: number;
};

async function getConfig(guildId: string) {
  let config = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (!config) {
    config = await prisma.guildConfig.create({
      data: {
        guildId,
        prefix: "/",
        logEnabled: false,
        logChannelId: null,
        language: "pt-BR",
        timezone: "America/Sao_Paulo",
      },
    });
  }
  return config;
}

async function getChannels(guildId: string) {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    next: { revalidate: 60 },
  });
  if (!res.ok) return [];
  const channels: DiscordChannel[] = await res.json();
  return channels.filter((c) => c.type === 0 || c.type === 5);
}

async function getRoles(guildId: string) {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  });
  if (!res.ok) return [];
  const roles = await res.json();
  return roles.map((r: any) => ({ id: r.id, name: r.name }));
}

async function getStats(guildId: string) {
  const commandsToday = await prisma.activityLog.count({
    where: { guildId, action: { startsWith: 'command:' }, createdAt: { gte: new Date(new Date().setHours(0,0,0,0)) } },
  });
  const xpData = await prisma.levelUser.aggregate({ where: { guildId }, _sum: { xp: true } });
  return {
    memberCount: 0,
    commandsToday,
    xpDistributed: xpData._sum.xp || 0,
  };
}

async function saveConfigAction(guildId: string, formData: FormData) {
  "use server";
  const prefix = formData.get("prefix") as string;
  const logEnabled = formData.get("logEnabled") === "true";
  const logChannelId = (formData.get("logChannelId") as string) || null;
  const language = (formData.get("language") as string) || "pt-BR";
  const timezone = (formData.get("timezone") as string) || "America/Sao_Paulo";
  const autoroleId = (formData.get("autoroleId") as string) || null;
  const inviteLink = (formData.get("inviteLink") as string) || null;

  try {
    let guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      guild = await prisma.guild.create({ data: { id: guildId } });
    }
    const existing = await prisma.guildConfig.findUnique({ where: { guildId } });
    if (existing) {
      await prisma.guildConfig.update({
        where: { guildId },
        data: { prefix, logEnabled, logChannelId, language, timezone, autoroleId, inviteLink },
      });
    } else {
      await prisma.guildConfig.create({
        data: { guildId, prefix, logEnabled, logChannelId, language, timezone, autoroleId, inviteLink },
      });
    }
  } catch (error) {
    console.error(error);
    throw new Error("Falha ao salvar configuração.");
  }
  revalidatePath(`/dashboard/${guildId}`);
}

export default async function GeneralPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { guildId } = await params;
  const config = await getConfig(guildId);
  const channels = await getChannels(guildId);
  const roles = await getRoles(guildId);
  const stats = await getStats(guildId);

  return (
    <GeneralForm
      guildId={guildId}
      config={{
        prefix: config.prefix,
        logEnabled: config.logEnabled,
        logChannelId: config.logChannelId,
        language: config.language || "pt-BR",
        timezone: config.timezone || "America/Sao_Paulo",
        autoroleId: config.autoroleId || null,
        inviteLink: config.inviteLink || null,
      }}
      channels={channels.map((c) => ({ id: c.id, name: c.name }))}
      roles={roles}
      stats={stats}
      saveAction={saveConfigAction.bind(null, guildId)}
    />
  );
}