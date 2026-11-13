import { NextRequest, NextResponse } from "next/server";
import { botGet } from '@/lib/discordCache';
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { canAccessPanel } from "@/lib/permissions";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 },
      );
    }

    const { guildId } = await params;

    const hasAccess = await canAccessPanel(guildId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 },
      );
    }

    const ticketConfig = await prisma.ticketConfig.findUnique({
      where: {
        guildId,
      },
      include: {
        panels: {
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    const [channelsRes, rolesRes] = await Promise.all([
      botGet(`/guilds/${guildId}/channels`),
      botGet(`/guilds/${guildId}/roles`),
    ]);

    const channels = channelsRes.ok ? channelsRes.data : [];
    const roles = rolesRes.ok ? rolesRes.data : [];

    return NextResponse.json({
      config: ticketConfig,
      channels: Array.isArray(channels)
        ? channels.filter((channel: any) => channel.type === 0 || channel.type === 5)
        : [],
      roles: Array.isArray(roles)
        ? roles.filter((role: any) => role.name !== "@everyone")
        : [],
    });
  } catch (error) {
    console.error("Erro ao carregar configuração de tickets:", error);

    return NextResponse.json(
      { error: "Erro interno ao carregar tickets." },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Não autorizado" },
        { status: 401 },
      );
    }

    const { guildId } = await params;

    const hasAccess = await canAccessPanel(guildId);

    if (!hasAccess) {
      return NextResponse.json(
        { error: "Acesso negado" },
        { status: 403 },
      );
    }

    const body = await request.json().catch(() => ({}));

    const enabled =
      typeof body.enabled === "boolean" ? body.enabled : true;

    const existingConfig = await prisma.ticketConfig.findUnique({
      where: {
        guildId,
      },
    });

    const ticketConfig = existingConfig
      ? await prisma.ticketConfig.update({
          where: {
            guildId,
          },
          data: {
            enabled,
          },
        })
      : await prisma.ticketConfig.create({
          data: {
            guildId,
            enabled,
          },
        });

    return NextResponse.json(ticketConfig);
  } catch (error) {
    console.error("Erro ao salvar configuração de tickets:", error);

    return NextResponse.json(
      { error: "Erro interno ao salvar tickets." },
      { status: 500 },
    );
  }
}