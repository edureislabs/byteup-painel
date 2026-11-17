import { NextResponse } from "next/server";
import { getAdminUserId } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { r2Configured } from "@/lib/r2";
import { linkDoJar } from "@/lib/mc/entrega";
import { JarInvalido } from "@/lib/mc/montarPlugin";

/**
 * Prévia do admin: o jar de um plugin pago montado com uma licença de teste ("previa-<seu ID>"),
 * para testar no seu servidor antes de vender. O site só aceita essa licença de quem é admin.
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(_req: Request, { params }: { params: Promise<{ fileId: string }> }) {
  const adminId = await getAdminUserId();
  if (!adminId) return new NextResponse("Não encontrado", { status: 404 });
  const { fileId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(fileId) || !r2Configured()) return new NextResponse("Arquivo não encontrado", { status: 404 });
  const arquivo = await prisma.storeProductFile.findUnique({ where: { id: fileId }, include: { product: { select: { slug: true, category: true } } } });
  if (!arquivo || arquivo.status !== "ready" || arquivo.product.category !== "plugin" || !/\.jar$/i.test(arquivo.fileName)) {
    return new NextResponse("Arquivo não encontrado", { status: 404 });
  }
  try {
    const url = await linkDoJar({ licencaId: `previa-${adminId}`, comprador: adminId, plugin: arquivo.product.slug, arquivo });
    return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    return new NextResponse(e instanceof JarInvalido ? `Jar inválido: ${e.message}` : `Erro: ${(e as Error).message}`, { status: 400 });
  }
}
