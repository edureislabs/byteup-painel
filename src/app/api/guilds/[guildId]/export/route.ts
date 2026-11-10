import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/apiGuard';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const [config, currencies, games, levelConfig, levelRewards, panelAccess] =
    await Promise.all([
      prisma.guildConfig.findUnique({ where: { guildId } }),
      prisma.currency.findMany({ where: { guildId } }),
      prisma.gameConfig.findMany({ where: { guildId } }),
      prisma.levelConfig.findUnique({ where: { guildId } }),
      prisma.levelReward.findMany({ where: { guildId } }),
      prisma.panelAccess.findMany({ where: { guildId } }),
    ]);

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