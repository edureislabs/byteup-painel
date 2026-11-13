"use client";

import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { loadStripe, type Stripe as StripeJs } from "@stripe/stripe-js";
import { EmbeddedCheckout, EmbeddedCheckoutProvider } from "@stripe/react-stripe-js";

/**
 * Pagamento na página da ByteUP.
 * - Pix: o QR code aparece na hora (o e-mail vem da conta do Discord).
 * - Cartão: formulário do Mercado Pago (Bricks) com as cores da ByteUP.
 * Enquanto espera, consulta o pedido a cada 4 s e avança sozinho quando aprova.
 */

// Cores da ByteUP no formulário de cartão
const style = {
  theme: "dark" as const,
  customVariables: {
    baseColor: "#a855f7",
    baseColorFirstVariant: "#9333ea",
    baseColorSecondVariant: "#c084fc",
    formBackgroundColor: "#111014",
    inputBackgroundColor: "#0b0a0e",
    textPrimaryColor: "#f4f2f7",
    textSecondaryColor: "#aaa3b5",
    outlinePrimaryColor: "#2a2631",
    outlineSecondaryColor: "#3a3542",
    buttonTextColor: "#ffffff",
    errorColor: "#f07878",
    successColor: "#7ee2a8",
    borderRadiusSmall: "8px",
    borderRadiusMedium: "12px",
    borderRadiusLarge: "16px",
    formPadding: "24px",
  },
};

// O SDK precisa ser iniciado uma vez, antes de desenhar o formulário
let initializedKey: string | null = null;
function ensureMercadoPago(publicKey: string) {
  if (initializedKey === publicKey) return;
  initMercadoPago(publicKey, { locale: "pt-BR" });
  initializedKey = publicKey;
}

type Pix = { paymentId: string; qrCode: string; qrBase64: string | null; expiresAt: string | null };
type Props = { publicKey: string | null; stripeKey: string | null; orderId: string; amount: number };

const box = "rounded-3xl border border-white/10 bg-white/[0.03] p-6";

// Configuração fixa do formulário de cartão (objeto estável: o Brick se recria se ele mudar)
const CARD_CUSTOMIZATION = {
  paymentMethods: { creditCard: "all" as const, maxInstallments: 12 },
  visual: { style },
};

/**
 * Formulário de cartão separado e memorizado: assim o relógio do Pix
 * (que atualiza a tela a cada segundo) não faz o formulário sumir e voltar.
 */
const CardForm = memo(function CardForm({
  orderId,
  amount,
  onApproved,
  onWaiting,
}: {
  orderId: string;
  amount: number;
  onApproved: (paymentId: string) => void;
  onWaiting: () => void;
}) {
  const [formKey, setFormKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const initialization = useMemo(() => ({ amount }), [amount]);

  const handleReady = useCallback(() => setReady(true), []);
  const handleError = useCallback((e: unknown) => console.error("[pagamento]", e), []);
  const handleSubmit = useCallback(
    async ({ formData }: { formData: unknown }) => {
      setError(null);
      const res = await fetch("/api/store/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId, formData }),
      });
      const data = await res.json().catch(() => ({}));
      const retry = (msg: string) => {
        setError(msg);
        setReady(false);
        setFormKey((k) => k + 1);
      };
      if (!res.ok) return retry(data.error || "Erro ao processar o pagamento.");
      if (data.status === "approved") return onApproved(data.paymentId ?? "");
      if (data.status === "pending" || data.status === "in_process") return onWaiting();
      retry(data.message || "Pagamento recusado.");
    },
    [orderId, onApproved, onWaiting]
  );

  return (
    <div>
      {error && (
        <div className="mb-4 rounded-2xl border border-[#f07878]/40 bg-[#f07878]/10 px-4 py-3 text-sm text-[#f7b4b4]">{error}</div>
      )}
      {!ready && (
        <div className="grid min-h-[320px] place-items-center rounded-3xl border border-white/10 bg-white/[0.03] text-sm text-[#7d7588]">
          Carregando formulário do cartão...
        </div>
      )}
      <Payment
        key={formKey}
        initialization={initialization}
        locale="pt"
        customization={CARD_CUSTOMIZATION}
        onReady={handleReady}
        onError={handleError}
        onSubmit={handleSubmit}
      />
    </div>
  );
});

// Stripe carregada uma vez por chave
const stripePromises = new Map<string, Promise<StripeJs | null>>();
function getStripe(key: string) {
  if (!stripePromises.has(key)) stripePromises.set(key, loadStripe(key, { locale: "auto" }));
  return stripePromises.get(key)!;
}

