import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import LandingNavbar from "../../../components/LandingNavbar";
import LandingFooter from "../../../components/LandingFooter";
import { prisma } from "@/lib/prisma";
import { mercadoPagoConfigured } from "@/lib/mercadopago";
import { anyPaymentConfigured, stripeConfigured } from "@/lib/stripe";
import { formatPrice, productImageUrl, storeCategoryLabel } from "@/lib/storeShared";
import { BUILDER_BASE, builderModule, readBuilderOptions, readUpgradeOptions } from "@/lib/builder/catalog";
import PaymentForm from "./PaymentForm";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Pagamento | Loja ByteUP", robots: { index: false } };

export default async function PagarPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/login");
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) notFound();

  const order = await prisma.storeOrder.findFirst({
    where: { id: orderId, userId },
    include: { items: { include: { product: { select: { id: true, imageKey: true, category: true, slug: true } } } } },
  });
  if (!order) notFound();
  if (order.status === "paid") redirect(`/loja/minhas-compras?pedido=${order.id}`);

  const payable = (order.status === "pending" || order.status === "failed") && anyPaymentConfigured();
  const item = order.items[0];
  const image = item?.product ? productImageUrl(item.product.id, item.product.imageKey) : null;
  const cat = storeCategoryLabel(item?.product?.category ?? "bot");
  const bot = item && !item.productId ? readBuilderOptions(item.options) : null;
  const upgrade = item && !item.productId ? readUpgradeOptions(item.options) : null;

  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />
      <section className="site-section-sm pb-24">
        <div className="site-container max-w-5xl">
          {item?.product && (
            <Link href={`/loja/${item.product.slug}`} className="text-sm text-[#7d7588] hover:text-white">← Voltar ao produto</Link>
          )}
          {bot && (
            <Link href="/loja/monte-o-seu" className="text-sm text-[#7d7588] hover:text-white">← Voltar ao Monte o seu bot</Link>
          )}
          {upgrade && (
            <Link href={`/loja/monte-o-seu?bot=${upgrade.botItemId}`} className="text-sm text-[#7d7588] hover:text-white">← Voltar aos módulos</Link>
          )}
          <h1 className="mt-4 text-3xl font-black">Pagamento</h1>

          <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_340px]">
            <div className="order-2 lg:order-1">
              {payable ? (
                <PaymentForm
                  publicKey={mercadoPagoConfigured() ? process.env.MP_PUBLIC_KEY! : null}
                  stripeKey={stripeConfigured() ? process.env.STRIPE_PUBLISHABLE_KEY! : null}
                  orderId={order.id}
                  amount={order.totalCents / 100}
                />
              ) : (
                <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-8 text-center text-[#aaa3b5]">
                  {order.status === "cancelled" || order.status === "refunded"
                    ? "Este pedido não pode mais ser pago. Faça uma nova compra pela loja."
                    : "Os pagamentos estão temporariamente indisponíveis. Tente mais tarde."}
                  <div className="mt-4">
                    <Link href="/loja" className="text-[#d9b4ff] underline">Ir para a loja</Link>
                  </div>
                </div>
              )}
            </div>

            <aside className="order-1 h-fit rounded-3xl border border-white/10 bg-white/[0.03] p-5 lg:order-2 lg:sticky lg:top-24">
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="aspect-video w-full rounded-2xl border border-white/10 object-cover" />
              ) : (
                <div className="grid aspect-video w-full place-items-center rounded-2xl bg-gradient-to-br from-[#b64cff]/25 to-[#08070a] text-5xl">
                  {cat.emoji}
                </div>
              )}
              <div className="mt-4 space-y-2 text-sm">
                {order.items.map((i) => (
                  <div key={i.id} className="flex justify-between gap-3">
                    <span className="font-bold">{i.nameSnapshot}</span>
                    <span>{formatPrice(i.priceCents)}</span>
                  </div>
                ))}
                {bot && (
                  <ul className="space-y-1 border-l border-white/10 pl-3 text-xs text-[#aaa3b5]">
                    <li className="flex justify-between gap-3">
                      <span>⚙️ {BUILDER_BASE.name}</span>
                      <span>{formatPrice(bot.precos?.base ?? BUILDER_BASE.priceCents)}</span>
                    </li>
                    {bot.modulos.map((id) => (
                      <li key={id} className="flex justify-between gap-3">
                        <span>
                          {builderModule(id)?.emoji} {builderModule(id)?.name ?? id}
                        </span>
                        <span>{formatPrice(bot.precos?.[id] ?? builderModule(id)?.priceCents ?? 0)}</span>
                      </li>
                    ))}
                  </ul>
                )}
                {upgrade && (
                  <ul className="space-y-1 border-l border-white/10 pl-3 text-xs text-[#aaa3b5]">
                    {upgrade.modulos.map((id) => (
                      <li key={id} className="flex justify-between gap-3">
                        <span>
                          ➕ {builderModule(id)?.emoji} {builderModule(id)?.name ?? id}
                        </span>
                        <span>{formatPrice(upgrade.precos?.[id] ?? builderModule(id)?.priceCents ?? 0)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
                <span className="text-sm text-[#aaa3b5]">Total</span>
                <span className="text-2xl font-black">{formatPrice(order.totalCents)}</span>
              </div>
              <ul className="mt-4 space-y-1.5 text-xs text-[#7d7588]">
                <li>🔒 Pagamento seguro via Mercado Pago ou Stripe</li>
                <li>⚡ Liberação automática após a aprovação</li>
                <li>💬 Aviso na sua DM do Discord</li>
              </ul>
              <p className="mt-4 text-[11px] text-[#5c5566]">Pedido {order.id}</p>
            </aside>
          </div>
        </div>
      </section>
      <LandingFooter />
    </main>
  );
}
