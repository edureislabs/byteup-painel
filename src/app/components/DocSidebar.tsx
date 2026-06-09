import Link from "next/link";
import { docLinks } from "../data/docs";

export default function DocSidebar() {
  return (
    <aside className="site-card-soft sticky top-24 hidden h-fit p-4 lg:block">
      <div className="mb-3 px-2 text-xs font-black uppercase tracking-[0.18em] text-[#7d7588]">
        Documentação
      </div>

      <nav className="space-y-1">
        {docLinks.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="block rounded-xl px-3 py-2 text-sm font-semibold text-[#aaa3b5] transition-colors hover:bg-white/[0.05] hover:text-white"
          >
            {link.title}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
