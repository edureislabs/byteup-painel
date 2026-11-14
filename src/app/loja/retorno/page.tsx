import type { Metadata } from "next";
import Link from "next/link";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import LandingNavbar from "../../components/LandingNavbar";
import LandingFooter from "../../components/LandingFooter";
import { prisma } from "@/lib/prisma";
import { mercadoPagoConfigured } from "@/lib/mercadopago";
import { syncMercadoPagoPayment } from "@/lib/storeOrders";
import { stripeConfigured, syncStripeSession } from "@/lib/stripe";
import { formatPrice } from "@/lib/storeShared";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pagamento | Loja ByteUP", robots: { index: false } };

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) ?? "";

/**
 * Para onde o Mercado Pago manda o cliente depois de pagar.
 * Confere o pagamento direto na API (não espera o webhook).
 */
export default async function RetornoPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const orderId = one(sp.pedido);
  const paymentId = one(sp.payment_id) || one(sp.collection_id);

  if (paymentId && /^\d+$/.test(paymentId) && mercadoPagoConfigured()) {
    try {
      await syncMercadoPagoPayment(paymentId);
    } catch (err) {
      console.error("[loja/retorno]", err);
    }
  }

  // Volta da Stripe: confere a sessão direto (não espera o webhook)
  const stripeSession = one(sp.stripe_session);
  if (/^cs_[A-Za-z0-9_]+$/.test(stripeSession) && stripeConfigured()) {
    try {
      await syncStripeSession(stripeSession);
    } catch (err) {
      console.error("[loja/retorno stripe]", err);
    }
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  const order =
    /^[0-9a-f-]{36}$/i.test(orderId) && userId
      ? await prisma.storeOrder.findFirst({ where: { id: orderId, userId }, include: { items: true } })
      : null;

  const status = order?.status ?? "desconhecido";
  const view = {
    paid: { emoji: "✅", title: "Pagamento aprovado!", text: "Pronto! Enviamos uma mensagem na sua DM do Discord. Seus downloads já estão liberados." },
    pending: { emoji: "⏳", title: "Aguardando pagamento", text: "Assim que o Mercado Pago confirmar (o Pix costuma levar segundos), liberamos sua compra e avisamos na DM. Esta página atualiza sozinha." },
    failed: { emoji: "❌", title: "Pagamento não aprovado", text: "O pagamento foi recusado ou cancelado. Nada foi cobrado. Você pode tentar de novo com outro meio." },
    cancelled: { emoji: "❌", title: "Pedido cancelado", text: "Este pedido foi cancelado. Você pode fazer uma nova compra." },
    refunded: { emoji: "↩️", title: "Pedido reembolsado", text: "Este pagamento foi devolvido." },
    desconhecido: { emoji: "🔎", title: "Pedido não encontrado", text: "Entre com a conta do Discord que fez a compra para ver o pedido." },
  }[status] ?? { emoji: "🔎", title: "Pedido", text: "" };

  return (
    <main className="min-h-screen text-white">
      {/* Atualiza a cada 6 s enquanto o pagamento não confirma */}
      {status === "pending" && <meta httpEquiv="refresh" content="6" />}
      <LandingNavbar />
      <section className="site-section-sm pb-24">
        <div className="site-container max-w-xl">
          <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center">
            <div className="text-5xl">{view.emoji}</div>
            <h1 className="mt-4 text-2xl font-black">{view.title}</h1>
            <p className="mt-3 text-sm leading-6 text-[#aaa3b5]">{view.text}</p>

            {order && (
              <div className="mt-6 rounded-2xl border border-white/10 bg-black/20 p-4 text-left text-sm">
                {order.items.map((i) => (
                  <div key={i.id} className="flex justify-between gap-3">
                    <span>{i.nameSnapshot}</span>
                    <span className="font-bold">{i.priceCents ? formatPrice(i.priceCents) : "Grátis"}</span>
                  </div>
                ))}
                <div className="mt-2 text-xs text-[#7d7588]">Pedido {order.id}</div>
              </div>
            )}

            <div className="mt-6 flex flex-col gap-2">
              {status === "pending" && order?.checkoutUrl && (
                <a href={order.checkoutUrl} className="site-button-secondary justify-center px-5 py-3 text-sm">Voltar ao pagamento</a>
              )}
              <Link href="/loja/minhas-compras" className="site-button-primary justify-center px-5 py-3 text-sm">Minhas compras</Link>
              <Link href="/loja" className="text-sm text-[#7d7588] hover:text-white">Voltar para a loja</Link>
            </div>
          </div>
        </div>
      </section>
      <LandingFooter />
    </main>
  );
}
