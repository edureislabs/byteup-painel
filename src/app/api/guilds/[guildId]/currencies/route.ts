import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';
import { canAccessPanel } from '@/lib/permissions';

// ===== GET — lista moedas da guild =====
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

    const currencies = await prisma.currency.findMany({
      where: { guildId },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json(currencies);
  } catch (error: any) {
    console.error('[currencies GET] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar moedas' },
      { status: 500 }
    );
  }
}

// ===== POST — cria moeda =====
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
    const { name, symbol, taxRate, exchangeRate, isPrimary } = body;

    if (!name) {
      return NextResponse.json(
        { error: 'Nome da moeda é obrigatório' },
        { status: 400 }
      );
    }

    // Garante que a Guild existe
    let guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      guild = await prisma.guild.create({ data: { id: guildId } });
    }

    // Verifica se já existe moeda com esse nome
    const existing = await prisma.currency.findUnique({
      where: { guildId_name: { guildId, name } },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe uma moeda com esse nome' },
        { status: 400 }
      );
    }

    // Se está marcando como primária, desmarca as outras
    if (isPrimary) {
      await prisma.currency.updateMany({
        where: { guildId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    // Se for a PRIMEIRA moeda da guild, força isPrimary = true
    const count = await prisma.currency.count({ where: { guildId } });
    const shouldBePrimary = count === 0 ? true : Boolean(isPrimary);

    const currency = await prisma.currency.create({
      data: {
        guildId,
        name,
        symbol: symbol || '$',
        taxRate: taxRate || 0,
        exchangeRate: exchangeRate || 1.0,
        isPrimary: shouldBePrimary,
      },
    });

    return NextResponse.json(currency);
  } catch (error: any) {
    console.error('[currencies POST] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar moeda' },
      { status: 500 }
    );
  }
}