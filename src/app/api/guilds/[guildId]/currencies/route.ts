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

// Limites para os campos da moeda. Taxa negativa fazia o /pay criar dinheiro.
function validateCurrencyFields(body: any, partial: boolean): string | null {
  const { name, symbol, taxRate, exchangeRate, isPrimary } = body ?? {};

  if (!partial || name !== undefined) {
    if (typeof name !== 'string' || !name.trim() || name.length > 32) {
      return 'Nome da moeda deve ter de 1 a 32 caracteres';
    }
  }
  if (symbol !== undefined && symbol !== null && symbol !== '') {
    if (typeof symbol !== 'string' || symbol.length > 10) {
      return 'Símbolo deve ter no máximo 10 caracteres';
    }
  }
  if (taxRate !== undefined && taxRate !== null && taxRate !== '') {
    const n = Number(taxRate);
    if (!Number.isFinite(n) || n < 0 || n > 100) {
      return 'A taxa deve ser um número entre 0 e 100';
    }
  }
  if (exchangeRate !== undefined && exchangeRate !== null && exchangeRate !== '') {
    const n = Number(exchangeRate);
    if (!Number.isFinite(n) || n <= 0 || n > 1_000_000) {
      return 'A taxa de câmbio deve ser maior que 0';
    }
  }
  if (isPrimary !== undefined && typeof isPrimary !== 'boolean') {
    return 'isPrimary deve ser verdadeiro/falso';
  }
  return null;
}

// ===== GET — lista moedas da guild =====
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

    const currencies = await prisma.currency.findMany({
      where: { guildId },
      orderBy: [{ isPrimary: 'desc' }, { name: 'asc' }],
    });

    return NextResponse.json(currencies, NO_CACHE);
  } catch (error: any) {
    console.error('[currencies GET] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao buscar moedas' },
      { status: 500, ...NO_CACHE }
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

    const body = await req.json().catch(() => null);
    const validationError = validateCurrencyFields(body, false);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400, ...NO_CACHE });
    }

    const { symbol, taxRate, exchangeRate, isPrimary } = body;
    const name = String(body.name).trim();

    let guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      guild = await prisma.guild.create({ data: { id: guildId } });
    }

    const existing = await prisma.currency.findUnique({
      where: { guildId_name: { guildId, name } },
    });

    if (existing) {
      return NextResponse.json(
        { error: 'Já existe uma moeda com esse nome' },
        { status: 400, ...NO_CACHE }
      );
    }

    if (isPrimary) {
      await prisma.currency.updateMany({
        where: { guildId, isPrimary: true },
        data: { isPrimary: false },
      });
    }

    const count = await prisma.currency.count({ where: { guildId } });
    const shouldBePrimary = count === 0 ? true : Boolean(isPrimary);

    const currency = await prisma.currency.create({
      data: {
        guildId,
        name,
        symbol: symbol || '$',
        taxRate: taxRate ? Number(taxRate) : 0,
        exchangeRate: exchangeRate ? Number(exchangeRate) : 1.0,
        isPrimary: shouldBePrimary,
      },
    });

    return NextResponse.json(currency, NO_CACHE);
  } catch (error: any) {
    console.error('[currencies POST] Erro:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao criar moeda' },
      { status: 500, ...NO_CACHE }
    );
  }
}