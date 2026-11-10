import { NextRequest, NextResponse } from "next/server";
import { botGet } from '@/lib/discordcache';
import { guardApi } from "@/lib/apiGuard";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  try {
    const [membersRes, rolesRes] = await Promise.all([
      botGet(`/guilds/${guildId}/members?limit=1000`, 60_000),
      botGet(`/guilds/${guildId}/roles`),
    ]);

    if (!membersRes.ok || !rolesRes.ok || !Array.isArray(membersRes.data) || !Array.isArray(rolesRes.data)) {
      return NextResponse.json({ error: "Erro ao buscar dados do servidor" }, { status: 500 });
    }

    const members = membersRes.data;
    const roles = rolesRes.data;

    const users = members.map((member: any) => ({
      id: member.user.id,
      name: member.user.username,
      discriminator: member.user.discriminator,
      avatar: member.user.avatar,
    }));

    const formattedRoles = roles.map((role: any) => ({
      id: role.id,
      name: role.name,
      color: role.color,
      position: role.position,
    }));

    return NextResponse.json({ users, roles: formattedRoles });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}