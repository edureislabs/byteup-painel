import { prisma } from "@/lib/prisma";

/**
 * O que a loja guarda de cada licença, dentro do item do pedido (options.licenca):
 * se está bloqueada e os aplicativos do Discord que ligaram o bot (para achar vazamento).
 */
export type Ativacao = { app: string; nome: string; versao: string; primeira: string; ultima: string; vezes: number };
export type EstadoLicenca = { bloqueada: boolean; ativacoes: Ativacao[] };

const MAX_ATIVACOES = 20;

export function lerEstado(options: unknown): EstadoLicenca {
  const l = (options && typeof options === "object" ? (options as Record<string, unknown>).licenca : null) as Record<string, unknown> | null;
  const ativacoes = Array.isArray(l?.ativacoes) ? (l.ativacoes as Ativacao[]).filter((a) => a && typeof a.app === "string") : [];
  return { bloqueada: l?.bloqueada === true, ativacoes };
}

async function gravar(itemId: string, mudar: (e: EstadoLicenca) => EstadoLicenca) {
  const item = await prisma.storeOrderItem.findUnique({ where: { id: itemId }, select: { options: true } });
  if (!item?.options || typeof item.options !== "object") return;
  const opts = item.options as Record<string, unknown>;
  const novo = mudar(lerEstado(opts));
  await prisma.storeOrderItem.update({ where: { id: itemId }, data: { options: { ...opts, licenca: novo } } });
}

export async function registrarAtivacao(itemId: string, a: { app: string; nome: string; versao: string }) {
  const agora = new Date().toISOString();
  await gravar(itemId, (e) => {
    const lista = e.ativacoes.filter((x) => x.app !== a.app);
    const antiga = e.ativacoes.find((x) => x.app === a.app);
    lista.unshift({ app: a.app, nome: a.nome, versao: a.versao, primeira: antiga?.primeira ?? agora, ultima: agora, vezes: (antiga?.vezes ?? 0) + 1 });
    return { ...e, ativacoes: lista.slice(0, MAX_ATIVACOES) };
  });
}

export async function definirBloqueio(itemId: string, bloqueada: boolean) {
  await gravar(itemId, (e) => ({ ...e, bloqueada }));
}
