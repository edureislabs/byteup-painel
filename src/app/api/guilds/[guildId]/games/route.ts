import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { canAccessPanel } from '@/lib/permissions';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { guildId } = await params;

    const hasAccess = await canAccessPanel(guildId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const games = await prisma.gameConfig.findMany({
      where: { guildId },
      include: { currency: true },
    });

    return NextResponse.json(games);
  } catch (error: any) {
    console.error('[games GET] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar jogos' },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401 }
      );
    }

    const { guildId } = await params;

    const hasAccess = await canAccessPanel(guildId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const {
      gameName,
      enabled,
      currencyId,
      minBet,
      maxBet,
      reward,
      dailyLimit,
    } = body;

    if (!gameName || typeof gameName !== 'string') {
      return NextResponse.json(
        { error: 'gameName é obrigatório' },
        { status: 400 }
      );
    }

    // Valida minBet <= maxBet
    if (
      typeof minBet === 'number' &&
      typeof maxBet === 'number' &&
      minBet > maxBet
    ) {
      return NextResponse.json(
        { error: 'A aposta mínima não pode ser maior que a máxima' },
        { status: 400 }
      );
    }

    // Verifica se a currency existe (se passou uma)
    if (currencyId) {
      const currency = await prisma.currency.findFirst({
        where: { id: currencyId, guildId },
      });

      if (!currency) {
        return NextResponse.json(
          { error: 'Moeda não encontrada neste servidor' },
          { status: 400 }
        );
      }
    }

    // Verifica se a guild existe
    let guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      guild = await prisma.guild.create({ data: { id: guildId } });
    }

    const existing = await prisma.gameConfig.findUnique({
      where: { guildId_gameName: { guildId, gameName } },
    });

    let game;

    if (existing) {
      game = await prisma.gameConfig.update({
        where: { id: existing.id },
        data: {
          enabled: enabled ?? existing.enabled,
          currencyId:
            currencyId !== undefined ? currencyId : existing.currencyId,
          minBet: minBet ?? existing.minBet,
          maxBet: maxBet ?? existing.maxBet,
          reward: reward ?? existing.reward,
          dailyLimit: dailyLimit ?? existing.dailyLimit,
        },
      });
    } else {
      game = await prisma.gameConfig.create({
        data: {
          guildId,
          gameName,
          enabled: enabled ?? true,
          currencyId: currencyId || null,
          minBet: minBet ?? 10,
          maxBet: maxBet ?? 1000,
          reward: reward ?? 100,
          dailyLimit: dailyLimit ?? 0,
        },
      });
    }

    return NextResponse.json(game);
  } catch (error: any) {
    console.error('[games POST] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao configurar jogo' },
      { status: 500 }
    );
  }
} 