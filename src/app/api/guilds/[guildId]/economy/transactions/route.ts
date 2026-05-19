import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { prisma } from '@/lib/prisma';

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;

  const transactions = await prisma.gameTransaction.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
    take: 100,
  });

  return NextResponse.json(transactions);
}