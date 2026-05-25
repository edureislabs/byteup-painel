// src/app/dashboard/[guildId]/automod/AutomodForm.tsx
"use client";
import { useState } from "react";

type Channel = { id: string; name: string };
type Config = {
  automodEnabled: boolean;
  automodBannedWords: string;
  automodLinkBlocklist: string;
  automodLinkWhitelist: string;
  automodBypassRoles: string;
  automodBypassUsers: string;
  automodIgnoredChannels: string;
};

type Props = {
  guildId: string;
  config: Config;
  channels: Channel[];
  saveAction: (formData: FormData) => Promise<void>;
};

// Componentes reutilizáveis (mesmos do GeneralForm)
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

export default function AutomodForm({ guildId, config, channels, saveAction }: Props) {
  const [enabled, setEnabled] = useState(config.automodEnabled);
  const [bannedWords, setBannedWords] = useState<string[]>(JSON.parse(config.automodBannedWords || '[]'));
  const [linkBlocklist, setLinkBlocklist] = useState<string[]>(JSON.parse(config.automodLinkBlocklist || '[]'));
  const [linkWhitelist, setLinkWhitelist] = useState<string[]>(JSON.parse(config.automodLinkWhitelist || '[]'));
  const [bypassRoles, setBypassRoles] = useState<string[]>(JSON.parse(config.automodBypassRoles || '[]'));
  const [bypassUsers, setBypassUsers] = useState<string[]>(JSON.parse(config.automodBypassUsers || '[]'));
  const [ignoredChannels, setIgnoredChannels] = useState<string[]>(JSON.parse(config.automodIgnoredChannels || '[]'));

  // Inputs temporários para adicionar
  const [newWord, setNewWord] = useState("");
  const [newBlockRegex, setNewBlockRegex] = useState("");
  const [newAllowRegex, setNewAllowRegex] = useState("");
  const [newBypassRole, setNewBypassRole] = useState("");
  const [newBypassUser, setNewBypassUser] = useState("");

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set("automodEnabled", enabled ? "true" : "false");
    formData.set("automodBannedWords", JSON.stringify(bannedWords));
    formData.set("automodLinkBlocklist", JSON.stringify(linkBlocklist));
    formData.set("automodLinkWhitelist", JSON.stringify(linkWhitelist));
    formData.set("automodBypassRoles", JSON.stringify(bypassRoles));
    formData.set("automodBypassUsers", JSON.stringify(bypassUsers));
    formData.set("automodIgnoredChannels", JSON.stringify(ignoredChannels));
    saveAction(formData);
  };

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", maxWidth: "680px", color: "#dbdee1" }}>
      <h2 style={{ color: "#f2f3f5", fontSize: "20px", fontWeight: 600, marginBottom: "24px" }}>
        Configuracao do Automod
      </h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {/* Toggle geral */}
        <Section>
          <Toggle enabled={enabled} setEnabled={setEnabled} title="Ativar Automod" description="O bot moderará mensagens automaticamente." />
        </Section>

        {/* Palavras proibidas */}
        <Section>
          <label className="field-label">Palavras Proibidas</label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <input className="field-input" value={newWord} onChange={e => setNewWord(e.target.value)} placeholder="Nova palavra" style={{ flex: 1 }} />
            <button type="button" className="add-btn" onClick={() => { if (newWord) { setBannedWords([...bannedWords, newWord]); setNewWord(""); } }}>Adicionar</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {bannedWords.map((word, i) => (
              <span key={i} style={{ background: "#1e2025", borderRadius: "6px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                {word}
                <button type="button" onClick={() => setBannedWords(bannedWords.filter(w => w !== word))} style={{ background: "none", border: "none", color: "#ed4245", cursor: "pointer" }}>×</button>
              </span>
            ))}
          </div>
        </Section>

        {/* Bloqueio de links */}
        <Section>
          <label className="field-label">Links Bloqueados (regex)</label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <input className="field-input" value={newBlockRegex} onChange={e => setNewBlockRegex(e.target.value)} placeholder="Regex (ex: discord\.gg)" style={{ flex: 1 }} />
            <button type="button" className="add-btn" onClick={() => { if (newBlockRegex) { setLinkBlocklist([...linkBlocklist, newBlockRegex]); setNewBlockRegex(""); } }}>Adicionar</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {linkBlocklist.map((reg, i) => (
              <span key={i} style={{ background: "#1e2025", borderRadius: "6px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                {reg}
                <button type="button" onClick={() => setLinkBlocklist(linkBlocklist.filter(r => r !== reg))} style={{ background: "none", border: "none", color: "#ed4245", cursor: "pointer" }}>×</button>
              </span>
            ))}
          </div>
        </Section>

        {/* Whitelist de links (permitidos) */}
        <Section>
          <label className="field-label">Links Permitidos (whitelist) – mesmo se estiverem na blocklist</label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <input className="field-input" value={newAllowRegex} onChange={e => setNewAllowRegex(e.target.value)} placeholder="Regex (ex: imgur\.com)" style={{ flex: 1 }} />
            <button type="button" className="add-btn" onClick={() => { if (newAllowRegex) { setLinkWhitelist([...linkWhitelist, newAllowRegex]); setNewAllowRegex(""); } }}>Adicionar</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {linkWhitelist.map((reg, i) => (
              <span key={i} style={{ background: "#1e2025", borderRadius: "6px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                {reg}
                <button type="button" onClick={() => setLinkWhitelist(linkWhitelist.filter(r => r !== reg))} style={{ background: "none", border: "none", color: "#ed4245", cursor: "pointer" }}>×</button>
              </span>
            ))}
          </div>
        </Section>

        {/* Bypass (cargos e usuários) */}
        <Section>
          <label className="field-label">Bypass – Cargos imunes</label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <input className="field-input" value={newBypassRole} onChange={e => setNewBypassRole(e.target.value)} placeholder="ID do cargo" style={{ flex: 1 }} />
            <button type="button" className="add-btn" onClick={() => { if (newBypassRole) { setBypassRoles([...bypassRoles, newBypassRole]); setNewBypassRole(""); } }}>Adicionar</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {bypassRoles.map((roleId, i) => (
              <span key={i} style={{ background: "#1e2025", borderRadius: "6px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                {roleId}
                <button type="button" onClick={() => setBypassRoles(bypassRoles.filter(id => id !== roleId))} style={{ background: "none", border: "none", color: "#ed4245", cursor: "pointer" }}>×</button>
              </span>
            ))}
          </div>
        </Section>

        <Section>
          <label className="field-label">Bypass – Usuários imunes</label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
            <input className="field-input" value={newBypassUser} onChange={e => setNewBypassUser(e.target.value)} placeholder="ID do usuário" style={{ flex: 1 }} />
            <button type="button" className="add-btn" onClick={() => { if (newBypassUser) { setBypassUsers([...bypassUsers, newBypassUser]); setNewBypassUser(""); } }}>Adicionar</button>
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
            {bypassUsers.map((userId, i) => (
              <span key={i} style={{ background: "#1e2025", borderRadius: "6px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                {userId}
                <button type="button" onClick={() => setBypassUsers(bypassUsers.filter(id => id !== userId))} style={{ background: "none", border: "none", color: "#ed4245", cursor: "pointer" }}>×</button>
              </span>
            ))}
          </div>
        </Section>

        {/* Canais ignorados */}
        <Section>
          <label className="field-label">Canais Ignorados</label>
          <select
            className="field-select"
            value=""
            onChange={e => { if (e.target.value) setIgnoredChannels([...ignoredChannels, e.target.value]); }}
          >
            <option value="">Adicionar canal...</option>
            {channels.filter(c => !ignoredChannels.includes(c.id)).map(c => (
              <option key={c.id} value={c.id}># {c.name}</option>
            ))}
          </select>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
            {ignoredChannels.map(chId => (
              <span key={chId} style={{ background: "rgba(193,0,255,0.1)", border: "1px solid rgba(193,0,255,0.2)", borderRadius: "6px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                # {channels.find(c => c.id === chId)?.name || chId}
                <button type="button" onClick={() => setIgnoredChannels(ignoredChannels.filter(id => id !== chId))} style={{ background: "none", border: "none", color: "#C100FF", cursor: "pointer" }}>×</button>
              </span>
            ))}
          </div>
        </Section>

        <button type="submit" className="save-btn">Salvar configuracoes</button>
      </form>

      <style jsx>{`
        .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #72767d; display: block; margin-bottom: 8px; }
        .field-input, .field-select { background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #dbdee1; width: 100%; outline: none; box-sizing: border-box; }
        .field-select { cursor: pointer; appearance: none; }
        .add-btn { background: #C100FF; color: white; border: none; border-radius: 8px; padding: 10px 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
        .add-btn:hover { background: #8A2BFF; }
        .save-btn { background: #C100FF; color: white; border: none; border-radius: 8px; padding: 12px 20px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%; transition: background 0.15s; }
        .save-btn:hover { background: #8A2BFF; }
      `}</style>
    </div>
  );
}