import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/apiGuard';
import { prisma } from '@/lib/prisma';
import { validateShopItem } from '@/lib/shopValidation';

type Params = { params: Promise<{ guildId: string; itemId: string }> };

// Edita um item (inclusive ativar/desativar)
export async function PATCH(req: NextRequest, { params }: Params) {
  const { guildId, itemId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const item = await prisma.shopItem.findFirst({ where: { id: itemId, guildId } });
  if (!item) return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });

  const body = await req.json().catch(() => null);
  const { data, error } = await validateShopItem(guildId, body, true);
  if (error || !data) return NextResponse.json({ error }, { status: 400 });

  const updated = await prisma.shopItem.update({
    where: { id: itemId },
    data,
    include: { currency: true },
  });

  return NextResponse.json(updated);
}

// Remove um item (quem já comprou cargo temporário continua até vencer)
export async function DELETE(req: NextRequest, { params }: Params) {
  const { guildId, itemId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const result = await prisma.shopItem.deleteMany({ where: { id: itemId, guildId } });
  if (result.count === 0) {
    return NextResponse.json({ error: 'Item não encontrado' }, { status: 404 });
  }

  return NextResponse.json({ success: true });
}