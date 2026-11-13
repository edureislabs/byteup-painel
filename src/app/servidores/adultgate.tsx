"use client";

import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ADULT_COOKIE } from "@/lib/listingShared";

/**
 * Barreira para conteúdo +18: pede login com o Discord e a confirmação
 * "tenho 18 anos". A confirmação fica salva num cookie por 1 ano.
 */
export default function AdultGate({
  loggedIn,
  compact = false,
}: {
  loggedIn: boolean;
  compact?: boolean;
}) {
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const confirm = () => {
    document.cookie = `${ADULT_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 365}; SameSite=Lax`;
    router.refresh();
  };

  return (
    <div className={`rounded-3xl border border-[#f07878]/30 bg-[#f07878]/[0.06] ${compact ? "p-5" : "p-8 text-center"}`}>
      <div className={compact ? "flex flex-col gap-3 md:flex-row md:items-center md:justify-between" : ""}>
        <div>
          <h2 className={`font-black text-white ${compact ? "text-lg" : "text-2xl"}`}>🔞 Conteúdo para maiores de 18 anos</h2>
          <p className={`mt-2 text-sm leading-6 text-[#aaa3b5] ${compact ? "" : "mx-auto max-w-lg"}`}>
            {loggedIn
              ? "Para ver servidores +18, confirme que você tem 18 anos ou mais."
              : "Para ver servidores +18, entre com sua conta do Discord e confirme que tem 18 anos ou mais."}
          </p>
        </div>

        <div className={compact ? "shrink-0" : "mt-6"}>
          {!loggedIn ? (
            <button
              onClick={() => signIn("discord", { callbackUrl: window.location.href })}
              className="site-button-primary px-5 py-3"
            >
              Entrar com Discord
            </button>
          ) : (
            <div className={`flex flex-col gap-3 ${compact ? "md:items-end" : "items-center"}`}>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-[#f4f1f6]">
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={(e) => setChecked(e.target.checked)}
                  className="h-4 w-4 accent-[#b64cff]"
                />
                Tenho 18 anos ou mais
              </label>
              <button onClick={confirm} disabled={!checked} className="site-button-primary px-5 py-3 disabled:opacity-40">
                Confirmar e ver
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/** Botão para sair do modo +18 (apaga a confirmação). */
export function LeaveAdultMode() {
  const router = useRouter();
  return (
    <button
      onClick={() => {
        document.cookie = `${ADULT_COOKIE}=; path=/; max-age=0; SameSite=Lax`;
        router.push("/servidores");
        router.refresh();
      }}
      className="text-xs font-semibold text-[#7d7588] underline hover:text-white"
    >
      Esconder servidores +18
    </button>
  );
}