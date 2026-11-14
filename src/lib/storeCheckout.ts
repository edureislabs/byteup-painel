import { prisma } from "@/lib/prisma";
import { anyPaymentConfigured } from "@/lib/stripe";
import { createPayment, getPayment, mercadoPagoConfigured, type MpPayment } from "@/lib/mercadopago";
import { markOrderPaid, syncMercadoPagoPayment, userOwnsProduct } from "@/lib/storeOrders";
import { breakdownTotal, getBuilderCatalog, priceBreakdown } from "@/lib/builder/prices";
import { ownedBot } from "@/lib/builder/owned";
import {
  builderItemName,
  cleanBotName,
  cleanColor,
  parseModules,
  upgradeItemName,
  type BuilderOptions,
  type UpgradeOptions,
} from "@/lib/builder/catalog";

/**
 * Regras de compra da loja, usadas pelo site e pelo bot (loja dentro do Discord).
 * Assim os dois criam pedidos, geram Pix e confirmam pagamento do mesmo jeito.
 */

export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// ---------- limites simples por usuário ----------
function limiter(windowMs: number, max: number) {
  const attempts = new Map<string, number[]>();
  return (userId: string) => {
    const now = Date.now();
    const list = (attempts.get(userId) || []).filter((t) => now - t < windowMs);
    list.push(now);
    attempts.set(userId, list);
    if (attempts.size > 5000) attempts.clear();
    return list.length > max;
  };
}
export const checkoutLimited = limiter(60_000, 10);
const pixLimited = limiter(10 * 60_000, 10);

// ---------- iniciar compra ----------
export type StartResult =
  | { kind: "unavailable" }
  | { kind: "owned" }
  | { kind: "free"; orderId: string }
  | { kind: "not_configured" }
  | { kind: "order"; orderId: string };

/**
 * - produto inativo: unavailable
 * - download já comprado: owned
 * - grátis: cria o pedido pago e entrega na hora
 * - pago: reaproveita um pedido pendente recente do mesmo produto, ou cria um
 */
