"use client";
import { useState } from "react";

type Channel = { id: string; name: string };
type Role = { id: string; name: string };

type Config = {
  prefix: string;
  logEnabled: boolean;
  logChannelId: string | null;
  language: string;
  timezone: string;
  autoroleId: string | null;
  inviteLink: string | null;
};

type Props = {
  guildId: string;
  config: Config;
  channels: Channel[];
  roles: Role[];
  stats: {
    memberCount: number;
    commandsToday: number;
    xpDistributed: number;
  };
  saveAction: (formData: FormData) => Promise<void>;
};

const timezones = [
  { value: "America/Sao_Paulo", label: "Brasilia (GMT-3)" },
  { value: "America/Manaus", label: "Manaus (GMT-4)" },
  { value: "America/Belem", label: "Belem (GMT-3)" },
  { value: "America/Fortaleza", label: "Fortaleza (GMT-3)" },
  { value: "America/Recife", label: "Recife (GMT-3)" },
  { value: "America/Rio_Branco", label: "Rio Branco (GMT-5)" },
  { value: "America/Argentina/Buenos_Aires", label: "Buenos Aires (GMT-3)" },
  { value: "America/Santiago", label: "Santiago (GMT-4)" },
  { value: "America/Mexico_City", label: "Cidade do Mexico (GMT-6)" },
  { value: "America/New_York", label: "Nova York (GMT-5)" },
  { value: "Europe/Lisbon", label: "Lisboa (GMT+0)" },
  { value: "Europe/London", label: "Londres (GMT+0)" },
  { value: "Europe/Paris", label: "Paris (GMT+1)" },
  { value: "Europe/Berlin", label: "Berlim (GMT+1)" },
  { value: "Asia/Tokyo", label: "Toquio (GMT+9)" },
];

const languages = [
  { value: "pt-BR", label: "Portugues (Brasil)" },
  { value: "en", label: "English" },
  { value: "es", label: "Espanol" },
];

