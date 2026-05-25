import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardApi } from '@/lib/apiGuard';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;

  const accessError = await guardApi(guildId);
  if (accessError) return accessError;

  const limitError = rateLimit(req);
  if (limitError) return limitError;

  const rewards = await prisma.levelReward.findMany({
    where: { guildId },
    orderBy: { level: 'asc' },
  });
  return NextResponse.json(rewards);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;

  const accessError = await guardApi(guildId);
  if (accessError) return accessError;

  const limitError = rateLimit(req);
  if (limitError) return limitError;

  const body = await req.json();
  const { level, roleId, currencyId, rewardAmount, imageUrl, message } = body;

  if (!level) return NextResponse.json({ error: 'Nível é obrigatório' }, { status: 400 });

  try {
    const existing = await prisma.levelReward.findFirst({
      where: { guildId, level },
    });

    if (existing) {
      const updated = await prisma.levelReward.update({
        where: { id: existing.id },
        data: { roleId, currencyId, rewardAmount: rewardAmount || 0, imageUrl, message },
      });
      return NextResponse.json(updated);
    } else {
      const created = await prisma.levelReward.create({
        data: { guildId, level, roleId, currencyId, rewardAmount: rewardAmount || 0, imageUrl, message },
      });
      return NextResponse.json(created);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao salvar recompensa' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;

  const accessError = await guardApi(guildId);
  if (accessError) return accessError;

  const limitError = rateLimit(req);
  if (limitError) return limitError;

  const { searchParams } = new URL(req.url);
  const level = parseInt(searchParams.get('level') || '');

  if (!level) return NextResponse.json({ error: 'Nível é obrigatório' }, { status: 400 });

  try {
    await prisma.levelReward.deleteMany({ where: { guildId, level } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao remover recompensa' }, { status: 500 });
  }
}