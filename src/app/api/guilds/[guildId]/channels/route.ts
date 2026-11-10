import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/apiGuard';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await params;
    const denied = await guardApi(guildId);
    if (denied) return denied;

    const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Erro ao buscar canais' }, { status: 500 });
    }

    const channels = await res.json();

    const filtered = channels
      .filter((c: any) => c.type === 0 || c.type === 5)
      .map((c: any) => ({ id: c.id, name: c.name }))
      .sort((a: any, b: any) => a.name.localeCompare(b.name));

    return NextResponse.json(filtered);
  } catch (error) {
    console.error('[channels] Erro:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}