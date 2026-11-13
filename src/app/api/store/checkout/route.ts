import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { createPreference, mercadoPagoConfigured } from "@/lib/mercadopago";
import { markOrderPaid, userOwnsProduct } from "@/lib/storeOrders";

/**
 * Inicia uma compra: { productId } -> { redirect }
 * - grátis: libera na hora;
 * - já comprado (download): manda para "Minhas compras";
 * - pago: cria o pedido e devolve o link do Mercado Pago.
 */

// Limite simples: 10 tentativas por minuto por usuário
const attempts = new Map<string, number[]>();
function limited(userId: string) {
  const now = Date.now();
  const list = (attempts.get(userId) || []).filter((t) => now - t < 60_000);
  list.push(now);
  attempts.set(userId, list);
  if (attempts.size > 5000) attempts.clear();
  return list.length > 10;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Faça login com o Discord para comprar." }, { status: 401 });
  if (limited(userId)) return NextResponse.json({ error: "Muitas tentativas. Espere um minuto." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const productId = String(body.productId || "");
  const product = await prisma.storeProduct.findUnique({ where: { id: productId } });
  if (!product || !product.active) return NextResponse.json({ error: "Produto indisponível." }, { status: 404 });

  if (product.kind === "download" && (await userOwnsProduct(userId, product.id))) {
    return NextResponse.json({ redirect: "/loja/minhas-compras" });
  }

  // Grátis: pedido pago na hora
  if (product.priceCents === 0) {
    const order = await prisma.storeOrder.create({
      data: {
        userId,
        totalCents: 0,
        provider: "gratis",
        items: { create: { productId: product.id, nameSnapshot: product.name, priceCents: 0 } },
      },
    });
    await markOrderPaid(order.id, "gratis", null);
    return NextResponse.json({ redirect: `/loja/minhas-compras?pedido=${order.id}` });
  }

  if (!mercadoPagoConfigured()) {
    return NextResponse.json({ error: "Pagamentos ainda não configurados." }, { status: 503 });
  }

  // Reaproveita um pedido pendente recente do mesmo produto (evita vários pedidos abertos)
  const recent = await prisma.storeOrder.findFirst({
    where: {
      userId,
      status: "pending",
      totalCents: product.priceCents,
      createdAt: { gt: new Date(Date.now() - 20 * 60 * 60 * 1000) },
      items: { some: { productId: product.id } },
      checkoutUrl: { not: null },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent?.checkoutUrl) return NextResponse.json({ redirect: recent.checkoutUrl });

  const order = await prisma.storeOrder.create({
    data: {
      userId,
      totalCents: product.priceCents,
      provider: "mercadopago",
      items: { create: { productId: product.id, nameSnapshot: product.name, priceCents: product.priceCents } },
    },
  });

  try {
    const pref = await createPreference({ id: order.id, title: product.name, productId: product.id, totalCents: product.priceCents });
    await prisma.storeOrder.update({ where: { id: order.id }, data: { checkoutUrl: pref.url } });
    return NextResponse.json({ redirect: pref.url });
  } catch (err) {
    console.error("[loja/checkout]", err);
    await prisma.storeOrder.update({ where: { id: order.id }, data: { status: "cancelled" } });
    return NextResponse.json({ error: "Não foi possível iniciar o pagamento. Tente de novo." }, { status: 502 });
  }
}