import { prisma } from '@/lib/prisma';
import { assertGuildAccess } from "@/lib/apiGuard";
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import SuggestionsClient from './SuggestionsClient';

type Props = { params: Promise<{ guildId: string }> };

async function getConfig(guildId: string) {
  let config = await prisma.suggestionConfig.findUnique({ where: { guildId } });
  if (!config) {
    config = await prisma.suggestionConfig.create({ data: { guildId } });
  }
  return config;
}

async function saveSuggestionConfigAction(guildId: string, formData: FormData) {
  'use server';
  await assertGuildAccess(guildId);
  const enabled = formData.get('enabled') === 'true';
  const channelId = (formData.get('channelId') as string) || null;
  const anonymous = formData.get('anonymous') === 'true';
  const autoApprove = formData.get('autoApprove') === 'true';
  const duration = (formData.get('duration') as string) || '7d';

  await prisma.suggestionConfig.upsert({
    where: { guildId },
    update: { enabled, channelId, anonymous, autoApprove, duration },
    create: { enabled, channelId, anonymous, autoApprove, duration, guildId },
  });

  revalidatePath(`/dashboard/${guildId}/suggestions`);
}

async function updateSuggestionAction(
  guildId: string,
  suggestionId: string,
  status: string,
  _clientUserId: string,
  staffComment: string | null
) {
  'use server';
  // O ID de quem revisou vem da sessão, nunca do navegador.
  const userId = await assertGuildAccess(guildId);

  const ALLOWED = ['pending', 'approved', 'denied', 'implemented'];
  if (!ALLOWED.includes(status)) throw new Error('Status inválido');

  // updateMany com guildId garante que a sugestão é deste servidor
  await prisma.suggestion.updateMany({
    where: { id: String(suggestionId), guildId },
    data: {
      status,
      staffComment: staffComment ? String(staffComment).slice(0, 1000) : null,
      reviewedBy: userId,
      reviewedAt: new Date(),
    },
  });
  revalidatePath(`/dashboard/${guildId}/suggestions`);
}

export default async function SuggestionsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const { guildId } = await params;
  const config = await getConfig(guildId);

  return (
    <SuggestionsClient
  guildId={guildId}
  config={{
    enabled: config.enabled,
    channelId: config.channelId || '',
    anonymous: config.anonymous,
    autoApprove: config.autoApprove,
    duration: config.duration || '7d',
  }}
  currentUserId={(session.user as any).id || ''}
  saveAction={saveSuggestionConfigAction.bind(null, guildId)}
  updateAction={updateSuggestionAction.bind(null, guildId)}
/>
  );
}