/** Pagamento internacional (Stripe), embutido na página. */
const StripeForm = memo(function StripeForm({ stripeKey, orderId }: { stripeKey: string; orderId: string }) {
  const [error, setError] = useState<string | null>(null);
  const fetchClientSecret = useCallback(async () => {
    const res = await fetch("/api/store/stripe/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ orderId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.clientSecret) {
      const msg = data.error || "Não foi possível abrir o pagamento internacional.";
      setError(msg);
      throw new Error(msg);
    }
    return data.clientSecret as string;
  }, [orderId]);
  const options = useMemo(() => ({ fetchClientSecret }), [fetchClientSecret]);

  if (error) {
    return <div className="rounded-2xl border border-[#f07878]/40 bg-[#f07878]/10 px-4 py-3 text-sm text-[#f7b4b4]">{error}</div>;
  }
  return (
    <div className="relative min-h-[420px] overflow-hidden rounded-3xl bg-white p-2">
      <div className="absolute inset-0 -z-0 grid place-items-center text-sm text-gray-400">Carregando pagamento internacional...</div>
      <EmbeddedCheckoutProvider stripe={getStripe(stripeKey)} options={options}>
        <EmbeddedCheckout className="relative z-10 bg-white" />
      </EmbeddedCheckoutProvider>
    </div>
  );
});

