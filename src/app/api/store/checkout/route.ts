import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkoutLimited, startPurchase } from "@/lib/storeCheckout";

/**
 * Inicia uma compra: { productId } -> { redirect }
 * - grátis: libera na hora;
 * - já comprado (download): manda para "Minhas compras";
 * - pago: cria o pedido e manda para a página de pagamento do site (/loja/pagar/...).
 * As regras ficam em lib/storeCheckout (as mesmas da loja dentro do Discord).
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Faça login com o Discord para comprar." }, { status: 401 });
  if (checkoutLimited(userId)) return NextResponse.json({ error: "Muitas tentativas. Espere um minuto." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const r = await startPurchase(userId, String(body.productId || ""));

  switch (r.kind) {
    case "unavailable":
      return NextResponse.json({ error: "Produto indisponível." }, { status: 404 });
    case "owned":
      return NextResponse.json({ redirect: "/loja/minhas-compras" });
    case "free":
      return NextResponse.json({ redirect: `/loja/minhas-compras?pedido=${r.orderId}` });
    case "not_configured":
      return NextResponse.json({ error: "Pagamentos ainda não configurados." }, { status: 503 });
    case "order":
      return NextResponse.json({ redirect: `/loja/pagar/${r.orderId}` });
  }
}