export default function GeneralForm({ guildId, config, channels, roles, stats, saveAction }: Props) {
  const [logsEnabled, setLogsEnabled] = useState(config.logEnabled);
  const [prefix, setPrefix] = useState(config.prefix);
  const [language, setLanguage] = useState(config.language || "pt-BR");
  const [timezone, setTimezone] = useState(config.timezone || "America/Sao_Paulo");
  const [autoroleId, setAutoroleId] = useState(config.autoroleId || "");
  const [inviteLink, setInviteLink] = useState(config.inviteLink || "");

  const handleExport = async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/export`);
      const data = await res.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `byteup-config-${guildId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {}
  };

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", maxWidth: "680px", color: "#dbdee1" }}>
      <h2 style={{ color: "#f2f3f5", fontSize: "20px", fontWeight: 600, marginBottom: "8px" }}>
        Configuracoes Gerais
      </h2>
      <p style={{ fontSize: "13px", color: "#72767d", margin: "0 0 28px 0", lineHeight: "1.5" }}>
        Gerencie as configuracoes basicas do bot neste servidor.
      </p>

      {/* Estatísticas Rápidas */}
      <div style={{
        display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px",
        marginBottom: "28px",
      }}>
        {[
          { label: "Membros", value: stats.memberCount, color: "#5865f2" },
          { label: "Comandos Hoje", value: stats.commandsToday, color: "#57F287" },
          { label: "XP Distribuido", value: stats.xpDistributed, color: "#FEE75C" },
        ].map(stat => (
          <div key={stat.label} style={{
            background: "#16181c", border: "1px solid #1e2025", borderRadius: "12px",
            padding: "16px", textAlign: "center",
          }}>
            <div style={{ fontSize: "24px", fontWeight: 700, color: stat.color }}>
              {stat.value.toLocaleString()}
            </div>
            <div style={{ fontSize: "11px", color: "#72767d", marginTop: "4px", textTransform: "uppercase", letterSpacing: "0.5px" }}>
              {stat.label}
            </div>
          </div>
        ))}
      </div>

      <form action={saveAction} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
        {/* Prefixo */}
        <Section>
          <label className="field-label">Prefixo</label>
          <input className="field-input" name="prefix" value={prefix} onChange={e => setPrefix(e.target.value)} />
          <Hint>O prefixo era usado para comandos antigos. Mantenha como / para compatibilidade.</Hint>
        </Section>

        {/* Idioma e Fuso */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <Section>
            <label className="field-label">Idioma do Bot</label>
            <select className="field-select" name="language" value={language} onChange={e => setLanguage(e.target.value)}>
              {languages.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
            </select>
          </Section>
          <Section>
            <label className="field-label">Fuso Horario</label>
            <select className="field-select" name="timezone" value={timezone} onChange={e => setTimezone(e.target.value)}>
              {timezones.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
          </Section>
        </div>



        {/* Link de Convite */}
        <Section>
          <label className="field-label">Link de Convite do Servidor</label>
          <input className="field-input" name="inviteLink" value={inviteLink} onChange={e => setInviteLink(e.target.value)} placeholder="https://discord.gg/seuconvite" />
          <Hint>Link exibido em comandos como /botinfo e /serverinfo.</Hint>
        </Section>

        {/* Logs */}
        <Section>
          <label className="field-label" style={{ marginBottom: "12px" }}>Logs de Atividade</label>
          <Toggle enabled={logsEnabled} setEnabled={setLogsEnabled} title="Ativar logs detalhados" description="Registra tudo o que acontece no servidor: mensagens, voz, membros, emojis e muito mais." />
          <input type="hidden" name="logEnabled" value={logsEnabled ? "true" : "false"} />
          {logsEnabled && (
            <div style={{ borderTop: "1px solid #1e2025", paddingTop: "16px", marginTop: "12px" }}>
              <label className="field-label" style={{ marginBottom: "8px" }}>Canal de Logs</label>
              <select className="field-select" name="logChannelId" defaultValue={config.logChannelId || ""}>
                <option value="">Selecione um canal</option>
                {channels.map(ch => <option key={ch.id} value={ch.id}># {ch.name}</option>)}
              </select>
            </div>
          )}
        </Section>

        {/* Exportar/Importar */}
        <Section>
          <label className="field-label" style={{ marginBottom: "12px" }}>Backup</label>
          <div style={{ display: "flex", gap: "12px" }}>
            <button type="button" className="save-btn" onClick={handleExport} style={{ width: "auto", flex: 1 }}>
              Exportar Configuracoes
            </button>
          </div>
          <Hint>Exporte as configuracoes do servidor como arquivo JSON para backup ou transferencia.</Hint>
        </Section>

        <button type="submit" className="save-btn">Salvar alteracoes</button>
      </form>

      <style jsx>{`
        .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #72767d; display: block; margin-bottom: 4px; }
        .field-input, .field-select { background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #dbdee1; width: 100%; outline: none; box-sizing: border-box; transition: border-color 0.15s; }
        .field-input:focus, .field-select:focus { border-color: #5865f2; }
        .field-select { cursor: pointer; appearance: none; }
        .save-btn { background: #5865f2; color: white; border: none; border-radius: 8px; padding: 12px 20px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%; transition: background 0.15s; }
        .save-btn:hover { background: #4752c4; }
      `}</style>
    </div>
  );
}

function Section({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: "#16181c", border: "1px solid #1e2025",
      borderRadius: "12px", padding: "20px",
      ...style,
    }}>
      {children}
    </div>
  );
}

function Hint({ children }: { children: React.ReactNode }) {
  return <p style={{ fontSize: "11px", color: "#72767d", margin: "8px 0 0 0" }}>{children}</p>;
}

function Toggle({ enabled, setEnabled, title, description }: { enabled: boolean; setEnabled: (v: boolean) => void; title: string; description: string }) {
  return (
    <div style={{ display: "flex", alignItems: "flex-start", gap: "12px" }}>
      <button type="button" style={{
        width: "40px", height: "24px", borderRadius: "12px",
        background: enabled ? "#5865f2" : "#2b2d31",
        border: "none", cursor: "pointer", position: "relative",
        flexShrink: 0, marginTop: "2px", transition: "background 0.2s",
      }} onClick={() => setEnabled(!enabled)}>
        <div style={{
          position: "absolute", width: "18px", height: "18px", borderRadius: "50%",
          background: "white", top: "3px", left: enabled ? "19px" : "3px",
          transition: "left 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.3)",
        }} />
      </button>
      <div>
        <div style={{ fontSize: "14px", fontWeight: 500, color: "#dbdee1", marginBottom: "3px" }}>{title}</div>
        <div style={{ fontSize: "12px", color: "#72767d" }}>{description}</div>
      </div>
    </div>
  );
}