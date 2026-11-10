import { NextRequest, NextResponse } from 'next/server';
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

    const authorsData: Record<
      string,
      { username: string; avatar: string | null }
    > = {};

    for (const userId of authorIds) {
      try {
        const res = await fetch(
          `https://discord.com/api/v10/users/${userId}`,
          {
            headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
          }
        );
        if (res.ok) {
          const data = await res.json();
          authorsData[userId] = {
            username: data.username,
            avatar: data.avatar
              ? `https://cdn.discordapp.com/avatars/${userId}/${data.avatar}.png?size=128`
              : null,
          };
        }
      } catch {}
    }

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