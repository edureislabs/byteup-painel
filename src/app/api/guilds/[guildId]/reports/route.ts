import { NextRequest, NextResponse } from 'next/server';
import { getUsersCached } from '@/lib/discordcache';
import { guardApi } from '@/lib/apiGuard';
import { prisma } from '@/lib/prisma';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await params;
    const denied = await guardApi(guildId);
    if (denied) return denied;

    const status = req.nextUrl.searchParams.get('status') || 'all';

    const where: any = { guildId };
    if (status !== 'all') where.status = status;

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    const userIds = [
      ...new Set(reports.flatMap((r) => [r.reporterId, r.targetId])),
    ];

    // Busca em paralelo (5 por vez) e com cache de 10 minutos.
    // Antes eram até 400 chamadas ao Discord uma atrás da outra.
    const usersData = await getUsersCached(userIds);

    return NextResponse.json(
      reports.map((r) => ({
        ...r,
        reporter: usersData[r.reporterId] || {
          username: 'Desconhecido',
          avatar: null,
        },
        target: usersData[r.targetId] || {
          username: 'Desconhecido',
          avatar: null,
        },
      }))
    );
  } catch (error) {
    console.error('[reports] Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}