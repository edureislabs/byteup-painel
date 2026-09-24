import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;

  let config = await prisma.levelConfig.findUnique({ where: { guildId } });
  if (!config) {
    config = await prisma.levelConfig.create({
      data: {
        guildId,
        enabled: false,
        message: '{user} subiu para o nivel {level}!',
        xpMode: 'formula',
        baseXP: 100,
        exponent: 2.0,
        minXpPerMessage: 15,
        maxXpPerMessage: 25,
        cooldownSeconds: 60,
        rewardAmount: 0,
      },
    });
  }

  return NextResponse.json(config);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;
  const body = await req.json();

  try {
    const existing = await prisma.levelConfig.findUnique({ where: { guildId } });
    if (existing) {
      const config = await prisma.levelConfig.update({ where: { guildId }, data: body });
      return NextResponse.json(config);
    } else {
      const config = await prisma.levelConfig.create({ data: { guildId, ...body } });
      return NextResponse.json(config);
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao salvar configuração' }, { status: 500 });
  }
}