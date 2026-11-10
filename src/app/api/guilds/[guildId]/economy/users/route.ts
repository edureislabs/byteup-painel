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

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: 'Não autorizado' },
        {
          status: 401,
          headers: {
            'Cache-Control': 'no-store, max-age=0, must-revalidate',
          },
        }
      );
    }

    const { guildId } = await params;

    // Valida acesso à guild
    const hasAccess = await canAccessPanel(guildId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: 'Acesso negado' },
        {
          status: 403,
          headers: {
            'Cache-Control': 'no-store, max-age=0, must-revalidate',
          },
        }
      );
    }

    // Parâmetros de query
    const searchParams = req.nextUrl.searchParams;
    const currencyId = searchParams.get('currencyId') || null;
    const search = searchParams.get('search') || '';
    const sortByRaw = searchParams.get('sortBy') || 'total';
    const sortBy: 'balance' | 'bank' | 'total' = ['balance', 'bank', 'total'].includes(sortByRaw)
      ? (sortByRaw as 'balance' | 'bank' | 'total')
      : 'total';
    const sortOrder: 'asc' | 'desc' = searchParams.get('sortOrder') === 'asc' ? 'asc' : 'desc';
    const limit = Math.min(
      Math.max(parseInt(searchParams.get('limit') || '100', 10) || 100, 1),
      500
    );
    const offset = Math.max(
      parseInt(searchParams.get('offset') || '0', 10) || 0,
      0
    );

    // Monta o where
    const where: any = { guildId };

    if (currencyId) {
      where.currencyId = currencyId;
    }

    if (search.trim()) {
      where.userId = { contains: search.trim() };
    }

    // Ordenação feita ANTES de paginar. Antes o código pegava uma página
    // qualquer e só ordenava ela, então o "top" mostrava usuários aleatórios.
    let sorted;

    if (sortBy === 'total') {
      // O Prisma não ordena por soma de colunas: busca só os números,
      // ordena tudo e depois carrega a página.
      const all = await prisma.economyUser.findMany({
        where,
        select: { id: true, balance: true, bank: true },
      });
      all.sort((a, b) => {
        const diff = a.balance + a.bank - (b.balance + b.bank);
        return sortOrder === 'desc' ? -diff : diff;
      });
      const pageIds = all.slice(offset, offset + limit).map((u) => u.id);
      const pageUsers = await prisma.economyUser.findMany({
        where: { id: { in: pageIds } },
        include: { currency: true },
      });
      const byId = new Map(pageUsers.map((u) => [u.id, u]));
      sorted = pageIds.map((id) => byId.get(id)).filter(Boolean);
    } else {
      sorted = await prisma.economyUser.findMany({
        where,
        include: { currency: true },
        orderBy: [{ [sortBy]: sortOrder }, { id: 'asc' }],
        take: limit,
        skip: offset,
      });
    }

    // Total pra saber se tem mais
    const total = await prisma.economyUser.count({ where });

    return NextResponse.json(
      {
        users: sorted,
        total,
        limit,
        offset,
      },
      {
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    );
  } catch (error: any) {
    console.error('[economy/users] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar usuários' },
      {
        status: 500,
        headers: {
          'Cache-Control': 'no-store, max-age=0, must-revalidate',
        },
      }
    );
  }
}