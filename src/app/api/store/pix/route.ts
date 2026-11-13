import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { createPayment, getPayment, mercadoPagoConfigured, type MpPayment } from "@/lib/mercadopago";

/**
 * Gera (ou reaproveita) o Pix de um pedido e devolve o QR code para mostrar na tela.
 * O e-mail do pagador vem da conta do Discord; se não tiver, o navegador manda.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const attempts = new Map<string, number[]>();
function limited(userId: string) {
  const now = Date.now();
  const list = (attempts.get(userId) || []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  attempts.set(userId, list);
  if (attempts.size > 5000) attempts.clear();
  return list.length > 10;
}

function pixResponse(p: MpPayment) {
  const td = p.point_of_interaction?.transaction_data;
  return {
    paymentId: String(p.id),
    status: p.status,
    qrCode: td?.qr_code ?? null,
    qrBase64: td?.qr_code_base64 ?? null,
    expiresAt: p.date_of_expiration ?? null,
  };
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Faça login para pagar." }, { status: 401 });
  if (!mercadoPagoConfigured()) return NextResponse.json({ error: "Pagamentos não configurados." }, { status: 503 });

  const body = await req.json().catch(() => ({}));
  const order = await prisma.storeOrder.findFirst({
    where: { id: String(body.orderId || ""), userId },
    include: { items: true },
  });
  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ status: "approved" });
  if (order.status !== "pending" && order.status !== "failed") {
    return NextResponse.json({ error: "Este pedido não pode mais ser pago." }, { status: 409 });
  }

  // Reaproveita o Pix que ainda está valendo (não cria outro a cada visita)
  if (order.providerRef && order.provider === "mercadopago") {
    try {
      const old = await getPayment(order.providerRef);
      const valid =
        old.payment_method_id === "pix" &&
        old.status === "pending" &&
        (!old.date_of_expiration || new Date(old.date_of_expiration).getTime() > Date.now() + 60_000);
      if (valid && old.point_of_interaction?.transaction_data?.qr_code) return NextResponse.json(pixResponse(old));
    } catch {
      // gera um novo
    }
  }

  const email = String(body.email || session?.user?.email || "").trim().slice(0, 254);
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Informe seu e-mail para gerar o Pix.", needEmail: true }, { status: 400 });
  }
  if (limited(userId)) return NextResponse.json({ error: "Muitas tentativas. Espere alguns minutos." }, { status: 429 });

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
      return NextResponse.json({ error: "O Mercado Pago não liberou o Pix nesta conta." }, { status: 502 });
    }
    return NextResponse.json(pixResponse(payment));
  } catch (err) {
    console.error("[loja/pix]", order.id, err);
    return NextResponse.json({ error: "Não foi possível gerar o Pix. Tente de novo." }, { status: 502 });
  }
}