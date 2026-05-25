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

async function getRoles(guildId: string) {
  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  });
  if (!res.ok) return [];
  const roles = await res.json();
  return roles.map((r: any) => ({ id: r.id, name: r.name }));
}

async function getCurrencies(guildId: string) {
  return await prisma.currency.findMany({ where: { guildId } });
}

async function saveBirthdayAction(guildId: string, formData: FormData) {
  "use server";
  const birthdayEnabled = formData.get("birthdayEnabled") === "true";
  const birthdayChannelId = (formData.get("birthdayChannelId") as string) || null;
  const birthdayMessage = (formData.get("birthdayMessage") as string) || "Feliz aniversario, {user}!";
  const birthdayRoleId = (formData.get("birthdayRoleId") as string) || null;
  const birthdayCurrencyId = (formData.get("birthdayCurrencyId") as string) || null;
  const birthdayRewardAmount = parseInt((formData.get("birthdayRewardAmount") as string) || "0");
  const birthdayImageUrl = (formData.get("birthdayImageUrl") as string) || null;

  try {
    let guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      guild = await prisma.guild.create({ data: { id: guildId } });
    }

    const existing = await prisma.guildConfig.findUnique({ where: { guildId } });
    if (existing) {
      await prisma.guildConfig.update({
        where: { guildId },
        data: { birthdayEnabled, birthdayChannelId, birthdayMessage, birthdayRoleId, birthdayCurrencyId, birthdayRewardAmount, birthdayImageUrl },
      });
    } else {
      await prisma.guildConfig.create({
        data: { guildId, birthdayEnabled, birthdayChannelId, birthdayMessage, birthdayRoleId, birthdayCurrencyId, birthdayRewardAmount, birthdayImageUrl },
      });
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
  const roles = await getRoles(guildId);
  const currencies = await getCurrencies(guildId);

  return (
    <BirthdayForm
      guildId={guildId}
      config={{
        birthdayEnabled: config.birthdayEnabled,
        birthdayChannelId: config.birthdayChannelId,
        birthdayMessage: config.birthdayMessage || "Feliz aniversario, {user}!",
        birthdayRoleId: config.birthdayRoleId,
        birthdayCurrencyId: config.birthdayCurrencyId,
        birthdayRewardAmount: config.birthdayRewardAmount || 0,
        birthdayImageUrl: config.birthdayImageUrl,
      }}
      channels={channels.map((c: any) => ({ id: c.id, name: c.name }))}
      roles={roles}
      currencies={currencies}
      saveAction={saveBirthdayAction.bind(null, guildId)}
    />
  );
}