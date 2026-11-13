import { NextRequest, NextResponse } from 'next/server';
import { getUsersCached } from '@/lib/discordCache';
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

    const suggestions = await prisma.suggestion.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: 200,
    });

    // Busca avatares
    const authorIds = [
      ...new Set(suggestions.map((s) => s.authorId).filter((id) => id !== 'anonymous')),
    ];

    // Busca em paralelo (5 por vez) e com cache de 10 minutos.
    // Antes eram até 400 chamadas ao Discord uma atrás da outra.
    const authorsData = await getUsersCached(authorIds);

    return NextResponse.json(
      suggestions.map((s) => ({
        ...s,
        author:
          s.authorId === 'anonymous'
            ? { username: 'Anônimo', avatar: null }
            : authorsData[s.authorId] || { username: 'Desconhecido', avatar: null },
      }))
    );
  } catch (error) {
    console.error('[suggestions] Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}