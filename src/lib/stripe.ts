import Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { siteUrl } from "@/lib/mercadopago";
import { markOrderPaid } from "@/lib/storeOrders";

/**
 * Stripe: cartão internacional (aba "Internacional" na página de pagamento).
 *
 * Variáveis na Vercel:
 *   STRIPE_SECRET_KEY       - chave secreta (sk_live_...). Secreta!
 *   STRIPE_PUBLISHABLE_KEY  - chave publicável (pk_live_...). Pode aparecer no site.
 *   STRIPE_WEBHOOK_SECRET   - segredo do webhook (whsec_...)
 */

export const stripeConfigured = () =>
  Boolean(process.env.STRIPE_SECRET_KEY && process.env.STRIPE_PUBLISHABLE_KEY && process.env.STRIPE_WEBHOOK_SECRET);

let client: Stripe | null = null;
export function stripe(): Stripe {
  if (!process.env.STRIPE_SECRET_KEY) throw new Error("Stripe não configurada");
  if (!client) client = new Stripe(process.env.STRIPE_SECRET_KEY, { maxNetworkRetries: 2, timeout: 10_000 });
  return client;
}

/** Cria a sessão de pagamento embutida no site. Devolve o client_secret. */
export async function createStripeSession(order: {
  id: string;
  title: string;
  totalCents: number;
  email?: string | null;
}): Promise<string> {
  const session = await stripe().checkout.sessions.create(
    {
      ui_mode: "embedded_page",
      mode: "payment",
      line_items: [
        {
          quantity: 1,
          price_data: {
            currency: "brl",
            unit_amount: order.totalCents,
            product_data: { name: order.title.slice(0, 250) },
          },
        },
      ],
      client_reference_id: order.id,
      metadata: { orderId: order.id },
      payment_intent_data: { metadata: { orderId: order.id }, statement_descriptor_suffix: "BYTEUP" },
      customer_email: order.email || undefined,
      return_url: `${siteUrl()}/loja/retorno?pedido=${order.id}&stripe_session={CHECKOUT_SESSION_ID}`,
      // A sessão vale 1 hora
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    },
    { idempotencyKey: `order-${order.id}-${Math.floor(Date.now() / 60_000)}` }
  );
  if (!session.client_secret) throw new Error("Stripe não devolveu client_secret");
  return session.client_secret;
}

/** Confere uma sessão na Stripe e, se estiver paga, libera o pedido. */
export async function syncStripeSession(sessionOrId: string | Stripe.Checkout.Session) {
  const session =
    typeof sessionOrId === "string" ? await stripe().checkout.sessions.retrieve(sessionOrId) : sessionOrId;
  const orderId = session.metadata?.orderId || session.client_reference_id || "";
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return { orderId: null, status: session.payment_status };

  if (session.payment_status === "paid") {
    const order = await prisma.storeOrder.findUnique({ where: { id: orderId } });
    if (!order) return { orderId: null, status: "paid" };
    // Confere valor e moeda: nunca confiar só no "pago"
    if (session.currency !== "brl" || (session.amount_total ?? 0) < order.totalCents) {
      console.error("[stripe] valor pago diferente do pedido", orderId, session.amount_total, order.totalCents);
      return { orderId, status: "valor_divergente" };
    }
    const paymentIntent =
      typeof session.payment_intent === "string" ? session.payment_intent : session.payment_intent?.id ?? session.id;
    await markOrderPaid(orderId, "stripe", paymentIntent);
  }
  return { orderId, status: session.payment_status };
}

/** Tem pelo menos uma forma de pagamento configurada? */
export const anyPaymentConfigured = () => Boolean(process.env.MP_ACCESS_TOKEN && process.env.MP_PUBLIC_KEY) || stripeConfigured();
