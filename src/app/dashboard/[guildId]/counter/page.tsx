import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import CounterForm from './CounterForm';

type Props = { params: Promise<{ guildId: string }> };

async function getConfig(guildId: string) {
  let config = await prisma.guildConfig.findUnique({ where: { guildId } });
  if (!config) {
    config = await prisma.guildConfig.create({ data: { guildId } });
  }
  return config;
}

async function getChannels(guildId: string) {
  const res = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/channels`,
    {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      next: { revalidate: 60 },
    }
  );
  if (!res.ok) return [];
  const channels = await res.json();
  // Só canais de voz (type 2) — porque o contador precisa de canal de voz
  return channels.filter((c: any) => c.type === 2);
}

async function saveCounterAction(guildId: string, formData: FormData) {
  'use server';
  const counterEnabled = formData.get('counterEnabled') === 'true';
  const counterChannelId = (formData.get('counterChannelId') as string) || null;
  const counterTemplate =
    (formData.get('counterTemplate') as string) ||
    'Membros: {contmember}';

  try {
    let guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      guild = await prisma.guild.create({ data: { id: guildId } });
    }

    const existing = await prisma.guildConfig.findUnique({
      where: { guildId },
    });

    if (existing) {
      await prisma.guildConfig.update({
        where: { guildId },
        data: { counterEnabled, counterChannelId, counterTemplate },
      });
    } else {
      await prisma.guildConfig.create({
        data: {
          guildId,
          counterEnabled,
          counterChannelId,
          counterTemplate,
        },
      });
    }
  } catch (error) {
    console.error(error);
    throw new Error('Falha ao salvar configurações.');
  }

  revalidatePath(`/dashboard/${guildId}/counter`);
}

export default async function CounterPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const { guildId } = await params;
  const config = await getConfig(guildId);
  const channels = await getChannels(guildId);

  return (
    <CounterForm
      guildId={guildId}
      config={{
        counterEnabled: config.counterEnabled ?? false,
        counterChannelId: config.counterChannelId ?? '',
        counterTemplate:
          config.counterTemplate ?? 'Membros: {contmember}',
      }}
      channels={channels.map((c: any) => ({ id: c.id, name: c.name }))}
      saveAction={saveCounterAction.bind(null, guildId)}
    />
  );
}