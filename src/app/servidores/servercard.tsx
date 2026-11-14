import Link from "next/link";
import { categoryLabel, guildIconUrl, type PublicListing } from "@/lib/listing";

function timeAgo(date: Date | null) {
  if (!date) return null;
  const min = Math.floor((Date.now() - date.getTime()) / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `há ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `há ${h} h`;
  return `há ${Math.floor(h / 24)} d`;
}

export default function ServerCard({ server }: { server: PublicListing }) {
  const icon = guildIconUrl(server.guildId, server.icon, 128);
  const category = categoryLabel(server.category);
  const bumped = timeAgo(server.bumpedAt);

  return (
    <article className="group flex flex-col rounded-3xl border border-white/10 bg-white/[0.03] p-5 transition-colors hover:border-[#b64cff]/50 hover:bg-white/[0.05]">
      <Link href={`/servidores/${server.guildId}`} className="flex items-center gap-3">
        {icon ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={icon} alt="" width={56} height={56} className="h-14 w-14 shrink-0 rounded-2xl" loading="lazy" />
        ) : (
          <div className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-white/10 text-xl font-black">
            {server.name.charAt(0)}
          </div>
        )}
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="truncate font-black text-white group-hover:text-[#d9b4ff]">{server.name}</h3>
            {server.nsfw && (
              <span className="shrink-0 rounded-full bg-[#f07878] px-2 py-0.5 text-[10px] font-black text-black">+18</span>
            )}
          </div>
          <p className="text-xs text-[#7d7588]">
            {category.emoji} {category.label}
          </p>
        </div>
      </Link>

      <p className="mt-4 line-clamp-3 flex-1 text-sm leading-6 text-[#aaa3b5]">
        {server.shortDescription || "Sem descrição."}
      </p>

      {server.tags.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-1.5">
          {server.tags.map((tag) => (
            <Link
              key={tag}
              href={`/servidores?tag=${encodeURIComponent(tag)}`}
              className="rounded-full bg-[#b64cff]/10 px-2.5 py-1 text-xs font-semibold text-[#d9b4ff] hover:bg-[#b64cff]/20"
            >
              #{tag}
            </Link>
          ))}
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[#7d7588]">
        <span>👥 {server.memberCount.toLocaleString("pt-BR")}</span>
        <span>🟢 {server.onlineCount.toLocaleString("pt-BR")} online</span>
        <span>⭐ {server.votes} votos</span>
        {bumped && <span>🚀 {bumped}</span>}
      </div>

      <div className="mt-5 flex gap-2">
        <Link href={`/servidores/${server.guildId}`} className="site-button-secondary flex-1 justify-center px-4 py-2.5 text-sm">
          Ver mais
        </Link>
        {server.inviteCode ? (
          <a
            href={`https://discord.gg/${server.inviteCode}`}
            target="_blank"
            rel="noopener noreferrer"
            className="site-button-primary flex-1 justify-center px-4 py-2.5 text-sm"
          >
            Entrar
          </a>
        ) : (
          <Link href={`/servidores/${server.guildId}`} className="site-button-primary flex-1 justify-center px-4 py-2.5 text-sm">
            Entrar
          </Link>
        )}
      </div>
    </article>
  );
}
