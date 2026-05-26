import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ guildId: string }> }
) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Nao autorizado" }, { status: 401 });
  }

  const { guildId } = await params;
  const searchParams = request.nextUrl.searchParams;
  const query = searchParams.get("q");

  if (!query || query.length < 2) {
    return NextResponse.json({ users: [] });
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}/members/search?query=${encodeURIComponent(query)}&limit=10`,
      {
        headers: {
          Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
        },
      }
    );

    if (!response.ok) {
      console.error("Discord API error:", response.status, await response.text());
      return NextResponse.json({ users: [] });
    }

    const members = await response.json();
    const users = members.map((member: any) => ({
      id: member.user.id,
      name: member.user.username,
      discriminator: member.user.discriminator || "0",
      avatar: member.user.avatar,
    }));

    return NextResponse.json({ users });
  } catch (error) {
    console.error("Erro ao buscar usuarios:", error);
    return NextResponse.json({ users: [] });
  }
}