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

  const currencies = await prisma.currency.findMany({ where: { guildId } });
  return NextResponse.json(currencies);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;

  const accessError = await guardApi(guildId);
  if (accessError) return accessError;

  const limitError = rateLimit(req);
  if (limitError) return limitError;

  const body = await req.json();
  const { name, symbol, taxRate, exchangeRate } = body;

  if (!name) return NextResponse.json({ error: 'Nome da moeda é obrigatório' }, { status: 400 });

  try {
    let guild = await prisma.guild.findUnique({ where: { id: guildId } });
    if (!guild) {
      guild = await prisma.guild.create({ data: { id: guildId } });
    }

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