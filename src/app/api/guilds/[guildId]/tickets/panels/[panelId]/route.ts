import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { canAccessPanel } from "@/lib/permissions";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string; panelId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { guildId, panelId } = await params;
  const hasAccess = await canAccessPanel(guildId);
  if (!hasAccess) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const panel = await prisma.ticketPanel.findFirst({
    where: { id: panelId, guildId },
  });

  if (!panel) return NextResponse.json({ error: "Painel não encontrado" }, { status: 404 });

  return NextResponse.json(panel);
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string; panelId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { guildId, panelId } = await params;
  const hasAccess = await canAccessPanel(guildId);
  if (!hasAccess) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  const body = await request.json();

  const panel = await prisma.ticketPanel.update({
    where: { id: panelId },
    data: body,
  });

  return NextResponse.json(panel);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string; panelId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session?.accessToken) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  const { guildId, panelId } = await params;
  const hasAccess = await canAccessPanel(guildId);
  if (!hasAccess) return NextResponse.json({ error: "Acesso negado" }, { status: 403 });

  await prisma.ticketPanel.delete({ where: { id: panelId } });

  return NextResponse.json({ success: true });
}