export async function startPurchase(userId: string, productId: string): Promise<StartResult> {
  const product = await prisma.storeProduct.findUnique({ where: { id: productId } });
  if (!product || !product.active) return { kind: "unavailable" };

  if (product.kind === "download" && (await userOwnsProduct(userId, product.id))) return { kind: "owned" };

  if (product.priceCents === 0) {
    const order = await prisma.storeOrder.create({
      data: {
        userId,
        totalCents: 0,
        provider: "gratis",
        items: { create: { productId: product.id, nameSnapshot: product.name, priceCents: 0 } },
      },
    });
    await markOrderPaid(order.id, "gratis", null);
    return { kind: "free", orderId: order.id };
  }

  if (!anyPaymentConfigured()) return { kind: "not_configured" };

  const recent = await prisma.storeOrder.findFirst({
    where: {
      userId,
      status: { in: ["pending", "failed"] },
      totalCents: product.priceCents,
      createdAt: { gt: new Date(Date.now() - 20 * 60 * 60 * 1000) },
      items: { some: { productId: product.id } },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return { kind: "order", orderId: recent.id };

  const order = await prisma.storeOrder.create({
    data: {
      userId,
      totalCents: product.priceCents,
      provider: "mercadopago",
      items: { create: { productId: product.id, nameSnapshot: product.name, priceCents: product.priceCents } },
    },
  });
  await prisma.storeOrder.update({ where: { id: order.id }, data: { checkoutUrl: `/loja/pagar/${order.id}` } });
  return { kind: "order", orderId: order.id };
}

// ---------- "Monte o seu bot" ----------
export type BuilderStartResult =
  | { kind: "invalid"; error: string }
  | { kind: "not_configured" }
  | { kind: "order"; orderId: string; totalCents: number };

/**
 * Cria (ou reaproveita) o pedido de um bot montado com os módulos escolhidos.
 * O preço é sempre calculado aqui, pelo catálogo: nunca vem de quem está comprando.
 */
export async function startBuilderPurchase(
  userId: string,
  input: { modules: unknown; botName: unknown; color?: unknown }
): Promise<BuilderStartResult> {
  const modulos = parseModules(input.modules);
  if (!modulos) return { kind: "invalid", error: "Escolha pelo menos um módulo." };
  const nome = cleanBotName(input.botName);
  if (!nome) return { kind: "invalid", error: "Dê um nome ao bot (de 2 a 32 caracteres)." };
  if (!anyPaymentConfigured()) return { kind: "not_configured" };

  // preços valendo agora (editáveis no admin) e só módulos à venda
  const catalogo = await getBuilderCatalog();
  const fora = modulos.filter((id) => !catalogo.modules.find((m) => m.id === id)?.active);
  if (fora.length) return { kind: "invalid", error: "Um dos módulos escolhidos não está mais à venda. Escolha de novo." };
  const precos = priceBreakdown(catalogo, modulos);
  const totalCents = breakdownTotal(precos);
  if (totalCents < 100) return { kind: "invalid", error: "O total precisa ser de pelo menos R$ 1,00." };
  const options: BuilderOptions = { tipo: "monte-o-seu", modulos, nome, cor: cleanColor(input.color), precos };

  // mesmo bot pedido de novo (clique duplo, voltou da página de pagamento): reaproveita o pedido pendente
  const recent = await prisma.storeOrder.findFirst({
    where: {
      userId,
      status: { in: ["pending", "failed"] },
      totalCents,
      createdAt: { gt: new Date(Date.now() - 20 * 60 * 60 * 1000) },
      items: { some: { productId: null, options: { equals: options } } },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return { kind: "order", orderId: recent.id, totalCents };

  const order = await prisma.storeOrder.create({
    data: {
      userId,
      totalCents,
      provider: "mercadopago",
      items: { create: { productId: null, nameSnapshot: builderItemName(nome), priceCents: totalCents, options } },
    },
  });
  await prisma.storeOrder.update({ where: { id: order.id }, data: { checkoutUrl: `/loja/pagar/${order.id}` } });
  return { kind: "order", orderId: order.id, totalCents };
}

/**
 * "Adicionar módulos" a um bot já comprado: cobra só os módulos novos (sem a base).
 */
export async function startUpgradePurchase(userId: string, input: { botItemId: unknown; modules: unknown }): Promise<BuilderStartResult> {
  const bot = await ownedBot(String(input.botItemId ?? ""), userId);
  if (!bot) return { kind: "invalid", error: "Bot não encontrado nas suas compras." };
  const pedidos = parseModules(input.modules);
  if (!pedidos) return { kind: "invalid", error: "Escolha pelo menos um módulo." };
  const novos = pedidos.filter((id) => !bot.options.modulos.includes(id));
  if (!novos.length) return { kind: "invalid", error: "Seu bot já tem esses módulos." };
  if (!anyPaymentConfigured()) return { kind: "not_configured" };

  const catalogo = await getBuilderCatalog();
  if (novos.some((id) => !catalogo.modules.find((m) => m.id === id)?.active)) {
    return { kind: "invalid", error: "Um dos módulos escolhidos não está mais à venda. Escolha de novo." };
  }
  const precos = priceBreakdown(catalogo, novos);
  delete precos.base; // a base a pessoa já pagou
  const totalCents = breakdownTotal(precos);
  if (totalCents < 100) return { kind: "invalid", error: "O total precisa ser de pelo menos R$ 1,00." };
  const options: UpgradeOptions = { tipo: "adicionar", botItemId: bot.itemId, modulos: novos, precos };

  const recent = await prisma.storeOrder.findFirst({
    where: {
      userId,
      status: { in: ["pending", "failed"] },
      totalCents,
      createdAt: { gt: new Date(Date.now() - 20 * 60 * 60 * 1000) },
      items: { some: { productId: null, options: { equals: options } } },
    },
    orderBy: { createdAt: "desc" },
  });
  if (recent) return { kind: "order", orderId: recent.id, totalCents };

  const order = await prisma.storeOrder.create({
    data: {
      userId,
      totalCents,
      provider: "mercadopago",
      items: { create: { productId: null, nameSnapshot: upgradeItemName(bot.options.nome), priceCents: totalCents, options } },
    },
  });
  await prisma.storeOrder.update({ where: { id: order.id }, data: { checkoutUrl: `/loja/pagar/${order.id}` } });
  return { kind: "order", orderId: order.id, totalCents };
}

// ---------- Pix ----------
export type PixData = {
  paymentId: string;
  status: string;
  qrCode: string | null;
  qrBase64: string | null;
  expiresAt: string | null;
};
export type PixResult =
  | { ok: true; approved: true }
  | { ok: true; approved: false; pix: PixData }
  | { ok: false; status: number; error: string; needEmail?: boolean };

function pixData(p: MpPayment): PixData {
  const td = p.point_of_interaction?.transaction_data;
  return {
    paymentId: String(p.id),
    status: p.status,
    qrCode: td?.qr_code ?? null,
    qrBase64: td?.qr_code_base64 ?? null,
    expiresAt: p.date_of_expiration ?? null,
  };
}

/** Gera (ou reaproveita) o Pix de um pedido do usuário. */
export async function generatePix(userId: string, orderId: string, emailInput?: string | null): Promise<PixResult> {
  if (!mercadoPagoConfigured()) return { ok: false, status: 503, error: "Pagamentos não configurados." };

  const order = await prisma.storeOrder.findFirst({ where: { id: orderId, userId }, include: { items: true } });
  if (!order) return { ok: false, status: 404, error: "Pedido não encontrado." };
  if (order.status === "paid") return { ok: true, approved: true };
  if (order.status !== "pending" && order.status !== "failed") {
    return { ok: false, status: 409, error: "Este pedido não pode mais ser pago." };
  }

  // Reaproveita o Pix que ainda está valendo (não cria outro a cada clique)
  if (order.providerRef && order.provider === "mercadopago") {
    try {
      const old = await getPayment(order.providerRef);
      const valid =
        old.payment_method_id === "pix" &&
        old.status === "pending" &&
        (!old.date_of_expiration || new Date(old.date_of_expiration).getTime() > Date.now() + 60_000);
      if (valid && old.point_of_interaction?.transaction_data?.qr_code) return { ok: true, approved: false, pix: pixData(old) };
    } catch {
      // gera um novo
    }
  }

  const email = String(emailInput || "").trim().slice(0, 254);
  if (!EMAIL_RE.test(email)) return { ok: false, status: 400, error: "Informe seu e-mail para gerar o Pix.", needEmail: true };
  if (pixLimited(userId)) return { ok: false, status: 429, error: "Muitas tentativas. Espere alguns minutos." };

  try {
    const title = order.items.map((i) => i.nameSnapshot).join(", ") || "Loja ByteUP";
    const payment = await createPayment(
      { payment_method_id: "pix", payer: { email } },
      { id: order.id, title, totalCents: order.totalCents }
    );
    await prisma.storeOrder.updateMany({
      where: { id: order.id, status: { in: ["pending", "failed"] } },
      data: { status: "pending", provider: "mercadopago", providerRef: String(payment.id) },
    });
    if (!payment.point_of_interaction?.transaction_data?.qr_code) {
      return { ok: false, status: 502, error: "O Mercado Pago não liberou o Pix nesta conta." };
    }
    return { ok: true, approved: false, pix: pixData(payment) };
  } catch (err) {
    console.error("[loja/pix]", order.id, err);
    return { ok: false, status: 502, error: "Não foi possível gerar o Pix. Tente de novo." };
  }
}

// ---------- status ----------
/** Status do pedido; se ainda estiver pendente, confere direto no Mercado Pago (caso o webhook atrase). */
export async function orderStatus(userId: string, orderId: string) {
  const sel = { status: true, providerRef: true, provider: true } as const;
  let order = await prisma.storeOrder.findFirst({ where: { id: orderId, userId }, select: sel });
  if (!order) return null;
  if (order.status === "pending" && order.provider === "mercadopago" && order.providerRef) {
    try {
      await syncMercadoPagoPayment(order.providerRef);
      order = await prisma.storeOrder.findFirst({ where: { id: orderId, userId }, select: sel });
    } catch {
      // tenta de novo na próxima consulta
    }
  }
  return order;
}
