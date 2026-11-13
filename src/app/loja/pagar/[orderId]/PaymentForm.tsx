"use client";

import { useEffect, useRef, useState } from "react";
import { initMercadoPago, Payment, StatusScreen } from "@mercadopago/sdk-react";

/**
 * Formulário de pagamento do Mercado Pago (Checkout Bricks) no visual da ByteUP.
 * - Cartão: aprovado na hora ou recusado com o motivo.
 * - Pix: mostra o QR code e espera a confirmação (confere a cada 4 s).
 */

// Cores da ByteUP aplicadas no formulário
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

type Props = { publicKey: string; orderId: string; amount: number; initialPaymentId: string | null };

export default function PaymentForm({ publicKey, orderId, amount, initialPaymentId }: Props) {
  ensureMercadoPago(publicKey);

  const [paymentId, setPaymentId] = useState<string | null>(initialPaymentId);
  const [error, setError] = useState<string | null>(null);
  const [formKey, setFormKey] = useState(0);
  const [ready, setReady] = useState(false);
  const [loadError, setLoadError] = useState(false);
  // Desenha o formulário de novo (depois de uma recusa, por exemplo)
  const remount = () => {
    setReady(false);
    setFormKey((k) => k + 1);
  };
  const done = useRef(false);

  const goToSuccess = (pid: string) => {
    if (done.current) return;
    done.current = true;
    window.location.href = `/loja/retorno?pedido=${orderId}&payment_id=${pid}`;
  };

  // Enquanto espera o Pix, consulta o pedido
  useEffect(() => {
    if (!paymentId) return;
    let stop = false;
    const tick = async () => {
      try {
        const res = await fetch(`/api/store/orders/${orderId}`, { cache: "no-store" });
        const data = await res.json();
        if (data.status === "paid") goToSuccess(paymentId);
        if (data.status === "failed" && !stop) {
          setError("O pagamento não foi concluído. Tente de novo.");
          setPaymentId(null);
          remount();
        }
      } catch {
        // tenta de novo no próximo ciclo
      }
    };
    const timer = setInterval(tick, 4000);
    return () => {
      stop = true;
      clearInterval(timer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paymentId, orderId]);

  if (paymentId) {
    return (
      <div>
        <StatusScreen
          initialization={{ paymentId }}
          customization={{ visual: { style, showExternalReference: false } }}
          locale="pt-BR"
        />
        <p className="mt-3 text-center text-xs text-[#7d7588]">
          Assim que o pagamento for confirmado, esta página avança sozinha.{" "}
          <button
            type="button"
            className="underline hover:text-white"
            onClick={() => {
              setPaymentId(null);
              remount();
            }}
          >
            Pagar de outra forma
          </button>
        </p>
      </div>
    );
  }

  return (
    <div>
      {!ready && !loadError && (
        <div className="grid min-h-[320px] place-items-center rounded-3xl border border-white/10 bg-white/[0.03] text-sm text-[#7d7588]">
          Carregando formulário de pagamento...
        </div>
      )}
      {loadError && (
        <div className="rounded-3xl border border-[#f07878]/40 bg-[#f07878]/10 p-6 text-sm text-[#f7b4b4]">
          Não foi possível carregar o pagamento. Desative bloqueadores de anúncio para este site e{" "}
          <button type="button" className="underline" onClick={() => window.location.reload()}>recarregue a página</button>.
        </div>
      )}
      {error && (
        <div className="mb-4 rounded-2xl border border-[#f07878]/40 bg-[#f07878]/10 px-4 py-3 text-sm text-[#f7b4b4]">{error}</div>
      )}
      <Payment
        key={formKey}
        initialization={{ amount }}
        locale="pt"
        customization={{
          paymentMethods: {
            bankTransfer: ["pix"],
            creditCard: "all",
            debitCard: "all",
            maxInstallments: 12,
          },
          visual: { style, defaultPaymentOption: { bankTransferForm: true } },
        }}
        onSubmit={async ({ formData }) => {
          setError(null);
          const res = await fetch("/api/store/pay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ orderId, formData }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            setError(data.error || "Erro ao processar o pagamento.");
            remount();
            return;
          }
          if (data.status === "approved") return goToSuccess(data.paymentId ?? "");
          if (data.status === "pending" || data.status === "in_process") {
            setPaymentId(data.paymentId);
            return;
          }
          setError(data.message || "Pagamento recusado.");
          remount();
        }}
        onReady={() => setReady(true)}
        onError={(e) => {
          console.error("[pagamento]", e);
          if (!ready) setLoadError(true);
        }}
      />
    </div>
  );
}