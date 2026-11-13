"use client";

import { startTransition, useActionState } from "react";
import { PRODUCT_KINDS, STORE_CATEGORIES } from "@/lib/storeShared";
import { updateProduct, type SaveState } from "../actions";

type Props = {
  product: {
    id: string;
    name: string;
    slug: string;
    shortDescription: string;
    description: string;
    category: string;
    kind: string;
    priceCents: number;
    sortOrder: number;
    active: boolean;
  };
};

const input =
  "w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2.5 text-sm text-white placeholder:text-[#7d7588] focus:border-[#b64cff] focus:outline-none";
const label = "mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#aaa3b5]";

export default function ProductForm({ product }: Props) {
  const [state, action, pending] = useActionState<SaveState, FormData>(updateProduct, null);
  const price = (product.priceCents / 100).toFixed(2).replace(".", ",");

  return (
    <form
      // Envia sem o "reset" automático do React 19: se der erro, o que foi digitado continua no formulário
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
      className="grid gap-4 md:grid-cols-2"
    >
      <input type="hidden" name="id" value={product.id} />

      <div>
        <label className={label}>Nome</label>
        <input name="name" defaultValue={product.name} maxLength={100} required className={input} />
      </div>
      <div>
        <label className={label}>Endereço</label>
        <div className="flex items-center rounded-xl border border-white/10 bg-black/30 pl-3 text-sm focus-within:border-[#b64cff]">
          <span className="text-[#7d7588]">/loja/</span>
          <input name="slug" defaultValue={product.slug} maxLength={60} className="w-full bg-transparent py-2.5 pr-3 focus:outline-none" />
        </div>
      </div>

      <div className="md:col-span-2">
        <label className={label}>Resumo (aparece no card)</label>
        <input name="shortDescription" defaultValue={product.shortDescription} maxLength={200} className={input} />
      </div>

      <div className="md:col-span-2">
        <label className={label}>Descrição completa</label>
        <textarea
          name="description"
          defaultValue={product.description}
          maxLength={10000}
          rows={8}
          placeholder={"O que vem no produto, requisitos, como instalar...\nLinhas que começam com - viram lista."}
          className={input}
        />
      </div>

      <div>
        <label className={label}>Categoria</label>
        <select name="category" defaultValue={product.category} className={input}>
          {STORE_CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
          ))}
        </select>
      </div>
      <div>
        <label className={label}>Tipo de entrega</label>
        <select name="kind" defaultValue={product.kind} className={input}>
          {PRODUCT_KINDS.map((k) => (
            <option key={k.value} value={k.value}>{k.label}</option>
          ))}
        </select>
      </div>

      <div>
        <label className={label}>Preço (R$)</label>
        <input name="price" defaultValue={price} inputMode="decimal" placeholder="49,90" className={input} />
      </div>
      <div>
        <label className={label}>Ordem na loja</label>
        <input name="sortOrder" type="number" defaultValue={product.sortOrder} min={-999} max={999} className={input} />
        <p className="mt-1 text-[11px] text-[#7d7588]">Menor aparece primeiro.</p>
      </div>

      <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-black/20 px-4 py-3 md:col-span-2">
        <input type="checkbox" name="active" defaultChecked={product.active} className="h-4 w-4 accent-[#b64cff]" />
        <span className="text-sm">
          <strong>À venda</strong>
          <span className="block text-xs text-[#7d7588]">Desmarcado = rascunho, só admins veem.</span>
        </span>
      </label>

      <div className="flex items-center gap-3 md:col-span-2">
        <button disabled={pending} className="rounded-xl bg-[#b64cff] px-5 py-2.5 text-sm font-bold disabled:opacity-50">
          {pending ? "Salvando..." : "Salvar"}
        </button>
        {state?.ok && <span className="text-sm text-[#7ee2a8]">✓ Salvo</span>}
        {state?.error && <span className="text-sm text-[#f07878]">{state.error}</span>}
      </div>
    </form>
  );
}   