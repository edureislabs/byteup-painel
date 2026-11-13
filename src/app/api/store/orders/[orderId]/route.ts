import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { syncMercadoPagoPayment } from "@/lib/storeOrders";

/** Status do pedido (a página de pagamento consulta enquanto espera o Pix). */
export async function GET(_req: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Não autorizado" }, { status: 401 });

  let order = await prisma.storeOrder.findFirst({
    where: { id: orderId, userId },
    select: { status: true, providerRef: true, provider: true },
  });
  if (!order) return NextResponse.json({ error: "Pedido não encontrado" }, { status: 404 });

  // Se o webhook atrasar, confere direto no Mercado Pago
  if (order.status === "pending" && order.provider === "mercadopago" && order.providerRef) {
    try {
      await syncMercadoPagoPayment(order.providerRef);
      order = await prisma.storeOrder.findFirst({
        where: { id: orderId, userId },
        select: { status: true, providerRef: true, provider: true },
      });
    } catch {
      // tenta de novo na próxima consulta
    }
  }
  return NextResponse.json(order, { headers: { "Cache-Control": "no-store" } });
}