import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;

  const games = await prisma.gameConfigs.findMany({
    where: { guildId },
    include: { currency: true },
  });

  return NextResponse.json(games);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;
  const body = await req.json();
  const { gameName, enabled, currencyId, minBet, maxBet, reward } = body;

  if (!gameName || !currencyId) return NextResponse.json({ error: 'gameName e currencyId são obrigatórios' }, { status: 400 });

  try {
    const game = await prisma.gameConfig.upsert({
      where: { guildId_gameName: { guildId, gameName } },
      update: { enabled, currencyId, minBet, maxBet, reward },
      create: { guildId, gameName, enabled, currencyId, minBet, maxBet, reward },
    });
    return NextResponse.json(game);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao configurar jogo' }, { status: 500 });
  }
}