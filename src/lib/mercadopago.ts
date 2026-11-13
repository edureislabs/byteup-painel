import { createHmac, timingSafeEqual } from "crypto";

/**
 * Mercado Pago (Checkout Pro): Pix e cartão.
 *
 * Variáveis na Vercel:
 *   MP_ACCESS_TOKEN    - Access Token de PRODUÇÃO (APP_USR-...). Para testes, o de teste.
 *   MP_WEBHOOK_SECRET  - "Assinatura secreta" da seção Webhooks em Suas integrações (opcional, recomendado)
 */

// MP_API_BASE só é usado em testes locais (servidor falso)
const API = process.env.MP_API_BASE || "https://api.mercadopago.com";

export const mercadoPagoConfigured = () => Boolean(process.env.MP_ACCESS_TOKEN);

export const siteUrl = () => (process.env.NEXTAUTH_URL || "https://byteup-painel.vercel.app").replace(/\/+$/, "");

async function mp<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}`,
      "Content-Type": "application/json",
      ...(init.headers || {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    console.error("[mercadopago]", path, res.status, JSON.stringify(data)?.slice(0, 500));
    throw new Error(`Mercado Pago respondeu ${res.status}`);
  }
  return data as T;
}

/** Cria o link de pagamento. Retorna a URL do checkout. */
export async function createPreference(order: {
  id: string;
  title: string;
  productId: string;
  totalCents: number;
}): Promise<{ id: string; url: string }> {
  const base = siteUrl();
  const pref = await mp<{ id: string; init_point: string; sandbox_init_point?: string }>("/checkout/preferences", {
    method: "POST",
    headers: { "X-Idempotency-Key": `order-${order.id}` },
    body: JSON.stringify({
      items: [
        {
          id: order.productId,
          title: order.title.slice(0, 250),
          quantity: 1,
          unit_price: order.totalCents / 100,
          currency_id: "BRL",
          category_id: "services",
        },
      ],
      external_reference: order.id,
      notification_url: `${base}/api/store/webhook/mercadopago?source_news=webhooks`,
      back_urls: {
        success: `${base}/loja/retorno?pedido=${order.id}`,
        pending: `${base}/loja/retorno?pedido=${order.id}`,
        failure: `${base}/loja/retorno?pedido=${order.id}`,
      },
      auto_return: "approved",
      statement_descriptor: "BYTEUP",
      // Sem boleto (demora dias para compensar); Pix e cartão
      payment_methods: { excluded_payment_types: [{ id: "ticket" }, { id: "atm" }], installments: 12 },
      // O link vale 24 h
      expires: true,
      expiration_date_to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    }),
  });
  const useSandbox = process.env.MP_ACCESS_TOKEN?.startsWith("TEST-");
  return { id: pref.id, url: (useSandbox && pref.sandbox_init_point) || pref.init_point };
}

export type MpPayment = {
  id: number;
  status: string; // approved | pending | in_process | rejected | cancelled | refunded | charged_back
  status_detail?: string;
  external_reference?: string | null;
  transaction_amount: number;
  currency_id: string;
  payment_type_id?: string;
};

export async function getPayment(paymentId: string): Promise<MpPayment> {
  if (!/^\d{1,20}$/.test(paymentId)) throw new Error("payment id inválido");
  return mp<MpPayment>(`/v1/payments/${paymentId}`);
}

/**
 * Confere a assinatura do webhook (x-signature).
 * Retorna true/false, ou null quando não dá para conferir (sem segredo ou sem header).
 * Mesmo assim, o pagamento SEMPRE é confirmado consultando a API do Mercado Pago.
 */
export function verifyWebhookSignature(opts: {
  xSignature: string | null;
  xRequestId: string | null;
  dataId: string | null;
}): boolean | null {
  const secret = process.env.MP_WEBHOOK_SECRET;
  if (!secret || !opts.xSignature) return null;

  let ts = "";
  let v1 = "";
  for (const part of opts.xSignature.split(",")) {
    const [k, v] = part.split("=").map((s) => s?.trim());
    if (k === "ts") ts = v || "";
    if (k === "v1") v1 = v || "";
  }
  if (!ts || !v1) return false;

  const parts: string[] = [];
  if (opts.dataId) parts.push(`id:${/^[a-z0-9]+$/i.test(opts.dataId) ? opts.dataId.toLowerCase() : opts.dataId}`);
  if (opts.xRequestId) parts.push(`request-id:${opts.xRequestId}`);
  parts.push(`ts:${ts}`);
  const manifest = parts.join(";") + ";";

  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const a = Buffer.from(expected);
  const b = Buffer.from(v1);
  return a.length === b.length && timingSafeEqual(a, b);
}