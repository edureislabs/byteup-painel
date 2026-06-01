import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { canAccessPanel } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { guildId } = await params;
  const hasAccess = await canAccessPanel(guildId);
  if (!hasAccess) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const ticketConfig = await prisma.ticketConfig.findUnique({
    where: { guildId },
    include: { panels: true }
  });

  const channelsRes = await fetch(`https://discord.com/api/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
  });
  const channels = channelsRes.ok ? await channelsRes.json() : [];

  const rolesRes = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` }
  });
  const roles = rolesRes.ok ? await rolesRes.json() : [];

  return NextResponse.json({
    config: ticketConfig,
    channels: channels.filter((c: any) => c.type === 0 || c.type === 5),
    roles: roles.filter((r: any) => r.name !== "@everyone")
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { guildId } = await params;
  const hasAccess = await canAccessPanel(guildId);
  if (!hasAccess) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();

  const ticketConfig = await prisma.ticketConfig.upsert({
    where: { guildId },
    update: {
      enabled: body.enabled ?? true,
    },
    create: {
      guildId,
      enabled: body.enabled ?? true,
    },
  });

  return NextResponse.json(ticketConfig);
}