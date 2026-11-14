import { prisma } from "@/lib/prisma";
import { BUILDER_BASE, BUILDER_MODULES, type BuilderModule } from "./catalog";

/**
 * Preços do "Monte o seu bot" valendo agora: os padrões do catalog.ts
 * com as mudanças feitas em /admin/loja/montador (tabela BuilderPrice).
 */
export type LiveModule = BuilderModule & { active: boolean; defaultPriceCents: number };
export type LiveCatalog = {
  base: typeof BUILDER_BASE & { defaultPriceCents: number };
  /** todos os módulos, inclusive os fora de venda (active = false) */
  modules: LiveModule[];
};

export async function getBuilderCatalog(): Promise<LiveCatalog> {
  let rows: { moduleId: string; priceCents: number; active: boolean }[] = [];
  try {
    rows = await prisma.builderPrice.findMany();
  } catch (err) {
    // tabela ainda não criada (falta o "prisma db push"): usa os preços padrão
    console.error("[montador] não consegui ler os preços, usando os padrão:", (err as Error).message);
  }
  const map = new Map(rows.map((r) => [r.moduleId, r]));
  return {
    base: { ...BUILDER_BASE, priceCents: map.get("base")?.priceCents ?? BUILDER_BASE.priceCents, defaultPriceCents: BUILDER_BASE.priceCents },
    modules: BUILDER_MODULES.map((m) => ({
      ...m,
      priceCents: map.get(m.id)?.priceCents ?? m.priceCents,
      defaultPriceCents: m.priceCents,
      active: map.get(m.id)?.active ?? true,
    })),
  };
}

export const modulesForSale = (cat: LiveCatalog) => cat.modules.filter((m) => m.active);

/** Preço de cada parte do pedido (fica salvo no pedido, para a conta bater depois). */
export function priceBreakdown(cat: LiveCatalog, ids: string[]): Record<string, number> {
  const precos: Record<string, number> = { base: cat.base.priceCents };
  for (const id of ids) precos[id] = cat.modules.find((m) => m.id === id)?.priceCents ?? 0;
  return precos;
}

export const breakdownTotal = (precos: Record<string, number>) => Object.values(precos).reduce((t, v) => t + v, 0);
