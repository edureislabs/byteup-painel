import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { cache, type ReactNode } from "react";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import LandingNavbar from "../../components/LandingNavbar";
import LandingFooter from "../../components/LandingFooter";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { formatBytes, formatPrice, productImageUrl, storeCategoryLabel } from "@/lib/storeshared";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

const getProduct = cache(async (slug: string) =>
  prisma.storeProduct.findUnique({
    where: { slug },
    include: { files: { where: { status: "ready" }, select: { id: true, fileName: true, sizeBytes: true } } },
  })
);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const p = await getProduct(slug);
  if (!p?.active) return { title: "Produto | ByteUP" };
  return { title: `${p.name} | Loja ByteUP`, description: p.shortDescription || undefined };
}

/** Texto simples: linha em branco separa parágrafos, linhas com "- " viram lista. */
function Description({ text }: { text: string }) {
  const blocks = text.split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  return (
    <div className="space-y-4 text-[15px] leading-7 text-[#c9c2d4]">
      {blocks.map((block, i) => {
        const lines = block.split("\n");
        if (lines.every((l) => /^\s*[-•]\s+/.test(l))) {
          return (
            <ul key={i} className="list-disc space-y-1 pl-5">
              {lines.map((l, j) => (
                <li key={j}>{l.replace(/^\s*[-•]\s+/, "")}</li>
              ))}
            </ul>
          );
        }
        const out: ReactNode[] = [];
        lines.forEach((l, j) => {
          if (j > 0) out.push(<br key={`br${j}`} />);
          out.push(l);
        });
        return <p key={i}>{out}</p>;
      })}
    </div>
  );
}

export default async function ProductPage({ params }: { params: Params }) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) notFound();

  // Rascunho: só admins veem
  if (!product.active) {
    const session = await getServerSession(authOptions);
    if (!isAdmin(session?.user?.id)) notFound();
  }

  const cat = storeCategoryLabel(product.category);
  const image = productImageUrl(product.id, product.imageKey);
  const totalSize = product.files.reduce((s, f) => s + Number(f.sizeBytes), 0);
  const isService = product.kind === "servico";

  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm pb-20">
        <div className="site-container">
          <Link href="/loja" className="text-sm text-[#7d7588] hover:text-white">← Voltar para a loja</Link>

          {!product.active && (
            <p className="mt-4 rounded-2xl border border-[#f0b878]/30 bg-[#f0b878]/[0.06] px-4 py-3 text-sm text-[#f0d4b8]">
              Rascunho: só admins veem esta página.{" "}
              <Link href={`/admin/loja/${product.id}`} className="underline">Editar</Link>
            </p>
          )}

          <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_360px]">
            <div>
              {image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={image} alt="" className="aspect-video w-full rounded-3xl border border-white/10 object-cover" />
              ) : (
                <div className="grid aspect-video w-full place-items-center rounded-3xl border border-white/10 bg-gradient-to-br from-[#b64cff]/25 to-[#08070a] text-7xl">
                  {cat.emoji}
                </div>
              )}

              <h1 className="mt-8 text-3xl font-black md:text-4xl">{product.name}</h1>
              {product.shortDescription && <p className="mt-3 text-lg text-[#aaa3b5]">{product.shortDescription}</p>}

              {product.description && (
                <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-6">
                  <Description text={product.description} />
                </div>
              )}
            </div>

            <aside className="h-fit rounded-3xl border border-white/10 bg-white/[0.03] p-6 lg:sticky lg:top-24">
              <p className="text-xs font-semibold text-[#7d7588]">
                {cat.emoji} {cat.label}
              </p>
              <div className="mt-2 text-4xl font-black">
                {product.priceCents === 0 ? "Grátis" : formatPrice(product.priceCents)}
              </div>

              <button
                type="button"
                disabled
                className="mt-6 w-full cursor-not-allowed rounded-2xl bg-[#b64cff]/40 px-5 py-3.5 text-sm font-black text-white/70"
              >
                Pagamento em breve
              </button>
              <p className="mt-2 text-center text-xs text-[#7d7588]">Pix e cartão chegam nos próximos dias.</p>

              <ul className="mt-6 space-y-2 border-t border-white/10 pt-5 text-sm text-[#aaa3b5]">
                {isService ? (
                  <>
                    <li>🛠️ Feito sob medida para você</li>
                    <li>🎫 Depois do pagamento, um ticket é aberto no Discord</li>
                  </>
                ) : (
                  <>
                    <li>⚡ Entrega automática na sua DM</li>
                    <li>📦 {product.files.length} arquivo(s){totalSize > 0 && ` • ${formatBytes(totalSize)}`}</li>
                    <li>🔁 Baixe de novo quando quiser em &quot;Minhas compras&quot;</li>
                  </>
                )}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}