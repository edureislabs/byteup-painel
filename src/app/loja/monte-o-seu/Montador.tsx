"use client";

import { useEffect, useMemo, useState } from "react";
import { signIn } from "next-auth/react";
import { bestCombo, builderModule, type BuilderModule, type ComboAtivo } from "@/lib/builder/catalog";
import { formatPrice } from "@/lib/storeShared";

type Props = {
  loggedIn: boolean;
  paymentsReady: boolean;
  /** preços valendo agora (vêm do servidor) e só os módulos à venda */
  base: { name: string; priceCents: number };
  modules: BuilderModule[];
  /** combos com desconto (não valem em "Adicionar módulos") */
  combos: ComboAtivo[];
  /** "Adicionar módulos" a um bot que a pessoa já comprou */
  upgrade?: { botItemId: string; nome: string; cor: string; owned: string[] };
};

const RASCUNHO = "byteup:monte-o-seu";
type Form = { selected: string[]; botName: string; color: string };

export default function Montador({
  loggedIn,
  paymentsReady,
  base,
  modules: BUILDER_MODULES,
  combos,
  upgrade,
}: Props) {
  const [form, setForm] = useState<Form>({
    selected: [],
    botName: upgrade?.nome ?? "",
    color: upgrade?.cor ?? "#5865F2",
  });
  const owned = useMemo(() => new Set(upgrade?.owned ?? []), [upgrade]);
  const { selected, botName, color } = form;
  const setSelected = (fn: (s: string[]) => string[]) =>
    setForm((f) => ({ ...f, selected: fn(f.selected) }));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // volta a seleção depois do login com o Discord
  useEffect(() => {
    if (upgrade) return;
    try {
      const raw = sessionStorage.getItem(RASCUNHO);
      if (!raw) return;
      sessionStorage.removeItem(RASCUNHO);
      const d = JSON.parse(raw);
      const salvo: Form = {
        selected: Array.isArray(d.selected)
          ? d.selected.filter((id: unknown) =>
              BUILDER_MODULES.some((m) => m.id === id),
            )
          : [],
        botName: typeof d.botName === "string" ? d.botName.slice(0, 32) : "",
        color:
          typeof d.color === "string" && /^#[0-9a-f]{6}$/i.test(d.color)
            ? d.color
            : "#5865F2",
      };
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setForm(salvo);
    } catch {
      // sem rascunho
    }
  }, [BUILDER_MODULES, upgrade]);

  const ordered = useMemo(
    () => BUILDER_MODULES.filter((m) => selected.includes(m.id)),
    [selected, BUILDER_MODULES],
  );
  const disponiveis = BUILDER_MODULES.filter((m) => !owned.has(m.id));
  const precos = useMemo(() => Object.fromEntries(BUILDER_MODULES.map((m) => [m.id, m.priceCents])), [BUILDER_MODULES]);
  const combo = upgrade ? null : bestCombo(combos, precos, ordered.map((m) => m.id));
  const total = (upgrade ? 0 : base.priceCents) + ordered.reduce((t, m) => t + m.priceCents, 0) - (combo?.discountCents ?? 0);
  const allSelected =
    disponiveis.length > 0 && disponiveis.every((m) => selected.includes(m.id));
  const nameOk =
    Boolean(upgrade) ||
    (botName.trim().length >= 2 && botName.trim().length <= 32);

  // marcar um módulo marca junto o que ele precisa (ex.: Avaliação → Tickets);
  // desmarcar um módulo desmarca quem depende dele
  const toggle = (id: string) => {
    if (owned.has(id)) return;
    setSelected((s) => {
      if (s.includes(id)) {
        const tirar = new Set([id]);
        for (const m of BUILDER_MODULES) if (m.requires?.includes(id) && !owned.has(m.id)) tirar.add(m.id);
        return s.filter((x) => !tirar.has(x));
      }
      const precisa = (BUILDER_MODULES.find((m) => m.id === id)?.requires ?? []).filter((r) => !owned.has(r) && !s.includes(r));
      return [...s, id, ...precisa];
    });
  };

  async function comprar() {
    setError(null);
    if (!ordered.length) return setError("Escolha pelo menos um módulo.");
    if (!nameOk) return setError("Dê um nome ao bot (de 2 a 32 caracteres).");
    if (!loggedIn) {
      try {
        sessionStorage.setItem(RASCUNHO, JSON.stringify(form));
      } catch {
        // sem armazenamento: a pessoa escolhe de novo
      }
      signIn("discord", { callbackUrl: window.location.href });
      return;
    }
    setBusy(true);
    try {
      const res = await fetch("/api/store/builder", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          upgrade
            ? {
                botItemId: upgrade.botItemId,
                modules: ordered.map((m) => m.id),
              }
            : {
                modules: ordered.map((m) => m.id),
                botName: botName.trim(),
                color,
              },
        ),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.redirect)
        throw new Error(data.error || "Erro ao iniciar a compra");
      window.location.href = data.redirect;
    } catch (e) {
      setError(e instanceof Error ? e.message : "Erro");
      setBusy(false);
    }
  }

  return (
    <div className="mt-10 grid gap-8 lg:grid-cols-[1fr_360px]">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="text-lg font-black">Escolha os módulos</h2>
          <button
            type="button"
            onClick={() =>
              setSelected(() =>
                allSelected ? [] : disponiveis.map((m) => m.id),
              )
            }
            className="rounded-full border border-white/10 px-4 py-1.5 text-xs font-bold text-[#aaa3b5] hover:text-white"
          >
            {allSelected ? "Limpar" : "Selecionar todos"}
          </button>
        </div>

        {!upgrade && combos.length > 0 && (
          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {combos.map((c) => {
              const soma = c.modules.reduce((t, id) => t + (precos[id] ?? 0), 0);
              const ativo = combo?.combo.id === c.id;
              return (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelected((s) => [...new Set([...s, ...c.modules])])}
                  className={`rounded-2xl border px-4 py-3 text-left text-sm transition-colors ${
                    ativo ? "border-[#7ee2a8] bg-[#7ee2a8]/10" : "border-[#b64cff]/30 bg-[#b64cff]/[0.06] hover:border-[#b64cff]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-black">
                      {c.emoji} Combo {c.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-[#7ee2a8]/15 px-2 py-0.5 text-xs font-bold text-[#7ee2a8]">-{c.discountPct}%</span>
                  </div>
                  <p className="mt-1 text-xs text-[#aaa3b5]">
                    {c.modules.map((id) => BUILDER_MODULES.find((m) => m.id === id)?.name ?? id).join(" + ")}
                  </p>
                  <p className="mt-1 text-xs text-[#7d7588]">
                    <s>{formatPrice(soma)}</s> {formatPrice(soma - Math.round((soma * c.discountPct) / 100))}{" "}
                    {ativo ? "· aplicado ✓" : "· clique para escolher"}
                  </p>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {BUILDER_MODULES.map((m) => {
            const tem = owned.has(m.id);
            const on = tem || selected.includes(m.id);
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => toggle(m.id)}
                aria-pressed={on}
                disabled={tem}
                className={`flex flex-col rounded-3xl border p-5 text-left transition-colors ${
                  tem
                    ? "cursor-default border-[#7ee2a8]/30 bg-[#7ee2a8]/[0.04] opacity-70"
                    : on
                      ? "border-[#b64cff] bg-[#b64cff]/10"
                      : "border-white/10 bg-white/[0.03] hover:border-white/25"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="text-2xl" aria-hidden>
                    {m.emoji}
                  </span>
                  <span
                    className={`grid h-6 w-6 shrink-0 place-items-center rounded-lg border text-xs font-black ${
                      tem
                        ? "border-[#7ee2a8] bg-[#7ee2a8] text-black"
                        : on
                          ? "border-[#b64cff] bg-[#b64cff] text-white"
                          : "border-white/20 text-transparent"
                    }`}
                    aria-hidden
                  >
                    ✓
                  </span>
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2">
                  <span className="font-black text-white">{m.name}</span>
                  <span
                    className={`shrink-0 text-sm font-bold ${tem ? "text-[#7ee2a8]" : "text-[#d9b4ff]"}`}
                  >
                    {tem ? "✓ já tem" : `+ ${formatPrice(m.priceCents)}`}
                  </span>
                </div>
                <p className="mt-2 flex-1 text-sm leading-6 text-[#aaa3b5]">
                  {m.description}
                </p>
                <p className="mt-3 text-xs text-[#7d7588]">
                  {m.commands.length
                    ? `${m.commands.length} comando(s)`
                    : "Automático"}
                  {m.configGroup ? " · configurável com /config" : ""}
                  {m.requires?.length ? ` · precisa de ${m.requires.map((r) => builderModule(r)?.name ?? r).join(", ")}` : ""}
                </p>
              </button>
            );
          })}
        </div>
      </div>

      <aside className="h-fit rounded-3xl border border-white/10 bg-white/[0.03] p-6 lg:sticky lg:top-24">
        <h2 className="font-black">
          {upgrade ? `Adicionar ao ${upgrade.nome}` : "Seu bot"}
        </h2>

        {!upgrade && (
          <>
            <label
              className="mt-4 block text-xs font-semibold text-[#aaa3b5]"
              htmlFor="nome-bot"
            >
              Nome do bot
            </label>
            <input
              id="nome-bot"
              value={botName}
              onChange={(e) =>
                setForm((f) => ({ ...f, botName: e.target.value }))
              }
              maxLength={32}
              placeholder="Ex.: Guardião"
              className="mt-1 w-full rounded-2xl border border-white/10 bg-black/30 px-4 py-2.5 text-sm text-white outline-none focus:border-[#b64cff]"
            />

            <label
              className="mt-4 block text-xs font-semibold text-[#aaa3b5]"
              htmlFor="cor-bot"
            >
              Cor das mensagens
            </label>
            <div className="mt-1 flex items-center gap-3">
              <input
                id="cor-bot"
                type="color"
                value={color}
                onChange={(e) =>
                  setForm((f) => ({ ...f, color: e.target.value }))
                }
                className="h-10 w-14 cursor-pointer rounded-xl border border-white/10 bg-transparent"
              />
              <span className="font-mono text-sm text-[#aaa3b5]">
                {color.toUpperCase()}
              </span>
            </div>
          </>
        )}

        <div className="mt-6 space-y-2 border-t border-white/10 pt-5 text-sm">
          {upgrade ? (
            <div className="text-xs text-[#7ee2a8]">
              ✓ Já tem: ⚙️ {base.name}
              {upgrade.owned
                .map(
                  (id) =>
                    ` · ${builderModule(id)?.emoji ?? ""} ${builderModule(id)?.name ?? id}`,
                )
                .join("")}
            </div>
          ) : (
            <div className="flex justify-between gap-3">
              <span>⚙️ {base.name}</span>
              <span className="text-[#aaa3b5]">
                {formatPrice(base.priceCents)}
              </span>
            </div>
          )}
          {ordered.map((m) => (
            <div key={m.id} className="flex justify-between gap-3">
              <span>
                {m.emoji} {m.name}
              </span>
              <span className="text-[#aaa3b5]">
                {formatPrice(m.priceCents)}
              </span>
            </div>
          ))}
          {combo && (
            <div className="flex justify-between gap-3 text-[#7ee2a8]">
              <span>
                {combo.combo.emoji} Combo {combo.combo.name} (-{combo.combo.discountPct}%)
              </span>
              <span>-{formatPrice(combo.discountCents)}</span>
            </div>
          )}
          {!ordered.length && (
            <p className="text-xs text-[#7d7588]">
              Nenhum módulo escolhido ainda.
            </p>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-4">
          <span className="text-sm text-[#aaa3b5]">Total</span>
          <span className="text-3xl font-black">{formatPrice(total)}</span>
        </div>

        <div className="mt-5">
          {paymentsReady ? (
            <button
              type="button"
              onClick={comprar}
              disabled={busy}
              className="flex w-full items-center justify-center rounded-2xl bg-[#b64cff] px-5 py-3.5 text-sm font-black text-white transition-colors hover:bg-[#c56bff] disabled:cursor-wait disabled:opacity-60"
            >
              {busy
                ? "Abrindo..."
                : loggedIn
                  ? "Continuar para o pagamento"
                  : "Entrar com Discord para comprar"}
            </button>
          ) : (
            <button
              type="button"
              disabled
              className="flex w-full cursor-not-allowed items-center justify-center rounded-2xl bg-[#b64cff]/40 px-5 py-3.5 text-sm font-black text-white/70"
            >
              Pagamento em breve
            </button>
          )}
          {error ? (
            <p className="mt-2 text-center text-xs text-[#f07878]">{error}</p>
          ) : (
            <p className="mt-2 text-center text-xs text-[#7d7588]">
              {upgrade
                ? "Você paga só os módulos novos. O bot completo chega na sua DM; seus dados continuam (veja o README)."
                : "Pix ou cartão. O bot chega na sua DM assim que o pagamento cair."}
            </p>
          )}
        </div>

        <ul className="mt-6 space-y-2 border-t border-white/10 pt-5 text-sm text-[#aaa3b5]">
          <li>🌐 Funciona em qualquer servidor</li>
          <li>⚙️ Configurado por comandos, sem mexer no código</li>
          <li>📘 Passo a passo para ligar (README)</li>
          <li>🔁 Baixe de novo quando quiser em &quot;Minhas compras&quot;</li>
        </ul>
      </aside>
    </div>
  );
}
