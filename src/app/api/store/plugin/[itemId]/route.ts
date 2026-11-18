import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { r2Configured, presignGet } from "@/lib/r2";
import { linkDoJar } from "@/lib/mc/entrega";
import { JarInvalido } from "@/lib/mc/montarPlugin";

/**
 * Download de um plugin: GET /api/store/plugin/<item do pedido>?arquivo=<id do arquivo .jar>
 * - Plugin PAGO (preço > 0): monta o jar com a licença de quem comprou (o código vai trancado no plugin.pack).
 * - Plugin GRÁTIS (preço = 0): entrega o jar do jeito que foi enviado (não usa o porteiro, não tem licença).
 */
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const arquivoId = new URL(req.url).searchParams.get("arquivo") || "";
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL || "http://localhost:3000"));
  if (!/^[0-9a-f-]{36}$/i.test(itemId) || !/^[0-9a-f-]{36}$/i.test(arquivoId) || !r2Configured()) {
    return new NextResponse("Arquivo não encontrado", { status: 404 });
  }

  const item = await prisma.storeOrderItem.findUnique({
    where: { id: itemId },
    select: {
      order: { select: { userId: true, status: true } },
      product: { select: { id: true, slug: true, category: true, priceCents: true } },
    },
  });
  const admin = isAdmin(userId);
  if (!item?.product || item.product.category !== "plugin" || (item.order.userId !== userId && !admin)) {
    return new NextResponse("Pedido não encontrado", { status: 404 });
  }
  if (item.order.status !== "paid") return new NextResponse("Este pedido não está pago.", { status: 403 });
  const estado = await prisma.mcLicenca.findUnique({ where: { itemId } });
  if (estado?.bloqueada && !admin) return new NextResponse("Esta licença está bloqueada. Abra um ticket no nosso Discord.", { status: 403 });

  const arquivo = await prisma.storeProductFile.findUnique({ where: { id: arquivoId } });
  if (!arquivo || arquivo.productId !== item.product.id || arquivo.status !== "ready" || !/\.jar$/i.test(arquivo.fileName)) {
    return new NextResponse("Arquivo não encontrado", { status: 404 });
  }

  const gratis = item.product.priceCents === 0;
  try {
    const url = gratis
      ? await presignGet(arquivo.key, { fileName: arquivo.fileName, expiresIn: 3600 })
      : await linkDoJar({ licencaId: itemId, comprador: item.order.userId, plugin: item.product.slug, arquivo });
    return NextResponse.redirect(url, { status: 302, headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("[plugin] entrega", itemId, gratis ? "(grátis)" : "(pago)", e);
    const msg = e instanceof JarInvalido ? "O arquivo deste plugin está sendo atualizado." : "Não consegui preparar o seu arquivo agora.";
    return new NextResponse(`${msg} Tente de novo em instantes ou abra um ticket no nosso Discord.`, { status: 500 });
  }
}