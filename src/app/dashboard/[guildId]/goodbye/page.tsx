"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";


interface GoodbyeConfig {
  channelId: string | null;
  message: string;
  enabled: boolean;
  sendType: string;
  embedJson: any;
}

interface EmbedConfig {
  color: string;
  description: string;
  imageUrl: string;
}

type Channel = { id: string; name: string };

const SEND_TYPES = [
  { id: "text_only", label: "💬 Só texto", desc: "Apenas uma mensagem de texto" },
  { id: "embed_only", label: "📨 Só embed", desc: "Apenas o embed configurado" },
];


function Section({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      background: "#16181c", border: "1px solid #1e2025",
      borderRadius: "12px", padding: "20px", marginBottom: "16px",
    }}>
      {children}
    </div>
  );
}

function Toggle({ enabled, setEnabled, title, description }: { enabled: boolean; setEnabled: (v: boolean) => void; title: string; description: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
      <button type="button" style={{
        width: "40px", height: "24px", borderRadius: "12px",
        background: enabled ? "#C100FF" : "#2b2d31", border: "none", cursor: "pointer",
        position: "relative", flexShrink: 0, marginTop: "2px", transition: "background 0.2s",
      }} onClick={() => setEnabled(!enabled)}>
        <div style={{
          position: "absolute", width: "18px", height: "18px", borderRadius: "50%",
          background: "white", top: "3px", left: enabled ? "19px" : "3px",
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </button>
      <div>
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#dbdee1" }}>{title}</div>
        <div style={{ fontSize: "12px", color: "#72767d" }}>{description}</div>
      </div>
    </div>
  );
}


export default function GoodbyeConfig() {
  const params = useParams();
  const router = useRouter();
  const guildId = params.guildId as string;

  const [config, setConfig] = useState<GoodbyeConfig>({
    channelId: null,
    message: "Até mais, {user}! 👋",
    enabled: true,
    sendType: "text_only",
    embedJson: null,
  });

  const [embedConfig, setEmbedConfig] = useState<EmbedConfig>({
    color: "#ED4245",
    description: "**{username}** saiu do servidor. 😢",
    imageUrl: "",
  });

  const [channels, setChannels] = useState<Channel[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [showEmbedEditor, setShowEmbedEditor] = useState(false);


  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [goodbyeRes, channelsRes] = await Promise.all([
          fetch(`/api/guilds/${guildId}/goodbye`),
          fetch(`/api/guilds/${guildId}/channels`), 
        ]);

        const goodbyeData = await goodbyeRes.json();
        const channelsData = await channelsRes.json();

        setChannels(channelsData || []);

        if (goodbyeData.goodbye) {
          setConfig({
            channelId: goodbyeData.goodbye.channelId || null,
            message: goodbyeData.goodbye.message || "Até mais, {user}! 👋",
            enabled: goodbyeData.goodbye.enabled ?? true,
            sendType: goodbyeData.goodbye.sendType || "text_only",
            embedJson: goodbyeData.goodbye.embedJson || null,
          });

          if (goodbyeData.goodbye.embedJson) {
            const savedEmbed = typeof goodbyeData.goodbye.embedJson === "string"
              ? JSON.parse(goodbyeData.goodbye.embedJson)
              : goodbyeData.goodbye.embedJson;
            setEmbedConfig({
              color: savedEmbed.color || "#ED4245",
              description: savedEmbed.description || "**{username}** saiu do servidor. 😢",
              imageUrl: (savedEmbed.imageUrl && !savedEmbed.imageUrl.startsWith('data:')) ? savedEmbed.imageUrl : "",
            });
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
        description: embedConfig.description || null,
        imageUrl: (embedConfig.imageUrl && !embedConfig.imageUrl.startsWith('data:')) ? embedConfig.imageUrl : null,
      };

      const body = {
        channelId: config.channelId,
        message: config.message,
        enabled: config.enabled,
        sendType: config.sendType,
        embedJson: JSON.stringify(embedJsonObj),
      };

      const response = await fetch(`/api/guilds/${guildId}/goodbye`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!response.ok) throw new Error("Erro ao salvar");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (error: any) {
      setError(error.message);
    } finally {
      setSaving(false);
    }
  };


  if (loading) {
    return (
      <div style={{ fontFamily: "DM Sans, sans-serif", maxWidth: "680px", color: "#dbdee1", padding: "40px" }}>
        <p style={{ color: "#72767d" }}>Carregando...</p>
      </div>
    );
  }


  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", maxWidth: "680px", color: "#dbdee1" }}>
      <h2 style={{ color: "#f2f3f5", fontSize: "20px", fontWeight: 600, marginBottom: "24px" }}>
        Configuração de Despedida
      </h2>

      {/* Status */}
      <Section>
        <Toggle enabled={config.enabled} setEnabled={(v) => setConfig(prev => ({ ...prev, enabled: v }))} title="Ativar sistema de despedida" description="O bot enviará uma mensagem quando um membro sair." />
      </Section>

      {/* Canal */}
      <Section>
        <label className="field-label">Canal de despedida</label>
        <select className="field-select" value={config.channelId || ""} onChange={(e) => setConfig(prev => ({ ...prev, channelId: e.target.value || null }))}>
          <option value="">— Selecione um canal —</option>
          {channels.map(c => (
            <option key={c.id} value={c.id}># {c.name}</option>
          ))}
        </select>
      </Section>

      {/* Tipo de envio */}
      <Section>
        <label className="field-label">Tipo de envio</label>
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {SEND_TYPES.map((type) => (
            <label key={type.id} style={{
              display: "flex", alignItems: "flex-start", gap: "12px", padding: "12px",
              borderRadius: "8px", cursor: "pointer",
              background: config.sendType === type.id ? "rgba(193, 0, 255, 0.1)" : "#0e0f11",
              border: config.sendType === type.id ? "1px solid #C100FF" : "1px solid #1e2025",
            }}>
              <input type="radio" value={type.id} checked={config.sendType === type.id} onChange={(e) => setConfig(prev => ({ ...prev, sendType: e.target.value }))} style={{ marginTop: "2px" }} />
              <div>
                <div style={{ fontSize: "14px", fontWeight: 500 }}>{type.label}</div>
                <div style={{ fontSize: "12px", color: "#72767d" }}>{type.desc}</div>
              </div>
            </label>
          ))}
        </div>
      </Section>

      {/* Mensagem */}
      <Section>
        <label className="field-label">Mensagem</label>
        <textarea className="field-input" value={config.message} onChange={(e) => setConfig(prev => ({ ...prev, message: e.target.value }))} rows={3} style={{ resize: "vertical" }} />
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px", fontSize: "12px", color: "#72767d" }}>
          <span>Variáveis:</span>
          <code style={{ background: "#0e0f11", padding: "2px 6px", borderRadius: "4px" }}>{`{username}`}</code>
          <code style={{ background: "#0e0f11", padding: "2px 6px", borderRadius: "4px" }}>{`{user}`}</code>
          <code style={{ background: "#0e0f11", padding: "2px 6px", borderRadius: "4px" }}>{`{server}`}</code>
          <code style={{ background: "#0e0f11", padding: "2px 6px", borderRadius: "4px" }}>{`{count}`}</code>
        </div>
      </Section>

      {/* Editor de Embed (só aparece no modo embed_only) */}
      {config.sendType === "embed_only" && (
        <Section>
          <button type="button" onClick={() => setShowEmbedEditor(!showEmbedEditor)} style={{
            width: "100%", background: "none", border: "none", cursor: "pointer",
            display: "flex", alignItems: "center", justifyContent: "space-between",
            color: "#dbdee1", fontSize: "14px", fontWeight: 500, padding: 0,
          }}>
            <div>
              <div>Configurações do Embed</div>
              <div style={{ fontSize: "12px", color: "#72767d" }}>Personalize a mensagem de despedida</div>
            </div>
            <span style={{ fontSize: "18px" }}>{showEmbedEditor ? "▼" : "▶"}</span>
          </button>

          {showEmbedEditor && (
            <div style={{ marginTop: "16px", display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="field-label">🎨 Cor</label>
                <input type="color" value={embedConfig.color} onChange={(e) => setEmbedConfig(prev => ({ ...prev, color: e.target.value }))} style={{ width: "100%", height: "40px", borderRadius: "8px", border: "1px solid #1e2025", background: "#0e0f11", cursor: "pointer" }} />
              </div>
              <div>
                <label className="field-label">📝 Descrição</label>
                <textarea className="field-input" value={embedConfig.description} onChange={(e) => setEmbedConfig(prev => ({ ...prev, description: e.target.value }))} rows={4} style={{ resize: "vertical" }} />
              </div>
              <div>
                <label className="field-label">🖼️ URL da Imagem</label>
                <input type="url" className="field-input" value={embedConfig.imageUrl || ""} onChange={(e) => setEmbedConfig(prev => ({ ...prev, imageUrl: e.target.value }))} placeholder="https://exemplo.com/imagem.jpg" />
              </div>
            </div>
          )}
        </Section>
      )}

      {/* Botão Salvar */}
      <button type="button" className="save-btn" onClick={salvar} disabled={saving}>
        {saving ? "💾 Salvando..." : "💾 Salvar configurações"}
      </button>

      {/* Mensagens de feedback */}
      {error && (
        <div style={{ background: "rgba(237, 66, 69, 0.1)", border: "1px solid rgba(237, 66, 69, 0.3)", borderRadius: "8px", padding: "12px", marginTop: "12px", color: "#ed4245", fontSize: "14px" }}>
          {error}
        </div>
      )}
      {success && (
        <div style={{ background: "rgba(87, 242, 135, 0.1)", border: "1px solid rgba(87, 242, 135, 0.3)", borderRadius: "8px", padding: "12px", marginTop: "12px", color: "#57f287", fontSize: "14px" }}>
          ✅ Configurações salvas com sucesso!
        </div>
      )}

      <style jsx>{`
        .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #72767d; display: block; margin-bottom: 8px; }
        .field-input, .field-select { background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #dbdee1; width: 100%; outline: none; box-sizing: border-box; }
        .field-select { cursor: pointer; appearance: none; }
        .save-btn { background: #C100FF; color: white; border: none; border-radius: 8px; padding: 12px 20px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%; transition: background 0.15s; margin-top: 8px; }
        .save-btn:hover { background: #8A2BFF; }
        .save-btn:disabled { opacity: 0.5; cursor: not-allowed; }
      `}</style>
    </div>
  );
}