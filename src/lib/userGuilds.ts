import { prisma } from "@/lib/prisma";

/**
 * Lista de servidores do usuário (GET /users/@me/guilds do Discord), com cache.
 *
 * Por que isso existe: essa rota do Discord tem um limite de requisições
 * baixo. Antes, cada chamada da API do painel perguntava ao Discord, e a
 * Vercel roda várias cópias do painel, cada uma com o cache vazio. Abrir a
 * página de Economia (9 chamadas ao mesmo tempo) estourava o limite e o
 * site ficava esperando.
 *
 * Camadas:
 *  1. memória (rápido, por cópia do painel)               — 60 s
 *  2. banco (compartilhado entre todas as cópias)          — 5 min
 *  3. Discord (com 1 requisição por vez para o mesmo usuário)
 *  Se o Discord falhar ou pedir para esperar (429), usa a última lista
 *  salva no banco (até 24 h).
 */

export type UserGuild = {
  id: string;
  name: string;
  icon: string | null;
  owner: boolean;
  permissions: string;
};

const MEMORY_TTL = 60_000;
const DB_FRESH_MS = 5 * 60_000;
const DB_STALE_MAX_MS = 24 * 60 * 60_000;

const memory = new Map<string, { guilds: UserGuild[]; expiresAt: number }>();
const inFlight = new Map<string, Promise<UserGuild[] | null>>();

/** Só os campos que o painel usa (deixa o cache pequeno). */
function slim(raw: any[]): UserGuild[] {
  return raw.map((g) => ({
    id: String(g.id),
    name: String(g.name ?? ""),
    icon: g.icon ?? null,
    owner: g.owner === true,
    permissions: String(g.permissions ?? "0"),
  }));
}

/** Busca no Discord. Retorna null se falhar. Lança "unauthorized" se o token for inválido. */
async function fetchFromDiscord(accessToken: string): Promise<UserGuild[] | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    try {
      const res = await fetch("https://discord.com/api/v10/users/@me/guilds", {
        headers: { Authorization: `Bearer ${accessToken}` },
        signal: controller.signal,
        cache: "no-store",
      });

      if (res.status === 401) throw new Error("unauthorized");

      if (res.status === 429) {
        // Espera só se for pouco tempo; senão usa a lista salva
        const data = await res.json().catch(() => ({}));
        const wait = Number(data?.retry_after ?? 1) * 1000;
        if (attempt === 0 && wait <= 2000) {
          await new Promise((r) => setTimeout(r, wait + 50));
          continue;
        }
        return null;
      }

      if (!res.ok) return null;
      const data = await res.json();
      return Array.isArray(data) ? slim(data) : null;
    } catch (error) {
      if (error instanceof Error && error.message === "unauthorized") throw error;
      return null;
    } finally {
      clearTimeout(timer);
    }
  }
  return null;
}

/**
 * Retorna a lista de servidores do usuário, ou:
 *  - null se não deu para obter (Discord fora e sem cache)
 *  - lança Error("unauthorized") se o token do Discord não vale mais
 */
export async function getUserGuilds(userId: string, accessToken: string): Promise<UserGuild[] | null> {
  // 1. Memória
  const mem = memory.get(userId);
  if (mem && mem.expiresAt > Date.now()) return mem.guilds;

  // Mesmo usuário pedindo ao mesmo tempo: todos esperam a mesma busca
  const pending = inFlight.get(userId);
  if (pending) return pending;

  const task = (async () => {
    // 2. Banco
    const row = await prisma.discordUserGuilds.findUnique({ where: { userId } }).catch(() => null);
    const age = row ? Date.now() - row.fetchedAt.getTime() : Infinity;

    if (row && age < DB_FRESH_MS) {
      const guilds = row.guilds as unknown as UserGuild[];
      memory.set(userId, { guilds, expiresAt: Date.now() + MEMORY_TTL });
      return guilds;
    }

    // 3. Discord
    const fresh = await fetchFromDiscord(accessToken);

    if (fresh) {
      memory.set(userId, { guilds: fresh, expiresAt: Date.now() + MEMORY_TTL });
      await prisma.discordUserGuilds
        .upsert({
          where: { userId },
          update: { guilds: fresh as any, fetchedAt: new Date() },
          create: { userId, guilds: fresh as any },
        })
        .catch((e) => console.error("[userGuilds] Erro ao salvar cache:", e));
      return fresh;
    }

    // Discord falhou: usa a lista salva, se não for muito antiga
    if (row && age < DB_STALE_MAX_MS) {
      return row.guilds as unknown as UserGuild[];
    }
    return null;
  })();

  inFlight.set(userId, task);
  try {
    return await task;
  } finally {
    inFlight.delete(userId);
  }
}

/** Força buscar de novo no Discord na próxima vez (ex.: botão "atualizar"). */
export async function clearUserGuildsCache(userId: string) {
  memory.delete(userId);
  await prisma.discordUserGuilds.delete({ where: { userId } }).catch(() => {});
}

/** Dono ou Administrador do servidor? */
export function isGuildManager(guild: UserGuild): boolean {
  if (guild.owner) return true;
  try {
    return (BigInt(guild.permissions) & BigInt(0x8)) === BigInt(0x8);
  } catch {
    return false;
  }
}
