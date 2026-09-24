import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import AutomodForm from "./AutomodForm";

type Props = { params: Promise<{ guildId: string }> };

async function getConfig(guildId: string) {
  let config = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (!config) {
    config = await prisma.guildConfig.create({ data: { guildId } });
  }
  return config;
}

async function saveAutomodAction(guildId: string, formData: FormData) {
  "use server";
  const automodEnabled = formData.get("automodEnabled") === "true";
  const automodBannedWords = (formData.get("automodBannedWords") as string) || '[]';
  const automodLinkBlocklist = (formData.get("automodLinkBlocklist") as string) || '[]';
  const automodLinkWhitelist = (formData.get("automodLinkWhitelist") as string) || '[]';
  const automodBypassRoles = (formData.get("automodBypassRoles") as string) || '[]';
  const automodBypassUsers = (formData.get("automodBypassUsers") as string) || '[]';
  const automodIgnoredChannels = (formData.get("automodIgnoredChannels") as string) || '[]';
  const automodMaxMentions = parseInt(formData.get("automodMaxMentions") as string) || 5;
  const automodMaxLines = parseInt(formData.get("automodMaxLines") as string) || 15;
  const automodMaxZalgo = formData.get("automodMaxZalgo") === "true";
  const automodInviteBlock = formData.get("automodInviteBlock") === "true";
  const automodAction = (formData.get("automodAction") as string) || "delete";
  const automodWarnThreshold = parseInt(formData.get("automodWarnThreshold") as string) || 3;
  const automodMuteDuration = parseInt(formData.get("automodMuteDuration") as string) || 300;
  const automodLogChannel = (formData.get("automodLogChannel") as string) || null;

  try {
    let guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      guild = await prisma.guild.create({ data: { id: guildId } });
    }
    const existing = await prisma.guildConfig.findUnique({ where: { guildId } });
    if (existing) {
      await prisma.guildConfig.update({
        where: { guildId },
        data: {
          automodEnabled,
          automodBannedWords,
          automodLinkBlocklist,
          automodLinkWhitelist,
          automodBypassRoles,
          automodBypassUsers,
          automodIgnoredChannels,
          automodMaxMentions,
          automodMaxLines,
          automodMaxZalgo,
          automodInviteBlock,
          automodAction,
          automodWarnThreshold,
          automodMuteDuration,
          automodLogChannel,
        },
      });
    } else {
      await prisma.guildConfig.create({
        data: {
          guildId,
          automodEnabled,
          automodBannedWords,
          automodLinkBlocklist,
          automodLinkWhitelist,
          automodBypassRoles,
          automodBypassUsers,
          automodIgnoredChannels,
          automodMaxMentions,
          automodMaxLines,
          automodMaxZalgo,
          automodInviteBlock,
          automodAction,
          automodWarnThreshold,
          automodMuteDuration,
          automodLogChannel,
        },
      });
    }
  } catch (error) {
    console.error(error);
    throw new Error("Falha ao salvar configuracoes do automod.");
  }
  revalidatePath(`/dashboard/${guildId}/automod`);
}

export default async function AutomodPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { guildId } = await params;
  const config = await getConfig(guildId);

  const channelsRes = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    next: { revalidate: 60 },
  });
  let channels: { id: string; name: string }[] = [];
  if (channelsRes.ok) {
    const allChannels = await channelsRes.json();
    channels = allChannels.filter((c: any) => c.type === 0 || c.type === 5).map((c: any) => ({ id: c.id, name: c.name }));
  }

  return (
    <AutomodForm
      guildId={guildId}
      config={{
        automodEnabled: config.automodEnabled ?? false,
        automodBannedWords: config.automodBannedWords || '[]',
        automodLinkBlocklist: config.automodLinkBlocklist || '[]',
        automodLinkWhitelist: config.automodLinkWhitelist || '[]',
        automodBypassRoles: config.automodBypassRoles || '[]',
        automodBypassUsers: config.automodBypassUsers || '[]',
        automodIgnoredChannels: config.automodIgnoredChannels || '[]',
        automodMaxMentions: config.automodMaxMentions || 5,
        automodMaxLines: config.automodMaxLines || 15,
        automodMaxZalgo: config.automodMaxZalgo ?? true,
        automodInviteBlock: config.automodInviteBlock ?? true,
        automodAction: config.automodAction || "delete",
        automodWarnThreshold: config.automodWarnThreshold || 3,
        automodMuteDuration: config.automodMuteDuration || 300,
        automodLogChannel: config.automodLogChannel || "",
      }}
      channels={channels}
      saveAction={saveAutomodAction.bind(null, guildId)}
    />
  );
}