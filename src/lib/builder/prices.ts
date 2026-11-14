import { prisma } from "@/lib/prisma";
import { BUILDER_BASE, BUILDER_COMBOS, BUILDER_MODULES, bestCombo, type BuilderModule, type ComboAtivo } from "./catalog";

/**
 * Preços do "Monte o seu bot" valendo agora: os padrões do catalog.ts
 * com as mudanças feitas em /admin/loja/montador (tabelas BuilderPrice e BuilderCombo).
 */
export type LiveModule = BuilderModule & { active: boolean; defaultPriceCents: number };
export type LiveCombo = ComboAtivo & { active: boolean; defaultDiscountPct: number; available: boolean };
export type LiveCatalog = {
  base: typeof BUILDER_BASE & { defaultPriceCents: number };
  /** todos os módulos, inclusive os fora de venda (active = false) */
  modules: LiveModule[];
  /** todos os combos; available = ativo e com todos os módulos à venda */
  combos: LiveCombo[];
};

export async function getBuilderCatalog(): Promise<LiveCatalog> {
  let rows: { moduleId: string; priceCents: number; active: boolean }[] = [];
  let comboRows: { id: string; discountPct: number; active: boolean }[] = [];
  try {
    [rows, comboRows] = await Promise.all([prisma.builderPrice.findMany(), prisma.builderCombo.findMany()]);
  } catch (err) {
    // tabelas ainda não criadas (falta o "prisma db push"): usa os valores padrão
    console.error("[montador] não consegui ler os preços, usando os padrão:", (err as Error).message);
  }
  const map = new Map(rows.map((r) => [r.moduleId, r]));
  const modules: LiveModule[] = BUILDER_MODULES.map((m) => ({
    ...m,
    priceCents: map.get(m.id)?.priceCents ?? m.priceCents,
    defaultPriceCents: m.priceCents,
    active: map.get(m.id)?.active ?? true,
  }));
  const aVenda = new Set(modules.filter((m) => m.active).map((m) => m.id));
  const comboMap = new Map(comboRows.map((r) => [r.id, r]));
  const combos: LiveCombo[] = BUILDER_COMBOS.map((c) => {
    const ids = c.modules === "todos" ? modules.filter((m) => m.active && !m.extra).map((m) => m.id) : c.modules;
    const active = comboMap.get(c.id)?.active ?? true;
    return {
      id: c.id,
      name: c.name,
      emoji: c.emoji,
      modules: ids,
      discountPct: comboMap.get(c.id)?.discountPct ?? c.discountPct,
      defaultDiscountPct: c.discountPct,
      active,
      available: active && ids.length > 1 && ids.every((id) => aVenda.has(id)),
    };
  });
  return {
    base: { ...BUILDER_BASE, priceCents: map.get("base")?.priceCents ?? BUILDER_BASE.priceCents, defaultPriceCents: BUILDER_BASE.priceCents },
    modules,
    combos,
  };
}

export const modulesForSale = (cat: LiveCatalog) => cat.modules.filter((m) => m.active);
export const combosForSale = (cat: LiveCatalog): ComboAtivo[] =>
  cat.combos.filter((c) => c.available).map(({ id, name, emoji, modules, discountPct }) => ({ id, name, emoji, modules, discountPct }));
export const priceMap = (cat: LiveCatalog) => Object.fromEntries(cat.modules.map((m) => [m.id, m.priceCents]));

/**
 * Preço de cada parte do pedido (fica salvo no pedido, para a conta bater depois).
 * Com `combo`, aplica o desconto do melhor combo como uma linha negativa "combo:<id>".
 */
export function priceBreakdown(cat: LiveCatalog, ids: string[], opts: { base?: boolean; combo?: boolean } = {}): Record<string, number> {
  const precos: Record<string, number> = {};
  if (opts.base !== false) precos.base = cat.base.priceCents;
  for (const id of ids) precos[id] = cat.modules.find((m) => m.id === id)?.priceCents ?? 0;
  if (opts.combo !== false) {
    const melhor = bestCombo(combosForSale(cat), priceMap(cat), ids);
    if (melhor) precos[`combo:${melhor.combo.id}`] = -melhor.discountCents;
  }
  return precos;
}

export const breakdownTotal = (precos: Record<string, number>) => Object.values(precos).reduce((t, v) => t + v, 0);
