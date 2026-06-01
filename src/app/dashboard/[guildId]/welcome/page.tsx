// src/app/dashboard/[guildId]/welcome/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";

interface WelcomeConfig {
  channelId: string | null;
  message: string;
  enabled: boolean;
  autoroleId: string | null;
  sendType: string;
  embedJson: any;
  templateJson?: string;
  buttonsJson?: string;
  bgImage?: string | null;
}

interface EmbedConfig {
  color: string;
  title: string;
  description: string;
  footer: string;
  footerIcon: boolean;
  thumbnail: boolean;
  timestamp: boolean;
  author: string;
  authorIcon: boolean;
  image: boolean;
  imageUrl: string;
}

interface ButtonConfig {
  id: string;
  label: string;
  style: "primary" | "secondary" | "success" | "danger";
  emoji: string;
  isLink: boolean;
  linkType: "url" | "channel";
  url?: string;
  channelId?: string;
  disabled: boolean;
}

const SEND_TYPES = [
  { id: "image_only", label: "🖼️ Só imagem", desc: "Envia apenas a imagem sem embed" },
  { id: "embed_only", label: "📨 Só embed", desc: "Envia apenas o embed configurado" },
  { id: "image_embed", label: "🖼️📨 Imagem + embed", desc: "Envia a imagem dentro do embed" },
  { id: "text_only", label: "💬 Só texto", desc: "Envia apenas uma mensagem de texto" },
];

