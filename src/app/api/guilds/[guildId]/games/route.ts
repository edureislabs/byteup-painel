import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { canAccessPanel } from '@/lib/permissions';

const NO_CACHE = {
  headers: {
    'Cache-Control': 'no-store, max-age=0, must-revalidate',
  },
};

// ===== GET — lista jogos com moedas =====
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401, ...NO_CACHE }
      );
    }

    const { guildId } = await params;

    const hasAccess = await canAccessPanel(guildId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403, ...NO_CACHE }
      );
    }

    const games = await prisma.gameConfig.findMany({
      where: { guildId },
      include: {
        currencies: {
          include: { currency: true },
        },
      },
    });

    return NextResponse.json(games, NO_CACHE);
  } catch (error: any) {
    console.error('[games GET] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar jogos' },
      { status: 500, ...NO_CACHE }
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
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        { status: 401, ...NO_CACHE }
      );
    }

    const { guildId } = await params;

    const hasAccess = await canAccessPanel(guildId);
    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        { status: 403, ...NO_CACHE }
      );
    }

    const body = await req.json().catch(() => ({}));
    const {
      gameName,
      enabled,
      currencyMode,
      minBet,
      maxBet,
      reward,
      dailyLimit,
      currencies = [],
    } = body;

    if (!gameName || typeof gameName !== 'string') {
      return NextResponse.json(
        { error: 'gameName é obrigatório' },
        { status: 400, ...NO_CACHE }
      );
    }

    // ===== Validação dos valores =====
    // Aposta negativa fazia o "débito" virar crédito no bot (dinheiro infinito).
    const MAX = 2_000_000_000;
    const isInt = (v: any, min: number) =>
      v === undefined || v === null || (Number.isInteger(v) && v >= min && v <= MAX);

    if (!['caracoroa', 'roll'].includes(gameName)) {
      return NextResponse.json({ error: 'Jogo desconhecido' }, { status: 400, ...NO_CACHE });
    }
    if (enabled !== undefined && typeof enabled !== 'boolean') {
      return NextResponse.json({ error: 'enabled inválido' }, { status: 400, ...NO_CACHE });
    }
    if (currencyMode !== undefined && !['single', 'multi_fixed', 'multi_user'].includes(currencyMode)) {
      return NextResponse.json({ error: 'Modo de moeda inválido' }, { status: 400, ...NO_CACHE });
    }
    if (!isInt(minBet, 1) || !isInt(maxBet, 1)) {
      return NextResponse.json(
        { error: 'As apostas mínima e máxima devem ser números inteiros a partir de 1' },
        { status: 400, ...NO_CACHE }
      );
    }
    if (!isInt(reward, 0) || !isInt(dailyLimit, 0)) {
      return NextResponse.json(
        { error: 'Prêmio e limite diário devem ser números inteiros a partir de 0' },
        { status: 400, ...NO_CACHE }
      );
    }
    if (typeof minBet === 'number' && typeof maxBet === 'number' && minBet > maxBet) {
      return NextResponse.json(
        { error: 'A aposta mínima não pode ser maior que a máxima' },
        { status: 400, ...NO_CACHE }
      );
    }
    if (!Array.isArray(currencies) || currencies.length > 25) {
      return NextResponse.json({ error: 'Lista de moedas inválida' }, { status: 400, ...NO_CACHE });
    }
    for (const c of currencies) {
      if (!c || typeof c.currencyId !== 'string' || !isInt(c.minBet, 1) || !isInt(c.maxBet, 1) || !isInt(c.reward, 0)) {
        return NextResponse.json(
          { error: 'Valores inválidos em uma das moedas do jogo' },
          { status: 400, ...NO_CACHE }
        );
      }
    }

    if (currencyMode && currencyMode !== 'single' && currencies.length === 0) {
      return NextResponse.json(
        { error: 'Jogos com múltiplas moedas precisam ter pelo menos 1 moeda' },
        { status: 400, ...NO_CACHE }
      );
    }

    for (const c of currencies) {
      const cMin = c.minBet ?? minBet ?? 10;
      const cMax = c.maxBet ?? maxBet ?? 1000;

      if (cMin > cMax) {
        return NextResponse.json(
          { error: 'Em uma das moedas, a aposta mínima é maior que a máxima' },
          { status: 400, ...NO_CACHE }
        );
      }

      const currency = await prisma.currency.findFirst({
        where: { id: c.currencyId, guildId },
      });

      if (!currency) {
        return NextResponse.json(
          { error: 'Uma das moedas não foi encontrada' },
          { status: 400, ...NO_CACHE }
        );
      }
    }

    let guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      guild = await prisma.guild.create({ data: { id: guildId } });
    }

    const existing = await prisma.gameConfig.findUnique({
      where: { guildId_gameName: { guildId, gameName } },
      include: { currencies: true },
    });

    let game: any;

    if (existing && (minBet ?? existing.minBet) > (maxBet ?? existing.maxBet)) {
      return NextResponse.json(
        { error: 'A aposta mínima não pode ser maior que a máxima' },
        { status: 400, ...NO_CACHE }
      );
    }

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

    const result = await prisma.gameConfig.findUnique({
      where: { id: game.id },
      include: {
        currencies: {
          include: { currency: true },
        },
      },
    });

    return NextResponse.json(result, NO_CACHE);
  } catch (error: any) {
    console.error('[games POST] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao salvar jogo' },
      { status: 500, ...NO_CACHE }
    );
  }
}