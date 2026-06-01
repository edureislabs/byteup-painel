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

  const goodbye = await prisma.goodbye.findUnique({ where: { guildId } });
  return NextResponse.json({ goodbye });
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

  const goodbye = await prisma.goodbye.upsert({
    where: { guildId },
    update: {
      channelId: body.channelId ?? null,
      message: body.message ?? "Até mais, {user}!",
      enabled: body.enabled ?? true,
      sendType: body.sendType ?? "text_only",
      embedJson: body.embedJson ?? null,
    },
    create: {
      guildId,
      channelId: body.channelId ?? null,
      message: body.message ?? "Até mais, {user}!",
      enabled: body.enabled ?? true,
      sendType: body.sendType ?? "text_only",
      embedJson: body.embedJson ?? null,
    },
  });

  return NextResponse.json(goodbye);
}