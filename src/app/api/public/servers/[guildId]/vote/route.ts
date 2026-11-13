import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSnowflake } from "@/lib/apiGuard";
import { getViewer } from "@/lib/adultGate";
import { VOTE_COOLDOWN_MS } from "@/lib/listingShared";

/** Vota em um servidor: 1 voto por pessoa a cada 12 horas por servidor. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  if (!isSnowflake(guildId)) {
    return NextResponse.json({ error: "Servidor inválido" }, { status: 400 });
  }

  const viewer = await getViewer();
  if (!viewer.userId) {
    return NextResponse.json({ error: "Entre com o Discord para votar.", needLogin: true }, { status: 401 });
  }

  const listing = await prisma.serverListing.findFirst({
    where: { guildId, enabled: true, hidden: false },
  });
  if (!listing) {
    return NextResponse.json({ error: "Servidor não encontrado" }, { status: 404 });
  }
  if (listing.nsfw && !viewer.canSeeAdult) {
    return NextResponse.json({ error: "Confirme que tem 18 anos para interagir com este servidor." }, { status: 403 });
  }

  const since = new Date(Date.now() - VOTE_COOLDOWN_MS);
  const last = await prisma.serverVote.findFirst({
    where: { guildId, userId: viewer.userId, createdAt: { gte: since } },
    orderBy: { createdAt: "desc" },
  });

  if (last) {
    const next = new Date(last.createdAt.getTime() + VOTE_COOLDOWN_MS);
    return NextResponse.json(
      { error: "Você já votou neste servidor. Volte mais tarde.", nextVoteAt: next.toISOString() },
      { status: 429 }
    );
  }

  await prisma.serverVote.create({ data: { guildId, userId: viewer.userId } });

  const votes = await prisma.serverVote.count({
    where: { guildId, createdAt: { gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } },
  });

  return NextResponse.json({
    ok: true,
    votes,
    nextVoteAt: new Date(Date.now() + VOTE_COOLDOWN_MS).toISOString(),
  });
}