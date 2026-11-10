import { NextRequest, NextResponse } from "next/server";
import { guardApi } from "@/lib/apiGuard";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await params;
    const denied = await guardApi(guildId);
    if (denied) return denied;

    const res = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/channels`,
      {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (!res.ok) {
      return NextResponse.json(
        { error: "Erro ao buscar categorias" },
        { status: 500 }
      );
    }

    const channels = await res.json();

    const categories = channels
      .filter((channel: any) => channel.type === 4)
      .map((category: any) => ({
        id: category.id,
        name: category.name,
        type: category.type,
        position: category.position,
      }))
      .sort((a: any, b: any) => a.position - b.position);

    return NextResponse.json(categories);
  } catch (error) {
    console.error("[categories] Erro:", error);
    return NextResponse.json({ error: "Erro interno" }, { status: 500 });
  }
}