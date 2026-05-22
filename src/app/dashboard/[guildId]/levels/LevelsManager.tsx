'use client';

import { useState, useEffect } from 'react';

type Currency = { id: string; name: string; symbol: string };
type Channel = { id: string; name: string };
type Role = { id: string; name: string };
type LevelRequirement = { id?: string; level: number; xpNeeded: number };

type LevelConfig = {
  enabled: boolean;
  xpMode: string;
  baseXP: number;
  exponent: number;
  minXpPerMessage: number;
  maxXpPerMessage: number;
  cooldownSeconds: number;
  message: string;
  imageUrl: string | null;
  levelUpChannelId: string | null;
  rewardCurrencyId: string | null;
  rewardAmount: number;
  channelMultipliers: string;
  roleMultipliers: string;
  blockedChannels: string;
  blockedRoles: string;
  roleByLevel: string;
};

export default function LevelsManager({ guildId }: { guildId: string }) {
  const [config, setConfig] = useState<LevelConfig>({
    enabled: false, xpMode: 'formula', baseXP: 100, exponent: 2.0,
    minXpPerMessage: 15, maxXpPerMessage: 25, cooldownSeconds: 60,
    message: '{user} subiu para o nivel {level}!', imageUrl: null,
    levelUpChannelId: null, rewardCurrencyId: null, rewardAmount: 0,
    channelMultipliers: '{}', roleMultipliers: '{}',
    blockedChannels: '[]', blockedRoles: '[]', roleByLevel: '{}',
  });
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [requirements, setRequirements] = useState<LevelRequirement[]>([]);
  const [message, setMessage] = useState('');
  const [roleByLevel, setRoleByLevel] = useState<Record<string, string>>({});
  const [channelMults, setChannelMults] = useState<Record<string, number>>({});
  const [roleMults, setRoleMults] = useState<Record<string, number>>({});
  const [blockedChannels, setBlockedChannels] = useState<string[]>([]);
  const [blockedRoles, setBlockedRoles] = useState<string[]>([]);

  useEffect(() => {
    fetchConfig();
    fetchCurrencies();
    fetchChannels();
    fetchRoles();
    fetchRequirements();
  }, [guildId]);

  const fetchConfig = async () => {
    const res = await fetch(`/api/guilds/${guildId}/levels/config`);
    const data = await res.json();
    if (data && !data.error) {
      setConfig(data);
      setRoleByLevel(JSON.parse(data.roleByLevel || '{}'));
      setChannelMults(JSON.parse(data.channelMultipliers || '{}'));
      setRoleMults(JSON.parse(data.roleMultipliers || '{}'));
      setBlockedChannels(JSON.parse(data.blockedChannels || '[]'));
      setBlockedRoles(JSON.parse(data.blockedRoles || '[]'));
    }
  };

  const fetchCurrencies = async () => {
    const res = await fetch(`/api/guilds/${guildId}/currencies`);
    const data = await res.json();
    if (Array.isArray(data)) setCurrencies(data);
  };

  const fetchChannels = async () => {
    const res = await fetch(`/api/guilds/${guildId}/channels`);
    const data = await res.json();
    if (Array.isArray(data)) setChannels(data);
  };

  const fetchRoles = async () => {
    const res = await fetch(`/api/guilds/${guildId}/roles`);
    const data = await res.json();
    if (Array.isArray(data)) setRoles(data);
  };

  const fetchRequirements = async () => {
    const res = await fetch(`/api/guilds/${guildId}/levels/requirements`);
    const data = await res.json();
    if (Array.isArray(data)) setRequirements(data);
  };

  const saveConfig = async (updates: Partial<LevelConfig>) => {
    const newConfig = { ...config, ...updates };
    setConfig(newConfig);
    const res = await fetch(`/api/guilds/${guildId}/levels/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newConfig),
    });
    if (res.ok) setMessage('Configuracao salva.');
    else setMessage('Erro ao salvar.');
  };

  const saveMultipliers = async () => {
    await saveConfig({
      channelMultipliers: JSON.stringify(channelMults),
      roleMultipliers: JSON.stringify(roleMults),
      blockedChannels: JSON.stringify(blockedChannels),
      blockedRoles: JSON.stringify(blockedRoles),
      roleByLevel: JSON.stringify(roleByLevel),
    });
  };

  const addRequirement = async () => {
    const level = (requirements.length > 0 ? Math.max(...requirements.map(r => r.level)) : 0) + 1;
    const xpNeeded = level * 100;
    const res = await fetch(`/api/guilds/${guildId}/levels/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level, xpNeeded }),
    });
    if (res.ok) { fetchRequirements(); setMessage('Requisito adicionado.'); }
    else setMessage('Erro ao adicionar.');
  };

  const updateRequirement = async (id: string, xpNeeded: number) => {
    const req = requirements.find(r => r.id === id);
    if (!req) return;
    const res = await fetch(`/api/guilds/${guildId}/levels/requirements`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ level: req.level, xpNeeded }),
    });
    if (res.ok) { fetchRequirements(); setMessage('Requisito atualizado.'); }
    else setMessage('Erro ao atualizar.');
  };

  const deleteRequirement = async (level: number) => {
    const res = await fetch(`/api/guilds/${guildId}/levels/requirements?level=${level}`, { method: 'DELETE' });
    if (res.ok) { fetchRequirements(); setMessage('Requisito removido.'); }
    else setMessage('Erro ao remover.');
  };

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: '700px', color: '#dbdee1' }}>
      <h2 style={{ color: '#f2f3f5', marginBottom: '24px' }}>Sistema de Niveis (XP)</h2>

      {/* Toggle principal */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <span>Ativar sistema de niveis</span>
        <button type="button" style={toggleStyle(config.enabled)} onClick={() => saveConfig({ enabled: !config.enabled })}>
          <div style={toggleThumbStyle(config.enabled)} />
        </button>
      </div>

      {config.enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Modo de XP */}
          <div>
            <label className="field-label">Modo de Calculo</label>
            <select className="field-select" value={config.xpMode} onChange={e => saveConfig({ xpMode: e.target.value })}>
              <option value="formula">Formula (automatico)</option>
              <option value="table">Tabela Manual</option>
            </select>
          </div>

          {/* Fórmula */}
          {config.xpMode === 'formula' && (
            <div style={{ display: 'flex', gap: '12px' }}>
              <div style={{ flex: 1 }}>
                <label className="field-label">XP Base</label>
                <input className="field-input" type="number" value={config.baseXP} onChange={e => saveConfig({ baseXP: Number(e.target.value) })} />
              </div>
              <div style={{ flex: 1 }}>
                <label className="field-label">Expoente</label>
                <input className="field-input" type="number" step="0.1" value={config.exponent} onChange={e => saveConfig({ exponent: Number(e.target.value) })} />
              </div>
            </div>
          )}

          {/* Tabela manual */}
          {config.xpMode === 'table' && (
            <div>
              <label className="field-label">Requisitos de XP por Nivel</label>
              {requirements.map(req => (
                <div key={req.id} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                  <span>Nivel {req.level}:</span>
                  <input className="field-input" type="number" value={req.xpNeeded} onChange={e => updateRequirement(req.id!, Number(e.target.value))} style={{ width: '120px' }} />
                  <button className="save-btn" onClick={() => deleteRequirement(req.level)} style={{ background: '#ed4245', width: 'auto', padding: '4px 12px', marginTop: 0 }}>X</button>
                </div>
              ))}
              <button className="save-btn" onClick={addRequirement} style={{ width: 'auto', padding: '8px 16px', marginTop: '8px' }}>Adicionar Nivel</button>
            </div>
          )}

          {/* Ganho de XP */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label className="field-label">XP Minimo por msg</label>
              <input className="field-input" type="number" value={config.minXpPerMessage} onChange={e => saveConfig({ minXpPerMessage: Number(e.target.value) })} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">XP Maximo por msg</label>
              <input className="field-input" type="number" value={config.maxXpPerMessage} onChange={e => saveConfig({ maxXpPerMessage: Number(e.target.value) })} />
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Cooldown (seg)</label>
              <input className="field-input" type="number" value={config.cooldownSeconds} onChange={e => saveConfig({ cooldownSeconds: Number(e.target.value) })} />
            </div>
          </div>

          {/* Mensagem de level up */}
          <div>
            <label className="field-label">Mensagem de Level Up</label>
            <input className="field-input" value={config.message} onChange={e => saveConfig({ message: e.target.value })} />
            <p style={{ fontSize: '11px', color: '#72767d', marginTop: '4px' }}>Use {'{user}'} e {'{level}'}</p>
          </div>

          {/* Imagem de level up */}
          <div>
            <label className="field-label">URL da Imagem/GIF de Level Up</label>
            <input className="field-input" value={config.imageUrl || ''} onChange={e => saveConfig({ imageUrl: e.target.value || null })} />
          </div>

          {/* Canal de aviso */}
          <div>
            <label className="field-label">Canal de Level Up</label>
            <select className="field-select" value={config.levelUpChannelId || ''} onChange={e => saveConfig({ levelUpChannelId: e.target.value || null })}>
              <option value="">Mesmo canal da mensagem</option>
              {channels.map(c => <option key={c.id} value={c.id}># {c.name}</option>)}
            </select>
          </div>

          {/* Recompensa */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label className="field-label">Moeda de Recompensa</label>
              <select className="field-select" value={config.rewardCurrencyId || ''} onChange={e => saveConfig({ rewardCurrencyId: e.target.value || null })}>
                <option value="">Nenhuma</option>
                {currencies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Quantidade</label>
              <input className="field-input" type="number" value={config.rewardAmount} onChange={e => saveConfig({ rewardAmount: Number(e.target.value) })} />
            </div>
          </div>

          {/* Cargos por nível */}
          <div>
            <label className="field-label">Cargos por Nivel</label>
            {Object.entries(roleByLevel).map(([level, roleId]) => (
              <div key={level} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <span>Nivel {level}:</span>
                <select className="field-select" value={roleId} onChange={e => {
                  const newRB = { ...roleByLevel, [level]: e.target.value };
                  setRoleByLevel(newRB);
                }} style={{ flex: 1 }}>
                  <option value="">Selecione</option>
                  {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                </select>
                <button className="save-btn" onClick={() => {
                  const newRB = { ...roleByLevel };
                  delete newRB[level];
                  setRoleByLevel(newRB);
                }} style={{ background: '#ed4245', width: 'auto', padding: '4px 12px', marginTop: 0 }}>X</button>
              </div>
            ))}
            <button className="save-btn" onClick={() => {
              const newLevel = (Object.keys(roleByLevel).length > 0 ? Math.max(...Object.keys(roleByLevel).map(Number)) : 0) + 1;
              setRoleByLevel({ ...roleByLevel, [newLevel]: '' });
            }} style={{ width: 'auto', padding: '8px 16px', marginTop: '8px' }}>Adicionar Cargo por Nivel</button>
          </div>

          {/* Multiplicadores de canal */}
          <div>
            <label className="field-label">Multiplicadores de Canal</label>
            {Object.entries(channelMults).map(([chId, mult]) => (
              <div key={chId} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <span>{channels.find(c => c.id === chId)?.name || chId}:</span>
                <input className="field-input" type="number" step="0.1" value={mult} onChange={e => setChannelMults({ ...channelMults, [chId]: Number(e.target.value) })} style={{ width: '100px' }} />
                <button className="save-btn" onClick={() => { const newM = { ...channelMults }; delete newM[chId]; setChannelMults(newM); }} style={{ background: '#ed4245', width: 'auto', padding: '4px 12px', marginTop: 0 }}>X</button>
              </div>
            ))}
            <select className="field-select" value="" onChange={e => { if (e.target.value) setChannelMults({ ...channelMults, [e.target.value]: 2.0 }); }} style={{ marginTop: '8px' }}>
              <option value="">Adicionar canal...</option>
              {channels.filter(c => !channelMults[c.id]).map(c => <option key={c.id} value={c.id}># {c.name}</option>)}
            </select>
          </div>

          {/* Multiplicadores de cargo */}
          <div>
            <label className="field-label">Multiplicadores de Cargo</label>
            {Object.entries(roleMults).map(([roleId, mult]) => (
              <div key={roleId} style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '8px' }}>
                <span>{roles.find(r => r.id === roleId)?.name || roleId}:</span>
                <input className="field-input" type="number" step="0.1" value={mult} onChange={e => setRoleMults({ ...roleMults, [roleId]: Number(e.target.value) })} style={{ width: '100px' }} />
                <button className="save-btn" onClick={() => { const newM = { ...roleMults }; delete newM[roleId]; setRoleMults(newM); }} style={{ background: '#ed4245', width: 'auto', padding: '4px 12px', marginTop: 0 }}>X</button>
              </div>
            ))}
            <select className="field-select" value="" onChange={e => { if (e.target.value) setRoleMults({ ...roleMults, [e.target.value]: 1.5 }); }} style={{ marginTop: '8px' }}>
              <option value="">Adicionar cargo...</option>
              {roles.filter(r => !roleMults[r.id]).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          {/* Canais bloqueados */}
          <div>
            <label className="field-label">Canais Bloqueados (sem XP)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              {blockedChannels.map(chId => (
                <span key={chId} style={{ background: '#2b2d31', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {channels.find(c => c.id === chId)?.name || chId}
                  <button onClick={() => setBlockedChannels(blockedChannels.filter(b => b !== chId))} style={{ background: 'none', border: 'none', color: '#ed4245', cursor: 'pointer' }}>X</button>
                </span>
              ))}
            </div>
            <select className="field-select" value="" onChange={e => { if (e.target.value && !blockedChannels.includes(e.target.value)) setBlockedChannels([...blockedChannels, e.target.value]); }}>
              <option value="">Bloquear canal...</option>
              {channels.filter(c => !blockedChannels.includes(c.id)).map(c => <option key={c.id} value={c.id}># {c.name}</option>)}
            </select>
          </div>

          {/* Cargos bloqueados */}
          <div>
            <label className="field-label">Cargos Bloqueados (sem XP)</label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '8px' }}>
              {blockedRoles.map(roleId => (
                <span key={roleId} style={{ background: '#2b2d31', padding: '4px 8px', borderRadius: '4px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  {roles.find(r => r.id === roleId)?.name || roleId}
                  <button onClick={() => setBlockedRoles(blockedRoles.filter(b => b !== roleId))} style={{ background: 'none', border: 'none', color: '#ed4245', cursor: 'pointer' }}>X</button>
                </span>
              ))}
            </div>
            <select className="field-select" value="" onChange={e => { if (e.target.value && !blockedRoles.includes(e.target.value)) setBlockedRoles([...blockedRoles, e.target.value]); }}>
              <option value="">Bloquear cargo...</option>
              {roles.filter(r => !blockedRoles.includes(r.id)).map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>

          <button className="save-btn" onClick={saveMultipliers}>Salvar Multiplicadores e Bloqueios</button>
        </div>
      )}

      {message && (
        <div style={{ marginTop: '16px', color: message.includes('Erro') ? '#ed4245' : '#23a55a', fontSize: '13px' }}>{message}</div>
      )}

      <style jsx>{`
        .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #72767d; display: block; margin-bottom: 4px; }
        .field-input, .field-select { background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #dbdee1; width: 100%; outline: none; box-sizing: border-box; }
        .field-select { cursor: pointer; }
        .save-btn { background: #5865f2; color: white; border: none; border-radius: 8px; padding: 10px 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
        .save-btn:hover { background: #4752c4; }
      `}</style>
    </div>
  );
}

const toggleStyle = (enabled: boolean): React.CSSProperties => ({
  width: '44px', height: '24px', borderRadius: '12px',
  background: enabled ? '#5865f2' : '#2b2d31',
  border: 'none', cursor: 'pointer', position: 'relative', padding: 0,
});

const toggleThumbStyle = (enabled: boolean): React.CSSProperties => ({
  position: 'absolute', width: '18px', height: '18px',
  borderRadius: '50%', background: 'white', top: '3px',
  left: enabled ? '23px' : '3px', transition: 'left 0.2s',
});