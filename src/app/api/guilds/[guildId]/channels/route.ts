import { NextRequest, NextResponse } from 'next/server';
import { guardApi } from '@/lib/apiGuard';
import { rateLimit } from '@/lib/rateLimit';

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;

  const accessError = await guardApi(guildId);
  if (accessError) return accessError;

  const limitError = rateLimit(req);
  if (limitError) return limitError;

  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  });

  if (!res.ok) return NextResponse.json({ error: 'Erro ao buscar canais' }, { status: 500 });

  const channels = await res.json();
  const filtered = channels.filter((c: any) => c.type === 0 || c.type === 5);
  return NextResponse.json(filtered.map((c: any) => ({ id: c.id, name: c.name })));
}