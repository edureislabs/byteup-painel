import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { getGuildEmojis } from '@/lib/discord';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;

  try {
    const emojis = await getGuildEmojis(guildId);
    return NextResponse.json(emojis);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar emojis' }, { status: 500 });
  }
}