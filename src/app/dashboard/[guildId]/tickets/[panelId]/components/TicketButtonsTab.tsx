"use client";

import { useEffect, useState } from "react";

interface TicketButtonsTabProps {
  guildId: string;
  panel: any;
  setPanel: (panel: any) => void;
  savePanel: (updates: any) => Promise<void>;
  saveStatus: "idle" | "saving" | "saved" | "error";
}

type ButtonStyle = "primary" | "secondary" | "success" | "danger";

interface TicketButton {
  id: string;
  emoji: string;
  label: string;
  style: ButtonStyle;
}

interface GuildEmoji {
  id: string;
  name: string;
  animated?: boolean;
}

const DEFAULT_BUTTONS: TicketButton[] = [
  { id: "close", emoji: "🔒", label: "Fechar", style: "danger" },
  { id: "claim", emoji: "🙋", label: "Assumir", style: "primary" },
  { id: "add_member", emoji: "➕", label: "Adicionar membro", style: "secondary" },
  { id: "remove_member", emoji: "➖", label: "Remover membro", style: "secondary" },
  { id: "rename", emoji: "✏️", label: "Renomear", style: "secondary" },
  { id: "temporary_call", emoji: "🔊", label: "Criar call", style: "success" },
];

const BUTTON_DESCRIPTIONS: Record<string, string> = {
  close: "Botão para fechar o ticket.",
  claim: "Botão para assumir o ticket.",
  add_member: "Botão para adicionar um membro ao ticket.",
  remove_member: "Botão para remover um membro do ticket.",
  rename: "Botão para renomear o canal do ticket.",
  temporary_call: "Botão para criar uma call temporária.",
};

function parseDiscordEmoji(value?: string) {
  if (!value) return null;

  const match = value.match(/^<(a?):([^:]+):(\d+)>$/);

  if (!match) return null;

  return {
    animated: match[1] === "a",
    name: match[2],
    id: match[3],
  };
}

function getDiscordEmojiUrl(emoji: { id: string; animated?: boolean }) {
  return `https://cdn.discordapp.com/emojis/${emoji.id}.${
    emoji.animated ? "gif" : "webp"
  }`;
}

function parseButtons(value: any): TicketButton[] {
  if (!value) return DEFAULT_BUTTONS;

  try {
    const parsed = typeof value === "string" ? JSON.parse(value) : value;

    if (!Array.isArray(parsed)) return DEFAULT_BUTTONS;

    // Garante que todos os botões padrão existam
    return DEFAULT_BUTTONS.map((def) => {
      const custom = parsed.find((b: any) => b.id === def.id);

      return custom
        ? {
            id: def.id,
            emoji: custom.emoji ?? def.emoji,
            label: custom.label ?? def.label,
            style: custom.style ?? def.style,
          }
        : def;
    });
  } catch {
    return DEFAULT_BUTTONS;
  }
}

function getButtonPreviewClass(style?: ButtonStyle) {
  if (style === "secondary") return "bg-[#4e5058] text-white";
  if (style === "success") return "bg-[#248046] text-white";
  if (style === "danger") return "bg-[#da373c] text-white";

  return "bg-[#5865F2] text-white";
}

