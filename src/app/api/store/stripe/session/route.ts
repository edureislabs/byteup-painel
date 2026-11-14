import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { createStripeSession, stripeConfigured } from "@/lib/stripe";

/** Cria a sessão da Stripe para um pedido do usuário logado. */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Faça login para pagar." }, { status: 401 });
  if (!stripeConfigured()) return NextResponse.json({ error: "Pagamento internacional indisponível." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const order = await prisma.storeOrder.findFirst({
    where: { id: String(body.orderId || ""), userId },
    include: { items: true },
  });
  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  if (order.status !== "pending" && order.status !== "failed") {
    return NextResponse.json({ error: "Este pedido não pode mais ser pago." }, { status: 409 });
  }
  // A Stripe não aceita cobranças muito baixas (mínimo de R$ 0,50)
  if (order.totalCents < 50) return NextResponse.json({ error: "Valor abaixo do mínimo da Stripe." }, { status: 400 });

  try {
    const clientSecret = await createStripeSession({
      id: order.id,
      title: order.items.map((i) => i.nameSnapshot).join(", ") || "Loja ByteUP",
      totalCents: order.totalCents,
      email: session?.user?.email,
    });
    return NextResponse.json({ clientSecret });
  } catch (err) {
    console.error("[loja/stripe]", order.id, err);
    return NextResponse.json({ error: "Não foi possível abrir o pagamento internacional." }, { status: 502 });
  }
}
