import { NextRequest, NextResponse } from 'next/server';
import { guardApi, isSnowflake } from '@/lib/apiGuard';
import { prisma } from '@/lib/prisma';

const DEFAULTS = {
  dailyAmount: 100,
  dailyCooldownHours: 24,
  workEnabled: true,
  workMin: 50,
  workMax: 150,
  workCooldownMinutes: 60,
  bankEnabled: true,
  staffLogChannelId: null as string | null,
};

const INT_RULES: Record<string, [number, number]> = {
  dailyAmount: [0, 1_000_000_000], // 0 = daily desativado
  dailyCooldownHours: [1, 168],
  workMin: [1, 1_000_000_000],
  workMax: [1, 1_000_000_000],
  workCooldownMinutes: [1, 10_080],
};

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const config = await prisma.economyConfig.findUnique({ where: { guildId } });
  return NextResponse.json({ ...DEFAULTS, ...(config || {}), guildId });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }

  const data: Record<string, any> = {};

  for (const [field, [min, max]] of Object.entries(INT_RULES)) {
    if (body[field] === undefined) continue;
    const n = Number(body[field]);
    if (!Number.isInteger(n) || n < min || n > max) {
      return NextResponse.json(
        { error: `${field} deve ser um número inteiro entre ${min} e ${max}` },
        { status: 400 }
      );
    }
    data[field] = n;
  }

  for (const field of ['workEnabled', 'bankEnabled']) {
    if (body[field] === undefined) continue;
    if (typeof body[field] !== 'boolean') {
      return NextResponse.json({ error: `${field} deve ser verdadeiro/falso` }, { status: 400 });
    }
    data[field] = body[field];
  }

  if (body.staffLogChannelId !== undefined) {
    const v = body.staffLogChannelId;
    if (v !== null && v !== '' && !isSnowflake(v)) {
      return NextResponse.json({ error: 'Canal de log inválido' }, { status: 400 });
    }
    data.staffLogChannelId = v || null;
  }

  const existing = await prisma.economyConfig.findUnique({ where: { guildId } });
  const min = data.workMin ?? existing?.workMin ?? DEFAULTS.workMin;
  const max = data.workMax ?? existing?.workMax ?? DEFAULTS.workMax;
  if (min > max) {
    return NextResponse.json(
      { error: 'O ganho mínimo do trabalho não pode ser maior que o máximo' },
      { status: 400 }
    );
  }

  const saved = await prisma.economyConfig.upsert({
    where: { guildId },
    update: data,
    create: { guildId, ...data },
  });

  return NextResponse.json(saved);
}