import { prisma } from "@/lib/prisma";
import { normalizeTags, PAGE_SIZE, VOTE_WINDOW_DAYS } from "@/lib/listingShared";

export * from "@/lib/listingShared";

export type PublicListing = {
  guildId: string;
  name: string;
  icon: string | null;
  banner: string | null;
  memberCount: number;
  onlineCount: number;
  shortDescription: string | null;
  tags: string[];
  category: string;
  nsfw: boolean;
  bumpedAt: Date | null;
  votes: number;
  // O convite só vai junto para servidores que NÃO são +18
  inviteCode: string | null;
};

export type ListingQuery = {
  q?: string;
  tag?: string;
  category?: string;
  sort?: "recentes" | "populares" | "membros";
  includeAdult?: boolean;
  page?: number;
};

/**
 * Lista pública de servidores com filtros e ordenação.
 * Só aparecem servidores ativos, não ocultados e com convite criado.
 */
export async function getPublicListings(query: ListingQuery) {
  const q = (query.q || "").trim().slice(0, 60);
  const tag = query.tag ? normalizeTags([query.tag])[0] : undefined;
  const page = Math.max(1, query.page || 1);

  const rows = await prisma.serverListing.findMany({
    where: {
      enabled: true,
      hidden: false,
      inviteCode: { not: null },
      ...(query.includeAdult ? {} : { nsfw: false }),
      ...(query.category ? { category: query.category } : {}),
      ...(tag ? { tags: { has: tag } } : {}),
      ...(q
        ? {
            OR: [
              { name: { contains: q, mode: "insensitive" as const } },
              { shortDescription: { contains: q, mode: "insensitive" as const } },
              { tags: { has: normalizeTags([q])[0] ?? "__nenhuma__" } },
            ],
          }
        : {}),
    },
    take: 1000,
  });

  // Votos dos últimos 30 dias de cada servidor
  const since = new Date(Date.now() - VOTE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  const voteGroups = rows.length
    ? await prisma.serverVote.groupBy({
        by: ["guildId"],
        where: { guildId: { in: rows.map((r) => r.guildId) }, createdAt: { gte: since } },
        _count: { _all: true },
      })
    : [];
  const votes = new Map(voteGroups.map((v) => [v.guildId, v._count._all]));

  const list: PublicListing[] = rows.map((r) => ({
    guildId: r.guildId,
    name: r.name || "Servidor sem nome",
    icon: r.icon,
    banner: r.banner,
    memberCount: r.memberCount,
    onlineCount: r.onlineCount,
    shortDescription: r.shortDescription,
    tags: r.tags,
    category: r.category,
    nsfw: r.nsfw,
    bumpedAt: r.bumpedAt,
    votes: votes.get(r.guildId) ?? 0,
    inviteCode: r.nsfw ? null : r.inviteCode,
  }));

  const sort = query.sort || "recentes";
  list.sort((a, b) => {
    if (sort === "populares") return b.votes - a.votes || b.memberCount - a.memberCount;
    if (sort === "membros") return b.memberCount - a.memberCount;
    // recentes: último bump primeiro (quem nunca bumpou vai para o fim)
    return (b.bumpedAt?.getTime() ?? 0) - (a.bumpedAt?.getTime() ?? 0);
  });

  const total = list.length;
  return {
    total,
    page,
    pages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
    items: list.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
  };
}

/** Hashtags mais usadas (para os atalhos no topo da página). */
export async function getPopularTags(limit = 12) {
  const rows = await prisma.serverListing.findMany({
    where: { enabled: true, hidden: false, nsfw: false, inviteCode: { not: null } },
    select: { tags: true },
    take: 2000,
  });
  const count = new Map<string, number>();
  for (const r of rows) for (const t of r.tags) count.set(t, (count.get(t) ?? 0) + 1);
  return [...count.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

/** Votos de um servidor nos últimos 30 dias. */
export async function countRecentVotes(guildId: string) {
  const since = new Date(Date.now() - VOTE_WINDOW_DAYS * 24 * 60 * 60 * 1000);
  return prisma.serverVote.count({ where: { guildId, createdAt: { gte: since } } });
}