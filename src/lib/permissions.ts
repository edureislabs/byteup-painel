import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";
import { getDiscordAccessToken } from "@/lib/discordToken";
import { getUserGuilds, isGuildManager } from "@/lib/userGuilds";

export { getDiscordAccessToken };

// Resultado da checagem por usuário + servidor (60 s em memória)
const accessCache = new Map<string, { value: boolean; expiresAt: number }>();
const CACHE_TTL = 60_000;

/**
 * Pode mexer no painel deste servidor?
 * Sim se for dono, administrador, ou estiver na lista do /panelaccess.
 *
 * A lista de servidores do usuário vem de getUserGuilds (com cache em
 * memória + banco), então várias chamadas seguidas não batem no Discord.
 */
export async function canAccessPanel(guildId: string): Promise<boolean> {
  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) return false;

  const cacheKey = `${userId}:${guildId}`;
  const cached = accessCache.get(cacheKey);
  if (cached && cached.expiresAt > Date.now()) return cached.value;

  const accessToken = await getDiscordAccessToken();
  if (!accessToken) return false;

  let result = false;

  try {
    const guilds = await getUserGuilds(userId, accessToken);

    // Discord indisponível e sem cache: usa a última resposta, se houver
    if (!guilds) return cached?.value ?? false;

    const guild = guilds.find((g) => g.id === guildId);

    if (guild) {
      if (isGuildManager(guild)) {
        result = true;
      } else {
        const access = await prisma.panelAccess.findUnique({
          where: { guildId_userId: { guildId, userId } },
        });
        result = !!access;
      }
    }
  } catch (error) {
    console.error("[canAccessPanel] Erro:", error);
    return cached?.value ?? false;
  }

  accessCache.set(cacheKey, { value: result, expiresAt: Date.now() + CACHE_TTL });
  return result;
}

// Limpeza periódica
setInterval(() => {
  const now = Date.now();
  for (const [key, value] of accessCache.entries()) {
    if (value.expiresAt < now) accessCache.delete(key);
  }
}, 5 * 60_000).unref?.();
