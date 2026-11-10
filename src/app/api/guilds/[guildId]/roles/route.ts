import { NextRequest, NextResponse } from 'next/server';
import { botGet } from '@/lib/discordcache';
import { guardApi } from '@/lib/apiGuard';

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const res = await botGet(`/guilds/${guildId}/roles`);

  if (!res.ok || !Array.isArray(res.data)) {
    return NextResponse.json({ error: 'Erro ao buscar cargos' }, { status: 500 });
  }

  const roles = res.data;

  const formattedRoles = roles
    .filter((r: any) => r.name !== "@everyone")
    .map((r: any) => ({ id: r.id, name: r.name, position: r.position, color: r.color }))
    .sort((a: any, b: any) => b.position - a.position);

  return NextResponse.json(formattedRoles);
}