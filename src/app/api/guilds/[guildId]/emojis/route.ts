import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/apiGuard';
import { getGuildEmojis } from '@/lib/discord';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  try {
    const emojis = await getGuildEmojis(guildId);
    return NextResponse.json(emojis);
  } catch {
    return NextResponse.json({ error: 'Erro ao buscar emojis' }, { status: 500 });
  }
}
