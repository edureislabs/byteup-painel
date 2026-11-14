import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { checkoutLimited, startBuilderPurchase } from "@/lib/storeCheckout";

/**
 * "Monte o seu bot": { modules: string[], botName: string, color?: string } -> { redirect }
 * Cria o pedido e manda para a página de pagamento. O preço é calculado no servidor.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Faça login com o Discord para comprar." }, { status: 401 });
  if (checkoutLimited(userId)) return NextResponse.json({ error: "Muitas tentativas. Espere um minuto." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const r = await startBuilderPurchase(userId, { modules: body.modules, botName: body.botName, color: body.color });

  switch (r.kind) {
    case "invalid":
      return NextResponse.json({ error: r.error }, { status: 400 });
    case "not_configured":
      return NextResponse.json({ error: "Pagamentos ainda não configurados." }, { status: 503 });
    case "order":
      return NextResponse.json({ redirect: `/loja/pagar/${r.orderId}` });
  }
}
