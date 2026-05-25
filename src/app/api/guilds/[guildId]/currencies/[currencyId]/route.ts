import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { guardApi } from '@/lib/apiGuard';
import { rateLimit } from '@/lib/rateLimit';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ guildId: string; currencyId: string }> }) {
  const { guildId, currencyId } = await params;

  const accessError = await guardApi(guildId);
  if (accessError) return accessError;

  const limitError = rateLimit(req);
  if (limitError) return limitError;

  const body = await req.json();
  const { name, symbol, taxRate, exchangeRate } = body;

  try {
    const currency = await prisma.currency.updateMany({
      where: { id: currencyId, guildId },
      data: { name, symbol, taxRate, exchangeRate },
    });
    return NextResponse.json(currency);
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao atualizar moeda' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ guildId: string; currencyId: string }> }) {
  const { guildId, currencyId } = await params;

  const accessError = await guardApi(guildId);
  if (accessError) return accessError;

  const limitError = rateLimit(req);
  if (limitError) return limitError;

  try {
    await prisma.currency.deleteMany({ where: { id: currencyId, guildId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao remover moeda' }, { status: 500 });
  }
}