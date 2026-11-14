import { NextRequest, NextResponse } from "next/server";
import { botGet } from '@/lib/discordCache';
import { guardApi } from "@/lib/apiGuard";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  try {
    const { guildId } = await params;
    const denied = await guardApi(guildId);
    if (denied) return denied;

    const res = await botGet(`/guilds/${guildId}/channels`);

    if (!res.ok || !Array.isArray(res.data)) {
      return NextResponse.json(
        { error: "Erro ao buscar categorias" },
        { status: 500 }
      );
    }

    const channels = res.data;

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
