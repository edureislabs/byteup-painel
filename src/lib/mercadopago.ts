import { createHmac, randomUUID, timingSafeEqual } from "crypto";

/**
 * Mercado Pago (Checkout Bricks): Pix e cartão dentro do site.
 *
 * Variáveis na Vercel:
 *   MP_ACCESS_TOKEN    - Access Token de PRODUÇÃO (APP_USR-...). Secreto!
 *   MP_PUBLIC_KEY      - Public Key de produção (pode aparecer no site, é usada pelo formulário de pagamento)
 *   MP_WEBHOOK_SECRET  - "Assinatura secreta" da seção Webhooks em Suas integrações (opcional, recomendado)
 */

// MP_API_BASE só é usado em testes locais (servidor falso)
const API = process.env.MP_API_BASE || "https://api.mercadopago.com";

export const mercadoPagoConfigured = () => Boolean(process.env.MP_ACCESS_TOKEN && process.env.MP_PUBLIC_KEY);

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

export type MpPaymentInput = {
  token?: string;
  issuer_id?: string | number;
  payment_method_id: string;
  installments?: number;
  payer: {
    email: string;
    first_name?: string;
    last_name?: string;
    identification?: { type?: string; number?: string };
  };
};

/**
 * Cria o pagamento com os dados que o Payment Brick devolveu.
 * Valor, descrição e pedido vêm SEMPRE do servidor, nunca do navegador.
 */
export async function createPayment(input: MpPaymentInput, order: { id: string; title: string; totalCents: number }) {
  const isPix = input.payment_method_id === "pix";
  return mp<MpPayment>("/v1/payments", {
    method: "POST",
    headers: { "X-Idempotency-Key": randomUUID() },
    body: JSON.stringify({
      ...input,
      transaction_amount: order.totalCents / 100,
      description: order.title.slice(0, 250),
      external_reference: order.id,
      notification_url: `${siteUrl()}/api/store/webhook/mercadopago?source_news=webhooks`,
      statement_descriptor: "BYTEUP",
      // QR code do Pix vale 30 minutos
      ...(isPix ? { date_of_expiration: new Date(Date.now() + 30 * 60 * 1000).toISOString() } : {}),
    }),
  });
}

/** Mensagem amigável para pagamentos recusados. */
export function rejectionMessage(detail?: string): string {
  const map: Record<string, string> = {
    cc_rejected_insufficient_amount: "Saldo ou limite insuficiente.",
    cc_rejected_bad_filled_security_code: "Código de segurança (CVV) incorreto.",
    cc_rejected_bad_filled_date: "Data de validade incorreta.",
    cc_rejected_bad_filled_card_number: "Número do cartão incorreto.",
    cc_rejected_bad_filled_other: "Confira os dados do cartão.",
    cc_rejected_call_for_authorize: "O banco pediu autorização: ligue para o seu banco e tente de novo.",
    cc_rejected_card_disabled: "Cartão bloqueado ou desativado. Fale com o seu banco.",
    cc_rejected_duplicated_payment: "Você já fez um pagamento igual há pouco.",
    cc_rejected_high_risk: "Pagamento recusado pela análise de segurança. Tente o Pix ou outro cartão.",
    cc_rejected_max_attempts: "Muitas tentativas com este cartão. Use outro meio.",
  };
  return (detail && map[detail]) || "Pagamento recusado. Tente outro cartão ou pague com Pix.";
}

export type MpPayment = {
  id: number;
  status: string; // approved | pending | in_process | rejected | cancelled | refunded | charged_back
  status_detail?: string;
  external_reference?: string | null;
  transaction_amount: number;
  currency_id: string;
  payment_type_id?: string;
  payment_method_id?: string;
  date_of_expiration?: string | null;
  point_of_interaction?: { transaction_data?: { qr_code?: string; qr_code_base64?: string; ticket_url?: string } };
};

export async function getPayment(paymentId: string): Promise<MpPayment> {
  if (!/^\d{1,20}$/.test(paymentId)) throw new Error("payment id inválido");
  return mp<MpPayment>(`/v1/payments/${paymentId}`);
}

/** Cancela um pagamento pendente (ex.: Pix ainda não pago). Não dá erro se já não puder. */
export async function cancelPayment(paymentId: string): Promise<boolean> {
  if (!/^\d{1,20}$/.test(paymentId)) return false;
  try {
    await mp(`/v1/payments/${paymentId}`, { method: "PUT", body: JSON.stringify({ status: "cancelled" }) });
    return true;
  } catch {
    return false;
  }
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