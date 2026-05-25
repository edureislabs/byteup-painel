import { NextRequest, NextResponse } from 'next/server';
import { createGuildEmoji } from '@/lib/discord';
import { guardApi } from '@/lib/apiGuard';
import { rateLimit } from '@/lib/rateLimit';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;

  const accessError = await guardApi(guildId);
  if (accessError) return accessError;

  const limitError = rateLimit(req);
  if (limitError) return limitError;

  const body = await req.json();
  const { name, image } = body;

  if (!name || !image) return NextResponse.json({ error: 'Nome e imagem são obrigatórios' }, { status: 400 });

  try {
    const emoji = await createGuildEmoji(guildId, name, image);
    return NextResponse.json(emoji);
  } catch (error: any) {
    console.error('Erro ao criar emoji:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar emoji' }, { status: 500 });
  }
}