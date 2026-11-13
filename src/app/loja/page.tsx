import type { Metadata } from "next";
import Link from "next/link";
import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";
import ProductCard from "./ProductCard";
import { prisma } from "@/lib/prisma";
import { STORE_CATEGORIES } from "@/lib/storeshared";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Loja | ByteUP",
  description: "Bots, plugins, aplicativos e serviços da ByteUP.",
};

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LojaPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const raw = Array.isArray(sp.categoria) ? sp.categoria[0] : sp.categoria;
  const categoria = STORE_CATEGORIES.some((c) => c.value === raw) ? raw! : "";

  const products = await prisma.storeProduct.findMany({
    where: { active: true, ...(categoria ? { category: categoria } : {}) },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "desc" }],
    select: { id: true, slug: true, name: true, shortDescription: true, category: true, kind: true, priceCents: true, imageKey: true },
  });

  const chip = (active: boolean) =>
    `rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
      active ? "bg-[#b64cff] text-white" : "border border-white/10 text-[#aaa3b5] hover:text-white"
    }`;

  return (
    <main className="min-h-screen text-white">
      <LandingNavbar />

      <section className="site-section-sm">
        <div className="site-container">
          <span className="site-pill">Loja</span>
          <h1 className="site-title mt-4 text-4xl font-black md:text-5xl">Loja ByteUP</h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-[#aaa3b5]">
            Bots, plugins, aplicativos e serviços feitos pela ByteUP. Depois do pagamento, o download chega na sua DM do Discord.
          </p>

          <div className="mt-8 flex flex-wrap gap-2">
            <Link href="/loja" className={chip(!categoria)}>Tudo</Link>
            {STORE_CATEGORIES.map((c) => (
              <Link key={c.value} href={`/loja?categoria=${c.value}`} className={chip(categoria === c.value)}>
                {c.emoji} {c.label}
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="site-container">
          {products.length === 0 ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.03] p-10 text-center text-[#aaa3b5]">
              Nenhum produto {categoria ? "nesta categoria " : ""}por enquanto. Volte em breve!
            </div>
          ) : (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {products.map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          )}
        </div>
      </section>

      <LandingFooter />
    </main>
  );
}