export default function TicketButtonsTab({
  guildId,
  panel,
  setPanel,
  savePanel,
  saveStatus,
}: TicketButtonsTabProps) {
  const buttons = parseButtons(panel?.ticketButtonsJson);

  const [emojis, setEmojis] = useState<GuildEmoji[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const buttonLabel =
    saveStatus === "saving"
      ? "Salvando..."
      : saveStatus === "saved"
      ? "Salvo"
      : saveStatus === "error"
      ? "Erro ao salvar"
      : "Salvar botões";

  const buttonClass =
    saveStatus === "saved"
      ? "bg-[#2b8a3e]"
      : saveStatus === "error"
      ? "bg-[#c92a2a]"
      : "bg-[#C100FF] hover:bg-[#8A2BFF]";

  useEffect(() => {
    async function loadEmojis() {
      try {
        setLoadingAssets(true);

        const res = await fetch(`/api/guilds/${guildId}/emojis`, {
          credentials: "include",
        });

        if (res.ok) {
          const data = await res.json();
          setEmojis(Array.isArray(data) ? data : []);
        }
      } catch (error) {
        console.error("Erro ao buscar emojis:", error);
      } finally {
        setLoadingAssets(false);
      }
    }

    loadEmojis();
  }, [guildId]);

  const formatGuildEmoji = (emoji: GuildEmoji) => {
    return emoji.animated
      ? `<a:${emoji.name}:${emoji.id}>`
      : `<:${emoji.name}:${emoji.id}>`;
  };

  const getGuildEmojiUrl = (emoji: GuildEmoji) => {
    return `https://cdn.discordapp.com/emojis/${emoji.id}.${
      emoji.animated ? "gif" : "webp"
    }`;
  };

  const updateButton = (id: string, updates: Partial<TicketButton>) => {
    const next = buttons.map((btn) =>
      btn.id === id ? { ...btn, ...updates } : btn
    );

    setPanel({
      ...(panel || {}),
      ticketButtonsJson: next,
    });
  };

  const resetButton = (id: string) => {
    const def = DEFAULT_BUTTONS.find((b) => b.id === id);
    if (!def) return;

    updateButton(id, {
      emoji: def.emoji,
      label: def.label,
      style: def.style,
    });
  };

  const resetAll = () => {
    setPanel({
      ...(panel || {}),
      ticketButtonsJson: DEFAULT_BUTTONS,
    });
  };

  const saveButtons = () => {
    savePanel({
      ticketButtonsJson: buttons,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-semibold text-lg">Botões do Ticket</h3>
          <p className="text-sm text-gray-400 mt-1">
            Personalize o emoji, o texto e o estilo dos botões que aparecem
            dentro do canal do ticket. Para ativar ou desativar cada botão, use a
            aba <strong className="text-[#C100FF]">Moderador</strong>.
          </p>
        </div>

        <button
          type="button"
          onClick={resetAll}
          className="rounded-lg border border-[#2b2b2b] px-3 py-2 text-xs text-gray-300 transition-colors hover:border-red-400 hover:text-red-300"
        >
          Restaurar tudo
        </button>
      </div>

      <div className="space-y-4">
        {buttons.map((btn) => (
          <div
            key={btn.id}
            className="rounded-xl border border-[#2b2b2b] bg-[#0e0e0e] p-5"
          >
            <div className="mb-4 flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-semibold text-white capitalize">
                    {btn.id.replace(/_/g, " ")}
                  </h4>

                  <code className="rounded bg-[#2b2b2b] px-2 py-0.5 text-[10px] text-gray-400">
                    {btn.id}
                  </code>
                </div>

                <p className="mt-1 text-xs text-gray-400">
                  {BUTTON_DESCRIPTIONS[btn.id] || ""}
                </p>
              </div>

              <button
                type="button"
                onClick={() => resetButton(btn.id)}
                className="rounded-lg border border-[#2b2b2b] px-3 py-1.5 text-[11px] text-gray-300 transition-colors hover:border-red-400 hover:text-red-300"
              >
                Restaurar
              </button>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-gray-400">
                  Emoji
                </label>

                <input
                  type="text"
                  value={btn.emoji}
                  onChange={(e) =>
                    updateButton(btn.id, {
                      emoji: e.target.value,
                    })
                  }
                  placeholder="🔒 ou <:emoji:id>"
                  className="w-full rounded-lg border border-[#2b2b2b] bg-[#111111] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
                />

                <div className="mt-2">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-500">
                      Emojis do servidor
                    </span>

                    {loadingAssets && (
                      <span className="text-xs text-gray-500">
                        Carregando...
                      </span>
                    )}
                  </div>

                  {emojis.length === 0 ? (
                    <p className="text-xs text-gray-500">
                      Nenhum emoji encontrado.
                    </p>
                  ) : (
                    <div className="flex max-h-24 flex-wrap gap-2 overflow-y-auto rounded-lg border border-[#2b2b2b] bg-[#111111] p-2">
                      {emojis.map((emoji) => (
                        <button
                          key={emoji.id}
                          type="button"
                          onClick={() =>
                            updateButton(btn.id, {
                              emoji: formatGuildEmoji(emoji),
                            })
                          }
                          title={`:${emoji.name}:`}
                          className="flex h-8 w-8 items-center justify-center rounded-md border border-[#2b2b2b] bg-[#0e0e0e] transition-colors hover:border-[#C100FF] hover:bg-[#171017]"
                        >
                          <img
                            src={getGuildEmojiUrl(emoji)}
                            alt={`:${emoji.name}:`}
                            className="h-5 w-5 object-contain"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-gray-400">
                    Texto
                  </label>

                  <input
                    type="text"
                    value={btn.label}
                    onChange={(e) =>
                      updateButton(btn.id, {
                        label: e.target.value,
                      })
                    }
                    placeholder="Texto do botão"
                    maxLength={80}
                    className="w-full rounded-lg border border-[#2b2b2b] bg-[#111111] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs text-gray-400">
                    Estilo
                  </label>

                  <select
                    value={btn.style}
                    onChange={(e) =>
                      updateButton(btn.id, {
                        style: e.target.value as ButtonStyle,
                      })
                    }
                    className="w-full rounded-lg border border-[#2b2b2b] bg-[#111111] px-3 py-2 text-white focus:border-[#C100FF] focus:outline-none"
                  >
                    <option value="primary">Azul / Principal</option>
                    <option value="secondary">Cinza</option>
                    <option value="success">Verde</option>
                    <option value="danger">Vermelho</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="mt-4 border-t border-[#2b2b2b] pt-4">
              <span className="mb-2 block text-xs text-gray-400">
                Preview
              </span>

              <button
                type="button"
                disabled
                className={`rounded px-4 py-2 text-sm font-medium transition-all ${getButtonPreviewClass(
                  btn.style
                )} cursor-default`}
              >
                {btn.emoji && (
                  <span className="mr-2 inline-flex items-center">
                    {(() => {
                      const emoji = parseDiscordEmoji(btn.emoji);

                      if (!emoji) return btn.emoji;

                      return (
                        <img
                          src={getDiscordEmojiUrl(emoji)}
                          alt={`:${emoji.name}:`}
                          className="h-4 w-4 object-contain"
                          loading="lazy"
                        />
                      );
                    })()}
                  </span>
                )}

                {btn.label || "Botão"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={saveButtons}
        disabled={saveStatus === "saving"}
        className={`${buttonClass} text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50`}
      >
        {buttonLabel}
      </button>
    </div>
  );
}