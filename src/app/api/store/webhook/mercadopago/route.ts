import { NextRequest, NextResponse } from "next/server";
import { verifyWebhookSignature } from "@/lib/mercadopago";
import { syncMercadoPagoPayment } from "@/lib/storeOrders";

/**
 * Notificações do Mercado Pago.
 * Nunca confia no corpo da notificação: só usa o ID para consultar o
 * pagamento na API com o nosso Access Token.
 */
export async function POST(req: NextRequest) {
  const url = req.nextUrl;
  const body = await req.json().catch(() => ({} as Record<string, unknown>));

  const type = url.searchParams.get("type") || url.searchParams.get("topic") || String((body as { type?: string }).type || "");
  const dataId =
    url.searchParams.get("data.id") ||
    url.searchParams.get("id") ||
    String(((body as { data?: { id?: unknown } }).data?.id ?? "") || "");

  const sig = verifyWebhookSignature({
    xSignature: req.headers.get("x-signature"),
    xRequestId: req.headers.get("x-request-id"),
    dataId: url.searchParams.get("data.id") || dataId || null,
  });
  if (sig === false) return NextResponse.json({ error: "assinatura inválida" }, { status: 401 });

  if (type !== "payment" || !/^\d{1,20}$/.test(dataId)) {
    return NextResponse.json({ ok: true, ignored: true });
  }

  try {
    const r = await syncMercadoPagoPayment(dataId);
    return NextResponse.json({ ok: true, ...r });
  } catch (err) {
    console.error("[loja/webhook]", dataId, err);
    // 500 faz o Mercado Pago tentar de novo mais tarde
    return NextResponse.json({ error: "falha temporária" }, { status: 500 });
  }
}