import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { guildId } = await params;

  try {
    const [membersRes, rolesRes] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${guildId}/members?limit=1000`, {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        },
      }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        },
      }),
    ]);

    if (!membersRes.ok || !rolesRes.ok) {
      return NextResponse.json({ error: "Erro ao buscar dados do servidor" }, { status: 500 });
    }

    const members = await membersRes.json();
    const roles = await rolesRes.json();

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