import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { createGuildEmoji } from '@/lib/discord';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;
  const body = await req.json();
  const { name, image } = body;

  if (!name || !image) return NextResponse.json({ error: 'Nome e imagem são obrigatórios' }, { status: 400 });

  try {
    const emoji = await createGuildEmoji(guildId, name, image);
    return NextResponse.json(emoji);
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao criar emoji' }, { status: 500 });
  }
}