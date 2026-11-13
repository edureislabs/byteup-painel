import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import LandingNavbar from "../../components/LandingNavbar";
import LandingFooter from "../../components/LandingFooter";
import { prisma } from "@/lib/prisma";
import { daysAgo, formatBytes, formatPrice } from "@/lib/storeShared";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Minhas compras | Loja ByteUP", robots: { index: false } };

const STATUS: Record<string, { label: string; cls: string }> = {
  paid: { label: "Pago", cls: "bg-[#7ee2a8]/15 text-[#7ee2a8]" },
  pending: { label: "Aguardando pagamento", cls: "bg-[#f0b878]/15 text-[#f0b878]" },
  failed: { label: "Recusado", cls: "bg-[#f07878]/15 text-[#f07878]" },
  cancelled: { label: "Cancelado", cls: "bg-white/10 text-[#aaa3b5]" },
  refunded: { label: "Reembolsado", cls: "bg-white/10 text-[#aaa3b5]" },
};

const fmtDate = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export default async function MinhasComprasPage() {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) redirect("/login");

  const orders = await prisma.storeOrder.findMany({
    where: { userId, status: { in: ["paid", "pending", "refunded"] } },
    orderBy: { createdAt: "desc" },
    take: 100,
    include: {
      items: {
        include: {
          product: {
            select: {
              slug: true,
              kind: true,
              files: { where: { status: "ready" }, orderBy: { createdAt: "asc" }, select: { id: true, fileName: true, sizeBytes: true } },
            },
          },
        },
      },
    },
  });
  // Pedidos pendentes antigos (link vencido) não interessam
  const cutoff = daysAgo(1);
  const visible = orders.filter((o) => o.status !== "pending" || o.createdAt > cutoff);

  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />
      <section className="site-section-sm pb-24">
        <div className="site-container max-w-3xl">
          <Link href="/loja" className="text-sm text-[#7d7588] hover:text-white">← Voltar para a loja</Link>
          <h1 className="mt-4 text-3xl font-black">Minhas compras</h1>
          <p className="mt-2 text-sm text-[#aaa3b5]">
            Os links de download são gerados na hora e valem por 1 hora. Pode voltar aqui e baixar de novo quando quiser.
          </p>

          {visible.length === 0 && (
            <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center text-[#aaa3b5]">
              Você ainda não comprou nada. <Link href="/loja" className="text-[#d9b4ff] underline">Ver a loja</Link>
            </div>
          )}

          <div className="mt-8 space-y-4">
            {visible.map((o) => {
              const st = STATUS[o.status] ?? { label: o.status, cls: "bg-white/10" };
              return (
                <div key={o.id} className="rounded-3xl border border-white/10 bg-white/[0.03] p-5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-xs text-[#7d7588]">
                      {fmtDate(o.createdAt)} • {o.totalCents ? formatPrice(o.totalCents) : "Grátis"} • pedido {o.id.slice(0, 8)}
                    </div>
                    <span className={`rounded-full px-3 py-1 text-xs font-bold ${st.cls}`}>{st.label}</span>
                  </div>

                  {o.items.map((item) => (
                    <div key={item.id} className="mt-3">
                      <div className="font-bold">
                        {item.product ? (
                          <Link href={`/loja/${item.product.slug}`} className="hover:text-[#d9b4ff]">{item.nameSnapshot}</Link>
                        ) : (
                          item.nameSnapshot
                        )}
                      </div>

                      {o.status === "paid" && item.product?.kind === "servico" && (
                        <p className="mt-2 text-sm text-[#aaa3b5]">
                          🛠️ Serviço sob medida: abra um ticket no nosso Discord e informe o pedido <code className="rounded bg-black/30 px-1">{o.id}</code>.
                        </p>
                      )}

                      {o.status === "paid" && item.product?.kind !== "servico" && (
                        <div className="mt-2 space-y-2">
                          {(item.product?.files ?? []).map((f) => (
                            <a
                              key={f.id}
                              href={`/api/store/download/${f.id}`}
                              className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 text-sm hover:border-[#b64cff]/50"
                            >
                              <span className="truncate">📦 {f.fileName}</span>
                              <span className="shrink-0 text-xs text-[#7d7588]">{formatBytes(Number(f.sizeBytes))} • Baixar ↓</span>
                            </a>
                          ))}
                          {(item.product?.files ?? []).length === 0 && (
                            <p className="text-sm text-[#7d7588]">Os arquivos estão sendo atualizados. Volte em instantes ou abra um ticket.</p>
                          )}
                        </div>
                      )}
                    </div>
                  ))}

                  {o.status === "pending" && o.checkoutUrl && (
                    <a href={o.checkoutUrl} className="mt-4 inline-block text-sm font-bold text-[#d9b4ff] underline">Continuar pagamento →</a>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </section>
      <LandingFooter />
    </main>
  );
}
