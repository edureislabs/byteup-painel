import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/admin";
import { r2Configured } from "@/lib/r2";
import { formatPrice, storeCategoryLabel } from "@/lib/storeshared";
import { createProduct } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminLojaPage() {
  if (!(await getAdminUserId())) notFound();

  const products = await prisma.storeProduct.findMany({
    orderBy: [{ active: "desc" }, { sortOrder: "asc" }, { createdAt: "desc" }],
    include: { _count: { select: { files: { where: { status: "ready" } } } } },
  });

  return (
    <main className="min-h-screen bg-[#08070a] p-6 text-white md:p-10">
      <div className="mx-auto max-w-5xl">
        <div className="flex flex-wrap gap-4 text-sm text-[#7d7588]">
          <Link href="/dashboard" className="hover:text-white">← Voltar para o painel</Link>
          <Link href="/loja" target="_blank" className="hover:text-white">Ver a loja ↗</Link>
        </div>
        <h1 className="mt-3 text-3xl font-black">Loja ByteUP</h1>
        <p className="mt-2 text-sm text-[#aaa3b5]">
          {products.length} produto(s) • {products.filter((p) => p.active).length} à venda
        </p>

        {!r2Configured() && (
          <p className="mt-4 rounded-2xl border border-[#f0b878]/30 bg-[#f0b878]/[0.06] px-4 py-3 text-xs text-[#f0d4b8]">
            ⚠️ O armazenamento ainda não está configurado. Crie o bucket no Cloudflare R2 e adicione{" "}
            <code className="rounded bg-black/30 px-1">R2_ACCOUNT_ID</code>, <code className="rounded bg-black/30 px-1">R2_ACCESS_KEY_ID</code>,{" "}
            <code className="rounded bg-black/30 px-1">R2_SECRET_ACCESS_KEY</code> e <code className="rounded bg-black/30 px-1">R2_BUCKET</code> na Vercel.
            Sem isso dá para cadastrar produtos, mas não enviar arquivos nem imagens.
          </p>
        )}

        <form action={createProduct} className="mt-8 flex gap-2">
          <input
            name="name"
            required
            maxLength={100}
            placeholder="Nome do novo produto"
            className="flex-1 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm placeholder:text-[#7d7588] focus:border-[#b64cff] focus:outline-none"
          />
          <button className="rounded-2xl bg-[#b64cff] px-5 py-3 text-sm font-bold">+ Criar produto</button>
        </form>

        <div className="mt-6 overflow-hidden rounded-3xl border border-white/10">
          {products.length === 0 && <p className="p-6 text-sm text-[#7d7588]">Nenhum produto ainda. Crie o primeiro acima.</p>}
          {products.map((p) => {
            const cat = storeCategoryLabel(p.category);
            return (
              <Link
                key={p.id}
                href={`/admin/loja/${p.id}`}
                className="flex items-center gap-4 border-b border-white/5 px-5 py-4 last:border-b-0 hover:bg-white/[0.03]"
              >
                <span className="text-2xl">{cat.emoji}</span>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-bold">{p.name}</div>
                  <div className="text-xs text-[#7d7588]">
                    {cat.label} • {p.kind === "servico" ? "serviço por ticket" : `${p._count.files} arquivo(s)`} • /loja/{p.slug}
                  </div>
                </div>
                <div className="text-sm font-bold">{p.priceCents === 0 ? "Grátis" : formatPrice(p.priceCents)}</div>
                <span
                  className={`rounded-full px-3 py-1 text-xs font-bold ${
                    p.active ? "bg-[#7ee2a8]/15 text-[#7ee2a8]" : "bg-white/10 text-[#aaa3b5]"
                  }`}
                >
                  {p.active ? "À venda" : "Rascunho"}
                </span>
              </Link>
            );
          })}
        </div>
      </div>
    </main>
  );
}