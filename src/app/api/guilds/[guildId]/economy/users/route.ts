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

    // Valida acesso à guild
    const hasAccess = await canAccessPanel(guildId);

    if (!hasAccess) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    // Parâmetros de query
    const searchParams = req.nextUrl.searchParams;
    const currencyId = searchParams.get('currencyId') || null;
    const search = searchParams.get('search') || '';
    const sortBy = (searchParams.get('sortBy') || 'total') as
      | 'balance'
      | 'bank'
      | 'total';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as
      | 'asc'
      | 'desc';
    const limit = Math.min(
      parseInt(searchParams.get('limit') || '100', 10),
      500
    );
    const offset = Math.max(
      parseInt(searchParams.get('offset') || '0', 10),
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

    // Busca os usuários
    const users = await prisma.economyUser.findMany({
      where,
      include: { currency: true },
      take: limit,
      skip: offset,
    });

    // Ordena em memória (por total quando for "total")
    const sorted = [...users].sort((a, b) => {
      const getVal = (u: any) => {
        if (sortBy === 'total') return u.balance + u.bank;
        return u[sortBy];
      };

      const diff = getVal(a) - getVal(b);
      return sortOrder === 'desc' ? -diff : diff;
    });

    // Total pra saber se tem mais
    const total = await prisma.economyUser.count({ where });

    return NextResponse.json({
      users: sorted,
      total,
      limit,
      offset,
    });
  } catch (error: any) {
    console.error('[economy/users] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar usuários' },
      { status: 500 }
    );
  }
}