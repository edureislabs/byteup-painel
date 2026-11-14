import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { createPayment, mercadoPagoConfigured, rejectionMessage, type MpPaymentInput } from "@/lib/mercadopago";
import { markOrderPaid } from "@/lib/storeOrders";

/**
 * Recebe os dados do formulário de pagamento (Payment Brick) e cria o
 * pagamento no Mercado Pago. Só campos conhecidos passam adiante; valor e
 * descrição vêm do pedido no banco.
 */

const attempts = new Map<string, number[]>();
function limited(userId: string) {
  const now = Date.now();
  const list = (attempts.get(userId) || []).filter((t) => now - t < 10 * 60_000);
  list.push(now);
  attempts.set(userId, list);
  if (attempts.size > 5000) attempts.clear();
  return list.length > 8; // 8 tentativas a cada 10 min
}

const str = (v: unknown, max = 200) => (typeof v === "string" ? v.slice(0, max) : undefined);

function sanitize(raw: Record<string, unknown>): MpPaymentInput | null {
  const method = str(raw.payment_method_id, 50);
  if (!method || !/^[a-z_]+$/.test(method)) return null;
  const payer = (raw.payer ?? {}) as Record<string, unknown>;
  const email = str(payer.email, 254);
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return null;
  const ident = (payer.identification ?? {}) as Record<string, unknown>;

  const out: MpPaymentInput = {
    payment_method_id: method,
    payer: {
      email,
      first_name: str(payer.first_name, 100),
      last_name: str(payer.last_name, 100),
      identification:
        ident.type || ident.number ? { type: str(ident.type, 20), number: str(ident.number, 30) } : undefined,
    },
  };
  if (method !== "pix") {
    out.token = str(raw.token, 100);
    if (!out.token) return null;
    const inst = Number(raw.installments);
    out.installments = Number.isInteger(inst) && inst >= 1 && inst <= 12 ? inst : 1;
    if (raw.issuer_id != null) out.issuer_id = str(String(raw.issuer_id), 20);
  }
  return out;
}

export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Faça login para pagar." }, { status: 401 });
  if (!mercadoPagoConfigured()) return NextResponse.json({ error: "Pagamentos não configurados." }, { status: 503 });
  if (limited(userId)) return NextResponse.json({ error: "Muitas tentativas. Espere alguns minutos." }, { status: 429 });

  const body = await req.json().catch(() => ({}));
  const order = await prisma.storeOrder.findFirst({
    where: { id: String(body.orderId || ""), userId },
    include: { items: true },
  });
  if (!order) return NextResponse.json({ error: "Pedido não encontrado." }, { status: 404 });
  if (order.status === "paid") return NextResponse.json({ status: "approved", alreadyPaid: true });
  if (order.status !== "pending" && order.status !== "failed") {
    return NextResponse.json({ error: "Este pedido não pode mais ser pago." }, { status: 409 });
  }

  const input = sanitize((body.formData ?? {}) as Record<string, unknown>);
  if (!input) return NextResponse.json({ error: "Dados de pagamento inválidos." }, { status: 400 });

  try {
    const title = order.items.map((i) => i.nameSnapshot).join(", ") || "Loja ByteUP";
    const payment = await createPayment(input, { id: order.id, title, totalCents: order.totalCents });
    const paymentId = String(payment.id);

    if (payment.status === "approved") {
      await markOrderPaid(order.id, "mercadopago", paymentId);
    } else if (payment.status === "pending" || payment.status === "in_process") {
      await prisma.storeOrder.updateMany({
        where: { id: order.id, status: { in: ["pending", "failed"] } },
        data: { status: "pending", provider: "mercadopago", providerRef: paymentId },
      });
    } else {
      await prisma.storeOrder.updateMany({ where: { id: order.id, status: "pending" }, data: { status: "failed" } });
    }

    return NextResponse.json({
      paymentId,
      status: payment.status,
      message: payment.status === "rejected" ? rejectionMessage(payment.status_detail) : undefined,
    });
  } catch (err) {
    console.error("[loja/pay]", order.id, err);
    return NextResponse.json({ error: "Não foi possível processar o pagamento. Tente de novo." }, { status: 502 });
  }
}
