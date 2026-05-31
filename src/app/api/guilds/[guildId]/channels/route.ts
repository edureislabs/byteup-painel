import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const { guildId } = await params;

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
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}