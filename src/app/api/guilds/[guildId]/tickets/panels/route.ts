import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { canAccessPanel } from "@/lib/permissions";

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

  const panel = await prisma.ticketPanel.create({
    data: {
      guildId,
      name: body.name || "Novo Painel",
      description: body.description || "",
    },
  });

  return NextResponse.json(panel);
}