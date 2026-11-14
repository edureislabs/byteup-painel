import { prisma } from "@/lib/prisma";

/**
 * Testadores da loja: contas do Discord que "compram" sem pagar.
 * O pedido é aprovado na hora (provider "teste") e não entra no faturamento.
 */
export async function isStoreTester(userId: string | null | undefined): Promise<boolean> {
  if (!userId) return false;
  try {
    return Boolean(await prisma.storeTester.findUnique({ where: { userId }, select: { userId: true } }));
  } catch {
    return false; // tabela ainda não criada
  }
}

/** Pedidos de teste não contam como venda (provider vazio também conta como venda: ex. grátis). */
export const NOT_TEST_ORDER = { OR: [{ provider: null }, { provider: { not: "teste" } }] };
