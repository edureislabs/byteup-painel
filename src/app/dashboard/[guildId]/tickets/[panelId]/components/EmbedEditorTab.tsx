"use client";

import { useEffect, useState } from "react";

interface EmbedEditorTabProps {
  guildId: string;
  panel: any;
  setPanel: (panel: any) => void;
  savePanel: (updates: any) => Promise<void>;
  saving: boolean;
}

type ButtonStyle = "primary" | "secondary" | "success" | "danger";

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

interface SelectOption {
  id: string;
  label: string;
  value: string;
  description: string;
  emoji: string;
}

interface MessageComponent {
  id: string;
  type: "button" | "select";
  label?: string;
  emoji?: string;
  style?: ButtonStyle;
  customId?: string;
  disabled?: boolean;

  isLink?: boolean;
  linkType?: "url" | "channel";
  url?: string;
  channelId?: string;

  placeholder?: string;
  minValues?: number;
  maxValues?: number;
  options?: SelectOption[];
}
interface DiscordChannel {
  id: string;
  name: string;
  type?: number;
}

interface GuildEmoji {
  id: string;
  name: string;
  animated?: boolean;
}

const DEFAULT_EMBED: EmbedConfig = {
  enabled: true,
  color: "#C100FF",
  title: "Abrir ticket",
  description: "Clique no botão abaixo para abrir um ticket.",
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

function parseComponents(componentsJson: any): MessageComponent[] {
  if (!componentsJson) return [];

  try {
    const parsed =
      typeof componentsJson === "string"
        ? JSON.parse(componentsJson)
        : componentsJson;

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function getButtonPreviewClass(style?: ButtonStyle) {
  if (style === "secondary") return "bg-[#4e5058] text-white";
  if (style === "success") return "bg-[#248046] text-white";
  if (style === "danger") return "bg-[#da373c] text-white";

  return "bg-[#5865F2] text-white";
}

export default function EmbedEditorTab({
  guildId,
  panel,
  setPanel,
  savePanel,
  saving,
}: EmbedEditorTabProps) {
  const embed = parseEmbed(panel?.embedJson);
  const components = parseComponents(panel?.componentsJson);
  const [channels, setChannels] = useState<DiscordChannel[]>([]);
const [emojis, setEmojis] = useState<GuildEmoji[]>([]);
const [loadingAssets, setLoadingAssets] = useState(false);

useEffect(() => {
  async function loadAssets() {
    try {
      setLoadingAssets(true);

      const [channelsRes, emojisRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/channels`, {
          credentials: "include",
        }),
        fetch(`/api/guilds/${guildId}/emojis`, {
          credentials: "include",
        }),
      ]);

      if (channelsRes.ok) {
        const channelsData = await channelsRes.json();
        setChannels(Array.isArray(channelsData) ? channelsData : []);
      }

      if (emojisRes.ok) {
        const emojisData = await emojisRes.json();
        setEmojis(Array.isArray(emojisData) ? emojisData : []);
      }
    } catch (error) {
      console.error("Erro ao buscar canais/emojis:", error);
    } finally {
      setLoadingAssets(false);
    }
  }

  loadAssets();
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


const getDiscordEmojiUrl = (emoji: { id: string; animated?: boolean }) => {
  return `https://cdn.discordapp.com/emojis/${emoji.id}.${
    emoji.animated ? "gif" : "webp"
  }`;
};

const addEmojiToDescription = (emoji: GuildEmoji) => {
  updateEmbed({
    description: `${embed.description || ""}${formatGuildEmoji(emoji)}`,
  });
};
const setButtonEmoji = (componentId: string, emoji: GuildEmoji) => {
  updateComponent(componentId, {
    emoji: formatGuildEmoji(emoji),
  });
};  

const getChannelUrl = (channelId?: string) => {
  if (!channelId) return "";
  return `https://discord.com/channels/${guildId}/${channelId}`;
};

  const updatePanel = (updates: any) => {
    setPanel({
      ...(panel || {}),
      ...updates,
    });
  };

  const updateEmbed = (updates: Partial<EmbedConfig>) => {
    updatePanel({
      embedJson: {
        ...embed,
        ...updates,
      },
    });
  };

  const updateComponents = (nextComponents: MessageComponent[]) => {
    updatePanel({
      componentsJson: nextComponents,
    });
  };

  const addButton = () => {
  updateComponents([
    ...components,
    {
      id: Date.now().toString(),
      type: "button",
      label: "Abrir ticket",
      emoji: "🎫",
      style: "primary",
      customId: `ticket_button_${Date.now()}`,
      disabled: false,
      isLink: false,
      linkType: "url",
      url: "",
      channelId: "",
    },
  ]);
};

  const addSelect = () => {
    updateComponents([
      ...components,
      {
        id: Date.now().toString(),
        type: "select",
        placeholder: "Selecione uma opção",
        customId: `ticket_select_${Date.now()}`,
        minValues: 1,
        maxValues: 1,
        options: [
          {
            id: Date.now().toString(),
            label: "Suporte",
            value: "suporte",
            description: "Abrir ticket de suporte",
            emoji: "🛠️",
          },
        ],
      },
    ]);
  };

  const updateComponent = (id: string, updates: Partial<MessageComponent>) => {
    updateComponents(
      components.map((component) =>
        component.id === id ? { ...component, ...updates } : component
      )
    );
  };

  const removeComponent = (id: string) => {
    updateComponents(components.filter((component) => component.id !== id));
  };

  const addSelectOption = (componentId: string) => {
    updateComponents(
      components.map((component) => {
        if (component.id !== componentId || component.type !== "select") {
          return component;
        }

        return {
          ...component,
          options: [
            ...(component.options || []),
            {
              id: Date.now().toString(),
              label: "Nova opção",
              value: `opcao_${Date.now()}`,
              description: "",
              emoji: "🎫",
            },
          ],
        };
      })
    );
  };

  const updateSelectOption = (
    componentId: string,
    optionId: string,
    updates: Partial<SelectOption>
  ) => {
    updateComponents(
      components.map((component) => {
        if (component.id !== componentId || component.type !== "select") {
          return component;
        }

        return {
          ...component,
          options: (component.options || []).map((option) =>
            option.id === optionId ? { ...option, ...updates } : option
          ),
        };
      })
    );
  };

  const removeSelectOption = (componentId: string, optionId: string) => {
    updateComponents(
      components.map((component) => {
        if (component.id !== componentId || component.type !== "select") {
          return component;
        }

        return {
          ...component,
          options: (component.options || []).filter(
            (option) => option.id !== optionId
          ),
        };
      })
    );
  };

  const saveEmbedEditor = () => {
    savePanel({
      openMessage: panel?.openMessage || "",
      embedJson: embed,
      componentsJson: components,
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-lg">Editor de Embed</h3>
        <p className="text-sm text-gray-400 mt-1">
          Configure a mensagem, embed, botões e menus de seleção do painel.
        </p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="space-y-5">
          <div className="bg-[#0e0e0e] rounded-xl p-5 border border-[#2b2b2b]">
            <label className="block text-sm font-semibold text-white mb-2">
              Texto da mensagem
            </label>

            <p className="text-xs text-gray-400 mb-3">
              Texto enviado junto com o embed. Pode ficar vazio.
            </p>

            <textarea
              value={panel?.openMessage || ""}
              onChange={(e) =>
                updatePanel({
                  openMessage: e.target.value,
                })
              }
              rows={4}
              placeholder="Olá {user}, clique abaixo para abrir um ticket."
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
                <h4 className="font-semibold text-white">Embed</h4>
                <p className="text-xs text-gray-400 mt-1">
                  Personalize título, descrição, imagem, rodapé e cor.
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
                    placeholder="Abrir ticket"
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
                    placeholder="Clique no botão abaixo para abrir um ticket."
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

          <div className="bg-[#0e0e0e] rounded-xl p-5 border border-[#2b2b2b]">
            <div className="flex items-center justify-between gap-4 mb-4">
              <div>
                <h4 className="font-semibold text-white">Componentes</h4>
                <p className="text-xs text-gray-400 mt-1">
                  Adicione botões e menus de seleção abaixo do embed.
                </p>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={addButton}
                  className="bg-[#C100FF] hover:bg-[#8A2BFF] text-white text-xs px-3 py-2 rounded-lg transition-colors"
                >
                  + Botão
                </button>

                <button
                  type="button"
                  onClick={addSelect}
                  className="bg-[#2b2b2b] hover:bg-[#3b3b3b] text-white text-xs px-3 py-2 rounded-lg transition-colors"
                >
                  + Select
                </button>
              </div>
            </div>

            {components.length === 0 ? (
              <div className="text-center text-gray-500 py-8 border border-dashed border-[#2b2b2b] rounded-lg">
                <p>Nenhum componente criado</p>
                <p className="text-xs mt-1">
                  Adicione botões ou menus de seleção.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {components.map((component, index) => (
                  <div
                    key={component.id}
                    className="bg-[#111111] rounded-lg p-4 border border-[#2b2b2b]"
                  >
                    <div className="flex items-center justify-between mb-4">
                      <h5 className="font-semibold text-sm text-white">
                        {component.type === "button"
                          ? `Botão ${index + 1}`
                          : `Select ${index + 1}`}
                      </h5>

                      <button
                        type="button"
                        onClick={() => removeComponent(component.id)}
                        className="text-xs text-red-400 hover:text-red-300 transition-colors"
                      >
                        Remover
                      </button>
                    </div>

                    {component.type === "button" && (
  <div className="space-y-3">
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <div>
  <label className="block text-xs text-gray-400 mb-1">
    Emoji
  </label>

  <input
    type="text"
    value={component.emoji || ""}
    onChange={(e) =>
      updateComponent(component.id, {
        emoji: e.target.value,
      })
    }
    placeholder="🎫 ou <:emoji:id>"
    className="w-full bg-[#0e0e0e] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
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
      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto rounded-lg border border-[#2b2b2b] bg-[#111111] p-2">
        {emojis.map((emoji) => (
          <button
            key={emoji.id}
            type="button"
            onClick={() => setButtonEmoji(component.id, emoji)}
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

      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Texto
        </label>
        <input
          type="text"
          value={component.label || ""}
          onChange={(e) =>
            updateComponent(component.id, {
              label: e.target.value,
            })
          }
          className="w-full bg-[#0e0e0e] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
        />
      </div>
    </div>

    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={component.isLink || false}
        onChange={(e) =>
          updateComponent(component.id, {
            isLink: e.target.checked,
            linkType: e.target.checked ? "url" : "url",
            url: e.target.checked ? component.url || "" : "",
            channelId: e.target.checked ? component.channelId || "" : "",
          })
        }
        className="rounded"
      />
      <span className="text-sm text-gray-300">
        Este botão redireciona para link/canal
      </span>
    </label>

    {component.isLink ? (
      <div className="space-y-3 rounded-lg border border-[#2b2b2b] bg-[#0e0e0e] p-3">
        <div>
          <label className="block text-xs text-gray-400 mb-1">
            Tipo de destino
          </label>

          <select
            value={component.linkType || "url"}
            onChange={(e) =>
              updateComponent(component.id, {
                linkType: e.target.value as "url" | "channel",
                url: "",
                channelId: "",
              })
            }
            className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
          >
            <option value="url">URL externa</option>
            <option value="channel">Canal do Discord</option>
          </select>
        </div>

        {component.linkType === "channel" ? (
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              Canal
            </label>

            <select
              value={component.channelId || ""}
              onChange={(e) =>
                updateComponent(component.id, {
                  channelId: e.target.value,
                  url: getChannelUrl(e.target.value),
                })
              }
              className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
            >
              <option value="">— Selecione um canal —</option>

              {channels.map((channel) => (
                <option key={channel.id} value={channel.id}>
                  #{channel.name}
                </option>
              ))}
            </select>

            {component.channelId && (
              <p className="text-xs text-gray-500 mt-1">
                URL gerada: {getChannelUrl(component.channelId)}
              </p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs text-gray-400 mb-1">
              URL
            </label>

            <input
              type="url"
              value={component.url || ""}
              onChange={(e) =>
                updateComponent(component.id, {
                  url: e.target.value,
                })
              }
              placeholder="https://exemplo.com"
              className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
            />
          </div>
        )}

        <p className="text-xs text-gray-500">
          Botões de link abrem uma URL. Para canal, a URL do Discord é gerada automaticamente.
        </p>
      </div>
    ) : (
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Custom ID
        </label>
        <input
          type="text"
          value={component.customId || ""}
          onChange={(e) =>
            updateComponent(component.id, {
              customId: e.target.value,
            })
          }
          className="w-full bg-[#0e0e0e] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
        />
      </div>
    )}

    {!component.isLink && (
      <div>
        <label className="block text-xs text-gray-400 mb-1">
          Estilo
        </label>
        <select
          value={component.style || "primary"}
          onChange={(e) =>
            updateComponent(component.id, {
              style: e.target.value as ButtonStyle,
            })
          }
          className="w-full bg-[#0e0e0e] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
        >
          <option value="primary">Azul / Principal</option>
          <option value="secondary">Cinza</option>
          <option value="success">Verde</option>
          <option value="danger">Vermelho</option>
        </select>
      </div>
    )}

    <label className="flex items-center gap-2 cursor-pointer">
      <input
        type="checkbox"
        checked={component.disabled || false}
        onChange={(e) =>
          updateComponent(component.id, {
            disabled: e.target.checked,
          })
        }
        className="rounded"
      />
      <span className="text-xs text-gray-400">
        Desabilitado
      </span>
    </label>
  </div>
)}

                    {component.type === "select" && (
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Placeholder
                          </label>
                          <input
                            type="text"
                            value={component.placeholder || ""}
                            onChange={(e) =>
                              updateComponent(component.id, {
                                placeholder: e.target.value,
                              })
                            }
                            className="w-full bg-[#0e0e0e] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                          />
                        </div>

                        <div>
                          <label className="block text-xs text-gray-400 mb-1">
                            Custom ID
                          </label>
                          <input
                            type="text"
                            value={component.customId || ""}
                            onChange={(e) =>
                              updateComponent(component.id, {
                                customId: e.target.value,
                              })
                            }
                            className="w-full bg-[#0e0e0e] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-400 mb-1">
                              Mínimo
                            </label>
                            <input
                              type="number"
                              min={0}
                              max={25}
                              value={component.minValues ?? 1}
                              onChange={(e) =>
                                updateComponent(component.id, {
                                  minValues: Number(e.target.value),
                                })
                              }
                              className="w-full bg-[#0e0e0e] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                            />
                          </div>

                          <div>
                            <label className="block text-xs text-gray-400 mb-1">
                              Máximo
                            </label>
                            <input
                              type="number"
                              min={1}
                              max={25}
                              value={component.maxValues ?? 1}
                              onChange={(e) =>
                                updateComponent(component.id, {
                                  maxValues: Number(e.target.value),
                                })
                              }
                              className="w-full bg-[#0e0e0e] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                            />
                          </div>
                        </div>

                        <div className="pt-3 border-t border-[#2b2b2b]">
                          <div className="flex items-center justify-between mb-3">
                            <span className="text-sm font-semibold text-white">
                              Opções
                            </span>

                            <button
                              type="button"
                              onClick={() => addSelectOption(component.id)}
                              className="text-xs bg-[#C100FF] hover:bg-[#8A2BFF] text-white px-3 py-1.5 rounded-lg transition-colors"
                            >
                              + Opção
                            </button>
                          </div>

                          <div className="space-y-3">
                            {(component.options || []).map((option) => (
                              <div
                                key={option.id}
                                className="bg-[#0e0e0e] rounded-lg p-3 border border-[#2b2b2b]"
                              >
                                <div className="flex justify-between gap-3 mb-3">
                                  <span className="text-xs text-gray-400">
                                    Opção
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() =>
                                      removeSelectOption(
                                        component.id,
                                        option.id
                                      )
                                    }
                                    className="text-xs text-red-400 hover:text-red-300"
                                  >
                                    Remover
                                  </button>
                                </div>

                                <div className="grid grid-cols-1 gap-3">
                                  <div>
  <label className="block text-xs text-gray-400 mb-1">
    Emoji
  </label>

  <input
    type="text"
    value={option.emoji}
    onChange={(e) =>
      updateSelectOption(component.id, option.id, {
        emoji: e.target.value,
      })
    }
    placeholder="🎫 ou <:emoji:id>"
    className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
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
      <div className="flex flex-wrap gap-2 max-h-24 overflow-y-auto rounded-lg border border-[#2b2b2b] bg-[#111111] p-2">
        {emojis.map((emoji) => (
          <button
            key={emoji.id}
            type="button"
            onClick={() =>
              updateSelectOption(component.id, option.id, {
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

                                  <input
                                    type="text"
                                    value={option.label}
                                    onChange={(e) =>
                                      updateSelectOption(
                                        component.id,
                                        option.id,
                                        {
                                          label: e.target.value,
                                        }
                                      )
                                    }
                                    placeholder="Label"
                                    className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                                  />

                                  <input
                                    type="text"
                                    value={option.value}
                                    onChange={(e) =>
                                      updateSelectOption(
                                        component.id,
                                        option.id,
                                        {
                                          value: e.target.value,
                                        }
                                      )
                                    }
                                    placeholder="Valor"
                                    className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                                  />

                                  <input
                                    type="text"
                                    value={option.description}
                                    onChange={(e) =>
                                      updateSelectOption(
                                        component.id,
                                        option.id,
                                        {
                                          description: e.target.value,
                                        }
                                      )
                                    }
                                    placeholder="Descrição"
                                    className="w-full bg-[#111111] border border-[#2b2b2b] text-white rounded-lg px-3 py-2 focus:outline-none focus:border-[#C100FF]"
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={saveEmbedEditor}
            disabled={saving}
            className="bg-[#C100FF] hover:bg-[#8A2BFF] text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            {saving ? "Salvando..." : "Salvar editor"}
          </button>
        </div>

        <div className="xl:sticky xl:top-8 h-fit">
          <div className="bg-[#0e0e0e] rounded-xl p-5 border border-[#2b2b2b]">
            <h4 className="font-semibold text-white mb-4">
              Preview estilo Discord
            </h4>

            <div className="bg-[#313338] rounded-lg p-4">
             {panel?.openMessage && (
  <div className="text-[#dbdee1] text-sm mb-3 whitespace-pre-wrap">
    <DiscordText text={panel.openMessage} />
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

              {components.length > 0 && (
                <div className="mt-3 space-y-2">
                  <div className="flex flex-wrap gap-2">
                    {components
  .filter((component) => component.type === "button")
  .map((component) => (
    <button
      key={component.id}
      type="button"
      disabled={component.disabled}
      title={
        component.isLink
          ? component.linkType === "channel"
            ? getChannelUrl(component.channelId)
            : component.url || ""
          : component.customId || ""
      }
      className={`px-4 py-2 rounded text-sm font-medium transition-all ${
        component.disabled
          ? "opacity-50 cursor-not-allowed"
          : ""
      } ${
        component.isLink
          ? "bg-[#4e5058] text-white"
          : getButtonPreviewClass(component.style)
      }`}
    >
      {component.emoji && (
  <span className="mr-2 inline-flex items-center">
    {(() => {
      const emoji = parseDiscordEmoji(component.emoji);

      if (!emoji) {
        return component.emoji;
      }

      return (
        <img
          src={getDiscordEmojiUrl(emoji)}
          alt={`:${emoji.name}:`}
          title={`:${emoji.name}:`}
          className="h-4 w-4 object-contain"
          loading="lazy"
        />
      );
    })()}
  </span>
)}
      {component.label || "Botão"}
      {component.isLink && <span className="ml-2">↗</span>}
    </button>
  ))}
                  </div>

                  {components
                    .filter((component) => component.type === "select")
                    .map((component) => (
                      <div
                        key={component.id}
                        className="bg-[#1e1f22] border border-[#3f4147] rounded px-3 py-2 text-sm text-[#dbdee1] max-w-md"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-gray-400">
                            {component.placeholder || "Selecione uma opção"}
                          </span>
                          <span>⌄</span>
                        </div>

                        {(component.options || []).length > 0 && (
                          <div className="mt-2 border-t border-[#3f4147] pt-2 space-y-1">
                            {(component.options || []).map((option) => (
                              <div
                                key={option.id}
                                className="text-xs text-gray-300"
                              >
                                {option.emoji && (
  <span className="mr-1 inline-flex items-center">
    {(() => {
      const emoji = parseDiscordEmoji(option.emoji);

      if (!emoji) {
        return option.emoji;
      }

      return (
        <img
          src={getDiscordEmojiUrl(emoji)}
          alt={`:${emoji.name}:`}
          title={`:${emoji.name}:`}
          className="h-4 w-4 object-contain"
          loading="lazy"
        />
      );
    })()}
  </span>
)}

{option.label}
                                {option.description && (
                                  <span className="text-gray-500">
                                    {" "}
                                    — {option.description}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                </div>
              )}

              {!panel?.openMessage && !embed.enabled && components.length === 0 && (
                <div className="text-sm text-gray-400">
                  Nada configurado ainda.
                </div>
              )}
            </div>

            <p className="text-xs text-gray-500 mt-3">
              Observação: no Discord, botões e selects aparecem abaixo da
              mensagem/embed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}