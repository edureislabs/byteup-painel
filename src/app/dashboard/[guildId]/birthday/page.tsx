import { prisma } from "@/lib/prisma";
import { revalidatePath } from "next/cache";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import BirthdayForm from "./BirthdayForm";

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

async function saveBirthdayAction(guildId: string, formData: FormData) {
  "use server";
  const birthdayEnabled = formData.get("birthdayEnabled") === "true";
  const birthdayChannelId = (formData.get("birthdayChannelId") as string) || null;
  const birthdayMessage = (formData.get("birthdayMessage") as string) || "Feliz aniversario, {user}!";
  try {
    await prisma.guild.upsert({ where: { id: guildId }, update: {}, create: { id: guildId } });
    const existing = await prisma.guildConfig.findUnique({ where: { guildId } });
    if (existing) {
      await prisma.guildConfig.update({ where: { guildId }, data: { birthdayEnabled, birthdayChannelId, birthdayMessage } });
    } else {
      await prisma.guildConfig.create({ data: { guildId, birthdayEnabled, birthdayChannelId, birthdayMessage } });
    }
  } catch (error) {
    console.error(error);
    throw new Error("Falha ao salvar aniversários.");
  }
  revalidatePath(`/dashboard/${guildId}/birthday`);
}

export default async function BirthdayPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");
  const { guildId } = await params;
  const config = await getConfig(guildId);
  const channels = await getChannels(guildId);
  return (
    <BirthdayForm
      guildId={guildId}
      config={{
        birthdayEnabled: config.birthdayEnabled,
        birthdayChannelId: config.birthdayChannelId,
        birthdayMessage: config.birthdayMessage,
      }}
      channels={channels.map((c: any) => ({ id: c.id, name: c.name }))}
      saveAction={saveBirthdayAction.bind(null, guildId)}
    />
  );
}