import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/apiGuard';
import { prisma } from '@/lib/prisma';

function toLevel(value: unknown): number | null {
  const n = Number(value);
  return Number.isInteger(n) && n >= 1 && n <= 100_000 ? n : null;
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const requirements = await prisma.levelRequirement.findMany({
    where: { guildId },
    orderBy: { level: 'asc' },
  });

  return NextResponse.json(requirements);
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const level = toLevel(body.level);
  const xpNeeded = Number(body.xpNeeded);

  if (!level || !Number.isInteger(xpNeeded) || xpNeeded < 1 || xpNeeded > 2_000_000_000) {
    return NextResponse.json(
      { error: 'Nível e XP necessário precisam ser números inteiros positivos' },
      { status: 400 }
    );
  }

  try {
    const saved = await prisma.levelRequirement.upsert({
      where: { guildId_level: { guildId, level } },
      update: { xpNeeded },
      create: { guildId, level, xpNeeded },
    });
    return NextResponse.json(saved);
  } catch (error) {
    console.error('[levels/requirements POST] Erro:', error);
    return NextResponse.json({ error: 'Erro ao salvar requisito' }, { status: 500 });
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
    await prisma.levelRequirement.deleteMany({ where: { guildId, level } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[levels/requirements DELETE] Erro:', error);
    return NextResponse.json({ error: 'Erro ao remover requisito' }, { status: 500 });
  }
}