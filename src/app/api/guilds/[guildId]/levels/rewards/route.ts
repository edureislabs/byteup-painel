import { NextRequest, NextResponse } from 'next/server';
import { guardApi, isSnowflake } from '@/lib/apiGuard';
import { prisma } from '@/lib/prisma';

function toLevel(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 100_000 ? n : null;
}

function optionalString(value: unknown, max: number): string | null | undefined {
  if (value === null || value === undefined || value === '') return null;
  if (typeof value !== 'string' || value.length > max) return undefined; // inválido
  return value;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const rewards = await prisma.levelReward.findMany({
    where: { guildId },
    orderBy: { level: 'asc' },
  });
  return NextResponse.json(rewards);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));

  const level = toLevel(body.level);
  if (!level) return NextResponse.json({ error: 'Nível inválido' }, { status: 400 });

  const roleId = optionalString(body.roleId, 30);
  const currencyId = optionalString(body.currencyId, 100);
  const imageUrl = optionalString(body.imageUrl, 2000);
  const message = optionalString(body.message, 2000);

  if (roleId === undefined || currencyId === undefined || imageUrl === undefined || message === undefined) {
    return NextResponse.json({ error: 'Dados inválidos' }, { status: 400 });
  }
  if (roleId && !isSnowflake(roleId)) {
    return NextResponse.json({ error: 'Cargo inválido' }, { status: 400 });
  }

  const rewardAmount = Number(body.rewardAmount ?? 0);
  if (!Number.isInteger(rewardAmount) || rewardAmount < 0 || rewardAmount > 1_000_000_000) {
    return NextResponse.json({ error: 'Quantidade de recompensa inválida' }, { status: 400 });
  }

  // A moeda tem que ser deste servidor
  if (currencyId) {
    const currency = await prisma.currency.findFirst({ where: { id: currencyId, guildId } });
    if (!currency) return NextResponse.json({ error: 'Moeda não encontrada' }, { status: 400 });
  }

  try {
    const data = { roleId, currencyId, rewardAmount, imageUrl, message };
    const existing = await prisma.levelReward.findFirst({
      where: { guildId, level },
    });

    const saved = existing
      ? await prisma.levelReward.update({ where: { id: existing.id }, data })
      : await prisma.levelReward.create({ data: { guildId, level, ...data } });

    return NextResponse.json(saved);
  } catch (error) {
    console.error('[levels/rewards POST] Erro:', error);
    return NextResponse.json({ error: 'Erro ao salvar recompensa' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const level = toLevel(searchParams.get('level'));

  if (!level) return NextResponse.json({ error: 'Nível inválido' }, { status: 400 });

  try {
    await prisma.levelReward.deleteMany({ where: { guildId, level } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[levels/rewards DELETE] Erro:', error);
    return NextResponse.json({ error: 'Erro ao remover recompensa' }, { status: 500 });
  }
}
