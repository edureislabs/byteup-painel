// src/app/api/guilds/[guildId]/welcome/generate-image/route.ts
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateWelcomeImage } from "@/lib/generateWelcomeImage";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await params;
    const body = await req.json();

    const welcome = await prisma.welcome.findUnique({
      where: { guildId },
    });

    if (!welcome?.templateJson) {
      return new Response("Sem template configurado", { status: 400 });
    }

    const template = welcome.templateJson;

    const buffer = await generateWelcomeImage(template, {
      username: body.username,
      memberCount: body.memberCount,
      serverName: body.serverName,
      message: body.message,
      avatarUrl: body.avatarUrl,
    });

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "image/png",
      },
    });
  } catch (error) {
    console.error("Erro ao gerar imagem:", error);
    return new Response("Erro interno ao gerar imagem", { status: 500 });
  }
}