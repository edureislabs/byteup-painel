import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function getDiscordAccessToken(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session as any)?.accessToken || null;
}

// ===== CACHE EM MEMÓRIA =====
// Chave: `${userId}:${guildId}` → { value, expiresAt }
const accessCache = new Map<string, { value: boolean; expiresAt: number }>();
const CACHE_TTL = 60_000; // 60 segundos

// Cache da lista de guilds (evita bater no Discord toda hora)
const guildsCache = new Map<string, { guilds: any[]; expiresAt: number }>();
const GUILDS_CACHE_TTL = 60_000; // 60 segundos

async function fetchDiscordGuilds(accessToken: string): Promise<any[]> {
  // Usa cache se existir
  const cached = guildsCache.get(accessToken);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.guilds;
  }

  // Timeout de 5s (evita travar se o Discord demorar)
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);

  try {
    const res = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal,
      cache: 'no-store',
    });

    clearTimeout(timeout);

    if (!res.ok) {
      // Se o Discord retornar erro, tenta usar cache expirado (resiliência)
      if (cached) {
        console.warn('[canAccessPanel] Discord falhou, usando cache expirado');
        return cached.guilds;
      }
      return [];
    }

    const guilds = await res.json();

    // Guarda no cache
    guildsCache.set(accessToken, {
      guilds,
      expiresAt: Date.now() + GUILDS_CACHE_TTL,
    });

    return guilds;
  } catch (err) {
    clearTimeout(timeout);
    console.error('[canAccessPanel] Erro no fetch do Discord:', err);

    // Em caso de erro, tenta usar cache expirado
    if (cached) {
      return cached.guilds;
    }

    return [];
  }
}

export async function canAccessPanel(guildId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const userId = (session?.user as any)?.id;
  const accessToken = (session as any)?.accessToken;

  if (!accessToken || !userId) return false;

  // ===== USA CACHE PRIMEIRO =====
  const cacheKey = `${userId}:${guildId}`;
  const cached = accessCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.value;
  }

  try {
    const guilds = await fetchDiscordGuilds(accessToken);
    const guild = guilds.find((g: any) => g.id === guildId);

    let result = false;

    if (guild) {
      // Dono sempre tem acesso
      if (guild.owner === true) {
        result = true;
      } else {
        // Administrador tem acesso
        const permissions =
          typeof guild.permissions === 'string'
            ? parseInt(guild.permissions)
            : guild.permissions;
        const hasAdmin = (permissions & 0x8) === 0x8;

        if (hasAdmin) {
          result = true;
        } else {
          // Verifica lista de acesso no banco
          const access = await prisma.panelAccess.findUnique({
            where: { guildId_userId: { guildId, userId } },
          });
          result = !!access;
        }
      }
    }

    // ===== GUARDA NO CACHE =====
    accessCache.set(cacheKey, {
      value: result,
      expiresAt: Date.now() + CACHE_TTL,
    });

    return result;
  } catch (error) {
    console.error('[canAccessPanel] Erro:', error);

    // Em caso de erro, usa cache expirado (resiliência)
    if (cached) {
      return cached.value;
    }

    return false;
  }
}

// ===== LIMPEZA PERIÓDICA DO CACHE (opcional) =====
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of accessCache.entries()) {
    if (value.expiresAt < now) accessCache.delete(key);
  }
  for (const [key, value] of guildsCache.entries()) {
    if (value.expiresAt < now) guildsCache.delete(key);
  }
}, 5 * 60_000); // a cada 5 min