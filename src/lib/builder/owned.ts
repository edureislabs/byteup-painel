import { prisma } from "@/lib/prisma";
import { parseModules, readBuilderOptions, readUpgradeOptions, type BuilderOptions } from "./catalog";

/**
 * Bot que a pessoa comprou no "Monte o seu bot", já com os módulos
 * adicionados depois ("Adicionar módulos" pagos).
 */
export type OwnedBot = { itemId: string; userId: string; options: BuilderOptions; upgrades: number };

export async function ownedBot(botItemId: string, userId: string | null, opts: { admin?: boolean } = {}): Promise<OwnedBot | null> {
  if (!/^[0-9a-f-]{36}$/i.test(botItemId)) return null;
  const item = await prisma.storeOrderItem.findUnique({
    where: { id: botItemId },
    include: { order: { select: { userId: true, status: true } } },
  });
  const base = item && !item.productId ? readBuilderOptions(item.options) : null;
  if (!item || !base) return null;
  if (!opts.admin && (item.order.userId !== userId || item.order.status !== "paid")) return null;

  const upgrades = await prisma.storeOrderItem.findMany({
    where: {
      productId: null,
      options: { path: ["botItemId"], equals: botItemId },
      order: { status: "paid", userId: item.order.userId },
    },
    select: { options: true },
  });
  const todos = new Set(base.modulos);
  let n = 0;
  for (const u of upgrades) {
    const up = readUpgradeOptions(u.options);
    if (!up) continue;
    n++;
    for (const id of up.modulos) todos.add(id);
  }
  return {
    itemId: item.id,
    userId: item.order.userId,
    options: { ...base, modulos: parseModules([...todos]) ?? base.modulos },
    upgrades: n,
  };
}

/** Para download/entrega: o item pode ser o bot ou um "Adicionar módulos" dele. */
export function botItemIdOf(item: { id: string; options: unknown }): string | null {
  if (readBuilderOptions(item.options)) return item.id;
  return readUpgradeOptions(item.options)?.botItemId ?? null;
}
