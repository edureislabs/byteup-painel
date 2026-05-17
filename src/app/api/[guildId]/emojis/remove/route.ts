import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';
import { deleteGuildEmoji } from '@/lib/discord';

export async function DELETE(req: NextRequest, { params }: { params: { guildId: string } }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const emojiId = searchParams.get('id');

  if (!emojiId) return NextResponse.json({ error: 'ID do emoji é obrigatório' }, { status: 400 });

  try {
    await deleteGuildEmoji(params.guildId, emojiId);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao remover emoji' }, { status: 500 });
  }
}