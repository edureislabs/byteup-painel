import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;

  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  });

  if (!res.ok) return NextResponse.json({ error: 'Erro ao buscar canais' }, { status: 500 });

  const channels = await res.json();
  // Filtra apenas canais de texto (0) e anúncios (5)
  const filtered = channels.filter((c: any) => c.type === 0 || c.type === 5);
  return NextResponse.json(filtered.map((c: any) => ({ id: c.id, name: c.name })));
}