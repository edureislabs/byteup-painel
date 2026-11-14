import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { guardApi, isSnowflake } from '@/lib/apiGuard';
import { prisma } from '@/lib/prisma';

const MAX = 2_000_000_000;

// Histórico de ajustes feitos pela staff (bot e painel)
export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const logs = await prisma.economyLog.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
    take: 50,
  });

  const currencies = await prisma.currency.findMany({ where: { guildId } });
  const byId = new Map(currencies.map((c) => [c.id, c]));

  return NextResponse.json(
    logs.map((l) => ({
      ...l,
      currency: byId.get(l.currencyId) || null,
    }))
  );
}

/**
 * Ajusta o saldo (carteira) de um membro.
 * body: { userId, currencyId, amount (positivo adiciona, negativo remove), reason? }
 * Se remover mais do que a pessoa tem, a carteira fica em 0.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const session = await getServerSession(authOptions);
  const moderatorId = session!.user.id;

  const body = await req.json().catch(() => null);
  const userId = body?.userId;
  const currencyId = body?.currencyId;
  const amount = Number(body?.amount);
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 500) : null;

  if (!isSnowflake(userId)) {
    return NextResponse.json({ error: 'ID de usuário inválido' }, { status: 400 });
  }
  if (!Number.isInteger(amount) || amount === 0 || Math.abs(amount) > MAX) {
    return NextResponse.json(
      { error: 'Valor inválido: use um número inteiro diferente de 0 (negativo para remover)' },
      { status: 400 }
    );
  }

  const currency = await prisma.currency.findFirst({ where: { id: currencyId, guildId } });
  if (!currency) {
    return NextResponse.json({ error: 'Moeda não encontrada' }, { status: 400 });
  }

  try {
    const result = await prisma.$transaction(async (tx) => {
      const where = { guildId_userId_currencyId: { guildId, userId, currencyId } };
      const user = await tx.economyUser.upsert({
        where,
        update: {},
        create: { guildId, userId, currencyId, balance: 0 },
      });

      const applied =
        amount > 0 ? Math.min(amount, MAX - user.balance) : -Math.min(-amount, user.balance);

      const updated =
        applied === 0
          ? user
          : await tx.economyUser.update({ where, data: { balance: { increment: applied } } });

      if (applied !== 0) {
        await tx.economyLog.create({
          data: { guildId, userId, moderatorId, currencyId, amount: applied, reason, source: 'painel' },
        });
      }

      return { applied, balance: updated.balance };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('[economy/adjust] Erro:', error);
    return NextResponse.json({ error: 'Erro ao ajustar saldo' }, { status: 500 });
  }
}
