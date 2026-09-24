import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;
  const rewards = await prisma.levelReward.findMany({
    where: { guildId },
    orderBy: { level: 'asc' },
  });
  return NextResponse.json(rewards);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;
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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;
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