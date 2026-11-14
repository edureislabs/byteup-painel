import { NextRequest, NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { siteUrl } from "@/lib/mercadopago";
import { checkoutLimited, generatePix, orderStatus, startPurchase } from "@/lib/storeCheckout";

/**
 * Loja dentro do Discord: o bot chama esta rota em nome de quem clicou no botão.
 * Só o bot entra: precisa do cabeçalho  Authorization: Bearer <BOT_API_SECRET>
 * (o mesmo valor no .env do bot e nas variáveis da Vercel).
 *
 * Corpo: { action: "start" | "pix" | "status", userId, productId?, orderId?, email? }
 */

const SNOWFLAKE = /^\d{15,22}$/;
const UUID = /^[0-9a-f-]{36}$/i;

function autorizado(req: NextRequest) {
  const secret = process.env.BOT_API_SECRET || "";
  const header = req.headers.get("authorization") || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (secret.length < 24 || token.length !== secret.length) return false;
  return timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

const json = (data: unknown, status = 200) =>
  NextResponse.json(data, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(req: NextRequest) {
  if (!process.env.BOT_API_SECRET) return json({ error: "BOT_API_SECRET não configurado no painel." }, 503);
  if (!autorizado(req)) return json({ error: "Não autorizado" }, 401);

  const body = await req.json().catch(() => ({}));
  const userId = String(body.userId || "");
  if (!SNOWFLAKE.test(userId)) return json({ error: "Usuário inválido." }, 400);

  switch (body.action) {
    case "start": {
      const productId = String(body.productId || "");
      if (!UUID.test(productId)) return json({ error: "Produto inválido." }, 400);
      if (checkoutLimited(userId)) return json({ error: "Muitas tentativas. Espere um minuto." }, 429);
      const r = await startPurchase(userId, productId);
      if (r.kind === "order") return json({ ...r, payUrl: `${siteUrl()}/loja/pagar/${r.orderId}` });
      return json(r);
    }
    case "pix": {
      const orderId = String(body.orderId || "");
      if (!UUID.test(orderId)) return json({ error: "Pedido inválido." }, 400);
      const r = await generatePix(userId, orderId, body.email || null);
      if (!r.ok) return json({ error: r.error, needEmail: Boolean(r.needEmail) }, r.status);
      if (r.approved) return json({ approved: true });
      return json({ approved: false, pix: r.pix });
    }
    case "status": {
      const orderId = String(body.orderId || "");
      if (!UUID.test(orderId)) return json({ error: "Pedido inválido." }, 400);
      const order = await orderStatus(userId, orderId);
      if (!order) return json({ error: "Pedido não encontrado." }, 404);
      return json({ status: order.status });
    }
    default:
      return json({ error: "Ação desconhecida." }, 400);
  }
}