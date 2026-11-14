import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { generatePix } from "@/lib/storeCheckout";

/**
 * Gera (ou reaproveita) o Pix de um pedido e devolve o QR code para mostrar na tela.
 * O e-mail do pagador vem da conta do Discord; se não tiver, o navegador manda.
 */
export async function POST(req: NextRequest) {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return NextResponse.json({ error: "Faça login para pagar." }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const r = await generatePix(userId, String(body.orderId || ""), body.email || session?.user?.email || null);

  if (!r.ok) return NextResponse.json({ error: r.error, ...(r.needEmail ? { needEmail: true } : {}) }, { status: r.status });
  if (r.approved) return NextResponse.json({ status: "approved" });
  return NextResponse.json(r.pix);
}
