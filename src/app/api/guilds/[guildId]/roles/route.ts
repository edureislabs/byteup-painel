import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/apiGuard';

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  });

  if (!res.ok) return NextResponse.json({ error: 'Erro ao buscar cargos' }, { status: 500 });

  const roles = await res.json();

  const formattedRoles = roles
    .filter((r: any) => r.name !== "@everyone")
    .map((r: any) => ({ id: r.id, name: r.name, position: r.position, color: r.color }))
    .sort((a: any, b: any) => b.position - a.position);

  return NextResponse.json(formattedRoles);
}