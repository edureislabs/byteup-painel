"use client";
import { useState, useEffect } from "react";
import UserSearchInput from "./UserSearchInput";

type Channel = { id: string; name: string };
type UserInfo = { id: string; name: string; discriminator: string; avatar: string | null };
type Config = {
  automodEnabled: boolean;
  automodBannedWords: string;
  automodLinkBlocklist: string;
  automodLinkWhitelist: string;
  automodBypassRoles: string;
  automodBypassUsers: string;
  automodIgnoredChannels: string;
  automodMaxMentions?: number;
  automodMaxLines?: number;
  automodMaxZalgo?: boolean;
  automodInviteBlock?: boolean;
  automodAction?: string;
  automodWarnThreshold?: number;
  automodMuteDuration?: number;
  automodLogChannel?: string;
};

type Props = {
  guildId: string;
  config: Config;
  channels: Channel[];
  saveAction: (formData: FormData) => Promise<void>;
};

const PRESET_BANNED_WORDS = [
  "filhodaputa", "caralho", "porra", "buceta", "arrombado",
  "macaco", "crioulo", "nazista", "hitler",
  "viado", "bicha", "sapatao", "veado"
];

const PRESET_LINK_BLOCKLIST = [
  "discord\\.gg\\/[a-zA-Z0-9]+",
  "discord\\.com\\/invite\\/[a-zA-Z0-9]+",
  "tenor\\.com\\/view\\/.*",
  "giphy\\.com\\/gifs\\/.*"
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

export default function AutomodForm({ guildId, config, channels, saveAction }: Props) {
  const [enabled, setEnabled] = useState(config.automodEnabled);
  const [bannedWords, setBannedWords] = useState<string[]>(JSON.parse(config.automodBannedWords || '[]'));
  const [linkBlocklist, setLinkBlocklist] = useState<string[]>(JSON.parse(config.automodLinkBlocklist || '[]'));
  const [linkWhitelist, setLinkWhitelist] = useState<string[]>(JSON.parse(config.automodLinkWhitelist || '[]'));
  const [bypassRoles, setBypassRoles] = useState<string[]>(JSON.parse(config.automodBypassRoles || '[]'));
  const [bypassUsers, setBypassUsers] = useState<string[]>(JSON.parse(config.automodBypassUsers || '[]'));
  const [ignoredChannels, setIgnoredChannels] = useState<string[]>(JSON.parse(config.automodIgnoredChannels || '[]'));
  
  const [maxMentions, setMaxMentions] = useState(config.automodMaxMentions || 5);
  const [maxLines, setMaxLines] = useState(config.automodMaxLines || 15);
  const [blockZalgo, setBlockZalgo] = useState(config.automodMaxZalgo ?? true);
  const [blockInvites, setBlockInvites] = useState(config.automodInviteBlock ?? true);
  const [action, setAction] = useState(config.automodAction || "delete");
  const [warnThreshold, setWarnThreshold] = useState(config.automodWarnThreshold || 3);
  const [muteDuration, setMuteDuration] = useState(config.automodMuteDuration || 300);
  const [logChannel, setLogChannel] = useState(config.automodLogChannel || "");

  const [newWord, setNewWord] = useState("");
  const [newBlockRegex, setNewBlockRegex] = useState("");
  const [newAllowRegex, setNewAllowRegex] = useState("");
  
  const [usersInfo, setUsersInfo] = useState<Map<string, UserInfo>>(new Map());
  const [rolesList, setRolesList] = useState<{ id: string; name: string; color: number }[]>([]);

  useEffect(() => {
    async function fetchGuildData() {
      const [membersRes, rolesRes] = await Promise.all([
        fetch(`/api/guilds/${guildId}/members`),
        fetch(`/api/guilds/${guildId}/roles`)
      ]);
      
      if (membersRes.ok) {
        const data = await membersRes.json();
        const usersMap = new Map();
        data.users.forEach((user: any) => {
          usersMap.set(user.id, {
            id: user.id,
            name: user.name,
            discriminator: user.discriminator,
            avatar: user.avatar
          });
        });
        setUsersInfo(usersMap);
      }
      
      if (rolesRes.ok) {
        const roles = await rolesRes.json();
        setRolesList(roles);
      }
    }
    fetchGuildData();
  }, [guildId]);

  const getUserDisplay = (userId: string) => {
    const user = usersInfo.get(userId);
    if (user) {
      return `${user.name}${user.discriminator !== '0' ? `#${user.discriminator}` : ''} (${userId})`;
    }
    return `${userId} (Carregando...)`;
  };

  const getRoleDisplay = (roleId: string) => {
    const role = rolesList.find(r => r.id === roleId);
    if (role) {
      return `${role.name} (${roleId})`;
    }
    return `${roleId} (Carregando...)`;
  };

  const loadPreset = () => {
    if (confirm("Aplicar configuracoes padrao do AutoMod? Isso substituira suas configuracoes atuais.")) {
      setEnabled(true);
      setBannedWords(PRESET_BANNED_WORDS);
      setLinkBlocklist(PRESET_LINK_BLOCKLIST);
      setLinkWhitelist([]);
      setMaxMentions(5);
      setMaxLines(15);
      setBlockZalgo(true);
      setBlockInvites(true);
      setAction("delete");
      setWarnThreshold(3);
      setMuteDuration(300);
    }
  };

  const handleAddUser = (userId: string, userName: string) => {
    if (!bypassUsers.includes(userId)) {
      setBypassUsers([...bypassUsers, userId]);
    }
  };

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
    formData.set("automodMaxMentions", maxMentions.toString());
    formData.set("automodMaxLines", maxLines.toString());
    formData.set("automodMaxZalgo", blockZalgo ? "true" : "false");
    formData.set("automodInviteBlock", blockInvites ? "true" : "false");
    formData.set("automodAction", action);
    formData.set("automodWarnThreshold", warnThreshold.toString());
    formData.set("automodMuteDuration", muteDuration.toString());
    formData.set("automodLogChannel", logChannel);
    saveAction(formData);
  };

  return (
    <div style={{ fontFamily: "DM Sans, sans-serif", maxWidth: "680px", color: "#dbdee1" }}>
      <h2 style={{ color: "#f2f3f5", fontSize: "20px", fontWeight: 600, marginBottom: "24px" }}>
        Configuracao do Automod
      </h2>

      <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <Section>
          <Toggle enabled={enabled} setEnabled={setEnabled} title="Ativar Automod" description="O bot moderara mensagens automaticamente." />
        </Section>

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

        <Section>
          <label className="field-label">Links Permitidos (whitelist)</label>
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

        <Section>
          <label className="field-label">Configuracoes Avancadas</label>
          
          <div style={{ marginBottom: "12px" }}>
            <label className="field-label">Maximo de Mencoes</label>
            <input type="number" className="field-input" value={maxMentions} onChange={e => setMaxMentions(parseInt(e.target.value))} min="1" max="20" />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label className="field-label">Maximo de Linhas</label>
            <input type="number" className="field-input" value={maxLines} onChange={e => setMaxLines(parseInt(e.target.value))} min="1" max="50" />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <Toggle enabled={blockZalgo} setEnabled={setBlockZalgo} title="Bloquear Texto Zalgo" description="Bloqueia texto com caracteres corrompidos" />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <Toggle enabled={blockInvites} setEnabled={setBlockInvites} title="Bloquear Convites" description="Bloqueia convites para outros servidores do Discord" />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label className="field-label">Acao do AutoMod</label>
            <select className="field-select" value={action} onChange={e => setAction(e.target.value)}>
              <option value="delete">Apenas Deletar</option>
              <option value="mute">Mutar</option>
              <option value="warn">Apenas Avisar</option>
            </select>
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label className="field-label">Limite de Warns (antes de mutar)</label>
            <input type="number" className="field-input" value={warnThreshold} onChange={e => setWarnThreshold(parseInt(e.target.value))} min="1" max="10" />
          </div>

          <div style={{ marginBottom: "12px" }}>
            <label className="field-label">Duracao do Mute (segundos)</label>
            <input type="number" className="field-input" value={muteDuration} onChange={e => setMuteDuration(parseInt(e.target.value))} min="30" max="3600" />
          </div>

          <div>
            <label className="field-label">Canal de Logs</label>
            <select className="field-select" value={logChannel} onChange={e => setLogChannel(e.target.value)}>
              <option value="">Desativado</option>
              {channels.map(c => (
                <option key={c.id} value={c.id}># {c.name}</option>
              ))}
            </select>
          </div>
        </Section>

        <Section>
          <label className="field-label">Bypass Cargos Imunes</label>
          <select
            className="field-select"
            value=""
            onChange={e => { 
              if (e.target.value && !bypassRoles.includes(e.target.value)) {
                setBypassRoles([...bypassRoles, e.target.value]);
              }
            }}
          >
            <option value="">Adicionar cargo...</option>
            {rolesList.filter(r => !bypassRoles.includes(r.id) && r.name !== "@everyone").map(r => (
              <option key={r.id} value={r.id}>{r.name}</option>
            ))}
          </select>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
            {bypassRoles.map((roleId, i) => (
              <span key={i} style={{ background: "rgba(193,0,255,0.1)", border: "1px solid rgba(193,0,255,0.2)", borderRadius: "6px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                {getRoleDisplay(roleId)}
                <button type="button" onClick={() => setBypassRoles(bypassRoles.filter(id => id !== roleId))} style={{ background: "none", border: "none", color: "#C100FF", cursor: "pointer" }}>×</button>
              </span>
            ))}
          </div>
        </Section>

        <Section>
          <label className="field-label">Bypass Usuarios Imunes</label>
          <div style={{ display: "flex", gap: "8px", marginBottom: "8px", alignItems: "center" }}>
            <UserSearchInput 
              guildId={guildId} 
              onSelect={handleAddUser}
              placeholder="Buscar usuario por nome..."
            />
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginTop: "8px" }}>
            {bypassUsers.map((userId, i) => (
              <span key={i} style={{ background: "rgba(193,0,255,0.1)", border: "1px solid rgba(193,0,255,0.2)", borderRadius: "6px", padding: "4px 10px", display: "flex", alignItems: "center", gap: "6px" }}>
                {getUserDisplay(userId)}
                <button type="button" onClick={() => setBypassUsers(bypassUsers.filter(id => id !== userId))} style={{ background: "none", border: "none", color: "#C100FF", cursor: "pointer" }}>×</button>
              </span>
            ))}
          </div>
        </Section>

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

        <button type="button" className="preset-btn" onClick={loadPreset}>
          Carregar Pre definicoes Padrao
        </button>

        <button type="submit" className="save-btn">Salvar configuracoes</button>
      </form>

      <style jsx>{`
        .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #72767d; display: block; margin-bottom: 8px; }
        .field-input, .field-select { background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #dbdee1; width: 100%; outline: none; box-sizing: border-box; }
        .field-select { cursor: pointer; appearance: none; }
        .add-btn { background: #C100FF; color: white; border: none; border-radius: 8px; padding: 10px 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
        .add-btn:hover { background: #8A2BFF; }
        .save-btn { background: #C100FF; color: white; border: none; border-radius: 8px; padding: 12px 20px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%; transition: background 0.15s; margin-top: 8px; }
        .save-btn:hover { background: #8A2BFF; }
        .preset-btn { background: #2b2d31; color: #C100FF; border: 1px solid rgba(193, 0, 255, 0.3); border-radius: 8px; padding: 12px 20px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%; transition: all 0.15s; margin-bottom: 8px; }
        .preset-btn:hover { background: rgba(193, 0, 255, 0.1); border-color: #C100FF; }
      `}</style>
    </div>
  );
}