export default function WelcomeConfig() {
  const params = useParams();
  const router = useRouter();
  const guildId = params.guildId as string;

  const [config, setConfig] = useState<WelcomeConfig>({
    channelId: null,
    message: "Bem-vindo(a) ao servidor, {user}!",
    enabled: true,
    autoroleId: null,
    sendType: "image_embed",
    embedJson: null,
    templateJson: undefined,
    buttonsJson: undefined,
    bgImage: null,
  });

  const [embedConfig, setEmbedConfig] = useState<EmbedConfig>({
    color: "#5865F2",
    title: "",
    description: "Seja bem-vindo(a) ao **{server}**, {user}! 🎉",
    footer: "Membro #{count}",
    footerIcon: true,
    thumbnail: true,
    timestamp: true,
    author: "",
    authorIcon: true,
    image: true,
    imageUrl: ""
  });

  const [buttons, setButtons] = useState<ButtonConfig[]>([
    {
      id: "1",
      label: "Verificar",
      style: "primary",
      emoji: "✅",
      isLink: false,
      linkType: "url",
      url: "",
      channelId: "",
      disabled: false,
    },
    {
      id: "2",
      label: "Regras",
      style: "secondary",
      emoji: "📖",
      isLink: false,
      linkType: "url",
      url: "",
      channelId: "",
      disabled: false,
    },
    {
      id: "3",
      label: "Suporte",
      style: "primary",
      emoji: "🆘",
      isLink: true,
      linkType: "url",
      url: "https://discord.gg/suporte",
      channelId: "",
      disabled: false,
    },
  ]);

  const [channels, setChannels] = useState<any[]>([]);
  const [roles, setRoles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showEmbedEditor, setShowEmbedEditor] = useState(false);
  const [showButtonsEditor, setShowButtonsEditor] = useState(false);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const response = await fetch(`/api/guilds/${guildId}/welcome`);
        const data = await response.json();

        if (!response.ok) throw new Error(data.error || "Erro ao carregar");

        setChannels(data.channels ?? []);
        setRoles(data.roles ?? []);

        if (data.welcome) {
          setConfig({
            channelId: data.welcome.channelId || null,
            message: data.welcome.message || "Bem-vindo(a) ao servidor, {user}!",
            enabled: data.welcome.enabled ?? true,
            autoroleId: data.welcome.autoroleId || null,
            sendType: data.welcome.sendType || "image_embed",
            embedJson: data.welcome.embedJson || null,
            templateJson: data.welcome.templateJson || undefined,
            buttonsJson: data.welcome.buttonsJson || undefined,
            bgImage: data.welcome.bgImage || null,
          });

          if (data.welcome.embedJson) {
            try {
              const savedEmbed =
                typeof data.welcome.embedJson === "string"
                  ? JSON.parse(data.welcome.embedJson)
                  : data.welcome.embedJson;
              setEmbedConfig({
                color: savedEmbed.color || "#5865F2",
                title: savedEmbed.title || "",
                description:
                  savedEmbed.description ||
                  "Seja bem-vindo(a) ao **{server}**, {user}! 🎉",
                footer: savedEmbed.footer || "Membro #{count}",
                footerIcon: savedEmbed.footerIcon !== false,
                thumbnail: savedEmbed.thumbnail !== false,
                timestamp: savedEmbed.timestamp !== false,
                author: savedEmbed.author || "",
                authorIcon: savedEmbed.authorIcon !== false,
                image: savedEmbed.image !== false,
                  imageUrl: (savedEmbed.imageUrl && !savedEmbed.imageUrl.startsWith('data:')) ? savedEmbed.imageUrl : ""

              });
            } catch (e) {
              console.error("Erro ao parsear embedJson:", e);
            }
          }

          if (data.welcome.buttonsJson) {
            try {
              const savedButtons =
                typeof data.welcome.buttonsJson === "string"
                  ? JSON.parse(data.welcome.buttonsJson)
                  : data.welcome.buttonsJson;
              setButtons(savedButtons);
            } catch (e) {
              console.error("Erro ao parsear buttonsJson:", e);
            }
          }
        }
      } catch (error: any) {
        setError(error.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [guildId]);

  const salvar = async () => {
    setSaving(true);
    setError(null);

    try {
      const embedJsonObj = {
        color: embedConfig.color.replace("#", ""),
        title: embedConfig.title || null,
        description: embedConfig.description || null,
        footer: embedConfig.footer || null,
        footerIcon: embedConfig.footerIcon,
        thumbnail: embedConfig.thumbnail,
        timestamp: embedConfig.timestamp,
        author: embedConfig.author || null,
        authorIcon: embedConfig.authorIcon,
        image: embedConfig.image,
        imageUrl: embedConfig.imageUrl || null
      };

      const body = {
        channelId: config.channelId,
        message: config.message,
        enabled: config.enabled,
        autoroleId: config.autoroleId,
        sendType: config.sendType,
        embedJson: JSON.stringify(embedJsonObj),
        templateJson: config.templateJson || null,
        buttonsJson: JSON.stringify(buttons),
        bgImage: config.bgImage || null,
      };

      const response = await fetch(`/api/guilds/${guildId}/welcome`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Erro ao salvar");
      }

      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      setError(error.message);
      console.error("❌ Erro ao salvar:", error);
    } finally {
      setSaving(false);
    }
  };

  const processPreview = (text: string) => {
    if (!text) return "";
    return text
      .replace(/{username}/g, "NovoUsuario")
      .replace(/{user}/g, "@NovoUsuario")
      .replace(/{server}/g, "Meu Servidor")
      .replace(/{count}/g, "42")
      .replace(/{message}/g, config.message);
  };

  const processMarkdown = (text: string) => {
    if (!text) return "";
    let processed = processPreview(text);
    processed = processed.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
    processed = processed.replace(/\*(.*?)\*/g, "<em>$1</em>");
    processed = processed.replace(/__(.*?)__/g, "<u>$1</u>");
    processed = processed.replace(
      /`(.*?)`/g,
      '<code class="bg-[#2b2d31] px-1 py-0.5 rounded text-[#eb6f6f] text-xs">$1</code>'
    );
    return processed;
  };

  const addButton = () => {
    const newId = Date.now().toString();
    setButtons([
      ...buttons,
      {
        id: newId,
        label: "Novo Botão",
        style: "secondary",
        emoji: "🔘",
        isLink: false,
        linkType: "url",
        url: "",
        channelId: "",
        disabled: false,
      },
    ]);
  };

  const updateButton = (id: string, updates: Partial<ButtonConfig>) => {
    setButtons(buttons.map((btn) => (btn.id === id ? { ...btn, ...updates } : btn)));
  };

  const removeButton = (id: string) => {
    setButtons(buttons.filter((btn) => btn.id !== id));
  };

  const moveButton = (id: string, direction: "up" | "down") => {
    const index = buttons.findIndex((btn) => btn.id === id);
    if (direction === "up" && index > 0) {
      const newButtons = [...buttons];
      [newButtons[index - 1], newButtons[index]] = [
        newButtons[index],
        newButtons[index - 1],
      ];
      setButtons(newButtons);
    } else if (direction === "down" && index < buttons.length - 1) {
      const newButtons = [...buttons];
      [newButtons[index + 1], newButtons[index]] = [
        newButtons[index],
        newButtons[index + 1],
      ];
      setButtons(newButtons);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0e0e0e] text-white flex items-center justify-center">
        <p className="text-gray-400">Carregando configurações...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0e0e0e] text-white">
      <div className="max-w-7xl mx-auto p-8">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <button
            onClick={() => router.push(`/dashboard/${guildId}`)}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ← Voltar
          </button>
          <div>
            <h1 className="text-2xl font-bold">Configurações de Boas-vindas</h1>
            <p className="text-gray-400 text-sm">
              Configure como o bot receberá novos membros
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Coluna de configurações */}
          <div className="space-y-6">
            {/* Status */}
            <div className="bg-[#1a1a1a] rounded-xl p-5 border border-[#2b2b2b]">
  <div className="flex items-start justify-between">
    <div>
      <div className="font-medium">Ativar sistema de boas-vindas</div>
      <div className="text-sm text-gray-400">Quando ativado, o bot enviará uma mensagem para novos membros</div>
    </div>
    <button
      onClick={() => setConfig(prev => ({ ...prev, enabled: !prev.enabled }))}
      className={`w-11 h-6 rounded-full transition-colors ${config.enabled ? "bg-[#C100FF]" : "bg-[#2b2b2b]"} relative`}
    >
      <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white transition-all ${config.enabled ? "left-5" : "left-0.5"}`} />
    </button>
  </div>
</div>

            {/* Canal */}
            <div className="bg-[#1a1a1a] rounded-xl p-6">
              <label className="block font-semibold mb-2">Canal de boas-vindas</label>
              <p className="text-gray-400 text-sm mb-3">
                Canal onde a mensagem será enviada
              </p>
              <select
                value={config.channelId || ""}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, channelId: e.target.value || null }))
                }
                className="w-full bg-[#0e0e0e] border border-[#333] text-white rounded-lg px-4 py-2"
              >
                <option value="">— Selecione um canal —</option>
                {channels
                  .filter((c: any) => c.type === 0)
                  .map((c: any) => (
                    <option key={c.id} value={c.id}>
                      #{c.name}
                    </option>
                  ))}
              </select>
            </div>

            {/* Tipo de envio */}
            <div className="bg-[#1a1a1a] rounded-xl p-6">
              <label className="block font-semibold mb-2">Tipo de envio</label>
              <p className="text-gray-400 text-sm mb-3">Como a mensagem será enviada</p>
              <div className="grid grid-cols-1 gap-3">
                {SEND_TYPES.map((type) => (
                  <label
                    key={type.id}
                    className={`flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors ${
  config.sendType === type.id
    ? "bg-[#C100FF]/20 border border-[#C100FF]"
    : "bg-[#0e0e0e]"
}`}
                  >
                    <input
                      type="radio"
                      value={type.id}
                      checked={config.sendType === type.id}
                      onChange={(e) =>
                        setConfig((prev) => ({ ...prev, sendType: e.target.value }))
                      }
                      className="mt-1"
                    />
                    <div>
                      <div className="font-medium">{type.label}</div>
                      <div className="text-gray-400 text-xs">{type.desc}</div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            {/* Mensagem */}
            <div className="bg-[#1a1a1a] rounded-xl p-6">
              <label className="block font-semibold mb-2">Mensagem</label>
              <p className="text-gray-400 text-sm mb-3">
                Use variáveis para personalizar
              </p>
              <textarea
                value={config.message}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, message: e.target.value }))
                }
                rows={3}
                className="w-full bg-[#0e0e0e] border border-[#333] text-white rounded-lg px-4 py-2 resize-none"
              />
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="text-xs text-gray-400">Variáveis disponíveis:</span>
                <code className="text-xs bg-[#0e0e0e] px-2 py-1 rounded">{`{username}`}</code>
                <code className="text-xs bg-[#0e0e0e] px-2 py-1 rounded">{`{user}`}</code>
                <code className="text-xs bg-[#0e0e0e] px-2 py-1 rounded">{`{server}`}</code>
                <code className="text-xs bg-[#0e0e0e] px-2 py-1 rounded">{`{count}`}</code>
                <code className="text-xs bg-[#0e0e0e] px-2 py-1 rounded">{`{message}`}</code>
              </div>
            </div>

            {/* Editor de Embed */}
            {(config.sendType === "embed_only" || config.sendType === "image_embed") && (
              <div className="bg-[#1a1a1a] rounded-xl p-6">
                <button
                  onClick={() => setShowEmbedEditor(!showEmbedEditor)}
                  className="w-full flex items-center justify-between text-left mb-4"
                >
                  <div>
                    <h2 className="font-semibold">Configurações do Embed</h2>
                    <p className="text-gray-400 text-sm">
                      Personalize título, descrição, footer e mais
                    </p>
                  </div>
                  <span className="text-2xl">{showEmbedEditor ? "▼" : "▶"}</span>
                </button>

                {showEmbedEditor && (
                  <div className="space-y-4 mt-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">🎨 Cor</label>
                      <input
                        type="color"
                        value={embedConfig.color}
                        onChange={(e) =>
                          setEmbedConfig((prev) => ({ ...prev, color: e.target.value }))
                        }
                        className="w-full h-10 rounded cursor-pointer bg-[#0e0e0e] border border-[#333]"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        📌 Título (opcional)
                      </label>
                      <input
                        type="text"
                        value={embedConfig.title}
                        onChange={(e) =>
                          setEmbedConfig((prev) => ({ ...prev, title: e.target.value }))
                        }
                        placeholder="Ex: Bem-vindo(a)! 🌟"
                        className="w-full bg-[#0e0e0e] border border-[#333] text-white rounded-lg px-4 py-2"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">📝 Descrição</label>
                      <textarea
                        value={embedConfig.description}
                        onChange={(e) =>
                          setEmbedConfig((prev) => ({
                            ...prev,
                            description: e.target.value,
                          }))
                        }
                        rows={4}
                        placeholder="Seja bem-vindo(a) ao **{server}**, {user}! 🎉"
                        className="w-full bg-[#0e0e0e] border border-[#333] text-white rounded-lg px-4 py-2 resize-none"
                      />
                      <p className="text-xs text-gray-500 mt-1">
                        Use **negrito**, *itálico*, `código` e variáveis
                      </p>
                    </div>

                    <div>
                      <label className="text-[#C100FF] text-sm font-medium">
                        👤 Author (opcional)
                      </label>
                      <input
                        type="text"
                        value={embedConfig.author}
                        onChange={(e) =>
                          setEmbedConfig((prev) => ({ ...prev, author: e.target.value }))
                        }
                        placeholder="Ex: Sistema de Boas-vindas"
                        className="w-full bg-[#0e0e0e] border border-[#333] text-white rounded-lg px-4 py-2"
                      />
                      <label className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          checked={embedConfig.authorIcon}
                          onChange={(e) =>
                            setEmbedConfig((prev) => ({
                              ...prev,
                              authorIcon: e.target.checked,
                            }))
                          }
                          className="rounded"
                        />
                        <span className="text-sm">Mostrar ícone do usuário</span>
                      </label>
                    </div>

                    <div>
                      <label className="block text-sm font-medium mb-2">
                        📎 Footer (opcional)
                      </label>
                      <input
                        type="text"
                        value={embedConfig.footer}
                        onChange={(e) =>
                          setEmbedConfig((prev) => ({ ...prev, footer: e.target.value }))
                        }
                        placeholder="Ex: Membro #{count}"
                        className="w-full bg-[#0e0e0e] border border-[#333] text-white rounded-lg px-4 py-2"
                      />
                      <label className="flex items-center gap-2 mt-2">
                        <input
                          type="checkbox"
                          checked={embedConfig.footerIcon}
                          onChange={(e) =>
                            setEmbedConfig((prev) => ({
                              ...prev,
                              footerIcon: e.target.checked,
                            }))
                          }
                          className="rounded"
                        />
                        <span className="text-sm">Mostrar ícone do servidor</span>
                      </label>
                    </div>

                    <div className="space-y-2 pt-2 border-t border-[#333]">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={embedConfig.thumbnail}
                          onChange={(e) =>
                            setEmbedConfig((prev) => ({
                              ...prev,
                              thumbnail: e.target.checked,
                            }))
                          }
                          className="rounded"
                        />
                        <span className="text-sm">
                          🖼️ Mostrar thumbnail (avatar do usuário)
                        </span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={embedConfig.timestamp}
                          onChange={(e) =>
                            setEmbedConfig((prev) => ({
                              ...prev,
                              timestamp: e.target.checked,
                            }))
                          }
                          className="rounded"
                        />
                        <span className="text-sm">⏰ Mostrar timestamp</span>
                      </label>

                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={embedConfig.image}
                          onChange={(e) =>
                            setEmbedConfig((prev) => ({
                              ...prev,
                              image: e.target.checked,
                            }))
                          }
                          className="rounded"
                        />
                        <span className="text-sm">🖼️ Incluir imagem de boas-vindas</span>
                      </label>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Editor de Botões */}
            {(config.sendType === "embed_only" ||
              config.sendType === "image_embed" ||
              config.sendType === "text_only") && (
              <div className="bg-[#1a1a1a] rounded-xl p-6">
                <button
                  onClick={() => setShowButtonsEditor(!showButtonsEditor)}
                  className="w-full flex items-center justify-between text-left mb-4"
                >
                  <div>
                    <h2 className="font-semibold">Botões Interativos</h2>
                    <p className="text-gray-400 text-sm">
                      Adicione botões abaixo da mensagem/embed
                    </p>
                  </div>
                  <span className="text-2xl">{showButtonsEditor ? "▼" : "▶"}</span>
                </button>

                {showButtonsEditor && (
                  <div className="space-y-4 mt-4">
                    <button
                      onClick={addButton}
                      className="w-full bg-[#C100FF] hover:bg-[#8A2BFF] text-white text-sm py-2 rounded-lg transition-colors"
                    >
                      ➕ Adicionar Botão
                    </button>

                    {buttons.map((button, index) => (
                      <div key={button.id} className="bg-[#0e0e0e] rounded-lg p-4 space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => moveButton(button.id, "up")}
                              disabled={index === 0}
                              className="text-gray-400 hover:text-white disabled:opacity-30"
                            >
                              ↑
                            </button>
                            <button
                              onClick={() => moveButton(button.id, "down")}
                              disabled={index === buttons.length - 1}
                              className="text-gray-400 hover:text-white disabled:opacity-30"
                            >
                              ↓
                            </button>
                            <span className="text-sm text-gray-400">Botão {index + 1}</span>
                          </div>
                          <button
                            onClick={() => removeButton(button.id)}
                            className="text-red-400 hover:text-red-300 text-sm"
                          >
                            🗑️ Remover
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Emoji</label>
                            <input
                              type="text"
                              value={button.emoji}
                              onChange={(e) => updateButton(button.id, { emoji: e.target.value })}
                              placeholder="✅"
                              className="w-full bg-[#1a1a1a] border border-[#333] text-white rounded px-2 py-1 text-sm"
                            />
                          </div>
                          <div>
                            <label className="text-xs text-gray-400 mb-1 block">Label</label>
                            <input
                              type="text"
                              value={button.label}
                              onChange={(e) => updateButton(button.id, { label: e.target.value })}
                              placeholder="Texto do botão"
                              className="w-full bg-[#1a1a1a] border border-[#333] text-white rounded px-2 py-1 text-sm"
                            />
                          </div>
                        </div>

                        <div>
                          <label className="text-xs text-gray-400 mb-1 block">
                            🎨 Cor do botão
                          </label>
                          <select
                            value={button.style}
                            onChange={(e) =>
                              updateButton(button.id, { style: e.target.value as any })
                            }
                            className="w-full bg-[#1a1a1a] border border-[#333] text-white rounded px-2 py-1 text-sm"
                          >
                            <option value="primary">Azul</option>
                            <option value="secondary">Cinza</option>
                            <option value="success">Verde</option>
                            <option value="danger">Vermelho</option>
                          </select>
                          <p className="text-xs text-gray-500 mt-1">
                            Apenas cores oficiais do Discord
                          </p>
                        </div>

                        <label className="flex items-center gap-2 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={button.isLink || false}
                            onChange={(e) =>
                              updateButton(button.id, {
                                isLink: e.target.checked,
                                linkType: e.target.checked ? "url" : "url",
                                url: e.target.checked ? button.url : "",
                                channelId: e.target.checked ? button.channelId : "",
                              })
                            }
                            className="rounded"
                          />
                          <span className="text-sm">
                            🔗 Este é um botão de link (abre URL/canal)
                          </span>
                        </label>

                        {button.isLink && (
                          <div className="pl-4 border-l-2 border-[#5865F2] space-y-3">
                            <div>
                              <label className="text-xs text-gray-400 mb-1 block">
                                📌 Tipo de destino
                              </label>
                              <select
                                value={button.linkType || "url"}
                                onChange={(e) =>
                                  updateButton(button.id, {
                                    linkType: e.target.value as "url" | "channel",
                                  })
                                }
                                className="w-full bg-[#1a1a1a] border border-[#333] text-white rounded px-2 py-1 text-sm"
                              >
                                <option value="url">🌐 URL externa (site)</option>
                                <option value="channel">📢 Canal do Discord</option>
                              </select>
                            </div>

                            {button.linkType === "url" && (
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">🔗 URL</label>
                                <input
                                  type="url"
                                  value={button.url || ""}
                                  onChange={(e) => updateButton(button.id, { url: e.target.value })}
                                  placeholder="https://exemplo.com"
                                  className="w-full bg-[#1a1a1a] border border-[#333] text-white rounded px-2 py-1 text-sm"
                                />
                                <p className="text-xs text-gray-500 mt-1">
                                  Ex: https://discord.gg/servidor
                                </p>
                              </div>
                            )}

                            {button.linkType === "channel" && (
                              <div>
                                <label className="text-xs text-gray-400 mb-1 block">
                                  #️⃣ Canal do Discord
                                </label>
                                <select
                                  value={button.channelId || ""}
                                  onChange={(e) =>
                                    updateButton(button.id, { channelId: e.target.value })
                                  }
                                  className="w-full bg-[#1a1a1a] border border-[#333] text-white rounded px-2 py-1 text-sm"
                                >
                                  <option value="">— Selecione um canal —</option>
                                  {channels
                                    .filter((c: any) => c.type === 0)
                                    .map((c: any) => (
                                      <option key={c.id} value={c.id}>
                                        #{c.name}
                                      </option>
                                    ))}
                                </select>
                                <p className="text-xs text-gray-500 mt-1">
                                  O botão vai redirecionar para este canal
                                </p>
                              </div>
                            )}
                          </div>
                        )}

                        {!button.isLink && (
                          <div className="bg-[#1a1a1a] rounded-lg p-2">
                            <p className="text-xs text-gray-400 flex items-center gap-2">
                              <span>⚡</span>
                              Este é um botão de interação (requer configuração no bot para ações
                              personalizadas)
                            </p>
                          </div>
                        )}

                        <label className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={button.disabled || false}
                            onChange={(e) =>
                              updateButton(button.id, { disabled: e.target.checked })
                            }
                            className="rounded"
                          />
                          <span className="text-xs text-gray-400">
                            Desabilitado (cinza, não clicável)
                          </span>
                        </label>
                      </div>
                    ))}

                    {buttons.length === 0 && (
                      <div className="text-center text-gray-500 py-4">
                        <p>Nenhum botão adicionado</p>
                        <p className="text-xs mt-1">
                          Clique em "Adicionar Botão" para começar
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Cargo automático */}
            <div className="bg-[#1a1a1a] rounded-xl p-6">
              <label className="block font-semibold mb-2">Cargo automático</label>
              <p className="text-gray-400 text-sm mb-3">
                Cargo que será dado automaticamente ao novo membro
              </p>
              <select
                value={config.autoroleId || ""}
                onChange={(e) =>
                  setConfig((prev) => ({ ...prev, autoroleId: e.target.value || null }))
                }
                className="w-full bg-[#0e0e0e] border border-[#333] text-white rounded-lg px-4 py-2"
              >
                <option value="">— Nenhum cargo —</option>
                {roles
                  .filter((r: any) => r.name !== "@everyone")
                  .map((r: any) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
              </select>
            </div>
{/* Imagem de fundo via URL (fallback) */}
<div>
  <label className="block text-sm font-medium mb-2">
    🖼️ URL da Imagem do Embed
  </label>
  <input
    type="url"
    value={embedConfig.imageUrl}
    onChange={(e) =>
      setEmbedConfig((prev) => ({ ...prev, imageUrl: e.target.value }))
    }
    placeholder="https://exemplo.com/imagem.jpg"
    className="w-full bg-[#0e0e0e] border border-[#333] text-white rounded-lg px-4 py-2"
  />
  {embedConfig.imageUrl && !embedConfig.imageUrl.startsWith('data:') && (
  <div className="mt-3">
    <img 
      src={embedConfig.imageUrl} 
      alt="Preview" 
      className="w-full h-32 object-cover rounded-lg"
    />
  </div>
)}
  <p className="text-xs text-gray-500 mt-1">
    Esta imagem será exibida no embed quando não houver template personalizado.
  </p>
</div>
            {/* Editor de imagem */}
            <div className="bg-[#1a1a1a] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-semibold">Editor de imagem</h2>
                  <p className="text-gray-400 text-sm">
                    Personalize a imagem de boas-vindas
                  </p>
                </div>
                <button
  onClick={async () => {
    // Salva as configurações atuais antes de ir para o editor
    await salvar();
    router.push(`/dashboard/${guildId}/welcome/editor`);
  }}
  className="bg-[#C100FF] hover:bg-[#8A2BFF] text-white px-4 py-2 rounded-lg transition-colors"
>
  Abrir editor →
</button>
              </div>
              {config.templateJson && (
                <div className="bg-[#0e0e0e] rounded-lg p-3 mt-3">
                  <p className="text-green-400 text-sm">
                    ✅ Template personalizado configurado
                  </p>
                </div>
              )}
            </div>

            {/* Botões de ação */}
            <div className="flex gap-3">
              <button
                onClick={salvar}
                disabled={saving}
                className="flex-1 bg-[#C100FF] hover:bg-[#8A2BFF] text-white font-semibold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {saving ? "💾 Salvando..." : "💾 Salvar configurações"}
              </button>
              <button
                onClick={() => router.push(`/dashboard/${guildId}`)}
                className="px-6 bg-[#2b2b2b] hover:bg-[#3b3b3b] text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {success && (
              <div className="bg-green-500/10 border border-green-500/50 rounded-lg p-3">
                <p className="text-green-400 text-sm">
                  ✅ Configurações salvas com sucesso!
                </p>
              </div>
            )}
          </div>

          {/* Coluna do Preview */}
          <div className="lg:sticky lg:top-8 h-fit">
            <div className="bg-[#1a1a1a] rounded-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="font-semibold flex items-center gap-2">
                  Preview do Discord
                </h2>
              </div>

              <div className="bg-[#313338] rounded-lg overflow-hidden">
                <div className="p-4">
                  {config.sendType === "text_only" && (
                    <div className="text-[#dbdee1] text-sm mb-3">
                      {processPreview(config.message)}
                    </div>
                  )}

                  {(config.sendType === "embed_only" ||
                    config.sendType === "image_embed") && (
                    <div className="flex gap-4">
                      {embedConfig.thumbnail && (
                        <div className="flex-shrink-0">
                          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#C100FF] to-[#8A2BFF] flex items-center justify-center text-4xl shadow-lg ring-2 ring-[#C100FF]/30">
                          </div>
                        </div>
                      )}

                      <div className="flex-1 min-w-0 relative">
                        <div
                          className="absolute left-0 top-0 bottom-0 w-1 rounded-l"
style={{ backgroundColor: "#C100FF" }}
                        />

                        <div className="pl-3">
                          {embedConfig.author && (
                            <div className="flex items-center gap-2 mb-1">
                              {embedConfig.authorIcon && (
                                <div className="w-5 h-5 rounded-full bg-[#C100FF] flex items-center justify-center text-[10px]">
                                  👤
                                </div>
                              )}
                              <span className="text-[#5865F2] text-sm font-medium">
                                {processPreview(embedConfig.author)}
                              </span>
                            </div>
                          )}

                          {embedConfig.title && (
                            <div className="text-white font-bold text-base mb-1">
                              {processPreview(embedConfig.title)}
                            </div>
                          )}

                          {embedConfig.description && (
                            <div
                              className="text-[#dbdee1] text-sm mb-3 whitespace-pre-wrap"
                              dangerouslySetInnerHTML={{
                                __html: processMarkdown(embedConfig.description),
                              }}
                            />
                          )}

                          {(embedConfig.footer || embedConfig.timestamp) && (
                            <div className="flex items-center gap-2 text-xs text-[#949ba4] mt-2">
                              {embedConfig.footerIcon && (
                                <div className="w-4 h-4 rounded-full bg-[#C100FF] flex items-center justify-center text-[8px]">
                                  🏠
                                </div>
                              )}
                              {embedConfig.footer && (
                                <span>{processPreview(embedConfig.footer)}</span>
                              )}
                              {embedConfig.footer && embedConfig.timestamp && (
                                <span>•</span>
                              )}
                              {embedConfig.timestamp && <span>hoje às 12:34</span>}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {buttons.length > 0 && (
                  <div className="px-4 pb-4 pt-0 flex gap-3 flex-wrap">
                    {buttons.map((button) => {
                      let buttonStyle = "";
                      if (button.style === "primary")
                        buttonStyle = "bg-[#5865F2] text-white";
                      if (button.style === "secondary")
                        buttonStyle = "bg-[#4e5058] text-white";
                      if (button.style === "success")
                        buttonStyle = "bg-[#57F287] text-black";
                      if (button.style === "danger")
                        buttonStyle = "bg-[#ED4245] text-white";

                      return (
                        <button
                          key={button.id}
                          disabled={button.disabled}
                          className={`${
                            button.disabled
                              ? "opacity-50 cursor-not-allowed"
                              : "hover:brightness-110"
                          } px-4 py-1.5 rounded text-sm font-medium transition-all flex items-center gap-2 ${buttonStyle}`}
                        >
                          {button.emoji && <span>{button.emoji}</span>}
                          <span>{button.label}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}