import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isSnowflake } from "@/lib/apiGuard";
import { getViewer } from "@/lib/adultgate";
import { REPORT_REASONS } from "@/lib/listingshared";

/** Denuncia um servidor da lista. Uma denúncia aberta por pessoa por servidor. */
export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  if (!isSnowflake(guildId)) {
    return NextResponse.json({ error: "Servidor inválido" }, { status: 400 });
  }

  const viewer = await getViewer();
  if (!viewer.userId) {
    return NextResponse.json({ error: "Entre com o Discord para denunciar.", needLogin: true }, { status: 401 });
  }

  const body = await req.json().catch(() => null);
  const reason = String(body?.reason ?? "");
  const details = typeof body?.details === "string" ? body.details.trim().slice(0, 500) : null;

  if (!REPORT_REASONS.some((r) => r.value === reason)) {
    return NextResponse.json({ error: "Escolha um motivo." }, { status: 400 });
  }

  const listing = await prisma.serverListing.findUnique({ where: { guildId } });
  if (!listing) {
    return NextResponse.json({ error: "Servidor não encontrado" }, { status: 404 });
  }

  const open = await prisma.serverListingReport.findFirst({
    where: { guildId, reporterId: viewer.userId, resolved: false },
  });
  if (open) {
    return NextResponse.json({ ok: true, message: "Você já denunciou este servidor. Vamos analisar." });
  }

  await prisma.serverListingReport.create({
    data: { guildId, reporterId: viewer.userId, reason, details: details || null },
  });

  return NextResponse.json({ ok: true, message: "Denúncia enviada. Obrigado por avisar!" });
}