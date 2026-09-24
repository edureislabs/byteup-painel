import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { redirect } from 'next/navigation';
import ReportsClient from './ReportsClient';

type Props = { params: Promise<{ guildId: string }> };

async function getConfig(guildId: string) {
  let config = await prisma.reportConfig.findUnique({ where: { guildId } });
  if (!config) {
    config = await prisma.reportConfig.create({ data: { guildId } });
  }
  return config;
}

async function saveReportConfigAction(guildId: string, formData: FormData) {
  'use server';
  const enabled = formData.get('enabled') === 'true';
  const channelId = (formData.get('channelId') as string) || null;
  const mentionStaff = formData.get('mentionStaff') === 'true';
  const staffRoleId = (formData.get('staffRoleId') as string) || null;

  await prisma.reportConfig.upsert({
    where: { guildId },
    update: { enabled, channelId, mentionStaff, staffRoleId },
    create: { guildId, enabled, channelId, mentionStaff, staffRoleId },
  });

  revalidatePath(`/dashboard/${guildId}/reports`);
}

async function resolveReportAction(
  guildId: string,
  reportId: string,
  status: string,
  userId: string
) {
  'use server';
  await prisma.report.update({
    where: { id: reportId },
    data: {
      status,
      resolvedBy: userId,
      resolvedAt: new Date(),
    },
  });
  revalidatePath(`/dashboard/${guildId}/reports`);
}

export default async function ReportsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect('/login');

  const { guildId } = await params;
  const config = await getConfig(guildId);

  return (
    <ReportsClient
      guildId={guildId}
      config={{
        enabled: config.enabled,
        channelId: config.channelId || '',
        mentionStaff: config.mentionStaff,
        staffRoleId: config.staffRoleId || '',
      }}
      currentUserId={(session.user as any).id || ''}
      saveAction={saveReportConfigAction.bind(null, guildId)}
      resolveAction={resolveReportAction.bind(null, guildId)}
    />
  );
}