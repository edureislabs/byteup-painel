import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { canAccessPanel } from '@/lib/permissions';

// ===== GET — lista jogos com moedas =====
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { guildId } = await params;

    const hasAccess = await canAccessPanel(guildId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const games = await prisma.gameConfig.findMany({
      where: { guildId },
      include: {
        currencies: {
          include: { currency: true },
        },
      },
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

// ===== POST — cria/atualiza jogo =====
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
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
      currencyMode,
      minBet,
      maxBet,
      reward,
      dailyLimit,
      currencies = [], // [{ currencyId, minBet, maxBet, reward }]
    } = body;

    if (!gameName || typeof gameName !== 'string') {
      return NextResponse.json(
        { error: 'gameName é obrigatório' },
        { status: 400 }
      );
    }

    // Validação: se não for modo single, precisa ter moedas
    if (currencyMode && currencyMode !== 'single' && currencies.length === 0) {
      return NextResponse.json(
        { error: 'Jogos com múltiplas moedas precisam ter pelo menos 1 moeda' },
        { status: 400 }
      );
    }

    // Validação: minBet <= maxBet em cada moeda
    for (const c of currencies) {
      const cMin = c.minBet ?? minBet ?? 10;
      const cMax = c.maxBet ?? maxBet ?? 1000;

      if (cMin > cMax) {
        return NextResponse.json(
          { error: `Em uma das moedas, a aposta mínima é maior que a máxima` },
          { status: 400 }
        );
      }

      // Verifica se a moeda pertence à guild
      const currency = await prisma.currency.findFirst({
        where: { id: c.currencyId, guildId },
      });

      if (!currency) {
        return NextResponse.json(
          { error: 'Uma das moedas não foi encontrada' },
          { status: 400 }
        );
      }
    }

    // Garante guild
    let guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      guild = await prisma.guild.create({ data: { id: guildId } });
    }

    const existing = await prisma.gameConfig.findUnique({
      where: { guildId_gameName: { guildId, gameName } },
      include: { currencies: true },
    });

    let game: any;

    if (existing) {

      game = await prisma.gameConfig.update({
        where: { id: existing.id },
        data: {
          enabled: enabled ?? existing.enabled,
          currencyMode: currencyMode ?? existing.currencyMode,
          minBet: minBet ?? existing.minBet,
          maxBet: maxBet ?? existing.maxBet,
          reward: reward ?? existing.reward,
          dailyLimit: dailyLimit ?? existing.dailyLimit,
        },
      });

      // Sincroniza as moedas: deleta todas e recria
      await prisma.gameCurrency.deleteMany({
        where: { gameConfigId: game.id },
      });

      if (currencies.length > 0) {
        await prisma.gameCurrency.createMany({
          data: currencies.map((c: any) => ({
            gameConfigId: game.id,
            currencyId: c.currencyId,
            minBet: c.minBet ?? null,
            maxBet: c.maxBet ?? null,
            reward: c.reward ?? null,
          })),
        });
      }
    } else {
      // Cria novo
      game = await prisma.gameConfig.create({
        data: {
          guildId,
          gameName,
          enabled: enabled ?? true,
          currencyMode: currencyMode ?? 'single',
          minBet: minBet ?? 10,
          maxBet: maxBet ?? 1000,
          reward: reward ?? 100,
          dailyLimit: dailyLimit ?? 0,
        },
      });

      if (currencies.length > 0) {
        await prisma.gameCurrency.createMany({
          data: currencies.map((c: any) => ({
            gameConfigId: game.id,
            currencyId: c.currencyId,
            minBet: c.minBet ?? null,
            maxBet: c.maxBet ?? null,
            reward: c.reward ?? null,
          })),
        });
      }
    }

    // Retorna com include
    const result = await prisma.gameConfig.findUnique({
      where: { id: game.id },
      include: {
        currencies: {
          include: { currency: true },
        },
      },
    });

    return NextResponse.json(result);
  } catch (error: any) {
    console.error('[games POST] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar jogo' },
      { status: 500 }
    );
  }
}