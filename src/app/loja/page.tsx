import type { Metadata } from "next";
import Link from "next/link";
import LandingNavbar from "../components/LandingNavbar";
import LandingFooter from "../components/LandingFooter";
import ProductCard from "./ProductCard";
import { prisma } from "@/lib/prisma";
import { STORE_CATEGORIES } from "@/lib/storeShared";
import { BuIcon } from "@/components/BuIcon";

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

          <div className="mt-8 flex flex-wrap items-center gap-2">
            <Link href="/loja" className={chip(!categoria)}>Tudo</Link>
            {STORE_CATEGORIES.map((c) => (
              <Link key={c.value} href={`/loja?categoria=${c.value}`} className={chip(categoria === c.value)}>
                <BuIcon name={c.value} size={15} plain className="mr-1" /> {c.label}
              </Link>
            ))}
            <Link href="/loja/minhas-compras" className="ml-auto text-sm font-semibold text-[#d9b4ff] hover:text-white">
              Minhas compras →
            </Link>
          </div>
        </div>
      </section>

      <section className="pb-20">
        <div className="site-container">
          {(!categoria || categoria === "bot") && (
            <Link
              href="/loja/monte-o-seu"
              className="group mb-6 flex flex-col gap-4 rounded-3xl border border-[#b64cff]/40 bg-gradient-to-r from-[#b64cff]/20 via-[#b64cff]/5 to-transparent p-6 transition-colors hover:border-[#b64cff] sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-[#d9b4ff]"><BuIcon name="destaques" size={14} plain className="mr-1" /> Novo</p>
                <h2 className="mt-1 text-2xl font-black">Monte o seu bot</h2>
                <p className="mt-1 max-w-xl text-sm leading-6 text-[#aaa3b5]">
                  Escolha os módulos (moderação, tickets, níveis, economia e mais) e pague só pelo que usar. Funciona em qualquer servidor.
                </p>
              </div>
              <span className="shrink-0 rounded-2xl bg-[#b64cff] px-5 py-3 text-sm font-black text-white group-hover:bg-[#c56bff]">
                Montar agora →
              </span>
            </Link>
          )}
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
