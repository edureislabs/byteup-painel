"use client";

import { useEffect, useState } from "react";

interface TicketMessageTabProps {
  guildId: string;
  panel: any;
  setPanel: (panel: any) => void;
  savePanel: (updates: any) => Promise<void>;
  saveStatus: "idle" | "saving" | "saved" | "error";
}

interface EmbedConfig {
  enabled: boolean;
  color: string;
  title: string;
  description: string;
  authorName: string;
  authorIconUrl: string;
  thumbnailUrl: string;
  imageUrl: string;
  footerText: string;
  footerIconUrl: string;
  timestamp: boolean;
}

interface GuildEmoji {
  id: string;
  name: string;
  animated?: boolean;
}

const DEFAULT_EMBED: EmbedConfig = {
  enabled: true,
  color: "#C100FF",
  title: "Ticket aberto",
  description:
    "Olá {user}, seu ticket foi criado com sucesso.\nAguarde até que nossa equipe responda.",
  authorName: "",
  authorIconUrl: "",
  thumbnailUrl: "",
  imageUrl: "",
  footerText: "Sistema de Tickets",
  footerIconUrl: "",
  timestamp: true,
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

function DiscordText({ text }: { text: string }) {
  if (!text) return null;

  const parts = text.split(/(<a?:[^:]+:\d+>)/g);

  return (
    <>
      {parts.map((part, index) => {
        const emoji = parseDiscordEmoji(part);

        if (emoji) {
          return (
            <img
              key={`${emoji.id}-${index}`}
              src={getDiscordEmojiUrl(emoji)}
              alt={`:${emoji.name}:`}
              title={`:${emoji.name}:`}
              className="inline-block h-5 w-5 align-[-4px]"
              loading="lazy"
            />
          );
        }

        return <span key={index}>{part}</span>;
      })}
    </>
  );
}

function parseEmbed(embedJson: any): EmbedConfig {
  if (!embedJson) return DEFAULT_EMBED;

  try {
    const parsed =
      typeof embedJson === "string" ? JSON.parse(embedJson) : embedJson;

    return {
      ...DEFAULT_EMBED,
      ...parsed,
    };
  } catch {
    return DEFAULT_EMBED;
  }
}

export default function TicketMessageTab({
  guildId,
  panel,
  setPanel,
  savePanel,
  saveStatus,
}: TicketMessageTabProps) {
  const embed = parseEmbed(panel?.ticketEmbedJson);

  const [emojis, setEmojis] = useState<GuildEmoji[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const buttonLabel =
    saveStatus === "saving"
      ? "Salvando..."
      : saveStatus === "saved"
      ? "Salvo"
      : saveStatus === "error"
      ? "Erro ao salvar"
      : "Salvar mensagem do ticket";

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

  const updatePanel = (updates: any) => {
    setPanel({
      ...(panel || {}),
      ...updates,
    });
  };

  const updateEmbed = (updates: Partial<EmbedConfig>) => {
    updatePanel({
      ticketEmbedJson: {
        ...embed,
        ...updates,
      },
    });
  };

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

  const addEmojiToDescription = (emoji: GuildEmoji) => {
    updateEmbed({
      description: `${embed.description || ""}${formatGuildEmoji(emoji)}`,
    });
  };

  const saveTicketMessage = () => {
    savePanel({
      ticketMessage: panel?.ticketMessage || "",
      ticketEmbedJson: embed,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg">Mensagem do Ticket</h3>
        <p className="text-sm text-gray-400 mt-1">
          Configure a mensagem e o embed enviados dentro do canal criado do
          ticket. Para configurar os botões, use a aba{" "}
          <strong className="text-[#C100FF]">Botões do Ticket</strong>.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="bg-[#0e0e0e] rounded-xl p-5 border border-[#2b2b2b]">
            <label className="block text-sm font-semibold text-white mb-2">
              Texto da mensagem interna
            </label>

            <p className="text-xs text-gray-400 mb-3">
              Texto enviado dentro do canal do ticket. Pode ficar vazio.
            </p>

            <textarea
              value={panel?.ticketMessage || ""}
              onChange={(e) =>
                updatePanel({
                  ticketMessage: e.target.value,
                })
              }
              rows={4}
              placeholder="Olá {user}, seu ticket foi criado com sucesso."
              className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-4 py-3 resize-none focus:outline-none focus:border-[#C100FF] placeholder:text-gray-500"
            />

            <div className="flex flex-wrap gap-2 mt-3">
              <span className="text-xs text-gray-400">Variáveis:</span>
              <code className="text-xs bg-[#2b2b2b] px-2 py-1 rounded">
                {`{user}`}
              </code>
              <code className="text-xs bg-[#2b2b2b] px-2 py-1 rounded">
                {`{username}`}
              </code>
              <code className="text-xs bg-[#2b2b2b] px-2 py-1 rounded">
                {`{server}`}
              </code>
              <code className="text-xs bg-[#2b2b2b] px-2 py-1 rounded">
                {`{count}`}
              </code>
            </div>
          </div>

          <div className="bg-[#0e0e0e] rounded-xl p-5 border border-[#2b2b2b]">
            <div className="flex items-start justify-between gap-4 mb-4">
              <div>
                <h4 className="font-semibold text-white">Embed interno</h4>
                <p className="text-xs text-gray-400 mt-1">
                  Personalize o embed enviado dentro do canal do ticket.
                </p>
              </div>

              <button
                type="button"
                onClick={() => updateEmbed({ enabled: !embed.enabled })}
                className={`w-11 h-6 rounded-full transition-colors ${
                  embed.enabled ? "bg-[#C100FF]" : "bg-[#2b2b2b]"
                } relative flex-shrink-0`}
              >
                <div
                  className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${
                    embed.enabled ? "left-5" : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {embed.enabled && (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Cor do embed
                  </label>
                  <input
                    type="color"
                    value={embed.color}
                    onChange={(e) => updateEmbed({ color: e.target.value })}
                    className="w-full h-10 bg-[#111111] border border-[#2b2b2b] rounded-lg cursor-pointer"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Título
                  </label>
                  <input
                    type="text"
                    value={embed.title}
                    onChange={(e) => updateEmbed({ title: e.target.value })}
                    placeholder="Ticket aberto"
                    className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    Descrição
                  </label>
                  <textarea
                    value={embed.description}
                    onChange={(e) =>
                      updateEmbed({ description: e.target.value })
                    }
                    rows={5}
                    placeholder="Aguarde até que nossa equipe responda."
                    className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 resize-none focus:outline-none focus:border-[#C100FF]"
                  />
                </div>

                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-gray-400">
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
                      Nenhum emoji encontrado no servidor.
                    </p>
                  ) : (
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto rounded-lg border border-[#2b2b2b] bg-[#111111] p-2">
                      {emojis.map((emoji) => (
                        <button
                          key={emoji.id}
                          type="button"
                          onClick={() => addEmojiToDescription(emoji)}
                          title={`:${emoji.name}:`}
                          className="flex h-9 w-9 items-center justify-center rounded-md border border-[#2b2b2b] bg-[#0e0e0e] transition-colors hover:border-[#C100FF] hover:bg-[#171017]"
                        >
                          <img
                            src={getGuildEmojiUrl(emoji)}
                            alt={`:${emoji.name}:`}
                            className="h-6 w-6 object-contain"
                            loading="lazy"
                          />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Author
                    </label>
                    <input
                      type="text"
                      value={embed.authorName}
                      onChange={(e) =>
                        updateEmbed({ authorName: e.target.value })
                      }
                      placeholder="Sistema de Tickets"
                      className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      URL do ícone do author
                    </label>
                    <input
                      type="url"
                      value={embed.authorIconUrl}
                      onChange={(e) =>
                        updateEmbed({ authorIconUrl: e.target.value })
                      }
                      placeholder="https://..."
                      className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    URL da thumbnail
                  </label>
                  <input
                    type="url"
                    value={embed.thumbnailUrl}
                    onChange={(e) =>
                      updateEmbed({ thumbnailUrl: e.target.value })
                    }
                    placeholder="https://..."
                    className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                  />
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">
                    URL da imagem
                  </label>
                  <input
                    type="url"
                    value={embed.imageUrl}
                    onChange={(e) => updateEmbed({ imageUrl: e.target.value })}
                    placeholder="https://..."
                    className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      Footer
                    </label>
                    <input
                      type="text"
                      value={embed.footerText}
                      onChange={(e) =>
                        updateEmbed({ footerText: e.target.value })
                      }
                      placeholder="Sistema de Tickets"
                      className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                    />
                  </div>

                  <div>
                    <label className="block text-xs text-gray-400 mb-1">
                      URL do ícone do footer
                    </label>
                    <input
                      type="url"
                      value={embed.footerIconUrl}
                      onChange={(e) =>
                        updateEmbed({ footerIconUrl: e.target.value })
                      }
                      placeholder="https://..."
                      className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={embed.timestamp}
                    onChange={(e) =>
                      updateEmbed({ timestamp: e.target.checked })
                    }
                    className="rounded"
                  />
                  <span className="text-sm text-gray-300">
                    Mostrar timestamp
                  </span>
                </label>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={saveTicketMessage}
            disabled={saveStatus === "saving"}
            className={`${buttonClass} text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50`}
          >
            {buttonLabel}
          </button>
        </div>

        <div className="xl:sticky xl:top-8 h-fit">
          <div className="bg-[#0e0e0e] rounded-xl p-5 border border-[#2b2b2b]">
            <h4 className="font-semibold text-white mb-4">
              Preview estilo Discord
            </h4>

            <div className="bg-[#313338] rounded-lg p-4">
              {panel?.ticketMessage && (
                <div className="text-[#dbdee1] text-sm mb-3 whitespace-pre-wrap">
                  <DiscordText text={panel.ticketMessage} />
                </div>
              )}

              {embed.enabled && (
                <div className="flex gap-3 bg-[#2b2d31] rounded p-3 max-w-xl">
                  <div
                    className="w-1 rounded-full flex-shrink-0"
                    style={{ backgroundColor: embed.color }}
                  />

                  <div className="flex-1 min-w-0">
                    {embed.authorName && (
                      <div className="flex items-center gap-2 mb-2">
                        {embed.authorIconUrl ? (
                          <img
                            src={embed.authorIconUrl}
                            alt=""
                            className="w-5 h-5 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-[#C100FF]" />
                        )}

                        <span className="text-white text-xs font-semibold">
                          {embed.authorName}
                        </span>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <div className="flex-1 min-w-0">
                        {embed.title && (
                          <div className="text-white font-semibold text-sm mb-1">
                            {embed.title}
                          </div>
                        )}

                        {embed.description && (
                          <div className="text-[#dbdee1] text-sm whitespace-pre-wrap">
                            <DiscordText text={embed.description} />
                          </div>
                        )}
                      </div>

                      {embed.thumbnailUrl && (
                        <img
                          src={embed.thumbnailUrl}
                          alt=""
                          className="w-20 h-20 rounded object-cover flex-shrink-0"
                        />
                      )}
                    </div>

                    {embed.imageUrl && (
                      <img
                        src={embed.imageUrl}
                        alt=""
                        className="mt-3 max-h-64 rounded object-cover"
                      />
                    )}

                    {(embed.footerText || embed.timestamp) && (
                      <div className="flex items-center gap-2 text-xs text-[#949ba4] mt-3">
                        {embed.footerIconUrl && (
                          <img
                            src={embed.footerIconUrl}
                            alt=""
                            className="w-4 h-4 rounded-full object-cover"
                          />
                        )}

                        {embed.footerText && <span>{embed.footerText}</span>}

                        {embed.footerText && embed.timestamp && <span>•</span>}

                        {embed.timestamp && <span>hoje às 12:34</span>}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {!panel?.ticketMessage && !embed.enabled && (
                <div className="text-sm text-gray-400">
                  Nada configurado ainda.
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Essa mensagem será enviada dentro do canal criado do ticket. Os
              botões são configurados na aba{" "}
              <strong className="text-[#C100FF]">Botões do Ticket</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}