export default function PaymentForm({ publicKey, stripeKey, orderId, amount }: Props) {
  if (publicKey) ensureMercadoPago(publicKey);

  const [tab, setTab] = useState<"pix" | "card" | "intl">(publicKey ? "pix" : "intl");
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  // Pix
  const [pix, setPix] = useState<Pix | null>(null);
  const [pixLoading, setPixLoading] = useState(false);
  // Só pede o e-mail se a conta do Discord não tiver um (o servidor avisa)
  const [needEmail, setNeedEmail] = useState(false);
  const [email, setEmail] = useState("");
  const [copied, setCopied] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Cartão
  const [cardWaiting, setCardWaiting] = useState(false);
  const onCardWaiting = useCallback(() => setCardWaiting(true), []);

  const goToSuccess = useCallback(
    (pid: string) => {
      if (done.current) return;
      done.current = true;
      window.location.href = `/loja/retorno?pedido=${orderId}&payment_id=${pid}`;
    },
    [orderId]
  );

  const generatePix = useCallback(
    async (withEmail?: string) => {
      setPixLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/store/pix", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ orderId, email: withEmail }),
        });
        const data = await res.json().catch(() => ({}));
        if (data.status === "approved") return goToSuccess(data.paymentId ?? "");
        if (!res.ok) {
          if (data.needEmail) setNeedEmail(true);
          throw new Error(data.error || "Erro ao gerar o Pix.");
        }
        setNeedEmail(false);
        setPix({ paymentId: data.paymentId, qrCode: data.qrCode, qrBase64: data.qrBase64, expiresAt: data.expiresAt });
      } catch (e) {
        setError(e instanceof Error ? e.message : "Erro ao gerar o Pix.");
      } finally {
        setPixLoading(false);
      }
    },
    [orderId, goToSuccess]
  );

  // Gera (ou recupera) o Pix assim que a página abre
  const started = useRef(false);
  useEffect(() => {
    if (tab !== "pix" || pix || needEmail || started.current) return;
    started.current = true;
    generatePix();
  }, [tab, pix, needEmail, generatePix]);

  // Relógio da validade do QR code
  useEffect(() => {
    if (!pix?.expiresAt || tab !== "pix") return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [pix?.expiresAt, tab]);

  // Confere o pedido enquanto espera o pagamento
  const waitingId = pix?.paymentId ?? (cardWaiting ? "card" : null);
  useEffect(() => {
    if (!waitingId) return;
    const tick = async () => {
      try {
        const res = await fetch(`/api/store/orders/${orderId}`, { cache: "no-store" });
        const data = await res.json();
        if (data.status === "paid") goToSuccess(data.providerRef ?? "");
      } catch {
        // tenta de novo
      }
    };
    const timer = setInterval(tick, 4000);
    return () => clearInterval(timer);
  }, [waitingId, orderId, goToSuccess]);

  const remaining = pix?.expiresAt ? Math.max(0, new Date(pix.expiresAt).getTime() - now) : null;
  const expired = remaining === 0;
  const mmss =
    remaining !== null
      ? `${String(Math.floor(remaining / 60000)).padStart(2, "0")}:${String(Math.floor((remaining % 60000) / 1000)).padStart(2, "0")}`
      : null;

  async function copy() {
    if (!pix) return;
    try {
      await navigator.clipboard.writeText(pix.qrCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setError("Não consegui copiar. Selecione o código e copie manualmente.");
    }
  }

  const tabBtn = (active: boolean) =>
    `flex-1 rounded-2xl px-4 py-3 text-sm font-bold transition-colors ${
      active ? "bg-[#b64cff] text-white" : "text-[#aaa3b5] hover:text-white"
    }`;

  return (
    <div>
      <div className="mb-4 flex gap-2 rounded-3xl border border-white/10 bg-white/[0.03] p-1.5">
        {publicKey && (
          <>
            <button type="button" className={tabBtn(tab === "pix")} onClick={() => setTab("pix")}>
              ⚡ Pix
            </button>
            <button type="button" className={tabBtn(tab === "card")} onClick={() => setTab("card")}>
              💳 Cartão
            </button>
          </>
        )}
        {stripeKey && (
          <button type="button" className={tabBtn(tab === "intl")} onClick={() => setTab("intl")}>
            🌍 Internacional
          </button>
        )}
      </div>

      {error && (
        <div className="mb-4 rounded-2xl border border-[#f07878]/40 bg-[#f07878]/10 px-4 py-3 text-sm text-[#f7b4b4]">{error}</div>
      )}

      {/* ===== Pix ===== */}
      {tab === "pix" && (
        <div className={box}>
          {needEmail && !pix ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                generatePix(email);
              }}
            >
              <p className="text-sm text-[#aaa3b5]">Informe seu e-mail para gerar o Pix (o Mercado Pago envia o comprovante para ele).</p>
              <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="seu@email.com"
                  className="flex-1 rounded-2xl border border-white/10 bg-black/30 px-4 py-3 text-sm placeholder:text-[#7d7588] focus:border-[#b64cff] focus:outline-none"
                />
                <button disabled={pixLoading} className="rounded-2xl bg-[#b64cff] px-5 py-3 text-sm font-bold disabled:opacity-50">
                  {pixLoading ? "Gerando..." : "Gerar QR code"}
                </button>
              </div>
            </form>
          ) : !pix ? (
            <div className="grid min-h-[280px] place-items-center text-sm text-[#7d7588]">
              {pixLoading ? "Gerando QR code..." : (
                <button type="button" onClick={() => generatePix()} className="rounded-2xl bg-[#b64cff] px-5 py-3 font-bold text-white">
                  Gerar QR code
                </button>
              )}
            </div>
          ) : (
            <div className="grid gap-6 md:grid-cols-[240px_1fr] md:items-center">
              <div className="relative mx-auto">
                {pix.qrBase64 ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`data:image/png;base64,${pix.qrBase64}`}
                    alt="QR code Pix"
                    className={`h-60 w-60 rounded-2xl bg-white p-3 ${expired ? "opacity-20" : ""}`}
                  />
                ) : (
                  <div className="grid h-60 w-60 place-items-center rounded-2xl bg-white/10 text-xs text-[#7d7588]">Use o copia e cola</div>
                )}
                {expired && (
                  <div className="absolute inset-0 grid place-items-center">
                    <button
                      type="button"
                      onClick={() => {
                        setPix(null);
                        generatePix();
                      }}
                      className="rounded-2xl bg-[#b64cff] px-4 py-2.5 text-sm font-bold"
                    >
                      Gerar novo QR code
                    </button>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center gap-2 text-sm font-bold text-[#f0b878]">
                  <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-[#f0b878]" />
                  {expired ? "QR code expirado" : "Aguardando pagamento"}
                  {mmss && !expired && <span className="font-normal text-[#7d7588]">• expira em {mmss}</span>}
                </div>

                <ol className="mt-4 space-y-1.5 text-sm text-[#aaa3b5]">
                  <li>1. Abra o app do seu banco e escolha <strong className="text-white">Pix</strong>.</li>
                  <li>2. Leia o QR code ou use o <strong className="text-white">Pix Copia e Cola</strong>.</li>
                  <li>3. Confirme o pagamento. Esta página avança sozinha.</li>
                </ol>

                <div className="mt-5 flex gap-2">
                  <input
                    readOnly
                    value={pix.qrCode}
                    onFocus={(e) => e.currentTarget.select()}
                    className="min-w-0 flex-1 rounded-2xl border border-white/10 bg-black/30 px-3 py-2.5 font-mono text-xs text-[#aaa3b5]"
                  />
                  <button
                    type="button"
                    onClick={copy}
                    disabled={expired}
                    className="shrink-0 rounded-2xl bg-[#b64cff] px-4 py-2.5 text-sm font-bold disabled:opacity-40"
                  >
                    {copied ? "✓ Copiado" : "Copiar"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ===== Internacional (Stripe) ===== */}
      {tab === "intl" && stripeKey && (
        <div>
          <p className="mb-3 text-xs text-[#7d7588]">
            Para cartões de fora do Brasil. O valor é cobrado em reais e o seu banco converte para a sua moeda.
          </p>
          <StripeForm stripeKey={stripeKey} orderId={orderId} />
        </div>
      )}

      {/* ===== Cartão ===== */}
      {tab === "card" && (
        <div>
          {cardWaiting ? (
            <div className={`${box} text-center`}>
              <div className="text-4xl">⏳</div>
              <p className="mt-3 font-bold">Pagamento em análise</p>
              <p className="mt-2 text-sm text-[#aaa3b5]">
                O Mercado Pago está revisando o pagamento. Assim que aprovar, esta página avança e você recebe a DM.
              </p>
            </div>
          ) : (
            <CardForm orderId={orderId} amount={amount} onApproved={goToSuccess} onWaiting={onCardWaiting} />
          )}
        </div>
      )}
    </div>
  );
}