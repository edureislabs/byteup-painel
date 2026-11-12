import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/apiGuard';
import { prisma } from '@/lib/prisma';
import { validateShopItem } from '@/lib/shopvalidation';

// Lista os itens da loja
export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const items = await prisma.shopItem.findMany({
    where: { guildId },
    include: { currency: true },
    orderBy: { price: 'asc' },
  });

  return NextResponse.json(items);
}

// Cria um item
export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const count = await prisma.shopItem.count({ where: { guildId } });
  if (count >= 25) {
    return NextResponse.json(
      { error: 'Limite de 25 itens na loja (limite do Discord para listas).' },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const { data, error } = await validateShopItem(guildId, body, false);
  if (error || !data) return NextResponse.json({ error }, { status: 400 });

  const item = await prisma.shopItem.create({
    data: { guildId, ...data } as any,
    include: { currency: true },
  });

  return NextResponse.json(item);
}