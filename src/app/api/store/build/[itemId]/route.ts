import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { siteUrl } from "@/lib/mercadopago";
import { buildBotZip } from "@/lib/builder/build";
import { botItemIdOf, ownedBot } from "@/lib/builder/owned";

/**
 * Download do "Monte o seu bot": monta o .zip na hora com os módulos do pedido.
 * Só para quem comprou (pedido pago) ou admin.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ itemId: string }> }) {
  const { itemId } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.redirect(new URL("/login", process.env.NEXTAUTH_URL || "http://localhost:3000"));
  if (!/^[0-9a-f-]{36}$/i.test(itemId)) return new NextResponse("Pedido não encontrado", { status: 404 });

  const item = await prisma.storeOrderItem.findUnique({
    where: { id: itemId },
    include: { order: { select: { userId: true, status: true } } },
  });
  const botItemId = item && !item.productId ? botItemIdOf(item) : null;
  const admin = isAdmin(userId);
  if (!item || !botItemId || (item.order.userId !== userId && !admin)) return new NextResponse("Pedido não encontrado", { status: 404 });
  if (item.order.status !== "paid" && !admin) return new NextResponse("Este pedido não está pago.", { status: 403 });

  // sempre o bot completo: o original + todos os módulos adicionados depois
  const bot = await ownedBot(botItemId, item.order.userId, { admin });
  if (!bot) return new NextResponse("Este pedido não está pago.", { status: 403 });
  const zip = buildBotZip(bot.options, siteUrl());
  return new NextResponse(new Uint8Array(zip.buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zip.fileName}"`,
      "Content-Length": String(zip.buffer.length),
      "Cache-Control": "private, no-store",
    },
  });
}
