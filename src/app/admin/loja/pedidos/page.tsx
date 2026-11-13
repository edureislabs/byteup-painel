import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/admin";
import { getUsersCached } from "@/lib/discordCache";
import { cancelPayment, mercadoPagoConfigured } from "@/lib/mercadopago";
import { deliverOrder, markOrderPaid } from "@/lib/storeOrders";
import { daysAgo, formatPrice } from "@/lib/storeShared";
  import ConfirmButton from "./ConfirmButton";

export const dynamic = "force-dynamic";

async function requireAdmin() {
  const id = await getAdminUserId();
  if (!id) notFound();
  return id;
}

// Reenvia a mensagem de entrega na DM
async function resendDm(formData: FormData) {
  "use server";
  await requireAdmin();
  await deliverOrder(String(formData.get("orderId") || ""));
  revalidatePath("/admin/loja/pedidos");
}

// Para pagamentos recebidos por fora (ex.: Pix direto na sua chave)
async function markPaidManually(formData: FormData) {
  "use server";
  const adminId = await requireAdmin();
  await markOrderPaid(String(formData.get("orderId") || ""), "manual", `admin:${adminId}`);
  revalidatePath("/admin/loja/pedidos");
}

// Pedido aguardando: cancela (e cancela o Pix no Mercado Pago, para não poder mais ser pago)
async function cancelOrder(formData: FormData) {
  "use server";
  await requireAdmin();
  const order = await prisma.storeOrder.findUnique({ where: { id: String(formData.get("orderId") || "") } });
  if (!order || (order.status !== "pending" && order.status !== "failed")) return;
  if (order.provider === "mercadopago" && order.providerRef) await cancelPayment(order.providerRef);
  await prisma.storeOrder.updateMany({ where: { id: order.id, status: { in: ["pending", "failed"] } }, data: { status: "cancelled" } });
  revalidatePath("/admin/loja/pedidos");
}

// Pedido pago: tira o acesso ao download (a pessoa pode comprar de novo).
// Não devolve dinheiro: reembolso é feito no Mercado Pago.
async function revokeOrder(formData: FormData) {
  "use server";
  await requireAdmin();
  await prisma.storeOrder.updateMany({
    where: { id: String(formData.get("orderId") || ""), status: "paid" },
    data: { status: "revoked" },
  });
  revalidatePath("/admin/loja/pedidos");
}

// Apaga o pedido de vez (some também de "Minhas compras")
async function deleteOrder(formData: FormData) {
  "use server";
  await requireAdmin();
  const order = await prisma.storeOrder.findUnique({ where: { id: String(formData.get("orderId") || "") } });
  if (!order) return;
  if ((order.status === "pending" || order.status === "failed") && order.provider === "mercadopago" && order.providerRef) {
    await cancelPayment(order.providerRef);
  }
  await prisma.storeOrder.delete({ where: { id: order.id } });
  revalidatePath("/admin/loja/pedidos");
}

const STATUS: Record<string, string> = {
  paid: "text-[#7ee2a8]",
  pending: "text-[#f0b878]",
  failed: "text-[#f07878]",
  cancelled: "text-[#7d7588]",
  refunded: "text-[#7d7588]",
  revoked: "text-[#f07878]",
};

const LABEL: Record<string, string> = {
  paid: "pago",
  pending: "aguardando",
  failed: "recusado",
  cancelled: "cancelado",
  refunded: "reembolsado",
  revoked: "revogado",
};

