import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SLUG } from "@/lib/mc/dados";

/** Última versão de um plugin: GET /api/public/mc/versao?plugin=byteuphud → { versao, url }. */
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  const slug = (new URL(req.url).searchParams.get("plugin") || "").toLowerCase();
  if (!SLUG.test(slug)) return NextResponse.json({ ok: false }, { status: 400 });
  const p = await prisma.mcPlugin.findUnique({ where: { slug }, select: { ultimaVersao: true, urlDownload: true } });
  if (!p) return NextResponse.json({ ok: false }, { status: 404 });
  return NextResponse.json(
    { ok: true, versao: p.ultimaVersao, url: p.urlDownload },
    { headers: { "Cache-Control": "public, s-maxage=300, stale-while-revalidate=600" } },
  );
}
