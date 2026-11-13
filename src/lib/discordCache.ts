/**
 * Chamadas à API do Discord com o token do bot, com cache curto em memória.
 *
 * Antes cada página do painel chamava o Discord várias vezes (canais,
 * cargos, "o bot está no servidor?") sem cache nenhum, e as listas de
 * sugestões/denúncias buscavam até 400 usuários um por um. Com mais
 * gente usando, isso batia no limite de requisições do Discord (erro 429).
 */

const DISCORD_API = "https://discord.com/api/v10";

type Entry = {
  expiresAt: number;
  result?: BotGetResult;
  pending?: Promise<BotGetResult>;
};

export type BotGetResult = { ok: boolean; status: number; data: any };

const cache = new Map<string, Entry>();
const MAX_ENTRIES = 5000;

async function doFetch(path: string): Promise<BotGetResult> {
  try {
    const res = await fetch(`${DISCORD_API}${path}`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      cache: "no-store",
    });
    const data = res.ok ? await res.json().catch(() => null) : null;
    return { ok: res.ok, status: res.status, data };
  } catch {
    return { ok: false, status: 0, data: null };
  }
}

/**
 * GET na API do Discord com cache.
 * Só respostas de sucesso (e 404) ficam em cache; erros são tentados de novo.
 * Chamadas iguais ao mesmo tempo compartilham a mesma requisição.
 */
export async function botGet(path: string, ttlMs = 20_000): Promise<BotGetResult> {
  const now = Date.now();
  const entry = cache.get(path);

  if (entry?.result && entry.expiresAt > now) return entry.result;
  if (entry?.pending) return entry.pending;

  const pending = doFetch(path);
  cache.set(path, { expiresAt: 0, pending });

  const result = await pending;

  if (result.ok || result.status === 404) {
    if (cache.size >= MAX_ENTRIES) {
      const firstKey = cache.keys().next().value;
      if (firstKey) cache.delete(firstKey);
    }
    cache.set(path, { expiresAt: Date.now() + ttlMs, result });
  } else {
    cache.delete(path);
  }

  return result;
}

/** Busca vários usuários do Discord, no máximo 5 por vez, com cache de 10 min. */
export async function getUsersCached(
  userIds: string[]
): Promise<Record<string, { username: string; avatar: string | null }>> {
  const result: Record<string, { username: string; avatar: string | null }> = {};
  const ids = [...new Set(userIds)].filter((id) => /^\d{17,20}$/.test(id));

  const CONCURRENCY = 5;
  for (let i = 0; i < ids.length; i += CONCURRENCY) {
    const batch = ids.slice(i, i + CONCURRENCY);
    await Promise.all(
      batch.map(async (userId) => {
        const res = await botGet(`/users/${userId}`, 10 * 60_000);
        if (res.ok && res.data) {
          result[userId] = {
            username: res.data.username,
            avatar: res.data.avatar
              ? `https://cdn.discordapp.com/avatars/${userId}/${res.data.avatar}.png?size=128`
              : null,
          };
        }
      })
    );
  }

  return result;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache.entries()) {
    if (!entry.pending && entry.expiresAt < now) cache.delete(key);
  }
}, 5 * 60_000).unref?.();