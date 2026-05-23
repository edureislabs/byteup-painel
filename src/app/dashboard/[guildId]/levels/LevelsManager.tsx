'use client';

import { useState, useEffect } from 'react';

type Currency = { id: string; name: string; symbol: string };
type Channel = { id: string; name: string };
type Role = { id: string; name: string };
type LevelRequirement = { id?: string; level: number; xpNeeded: number };
type LevelReward = {
  id?: string;
  level: number;
  roleId?: string | null;
  currencyId?: string | null;
  rewardAmount: number;
  imageUrl?: string | null;
  message?: string | null;
};

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
  channelMultipliers: string;
  roleMultipliers: string;
  blockedChannels: string;
  blockedRoles: string;
  dailyXpLimit: number;
};

export default function LevelsManager({ guildId }: { guildId: string }) {
  const [config, setConfig] = useState<LevelConfig>({
  enabled: false, xpMode: 'formula', baseXP: 100, exponent: 2.0,
  minXpPerMessage: 15, maxXpPerMessage: 25, cooldownSeconds: 60,
  message: '{user} subiu para o nivel {level}!', imageUrl: null,
  levelUpChannelId: null,
  channelMultipliers: '{}', roleMultipliers: '{}',
  blockedChannels: '[]', blockedRoles: '[]',
  dailyXpLimit: 0,   // ← ADICIONE ESTA LINHA
});
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [requirements, setRequirements] = useState<LevelRequirement[]>([]);
  const [rewards, setRewards] = useState<LevelReward[]>([]);
  const [message, setMessage] = useState('');
  const [editingLevel, setEditingLevel] = useState<number | null>(null);

  // Estados para multiplicadores e bloqueios
  const [channelMults, setChannelMults] = useState<Record<string, number>>({});
  const [roleMults, setRoleMults] = useState<Record<string, number>>({});
  const [blockedChannels, setBlockedChannels] = useState<string[]>([]);
  const [blockedRoles, setBlockedRoles] = useState<string[]>([]);

  // Estado para o formulário de novo nível / edição
  const [newReward, setNewReward] = useState<LevelReward>({
    level: 0,
    roleId: null,
    currencyId: null,
    rewardAmount: 0,
    imageUrl: null,
    message: null,
  });

  useEffect(() => {
    fetchConfig();
    fetchCurrencies();
    fetchChannels();
    fetchRoles();
    fetchRequirements();
    fetchRewards();
  }, [guildId]);

  const fetchConfig = async () => {
    const res = await fetch(`/api/guilds/${guildId}/levels/config`);
    const data = await res.json();
    if (data && !data.error) {
      setConfig(data);
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

  const fetchRewards = async () => {
    const res = await fetch(`/api/guilds/${guildId}/levels/rewards`);
    const data = await res.json();
    if (Array.isArray(data)) setRewards(data);
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

  const saveReward = async () => {
  if (!newReward.level) return;
  const res = await fetch(`/api/guilds/${guildId}/levels/rewards`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newReward),
  });
  if (res.ok) {
    fetchRewards();
    setMessage('Recompensa salva.');
    setEditingLevel(null);
    setNewReward({ level: (rewards.length > 0 ? Math.max(...rewards.map(r => r.level)) : 0) + 1, roleId: null, currencyId: null, rewardAmount: 0, imageUrl: null, message: null });
  } else setMessage('Erro ao salvar recompensa.');
};

  const deleteReward = async (level: number) => {
  const res = await fetch(`/api/guilds/${guildId}/levels/rewards?level=${level}`, { method: 'DELETE' });
  if (res.ok) { 
    fetchRewards(); 
    setMessage('Recompensa removida.'); 
    if (editingLevel === level) {
      setEditingLevel(null);
      setNewReward({ level: (rewards.length > 0 ? Math.max(...rewards.map(r => r.level)) : 0) + 1, roleId: null, currencyId: null, rewardAmount: 0, imageUrl: null, message: null });
    }
  } else setMessage('Erro ao remover.');
};

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: '800px', color: '#dbdee1' }}>
      <h2 style={{ color: '#f2f3f5', marginBottom: '24px' }}>Sistema de Niveis (XP)</h2>

      {/* Toggle principal */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <span>Ativar sistema de niveis</span>
        <button type="button" style={toggleStyle(config.enabled)} onClick={() => saveConfig({ enabled: !config.enabled })}>
          <div style={toggleThumbStyle(config.enabled)} />
        </button>
      </div>

      {config.enabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
          <div style={{ flex: 1 }}>
  <label className="field-label">Limite Diario de XP</label>
  <input
    className="field-input"
    type="number"
    value={config.dailyXpLimit || 0}
    onChange={e => saveConfig({ dailyXpLimit: Number(e.target.value) })}
  />
  <p style={{ fontSize: '11px', color: '#72767d', marginTop: '4px' }}>0 = sem limite</p>
</div>
          {/* Configurações globais de mensagem e imagem (fallback) */}
          <div>
            <label className="field-label">Mensagem Padrao de Level Up</label>
            <input className="field-input" value={config.message} onChange={e => saveConfig({ message: e.target.value })} />
            <p style={{ fontSize: '11px', color: '#72767d', marginTop: '4px' }}>Use {'{user}'} e {'{level}'}. Essa mensagem sera usada se o nivel nao tiver uma personalizada.</p>
          </div>
          <div>
            <label className="field-label">Imagem/GIF Padrao</label>
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

                    {/* ==================== RECOMPENSAS POR NÍVEL ==================== */}
          <div style={{ background: '#16181c', border: '1px solid #1e2025', borderRadius: '12px', padding: '20px' }}>
            <label className="field-label" style={{ marginBottom: '12px' }}>Recompensas por Nivel (Personalizadas)</label>
            
            {/* Lista de níveis já configurados */}
            {rewards.map(r => (
              <div key={r.id || r.level} 
                onClick={() => {
                  setNewReward({
                    level: r.level,
                    roleId: r.roleId,
                    currencyId: r.currencyId,
                    rewardAmount: r.rewardAmount,
                    imageUrl: r.imageUrl,
                    message: r.message,
                  });
                  // Marca que está editando
                  setEditingLevel(r.level);
                }}
                style={{ 
                  display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', marginBottom: '12px', 
                  background: '#0e0f11', padding: '10px', borderRadius: '8px', cursor: 'pointer',
                  border: editingLevel === r.level ? '1px solid #5865f2' : '1px solid transparent',
                }}>
                <span style={{ fontWeight: 600, minWidth: '60px' }}>Nivel {r.level}</span>
                <span style={{ fontSize: '12px', color: '#72767d' }}>
                  {r.roleId ? (roles.find(ro => ro.id === r.roleId)?.name || r.roleId) : 'Sem cargo'} 
                  {r.currencyId ? ` | ${currencies.find(c => c.id === r.currencyId)?.symbol || '?'} ${r.rewardAmount}` : ''}
                  {r.message ? ` | Msg: "${r.message.slice(0, 30)}..."` : ''}
                </span>
                <button 
                  className="save-btn" 
                  onClick={(e) => { e.stopPropagation(); deleteReward(r.level); }} 
                  style={{ background: '#ed4245', width: 'auto', padding: '4px 12px', marginTop: 0, marginLeft: 'auto' }}
                >
                  Remover
                </button>
              </div>
            ))}

            {/* Formulário para adicionar/editar recompensa */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '8px' }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <label className="field-label" style={{ margin: 0 }}>Nivel:</label>
                <input 
                  className="field-input" 
                  type="number" 
                  value={newReward.level} 
                  onChange={e => setNewReward({ ...newReward, level: Number(e.target.value) })} 
                  style={{ width: '70px' }} 
                  disabled={editingLevel !== null}
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div style={{ flex: 1 }}>
                  <label className="field-label">Cargo (opcional)</label>
                  <select className="field-select" value={newReward.roleId || ''} onChange={e => setNewReward({ ...newReward, roleId: e.target.value || null })}>
                    <option value="">Nenhum</option>
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="field-label">Moeda (opcional)</label>
                  <select className="field-select" value={newReward.currencyId || ''} onChange={e => setNewReward({ ...newReward, currencyId: e.target.value || null })}>
                    <option value="">Nenhuma</option>
                    {currencies.map(c => <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label className="field-label">Quantidade</label>
                  <input className="field-input" type="number" value={newReward.rewardAmount} onChange={e => setNewReward({ ...newReward, rewardAmount: Number(e.target.value) })} />
                </div>
              </div>
              <div>
                <label className="field-label">Imagem/GIF (opcional)</label>
                <input className="field-input" value={newReward.imageUrl || ''} onChange={e => setNewReward({ ...newReward, imageUrl: e.target.value || null })} />
              </div>
              <div>
                <label className="field-label">Mensagem Personalizada (opcional)</label>
                <input className="field-input" value={newReward.message || ''} onChange={e => setNewReward({ ...newReward, message: e.target.value || null })} />
                <p style={{ fontSize: '11px', color: '#72767d', marginTop: '4px' }}>Use {'{user}'} e {'{level}'}. Se vazio, usa a mensagem padrao.</p>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="save-btn" onClick={saveReward} style={{ flex: 1, padding: '8px 20px', marginTop: '4px' }}>
                  {editingLevel !== null ? `Atualizar Nivel ${editingLevel}` : `Salvar Recompensa para Nivel ${newReward.level}`}
                </button>
                {editingLevel !== null && (
                  <button 
                    className="save-btn" 
                    onClick={() => {
                      setEditingLevel(null);
                      setNewReward({ level: (rewards.length > 0 ? Math.max(...rewards.map(r => r.level)) : 0) + 1, roleId: null, currencyId: null, rewardAmount: 0, imageUrl: null, message: null });
                    }} 
                    style={{ background: '#2b2d31', flex: 0, padding: '8px 16px', marginTop: '4px' }}
                  >
                    Cancelar
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* ==================== MULTIPLICADORES E BLOQUEIOS ==================== */}
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

          <button className="save-btn" onClick={saveMultipliers} style={{ width: 'auto', padding: '12px 24px' }}>
            Salvar Multiplicadores e Bloqueios
          </button>
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