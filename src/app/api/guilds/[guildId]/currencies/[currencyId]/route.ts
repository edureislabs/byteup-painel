import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { canAccessPanel } from '@/lib/permissions';

// ===== PATCH — atualiza moeda =====
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string; currencyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { guildId, currencyId } = await params;

    const hasAccess = await canAccessPanel(guildId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const body = await req.json();
    const { name, symbol, taxRate, exchangeRate, isPrimary } = body;

    // Confirma que a moeda pertence à guild
    const currency = await prisma.currency.findFirst({
      where: { id: currencyId, guildId },
    });

    if (!currency) {
      return NextResponse.json(
        { error: 'Moeda não encontrada' },
        { status: 404 }
      );
    }

    // Se está marcando como primária, desmarca as outras
    if (isPrimary === true) {
      await prisma.currency.updateMany({
        where: { guildId, isPrimary: true, id: { not: currencyId } },
        data: { isPrimary: false },
      });
    }

    // Se está DESmarcando a primária, verifica se tem outra primária
    if (isPrimary === false && currency.isPrimary) {
      const otherPrimary = await prisma.currency.findFirst({
        where: { guildId, isPrimary: true, id: { not: currencyId } },
      });

      if (!otherPrimary) {
        return NextResponse.json(
          { error: 'É obrigatório ter uma moeda primária. Marque outra antes de desmarcar.' },
          { status: 400 }
        );
      }
    }

    const updated = await prisma.currency.update({
      where: { id: currencyId },
      data: {
        name: name ?? currency.name,
        symbol: symbol ?? currency.symbol,
        taxRate: taxRate ?? currency.taxRate,
        exchangeRate: exchangeRate ?? currency.exchangeRate,
        isPrimary: isPrimary !== undefined ? isPrimary : currency.isPrimary,
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error('[currencies PATCH] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao atualizar moeda' },
      { status: 500 }
    );
  }
}

// ===== DELETE — remove moeda =====
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string; currencyId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { guildId, currencyId } = await params;

    const hasAccess = await canAccessPanel(guildId);
    if (!hasAccess) {
      return NextResponse.json({ error: 'Acesso negado' }, { status: 403 });
    }

    const currency = await prisma.currency.findFirst({
      where: { id: currencyId, guildId },
    });

    if (!currency) {
      return NextResponse.json(
        { error: 'Moeda não encontrada' },
        { status: 404 }
      );
    }

    // Não deixa deletar a primária sem ter outra
    if (currency.isPrimary) {
      const total = await prisma.currency.count({ where: { guildId } });

      if (total > 1) {
        return NextResponse.json(
          {
            error:
              'Não é possível deletar a moeda primária. Marque outra como primária antes.',
          },
          { status: 400 }
        );
      }
    }

    await prisma.currency.delete({ where: { id: currencyId } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('[currencies DELETE] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao remover moeda' },
      { status: 500 }
    );
  }
}