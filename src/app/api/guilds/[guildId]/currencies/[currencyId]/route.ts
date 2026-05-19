import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ guildId: string; currencyId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId, currencyId } = await params;
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
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId, currencyId } = await params;

  try {
    await prisma.currency.deleteMany({ where: { id: currencyId, guildId } });
    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message || 'Erro ao remover moeda' }, { status: 500 });
  }
}