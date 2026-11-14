import Link from "next/link";
import { formatPrice, productImageUrl, storeCategoryLabel } from "@/lib/storeShared";
import { BuIcon } from "@/components/BuIcon";

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  shortDescription: string;
  category: string;
  kind: string;
  priceCents: number;
  imageKey: string | null;
};

export default function ProductCard({ product }: { product: ProductCardData }) {
  const cat = storeCategoryLabel(product.category);
  const image = productImageUrl(product.id, product.imageKey);

  return (
    <Link
      href={`/loja/${product.slug}`}
      className="group flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] transition-colors hover:border-[#b64cff]/50 hover:bg-white/[0.05]"
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" loading="lazy" className="aspect-video w-full object-cover" />
      ) : (
        <div className="grid aspect-video w-full place-items-center bg-gradient-to-br from-[#b64cff]/25 to-[#08070a] text-5xl">
          <BuIcon name={cat.value} size={84} />
        </div>
      )}
      <div className="flex flex-1 flex-col p-5">
        <p className="flex items-center gap-1.5 text-xs font-semibold text-[#7d7588]">
          <BuIcon name={cat.value} size={13} plain /> {cat.label}
        </p>
        <h3 className="mt-1 font-black text-white group-hover:text-[#d9b4ff]">{product.name}</h3>
        <p className="mt-2 line-clamp-3 flex-1 text-sm leading-6 text-[#aaa3b5]">{product.shortDescription || "Sem descrição."}</p>
        <div className="mt-4 flex items-center justify-between">
          <span className="text-lg font-black text-white">
            {product.priceCents === 0 ? "Grátis" : formatPrice(product.priceCents)}
          </span>
          <span className="text-xs font-bold text-[#d9b4ff]">{product.kind === "servico" ? "Sob encomenda →" : "Ver produto →"}</span>
        </div>
      </div>
    </Link>
  );
}
