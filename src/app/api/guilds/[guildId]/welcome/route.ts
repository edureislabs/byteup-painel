// src/app/api/guilds/[guildId]/welcome/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { canAccessPanel } from "@/lib/permissions";

async function getChannels(guildId: string) {
  const response = await fetch(`https://discord.com/api/guilds/${guildId}/channels`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    cache: "no-store",
  });
  if (!response.ok) return [];
  return response.json();
}

async function getRoles(guildId: string) {
  const response = await fetch(`https://discord.com/api/guilds/${guildId}/roles`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
    cache: "no-store",
  });
  if (!response.ok) return [];
  return response.json();
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { guildId } = await params;
    const hasAccess = await canAccessPanel(guildId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const [welcome, channels, roles] = await Promise.all([
      prisma.welcome.findUnique({ where: { guildId } }),
      getChannels(guildId),
      getRoles(guildId),
    ]);

    const textChannels = channels.filter((c: any) => c.type === 0);
    const filteredRoles = roles
      .filter((r: any) => r.name !== "@everyone")
      .sort((a: any, b: any) => b.position - a.position);

    return NextResponse.json({ welcome, channels: textChannels, roles: filteredRoles });
  } catch (error) {
    console.error("Erro na API GET welcome:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { guildId } = await params;
    const hasAccess = await canAccessPanel(guildId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();

    const welcome = await prisma.welcome.upsert({
      where: { guildId },
      update: {
        channelId: body.channelId ?? null,
        message: body.message ?? "Bem-vindo(a) ao servidor, {user}!",
        enabled: body.enabled ?? true,
        autoroleId: body.autoroleId ?? null,
        bgImage: body.bgImage ?? null,
        templateJson: body.templateJson ?? null,
        sendType: body.sendType ?? "image_embed",
        embedJson: body.embedJson ?? null,
        buttonsJson: body.buttonsJson ?? null,
      },
      create: {
        guildId,
        channelId: body.channelId ?? null,
        message: body.message ?? "Bem-vindo(a) ao servidor, {user}!",
        enabled: body.enabled ?? true,
        autoroleId: body.autoroleId ?? null,
        bgImage: body.bgImage ?? null,
        templateJson: body.templateJson ?? null,
        sendType: body.sendType ?? "image_embed",
        embedJson: body.embedJson ?? null,
        buttonsJson: body.buttonsJson ?? null,
      },
    });

    return NextResponse.json(welcome);
  } catch (error) {
    console.error("Erro na API POST welcome:", error);
    return NextResponse.json({ error: "Erro interno ao salvar" }, { status: 500 });
  }
}

// ========== NOVA FUNÇÃO PATCH ==========
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.accessToken) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { guildId } = await params;
    const hasAccess = await canAccessPanel(guildId);
    if (!hasAccess) {
      return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
    }

    const body = await request.json();

    const welcome = await prisma.welcome.upsert({
      where: { guildId },
      update: {
        ...(body.templateJson !== undefined && { templateJson: body.templateJson }),
      },
      create: {
        guildId,
        templateJson: body.templateJson ?? null,
      },
    });

    return NextResponse.json(welcome);
  } catch (error) {
    console.error("Erro na API PATCH welcome:", error);
    return NextResponse.json({ error: "Erro interno ao salvar" }, { status: 500 });
  }
}