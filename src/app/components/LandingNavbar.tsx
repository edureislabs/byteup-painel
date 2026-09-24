"use client";

import Link from "next/link";
import { signIn, signOut, useSession } from "next-auth/react";
import { usePathname } from "next/navigation";
import { useState } from "react";

const links = [
  { label: "Início", href: "/" },
  { label: "Recursos", href: "/#recursos" },
  { label: "Documentação", href: "/documentacao" },
  { label: "Comandos", href: "/comandos" },
  { label: "Status", href: "/status" },
];

export default function LandingNavbar() {
  const pathname = usePathname();
  const { data: session, status } = useSession();
  const [mobileOpen, setMobileOpen] = useState(false);

  const isLogged = status === "authenticated";
  const user = session?.user;

  const isActive = (href: string) => {
    if (href === "/") return pathname === "/";

    if (href.includes("#")) {
      const cleanHref = href.split("#")[0] || "/";
      return pathname === cleanHref;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  const closeMobile = () => {
    setMobileOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#08070a]/90 backdrop-blur-md">
      <div className="site-container flex h-[72px] items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-3" onClick={closeMobile}>
          <div className="leading-tight">
            <div className="text-sm font-black text-white">ByteUP</div>
            <div className="text-xs text-[#7d7588]">Discord Bot</div>
          </div>
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-sm font-semibold transition-colors ${
                isActive(link.href)
                  ? "text-white"
                  : "text-[#9b93a7] hover:text-white"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {status === "loading" ? (
            <div className="h-10 w-28 animate-pulse rounded-full bg-white/10" />
          ) : isLogged ? (
            <>
              <Link
                href="/dashboard"
                className="site-button-secondary px-4 py-2.5"
              >
                Dashboard
              </Link>

              <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] p-1.5 pr-3">
                {user?.image ? (
                  <img
                    src={user.image}
                    alt={user?.name || "Usuário"}
                    className="h-8 w-8 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#211a2b] text-xs font-black text-white">
                    {(user?.name?.charAt(0) || "U").toUpperCase()}
                  </div>
                )}

                <div className="leading-tight">
                  <div className="max-w-[130px] truncate text-xs font-bold text-white">
                    {user?.name || "Usuário"}
                  </div>

                  <button
                    type="button"
                    onClick={() => signOut({ callbackUrl: "/" })}
                    className="text-[11px] text-[#7d7588] hover:text-white"
                  >
                    Sair
                  </button>
                </div>
              </div>
            </>
          ) : (
            <button
              type="button"
              onClick={() => signIn("discord", { callbackUrl: "/dashboard" })}
              className="site-button-primary px-5 py-2.5"
            >
              Entrar
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={() => setMobileOpen((current) => !current)}
          className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-white md:hidden"
          aria-label={mobileOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={mobileOpen}
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 top-0 h-0.5 w-5 rounded-full bg-current transition-all ${
                mobileOpen ? "translate-y-[7px] rotate-45" : ""
              }`}
            />
            <span
              className={`absolute left-0 top-[7px] h-0.5 w-5 rounded-full bg-current transition-all ${
                mobileOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 top-[14px] h-0.5 w-5 rounded-full bg-current transition-all ${
                mobileOpen ? "-translate-y-[7px] -rotate-45" : ""
              }`}
            />
          </span>
        </button>
      </div>

      {mobileOpen && (
        <div className="border-t border-white/10 bg-[#08070a]/95 md:hidden">
          <div className="site-container py-4">
            <nav className="grid gap-1">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={closeMobile}
                  className={`rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
                    isActive(link.href)
                      ? "bg-white/[0.07] text-white"
                      : "text-[#aaa3b5] hover:bg-white/[0.05] hover:text-white"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
            </nav>

            <div className="mt-4 border-t border-white/10 pt-4">
              {status === "loading" ? (
                <div className="h-12 animate-pulse rounded-2xl bg-white/10" />
              ) : isLogged ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] p-3">
                    {user?.image ? (
                      <img
                        src={user.image}
                        alt={user?.name || "Usuário"}
                        className="h-10 w-10 rounded-full object-cover"
                      />
                    ) : (
                      <div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#211a2b] text-sm font-black text-white">
                        {(user?.name?.charAt(0) || "U").toUpperCase()}
                      </div>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-black text-white">
                        {user?.name || "Usuário"}
                      </div>
                      <div className="text-xs text-[#7d7588]">
                        Conta conectada
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Link
                      href="/dashboard"
                      onClick={closeMobile}
                      className="site-button-secondary w-full px-4 py-3"
                    >
                      Dashboard
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        closeMobile();
                        signOut({ callbackUrl: "/" });
                      }}
                      className="rounded-full border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white transition-colors hover:bg-white/[0.07]"
                    >
                      Sair
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    closeMobile();
                    signIn("discord", { callbackUrl: "/dashboard" });
                  }}
                  className="site-button-primary w-full"
                >
                  Entrar
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
}