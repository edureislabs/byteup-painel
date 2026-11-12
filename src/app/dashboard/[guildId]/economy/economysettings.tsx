'use client';

import { useEffect, useState } from 'react';

type Config = {
  dailyAmount: number;
  dailyCooldownHours: number;
  workEnabled: boolean;
  workMin: number;
  workMax: number;
  workCooldownMinutes: number;
  bankEnabled: boolean;
  staffLogChannelId: string | null;
};

type Channel = { id: string; name: string };

const box: React.CSSProperties = {
  background: '#16181c',
  border: '1px solid #1e2025',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
};

const grid: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: '12px',
};

const small: React.CSSProperties = { fontSize: '12px', color: '#b5bac1', marginBottom: '6px', display: 'block' };

export default function EconomySettings({ guildId }: { guildId: string }) {
  const [config, setConfig] = useState<Config | null>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/guilds/${guildId}/economy/config`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => setConfig(d))
      .catch(() => setMessage('Erro ao carregar configurações.'));

    fetch(`/api/guilds/${guildId}/channels`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setChannels(d))
      .catch(() => {});
  }, [guildId]);

  if (!config) {
    return (
      <div style={box}>
        <label className="field-label">Configurações da economia</label>
        <p style={{ color: '#72767d', fontSize: '13px' }}>Carregando...</p>
      </div>
    );
  }

  const set = (field: keyof Config, value: any) => setConfig({ ...config, [field]: value });
  const num = (field: keyof Config) => (e: React.ChangeEvent<HTMLInputElement>) =>
    set(field, e.target.value === '' ? '' : Number(e.target.value));

  const save = async () => {
    setSaving(true);
    setMessage('');
    const res = await fetch(`/api/guilds/${guildId}/economy/config`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(config),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    setMessage(res.ok ? 'Configurações salvas. O bot aplica em até 30 segundos.' : data.error || 'Erro ao salvar.');
  };

  return (
    <div style={box}>
      <label className="field-label" style={{ marginBottom: '16px' }}>Configurações da economia</label>

      <div className="section">
      <p className="sub-title">📅 Daily</p>
      <div style={grid}>
        <div>
          <span style={small}>Valor do daily (0 = desativado)</span>
          <input className="field-input" type="number" min={0} value={config.dailyAmount} onChange={num('dailyAmount')} />
        </div>
        <div>
          <span style={small}>Intervalo (horas)</span>
          <input className="field-input" type="number" min={1} max={168} value={config.dailyCooldownHours} onChange={num('dailyCooldownHours')} />
        </div>
      </div>
      <p className="hint">Quanto o membro ganha no /daily e de quanto em quanto tempo pode usar.</p>
      </div>

      <div className="section">
      <p className="sub-title">💼 Trabalho (/trabalhar)</p>
      <label className="check">
        <input type="checkbox" checked={config.workEnabled} onChange={(e) => set('workEnabled', e.target.checked)} />
        Ativar /trabalhar
      </label>
      <div style={grid}>
        <div>
          <span style={small}>Ganho mínimo</span>
          <input className="field-input" type="number" min={1} value={config.workMin} onChange={num('workMin')} disabled={!config.workEnabled} />
        </div>
        <div>
          <span style={small}>Ganho máximo</span>
          <input className="field-input" type="number" min={1} value={config.workMax} onChange={num('workMax')} disabled={!config.workEnabled} />
        </div>
        <div>
          <span style={small}>Intervalo (minutos)</span>
          <input className="field-input" type="number" min={1} value={config.workCooldownMinutes} onChange={num('workCooldownMinutes')} disabled={!config.workEnabled} />
        </div>
      </div>
      <p className="hint">O valor sorteado fica entre o mínimo e o máximo.</p>
      </div>

      <div className="section">
      <p className="sub-title">🏦 Banco e registros</p>
      <label className="check">
        <input type="checkbox" checked={config.bankEnabled} onChange={(e) => set('bankEnabled', e.target.checked)} />
        Ativar /depositar e /sacar
      </label>
      <div style={{ maxWidth: '360px' }}>
        <span style={small}>Canal de log da economia (ajustes da staff)</span>
        <select className="field-select" value={config.staffLogChannelId || ''} onChange={(e) => set('staffLogChannelId', e.target.value || null)}>
          <option value="">Nenhum</option>
          {channels.map((c) => (
            <option key={c.id} value={c.id}>#{c.name}</option>
          ))}
        </select>
        <p className="hint">Os /addmoney, /removemoney e ajustes do painel aparecem aqui.</p>
      </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', paddingTop: '16px', borderTop: '1px solid #1e2025' }}>
        <button className="save-btn" onClick={save} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
        {message && <span className="msg">{message}</span>}
      </div>
      <style jsx>{`
        .field-input, .field-select { width: 100%; background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #dbdee1; outline: none; box-sizing: border-box; font-family: inherit; }
        .field-input::placeholder { color: #4e5058; }
        .field-input:disabled { opacity: 0.45; cursor: not-allowed; }
        .field-select { cursor: pointer; }
        .field-input:focus, .field-select:focus { border-color: #C100FF; }
        .save-btn { background: #C100FF; color: white; border: none; border-radius: 8px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; font-family: inherit; }
        .save-btn:hover { background: #8A2BFF; }
        .save-btn:disabled { opacity: 0.6; cursor: wait; }
        .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #72767d; display: block; }
        .sub-title { font-size: 13px; font-weight: 600; color: #f2f3f5; margin: 0 0 10px; display: flex; align-items: center; gap: 6px; }
        .section { padding: 16px 0; border-top: 1px solid #1e2025; }
        .section:first-of-type { border-top: none; padding-top: 4px; }
        .hint { font-size: 12px; color: #72767d; margin: 6px 0 0; }
        .check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #b5bac1; margin-bottom: 12px; cursor: pointer; width: fit-content; }
        .check input { accent-color: #C100FF; width: 16px; height: 16px; cursor: pointer; }
        .ghost-btn { background: transparent; border: 1px solid #2b2d31; color: #b5bac1; padding: 5px 10px; border-radius: 6px; font-size: 12px; cursor: pointer; font-family: inherit; transition: border-color 0.15s, color 0.15s; }
        .ghost-btn:hover { border-color: #C100FF; color: #f2f3f5; }
        .ghost-btn.danger { color: #ED4245; border-color: #ED424540; }
        .ghost-btn.danger:hover { border-color: #ED4245; }
        .msg { font-size: 13px; color: #b5bac1; }
      `}</style>
    </div>
  );
}