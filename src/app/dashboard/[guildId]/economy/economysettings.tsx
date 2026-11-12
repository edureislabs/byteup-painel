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

const small: React.CSSProperties = { fontSize: '12px', color: '#b5bac1', marginBottom: '4px', display: 'block' };

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
      <label className="field-label" style={{ marginBottom: '12px' }}>Configurações da economia</label>

      <p style={{ fontSize: '13px', color: '#f2f3f5', margin: '0 0 8px' }}>📅 Daily</p>
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

      <p style={{ fontSize: '13px', color: '#f2f3f5', margin: '20px 0 8px' }}>💼 Trabalho (/trabalhar)</p>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#b5bac1', marginBottom: '10px', cursor: 'pointer', width: 'fit-content' }}>
        <input type="checkbox" checked={config.workEnabled} onChange={(e) => set('workEnabled', e.target.checked)} style={{ accentColor: '#C100FF', width: '16px', height: '16px' }} />
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

      <p style={{ fontSize: '13px', color: '#f2f3f5', margin: '20px 0 8px' }}>🏦 Banco e registros</p>
      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: '#b5bac1', marginBottom: '10px', cursor: 'pointer', width: 'fit-content' }}>
        <input type="checkbox" checked={config.bankEnabled} onChange={(e) => set('bankEnabled', e.target.checked)} style={{ accentColor: '#C100FF', width: '16px', height: '16px' }} />
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
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '16px' }}>
        <button className="save-btn" onClick={save} disabled={saving} style={{ width: 'auto', padding: '10px 20px', marginTop: 0 }}>
          {saving ? 'Salvando...' : 'Salvar configurações'}
        </button>
        {message && <span style={{ fontSize: '13px', color: '#b5bac1' }}>{message}</span>}
      </div>
    </div>
  );
}