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

  const games = await prisma.gameConfig.findMany({
    where: { guildId },
    include: { currency: true },
  });

  return NextResponse.json(games);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;

  const accessError = await guardApi(guildId);
  if (accessError) return accessError;

  const limitError = rateLimit(req);
  if (limitError) return limitError;

  const body = await req.json();
  const { gameName, enabled, currencyId, minBet, maxBet, reward } = body;

  if (!gameName) {
    return NextResponse.json({ error: 'gameName é obrigatório' }, { status: 400 });
  }

  try {
    let game = await prisma.gameConfig.findUnique({
      where: { guildId_gameName: { guildId, gameName } },
    });

    if (game) {
      game = await prisma.gameConfig.update({
        where: { id: game.id },
        data: {
          enabled: enabled ?? game.enabled,
          currencyId: currencyId !== undefined ? currencyId : game.currencyId,
          minBet: minBet ?? game.minBet,
          maxBet: maxBet ?? game.maxBet,
          reward: reward ?? game.reward,
        },
      });
    } else {
      game = await prisma.gameConfig.create({
        data: {
          guildId,
          gameName,
          enabled: enabled ?? true,
          currencyId: currencyId || null,
          minBet: minBet || 10,
          maxBet: maxBet || 1000,
          reward: reward || 100,
        },
      });
    }

    return NextResponse.json(game);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao configurar jogo' }, { status: 500 });
  }
}