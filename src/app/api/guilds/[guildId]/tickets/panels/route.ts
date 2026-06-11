import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { canAccessPanel } from "@/lib/permissions";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> },
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.accessToken) {
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

    const name =
      typeof body.name === "string" && body.name.trim()
        ? body.name.trim()
        : typeof body.panelName === "string" && body.panelName.trim()
          ? body.panelName.trim()
          : typeof body.title === "string" && body.title.trim()
            ? body.title.trim()
            : "Novo Painel";

    const description =
      typeof body.description === "string" ? body.description : "";

    /**
     * Não usamos upsert aqui porque no seu ambiente o Prisma está em HTTP mode
     * e o upsert pode tentar abrir transação internamente.
     */
    const existingConfig = await prisma.ticketConfig.findUnique({
      where: {
        guildId,
      },
    });

    if (!existingConfig) {
      await prisma.ticketConfig.create({
        data: {
          guildId,
          enabled: true,
        },
      });
    }

    const panel = await prisma.ticketPanel.create({
      data: {
        guildId,
        name,
        description,
        ticketChannelName: "ticket-{count}",
        enabled: true,
      },
    });

    return NextResponse.json(panel, { status: 201 });
  } catch (error) {
    console.error("Erro ao criar painel de ticket:", error);

    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Erro interno ao criar painel.",
      },
      { status: 500 },
    );
  }
}