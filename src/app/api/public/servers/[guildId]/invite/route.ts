import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSnowflake } from "@/lib/apiGuard";
import { getViewer } from "@/lib/adultGate";

/**
 * Entrega o link de convite.
 * Para servidores +18, só entrega para quem está logado e confirmou
 * que tem 18 anos. Por isso o convite deles nunca vai no HTML da página.
 */
export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  if (!isSnowflake(guildId)) {
    return NextResponse.json({ error: "Servidor inválido" }, { status: 400 });
  }

  const listing = await prisma.serverListing.findFirst({
    where: { guildId, enabled: true, hidden: false, inviteCode: { not: null } },
    select: { inviteCode: true, nsfw: true },
  });
  if (!listing) {
    return NextResponse.json({ error: "Servidor não encontrado" }, { status: 404 });
  }

  if (listing.nsfw) {
    const viewer = await getViewer();
    if (!viewer.canSeeAdult) {
      return NextResponse.json(
        { error: "Entre com o Discord e confirme que tem 18 anos para entrar neste servidor.", needAdult: true },
        { status: 403 }
      );
    }
  }

  return NextResponse.json({ url: `https://discord.gg/${listing.inviteCode}` });
}