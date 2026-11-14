import { NextRequest, NextResponse } from "next/server";
import type Stripe from "stripe";
import { prisma } from "@/lib/prisma";
import { stripe, syncStripeSession } from "@/lib/stripe";

/**
 * Webhook da Stripe. A assinatura é conferida com STRIPE_WEBHOOK_SECRET;
 * sem ela, nada é aceito.
 *
 * Eventos usados:
 *   checkout.session.completed / checkout.session.async_payment_succeeded -> libera
 *   charge.refunded -> marca como reembolsado
 */
export async function POST(req: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers.get("stripe-signature");
  if (!secret || !signature) return NextResponse.json({ error: "sem assinatura" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe().webhooks.constructEvent(raw, signature, secret);
  } catch {
    return NextResponse.json({ error: "assinatura inválida" }, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "checkout.session.async_payment_succeeded":
        await syncStripeSession(event.data.object as Stripe.Checkout.Session);
        break;
      case "charge.refunded": {
        const charge = event.data.object as Stripe.Charge;
        const pi = typeof charge.payment_intent === "string" ? charge.payment_intent : charge.payment_intent?.id;
        if (pi && charge.refunded) {
          await prisma.storeOrder.updateMany({
            where: { provider: "stripe", providerRef: pi, status: "paid" },
            data: { status: "refunded" },
          });
        }
        break;
      }
    }
    return NextResponse.json({ received: true });
  } catch (err) {
    console.error("[loja/webhook-stripe]", event.type, err);
    // 500 faz a Stripe tentar de novo mais tarde
    return NextResponse.json({ error: "falha temporária" }, { status: 500 });
  }
}
