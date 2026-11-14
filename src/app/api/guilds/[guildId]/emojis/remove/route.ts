import { NextRequest, NextResponse } from 'next/server';
import { guardApi, isSnowflake } from '@/lib/apiGuard';
import { deleteGuildEmoji } from '@/lib/discord';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const { searchParams } = new URL(req.url);
  const emojiId = searchParams.get('id');

  // Só aceita um ID numérico do Discord. Antes, um id como
  // "../../../channels/123" fazia o bot apagar canais.
  if (!isSnowflake(emojiId)) {
    return NextResponse.json({ error: 'ID do emoji inválido' }, { status: 400 });
  }

  try {
    await deleteGuildEmoji(guildId, emojiId);
    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Erro ao remover emoji:', error);
    return NextResponse.json({ error: error.message || 'Erro ao remover emoji' }, { status: 500 });
  }
}
