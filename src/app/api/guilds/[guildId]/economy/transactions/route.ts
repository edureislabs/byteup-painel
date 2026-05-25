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

  const transactions = await prisma.gameTransaction.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json(transactions);
}