const fmtDate = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export default async function AdminPedidosPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  await requireAdmin();
  const { status } = await searchParams;
  const filter = status && STATUS[status] ? status : undefined;

  const since30 = daysAgo(30);
  const [orders, revenue, paidCount] = await Promise.all([
    prisma.storeOrder.findMany({
      where: filter ? { status: filter } : {},
      orderBy: { createdAt: "desc" },
      take: 100,
      include: { items: true },
    }),
    prisma.storeOrder.aggregate({ where: { status: "paid", paidAt: { gte: since30 } }, _sum: { totalCents: true } }),
    prisma.storeOrder.count({ where: { status: "paid", paidAt: { gte: since30 } } }),
  ]);
  const users = await getUsersCached([...new Set(orders.map((o) => o.userId))]);

  const chip = (active: boolean) =>
    `rounded-full px-3 py-1.5 text-xs font-bold ${active ? "bg-[#b64cff]" : "border border-white/10 text-[#aaa3b5]"}`;

  return (
    <main className="min-h-screen bg-[#08070a] p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl">
        <Link href="/admin/loja" className="text-sm text-[#7d7588] hover:text-white">← Produtos</Link>
        <h1 className="mt-3 text-3xl font-black">Pedidos</h1>
        <p className="mt-2 text-sm text-[#aaa3b5]">
          Últimos 30 dias: <strong className="text-white">{formatPrice(revenue._sum.totalCents ?? 0)}</strong> em {paidCount} venda(s)
          {!mercadoPagoConfigured() && <span className="text-[#f0b878]"> • Mercado Pago não configurado</span>}
        </p>

        <div className="mt-6 flex flex-wrap gap-2">
          <Link href="/admin/loja/pedidos" className={chip(!filter)}>Todos</Link>
          {Object.keys(STATUS).map((s) => (
            <Link key={s} href={`/admin/loja/pedidos?status=${s}`} className={chip(filter === s)}>{LABEL[s]}</Link>
          ))}
        </div>

        <div className="mt-4 overflow-hidden rounded-3xl border border-white/10">
          {orders.length === 0 && <p className="p-6 text-sm text-[#7d7588]">Nenhum pedido.</p>}
          {orders.map((o) => (
            <div key={o.id} className="flex flex-wrap items-center gap-4 border-b border-white/5 px-5 py-4 text-sm last:border-b-0">
              <div className="min-w-0 flex-1">
                <div className="font-bold">{o.items.map((i) => i.nameSnapshot).join(", ")}</div>
                <div className="text-xs text-[#7d7588]">
                  {users[o.userId]?.username ?? o.userId} • {fmtDate(o.createdAt)} • {o.provider ?? "-"}
                  {o.providerRef && <> #{o.providerRef}</>} • {o.id.slice(0, 8)}
                  {o.status === "paid" && !o.deliveredAt && <span className="text-[#f0b878]"> • DM não entregue</span>}
                </div>
              </div>
              <div className="font-bold">{o.totalCents ? formatPrice(o.totalCents) : "Grátis"}</div>
              <div className={`w-24 text-xs font-bold ${STATUS[o.status] ?? ""}`}>{LABEL[o.status] ?? o.status}</div>
              <div className="flex flex-wrap gap-2">
                {o.status === "paid" && (
                  <form action={resendDm}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <button className="rounded-xl border border-white/15 px-3 py-1.5 text-xs font-bold">Reenviar DM</button>
                  </form>
                )}
                {(o.status === "pending" || o.status === "failed") && (
                  <form action={markPaidManually}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <ConfirmButton
                      message="Marcar este pedido como pago? O cliente recebe o acesso e a DM."
                      className="rounded-xl border border-[#7ee2a8]/40 px-3 py-1.5 text-xs font-bold text-[#7ee2a8]"
                    >
                      Marcar pago
                    </ConfirmButton>
                  </form>
                )}
                {(o.status === "pending" || o.status === "failed") && (
                  <form action={cancelOrder}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <ConfirmButton
                      message="Cancelar este pedido? O Pix dele deixa de funcionar e o cliente pode fazer um pedido novo."
                      className="rounded-xl border border-[#f0b878]/40 px-3 py-1.5 text-xs font-bold text-[#f0b878]"
                    >
                      Cancelar
                    </ConfirmButton>
                  </form>
                )}
                {o.status === "paid" && (
                  <form action={revokeOrder}>
                    <input type="hidden" name="orderId" value={o.id} />
                    <ConfirmButton
                      message="Revogar esta compra? O cliente perde o acesso ao download e pode comprar de novo. O dinheiro NÃO é devolvido automaticamente (faça o reembolso no Mercado Pago, se for o caso)."
                      className="rounded-xl border border-[#f07878]/40 px-3 py-1.5 text-xs font-bold text-[#f07878]"
                    >
                      Revogar
                    </ConfirmButton>
                  </form>
                )}
                <form action={deleteOrder}>
                  <input type="hidden" name="orderId" value={o.id} />
                  <ConfirmButton
                    message={
                      o.status === "paid"
                        ? "Excluir esta compra PAGA? Ela some do histórico e o cliente perde o acesso. Isso não pode ser desfeito."
                        : "Excluir este pedido? Isso não pode ser desfeito."
                    }
                    className="rounded-xl border border-white/10 px-3 py-1.5 text-xs font-bold text-[#7d7588] hover:text-[#f07878]"
                  >
                    Excluir
                  </ConfirmButton>
                </form>
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}