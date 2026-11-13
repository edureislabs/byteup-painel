"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

type Props = {
  productId: string;
  free: boolean;
  isService: boolean;
  loggedIn: boolean;
  owned: boolean;
  paymentsReady: boolean;
};

const primary =
  "flex w-full items-center justify-center rounded-2xl bg-[#b64cff] px-5 py-3.5 text-sm font-black text-white transition-colors hover:bg-[#c56bff] disabled:cursor-wait disabled:opacity-60";

export default function BuyButton({ productId, free, isService, loggedIn, owned, paymentsReady }: Props) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (owned && !isService) {
    return (
      <>
        <Link href="/loja/minhas-compras" className={primary}>Você já tem — baixar</Link>
        <p className="mt-2 text-center text-xs text-[#7d7588]">Está em Minhas compras.</p>
      </>
    );
  }

  if (!free && !paymentsReady) {
    return (
      <>
        <button type="button" disabled className={`${primary} cursor-not-allowed bg-[#b64cff]/40 text-white/70`}>
          Pagamento em breve
        </button>
        <p className="mt-2 text-center text-xs text-[#7d7588]">Pix e cartão chegam nos próximos dias.</p>
      </>
    );
  }

  async function buy() {
    if (!loggedIn) {
      signIn("discord", { callbackUrl: window.location.href });
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/store/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ productId }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.redirect) throw new Error(data.error || "Erro ao iniciar a compra");
      window.location.href = data.redirect;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
      setBusy(false);
    }
  }

  const label = free ? "Obter grátis" : isService ? "Contratar" : "Comprar agora";

  return (
    <>
      <button type="button" onClick={buy} disabled={busy} className={primary}>
        {busy ? "Abrindo..." : loggedIn ? label : `Entrar com Discord para ${free ? "obter" : "comprar"}`}
      </button>
      {error ? (
        <p className="mt-2 text-center text-xs text-[#f07878]">{error}</p>
      ) : (
        <p className="mt-2 text-center text-xs text-[#7d7588]">
          {free ? "Liberado na hora na sua conta." : "Pix ou cartão via Mercado Pago."}
        </p>
      )}
    </>
  );
}