import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { presignGet, r2Configured } from "@/lib/r2";

/**
 * Imagem de capa de um produto. O bucket é privado, então redireciona
 * para um link assinado. O navegador guarda o redirecionamento por ~50 min.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ productId: string }> }) {
  const { productId } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(productId) || !r2Configured()) {
    return new NextResponse(null, { status: 404 });
  }

  const product = await prisma.storeProduct.findUnique({ where: { id: productId }, select: { imageKey: true } });
  if (!product?.imageKey) return new NextResponse(null, { status: 404 });

  const url = await presignGet(product.imageKey, { expiresIn: 3600 });
  return NextResponse.redirect(url, {
    status: 302,
    headers: { "Cache-Control": "public, max-age=3000" },
  });
}