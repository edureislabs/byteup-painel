import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;

  const config = await prisma.guildConfig.findUnique({ where: { guildId } });
  const currencies = await prisma.currency.findMany({ where: { guildId } });
  const games = await prisma.gameConfig.findMany({ where: { guildId } });
  const levelConfig = await prisma.levelConfig.findUnique({ where: { guildId } });
  const levelRewards = await prisma.levelReward.findMany({ where: { guildId } });
  const panelAccess = await prisma.panelAccess.findMany({ where: { guildId } });

  return NextResponse.json({
    exportedAt: new Date().toISOString(),
    guildId,
    config,
    currencies,
    games,
    levelConfig,
    levelRewards,
    panelAccess,
  });
}