import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/apiGuard';
import { createGuildEmoji } from '@/lib/discord';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const body = await req.json().catch(() => ({}));
  const { name, image } = body;

  if (typeof name !== 'string' || typeof image !== 'string' || !name || !image) {
    return NextResponse.json({ error: 'Nome e imagem são obrigatórios' }, { status: 400 });
  }

  // Regras do Discord: 2 a 32 caracteres, só letras, números e _
  if (!/^[a-zA-Z0-9_]{2,32}$/.test(name)) {
    return NextResponse.json(
      { error: 'Nome inválido: use 2 a 32 caracteres (letras, números e _)' },
      { status: 400 }
    );
  }

  // A imagem tem que ser um data URI de PNG, JPG, GIF ou WEBP
  if (!/^data:image\/(png|jpeg|jpg|gif|webp);base64,/.test(image)) {
    return NextResponse.json(
      { error: 'Envie a imagem como arquivo (PNG, JPG, GIF ou WEBP). O Discord não aceita link direto.' },
      { status: 400 }
    );
  }

  try {
    const emoji = await createGuildEmoji(guildId, name, image);
    return NextResponse.json(emoji);
  } catch (error: any) {
    console.error('Erro ao criar emoji:', error);
    return NextResponse.json({ error: error.message || 'Erro ao criar emoji' }, { status: 500 });
  }
}