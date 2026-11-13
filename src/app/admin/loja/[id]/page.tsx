import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/admin";
import { r2Configured } from "@/lib/r2";
import { formatBytes, productImageUrl } from "@/lib/storeShared";
import { deleteFile, deleteProduct, removeImage } from "../actions";
import ProductForm from "./ProductForm";
import FileUploader from "./FileUploader";
import ImageUploader from "./ImageUploader";

export const dynamic = "force-dynamic";

const fmtDate = (d: Date) =>
  d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" });

export default async function AdminProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ aviso?: string }>;
}) {
  if (!(await getAdminUserId())) notFound();
  const { id } = await params;
  const { aviso } = await searchParams;

  const product = await prisma.storeProduct.findUnique({
    where: { id },
    include: { files: { orderBy: { createdAt: "asc" } } },
  });
  if (!product) notFound();

  const storage = r2Configured();
  const image = productImageUrl(product.id, product.imageKey);
  const box = "rounded-3xl border border-white/10 bg-white/[0.03] p-6";

  return (
    <main className="min-h-screen bg-[#08070a] p-6 text-white md:p-10">
      <div className="mx-auto max-w-4xl">
        <div className="flex flex-wrap gap-4 text-sm text-[#7d7588]">
          <Link href="/admin/loja" className="hover:text-white">← Produtos</Link>
          <Link href={`/loja/${product.slug}`} target="_blank" className="hover:text-white">
            Ver na loja ↗ {!product.active && "(rascunho: só admins veem)"}
          </Link>
        </div>
        <h1 className="mt-3 text-3xl font-black">{product.name}</h1>

        {aviso === "vendido" && (
          <p className="mt-4 rounded-2xl border border-[#f0b878]/30 bg-[#f0b878]/[0.06] px-4 py-3 text-sm text-[#f0d4b8]">
            Este produto já foi vendido, então não pode ser apagado (quem comprou perderia o acesso). Ele foi desativado e saiu da loja.
          </p>
        )}

        {/* Dados */}
        <section className={`${box} mt-6`}>
          <ProductForm
            product={{
              id: product.id,
              name: product.name,
              slug: product.slug,
              shortDescription: product.shortDescription,
              description: product.description,
              category: product.category,
              kind: product.kind,
              priceCents: product.priceCents,
              sortOrder: product.sortOrder,
              active: product.active,
            }}
          />
        </section>

        {/* Imagem */}
        <section className={`${box} mt-6`}>
          <h2 className="text-lg font-black">Imagem de capa</h2>
          <p className="mt-1 text-xs text-[#7d7588]">PNG, JPG, WEBP ou GIF, até 5 MB. Proporção recomendada 16:9 (ex.: 1280×720).</p>
          <div className="mt-4 flex flex-wrap items-center gap-4">
            {image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={image} alt="" className="aspect-video w-64 rounded-2xl border border-white/10 object-cover" />
            ) : (
              <div className="grid aspect-video w-64 place-items-center rounded-2xl border border-dashed border-white/15 text-xs text-[#7d7588]">
                Sem imagem
              </div>
            )}
            <div className="flex flex-col gap-2">
              <ImageUploader productId={product.id} disabled={!storage} />
              {product.imageKey && (
                <form action={removeImage}>
                  <input type="hidden" name="id" value={product.id} />
                  <button className="text-xs text-[#f07878] underline">Remover imagem</button>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* Arquivos */}
        <section className={`${box} mt-6`}>
          <h2 className="text-lg font-black">Arquivos de entrega</h2>
          <p className="mt-1 text-xs text-[#7d7588]">
            {product.kind === "servico"
              ? "Produtos de serviço não precisam de arquivo: o cliente é atendido por ticket depois de pagar."
              : "O que o cliente recebe depois de pagar. Aceita arquivos grandes (até 50 GB): o envio vai direto para o armazenamento."}
          </p>

          <div className="mt-4 space-y-2">
            {product.files.length === 0 && <p className="text-sm text-[#7d7588]">Nenhum arquivo enviado.</p>}
            {product.files.map((f) => (
              <div key={f.id} className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-bold">📦 {f.fileName}</div>
                  <div className="text-xs text-[#7d7588]">
                    {formatBytes(Number(f.sizeBytes))} • {fmtDate(f.createdAt)}
                    {f.status !== "ready" && <span className="ml-2 text-[#f0b878]">envio incompleto</span>}
                  </div>
                </div>
                <form action={deleteFile}>
                  <input type="hidden" name="fileId" value={f.id} />
                  <button className="rounded-xl border border-[#f07878]/40 px-3 py-1.5 text-xs font-bold text-[#f07878]">
                    {f.status === "ready" ? "Apagar" : "Descartar"}
                  </button>
                </form>
              </div>
            ))}
          </div>

          <div className="mt-4">
            <FileUploader productId={product.id} disabled={!storage} />
          </div>
        </section>

        {/* Perigo */}
        <section className="mt-6 rounded-3xl border border-[#f07878]/25 p-6">
          <h2 className="text-lg font-black text-[#f07878]">Apagar produto</h2>
          <p className="mt-1 text-xs text-[#7d7588]">
            Apaga o produto, a imagem e todos os arquivos. Se ele já foi vendido, só é desativado.
          </p>
          <form action={deleteProduct} className="mt-3">
            <input type="hidden" name="id" value={product.id} />
            <button className="rounded-xl bg-[#f07878] px-4 py-2 text-xs font-bold text-black">Apagar produto</button>
          </form>
        </section>
      </div>
    </main>
  );
}