"use client";

import { signIn } from "next-auth/react";
import { useState } from "react";
import { REPORT_REASONS } from "@/lib/listingShared";

/** Botões da página do servidor: Entrar, Votar e Denunciar. */
export default function ServerActions({
  guildId,
  initialVotes,
  loggedIn,
}: {
  guildId: string;
  initialVotes: number;
  loggedIn: boolean;
}) {
  const [votes, setVotes] = useState(initialVotes);
  const [voteMsg, setVoteMsg] = useState("");
  const [joining, setJoining] = useState(false);
  const [joinMsg, setJoinMsg] = useState("");
  const [reportOpen, setReportOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [details, setDetails] = useState("");
  const [reportMsg, setReportMsg] = useState("");

  const login = () => signIn("discord", { callbackUrl: window.location.href });

  const join = async () => {
    setJoining(true);
    setJoinMsg("");
    const res = await fetch(`/api/public/servers/${guildId}/invite`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    setJoining(false);
    if (res.ok && data.url) {
      window.open(data.url, "_blank", "noopener,noreferrer");
    } else {
      setJoinMsg(data.error || "Não consegui pegar o convite.");
    }
  };

  const vote = async () => {
    if (!loggedIn) return login();
    setVoteMsg("");
    const res = await fetch(`/api/public/servers/${guildId}/vote`, { method: "POST" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setVotes(data.votes);
      setVoteMsg("Voto registrado! Você pode votar de novo em 12 horas.");
    } else if (data.nextVoteAt) {
      setVoteMsg(`Você já votou. Próximo voto: ${new Date(data.nextVoteAt).toLocaleString("pt-BR")}.`);
    } else {
      setVoteMsg(data.error || "Não consegui registrar o voto.");
    }
  };

  const report = async () => {
    if (!loggedIn) return login();
    setReportMsg("");
    const res = await fetch(`/api/public/servers/${guildId}/report`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason, details }),
    });
    const data = await res.json().catch(() => ({}));
    setReportMsg(data.message || data.error || "");
    if (res.ok) {
      setReason("");
      setDetails("");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row">
        <button onClick={join} disabled={joining} className="site-button-primary flex-1 justify-center px-6 py-3.5 text-base">
          {joining ? "Abrindo..." : "Entrar no servidor"}
        </button>
        <button onClick={vote} className="site-button-secondary flex-1 justify-center px-6 py-3.5 text-base">
          ⭐ Votar ({votes})
        </button>
      </div>
      {joinMsg && <p className="text-sm text-[#f07878]">{joinMsg}</p>}
      {voteMsg && <p className="text-sm text-[#aaa3b5]">{voteMsg}</p>}

      <div className="pt-2">
        {!reportOpen ? (
          <button onClick={() => setReportOpen(true)} className="text-xs font-semibold text-[#7d7588] underline hover:text-[#f07878]">
            Denunciar este servidor
          </button>
        ) : (
          <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
            <p className="text-sm font-bold text-white">Denunciar servidor</p>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-3 w-full rounded-xl border border-white/10 bg-[#111014] px-3 py-2.5 text-sm text-white"
            >
              <option value="">Escolha o motivo</option>
              {REPORT_REASONS.map((r) => (
                <option key={r.value} value={r.value}>{r.label}</option>
              ))}
            </select>
            <textarea
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              maxLength={500}
              rows={3}
              placeholder="Detalhes (opcional)"
              className="mt-2 w-full rounded-xl border border-white/10 bg-[#111014] px-3 py-2.5 text-sm text-white placeholder:text-[#7d7588]"
            />
            <div className="mt-2 flex items-center gap-3">
              <button onClick={report} disabled={!reason} className="site-button-primary px-4 py-2 text-sm disabled:opacity-40">
                Enviar denúncia
              </button>
              <button onClick={() => setReportOpen(false)} className="text-xs text-[#7d7588] hover:text-white">
                Cancelar
              </button>
            </div>
            {reportMsg && <p className="mt-2 text-sm text-[#aaa3b5]">{reportMsg}</p>}
          </div>
        )}
      </div>
    </div>
  );
}