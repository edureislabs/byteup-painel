import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;
  const currencies = await prisma.currency.findMany({ where: { guildId } });
  return NextResponse.json(currencies);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;
  const body = await req.json();
  const { name, symbol, taxRate, exchangeRate } = body;

  if (!name) return NextResponse.json({ error: 'Nome da moeda é obrigatório' }, { status: 400 });

  try {
    // Garante que a Guild existe antes de criar a Currency
    await prisma.guild.upsert({
      where: { id: guildId },
      update: {},
      create: { id: guildId },
    });

    const currency = await prisma.currency.create({
      data: {
        guildId,
        name,
        symbol: symbol || '$',
        taxRate: taxRate || 0,
        exchangeRate: exchangeRate || 1.0,
      },
    });

    return NextResponse.json(currency);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao criar moeda' }, { status: 500 });
  }
}