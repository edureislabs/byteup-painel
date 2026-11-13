import { prisma } from "@/lib/prisma";
import { getPayment, siteUrl } from "@/lib/mercadopago";
import { formatPrice } from "@/lib/storeshared";

/**
 * Pedidos da loja: confirmação de pagamento e entrega.
 * Usado pelo webhook do Mercado Pago e pela página de retorno
 * (as duas podem chegar ao mesmo tempo, então tudo aqui é idempotente).
 */

const DISCORD_API = "https://discord.com/api/v10";

/** Consulta o pagamento no Mercado Pago e atualiza o pedido. */
export async function syncMercadoPagoPayment(paymentId: string) {
  const payment = await getPayment(paymentId);
  const orderId = payment.external_reference || "";
  if (!/^[0-9a-f-]{36}$/i.test(orderId)) return { orderId: null, status: payment.status };

  const order = await prisma.storeOrder.findUnique({ where: { id: orderId } });
  if (!order) return { orderId: null, status: payment.status };

  if (payment.status === "approved") {
    // Confere valor e moeda: nunca confiar só no "aprovado"
    const paidCents = Math.round(Number(payment.transaction_amount) * 100);
    if (payment.currency_id !== "BRL" || paidCents < order.totalCents) {
      console.error("[loja] valor pago diferente do pedido", orderId, paidCents, order.totalCents);
      return { orderId, status: "valor_divergente" };
    }
    await markOrderPaid(orderId, "mercadopago", String(payment.id));
  } else if (payment.status === "refunded" || payment.status === "charged_back") {
    await prisma.storeOrder.updateMany({
      where: { id: orderId, providerRef: String(payment.id) },
      data: { status: "refunded" },
    });
  } else if ((payment.status === "rejected" || payment.status === "cancelled") && order.status === "pending") {
    // O cliente pode tentar outro meio no mesmo link; só marca falha se ainda não pagou
    await prisma.storeOrder.updateMany({ where: { id: orderId, status: "pending" }, data: { status: "failed" } });
  }

  return { orderId, status: payment.status };
}

/** Marca como pago (só uma vez) e entrega. */
export async function markOrderPaid(orderId: string, provider: string, providerRef: string | null) {
  const updated = await prisma.storeOrder.updateMany({
    where: { id: orderId, status: { in: ["pending", "failed"] } },
    data: { status: "paid", provider, providerRef, paidAt: new Date() },
  });
  if (updated.count === 0) return false; // já estava pago: não entrega duas vezes
  await deliverOrder(orderId);
  return true;
}

/** Avisa o comprador na DM com o link de "Minhas compras". */
export async function deliverOrder(orderId: string) {
  const order = await prisma.storeOrder.findUnique({
    where: { id: orderId },
    include: { items: { include: { product: { select: { kind: true, slug: true } } } } },
  });
  if (!order || order.status !== "paid") return;

  const base = siteUrl();
  const hasService = order.items.some((i) => i.product?.kind === "servico");
  const lines = order.items.map((i) => `• **${i.nameSnapshot}**${i.priceCents ? ` — ${formatPrice(i.priceCents)}` : ""}`);

  const embed = {
    title: "✅ Compra confirmada!",
    color: 0xa855f7,
    description: [
      "Obrigado por comprar na **Loja ByteUP**.",
      "",
      ...lines,
      "",
      hasService
        ? "🛠️ Este é um serviço sob medida: **abra um ticket** no nosso servidor e informe o número do pedido abaixo."
        : `📦 Seus arquivos estão prontos: [**Baixar em Minhas compras**](${base}/loja/minhas-compras)`,
      "",
      "Os links de download são gerados na hora e expiram em 1 hora, mas você pode voltar e baixar de novo sempre que quiser.",
    ].join("\n"),
    footer: { text: `Pedido ${order.id}` },
    timestamp: new Date().toISOString(),
  };

  const ok = await sendDm(order.userId, { embeds: [embed] });
  if (ok) await prisma.storeOrder.update({ where: { id: orderId }, data: { deliveredAt: new Date() } });
}

async function sendDm(userId: string, message: Record<string, unknown>): Promise<boolean> {
  const token = process.env.DISCORD_BOT_TOKEN;
  if (!token) return false;
  try {
    const ch = await fetch(`${DISCORD_API}/users/@me/channels`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ recipient_id: userId }),
      signal: AbortSignal.timeout(8000),
    });
    if (!ch.ok) return false;
    const { id } = (await ch.json()) as { id: string };
    const res = await fetch(`${DISCORD_API}/channels/${id}/messages`, {
      method: "POST",
      headers: { Authorization: `Bot ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify({ ...message, allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(8000),
    });
    // 50007 = a pessoa fechou a DM; ela ainda acha tudo em "Minhas compras"
    return res.ok;
  } catch {
    return false;
  }
}

/** O usuário já tem este produto (pedido pago)? */
export async function userOwnsProduct(userId: string, productId: string) {
  const n = await prisma.storeOrderItem.count({
    where: { productId, order: { userId, status: "paid" } },
  });
  return n > 0;
}