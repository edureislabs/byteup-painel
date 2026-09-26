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

    // Valida acesso
    const hasAccess = await canAccessPanel(guildId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Parâmetros
    const searchParams = req.nextUrl.searchParams;
    const gameName = searchParams.get('gameName') || null;
    const userId = searchParams.get('userId') || null;
    const result = searchParams.get('result') || null;
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '100', 10),
      500
    );
    const offset = Math.max(
      parseInt(searchParams.get('offset') || '0', 10),
      0
    );

    // Monta where
    const where: any = { guildId };

    if (gameName) where.gameName = gameName;
    if (userId) where.userId = userId;
    if (result) where.result = result;

    // Busca transações com a moeda
    const transactions = await prisma.gameTransaction.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      // A Currency NÃO tem relação direta, então fazemos manual
    });

    // Busca as moedas referenciadas
    const currencyIds = [
      ...new Set(
        transactions
          .map((t) => t.currencyId)
          .filter((id): id is string => Boolean(id))
      ),
    ];

    const currencies = await prisma.currency.findMany({
      where: { id: { in: currencyIds } },
    });

    const currencyMap = new Map(currencies.map((c) => [c.id, c]));

    // Anexa a moeda em cada transação
    const enriched = transactions.map((t) => ({
      ...t,
      currency: t.currencyId ? currencyMap.get(t.currencyId) || null : null,
    }));

    // Total
    const total = await prisma.gameTransaction.count({ where });

    return NextResponse.json({
      transactions: enriched,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[economy/transactions] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar transações' },
      { status: 500 }
    );
  }
}