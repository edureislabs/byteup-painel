import { NextRequest, NextResponse } from 'next/server';
import { getGuildEmojis } from '@/lib/discord';
import { guardApi } from '@/lib/apiGuard';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const accessError = await guardApi(guildId);
  if (accessError) return accessError;

  const limitError = rateLimit(req);
  if (limitError) return limitError;

  try {
    const emojis = await getGuildEmojis(guildId);
    return NextResponse.json(emojis);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar emojis' }, { status: 500 });
  }
}