'use client';

import { useEffect, useState } from 'react';

type Currency = { id: string; name: string; symbol: string; isPrimary: boolean };
type Log = {
  id: string;
  userId: string;
  moderatorId: string;
  amount: number;
  reason: string | null;
  source: string;
  createdAt: string;
  currency: Currency | null;
};

export type AdjustPrefill = { userId: string; currencyId: string; nonce: number } | null;

const box: React.CSSProperties = {
  background: '#16181c',
  border: '1px solid #1e2025',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
};

const small: React.CSSProperties = { fontSize: '12px', color: '#b5bac1', marginBottom: '4px', display: 'block' };

export default function AdjustBalance({
  guildId,
  currencies,
  prefill,
  onDone,
}: {
  guildId: string;
  currencies: Currency[];
  prefill: AdjustPrefill;
  onDone: () => void;
}) {
  const [userId, setUserId] = useState('');
  const [currencyId, setCurrencyId] = useState('');
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState('');
  const [logs, setLogs] = useState<Log[]>([]);

  const loadLogs = () =>
    fetch(`/api/guilds/${guildId}/economy/adjust`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setLogs(d))
      .catch(() => {});

  useEffect(() => {
    loadLogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  // Moeda escolhida (padrão: a principal)
  const selectedCurrencyId =
    currencyId || (currencies.find((c) => c.isPrimary) || currencies[0])?.id || '';

  // Clicou em "Ajustar" numa linha do ranking: preenche o formulário
  const [seenNonce, setSeenNonce] = useState<number | null>(null);
  if (prefill && prefill.nonce !== seenNonce) {
    setSeenNonce(prefill.nonce);
    setUserId(prefill.userId);
    setCurrencyId(prefill.currencyId);
    setAmount('');
    setMessage('');
  }

  useEffect(() => {
    if (prefill) {
      document.getElementById('ajustar-saldo')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [prefill]);

  const submit = async (sign: 1 | -1) => {
    setMessage('');
    const value = Number(amount);
    if (!Number.isInteger(value) || value <= 0) {
      return setMessage('Digite um valor inteiro maior que 0.');
    }
    const res = await fetch(`/api/guilds/${guildId}/economy/adjust`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: userId.trim(), currencyId: selectedCurrencyId, amount: sign * value, reason }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage(data.error || 'Erro ao ajustar saldo.');

    const c = currencies.find((x) => x.id === selectedCurrencyId);
    setMessage(
      data.applied === 0
        ? 'Nada foi alterado (a carteira já estava em 0).'
        : `${data.applied > 0 ? 'Adicionado' : 'Removido'} ${Math.abs(data.applied).toLocaleString('pt-BR')} ${c?.symbol ?? ''}. Novo saldo: ${data.balance.toLocaleString('pt-BR')}.`
    );
    setAmount('');
    setReason('');
    loadLogs();
    onDone();
  };

  return (
    <div style={box} id="ajustar-saldo">
      <label className="field-label" style={{ marginBottom: '12px' }}>🛠️ Ajustar saldo (staff)</label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
        <div>
          <span style={small}>ID do usuário</span>
          <input className="field-input" placeholder="Ex.: 123456789012345678" value={userId} onChange={(e) => setUserId(e.target.value)} />
        </div>
        <div>
          <span style={small}>Moeda</span>
          <select className="field-select" value={selectedCurrencyId} onChange={(e) => setCurrencyId(e.target.value)}>
            {currencies.map((c) => (
              <option key={c.id} value={c.id}>{c.symbol} {c.name}</option>
            ))}
          </select>
        </div>
        <div>
          <span style={small}>Valor</span>
          <input className="field-input" type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
        </div>
        <div>
          <span style={small}>Motivo (opcional)</span>
          <input className="field-input" placeholder="Ex.: prêmio de evento" value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
        <button className="save-btn" onClick={() => submit(1)} style={{ width: 'auto', padding: '10px 16px', marginTop: 0, background: '#23a55a' }}>
          ➕ Adicionar
        </button>
        <button className="save-btn" onClick={() => submit(-1)} style={{ width: 'auto', padding: '10px 16px', marginTop: 0, background: '#ED4245' }}>
          ➖ Remover
        </button>
        {message && <span style={{ fontSize: '13px', color: '#b5bac1' }}>{message}</span>}
      </div>

      <p style={{ fontSize: '13px', color: '#f2f3f5', margin: '20px 0 8px' }}>Últimos ajustes</p>
      {logs.length === 0 ? (
        <p style={{ color: '#72767d', fontSize: '13px' }}>Nenhum ajuste feito ainda.</p>
      ) : (
        <div style={{ maxHeight: '260px', overflowY: 'auto' }}>
          {logs.map((l) => (
            <div key={l.id} style={{ fontSize: '12px', padding: '8px 0', borderBottom: '1px solid #1e2025', color: '#b5bac1' }}>
              <span style={{ color: l.amount > 0 ? '#23a55a' : '#ED4245', fontWeight: 600 }}>
                {l.amount > 0 ? '+' : ''}{l.amount.toLocaleString('pt-BR')} {l.currency?.symbol ?? ''}
              </span>{' '}
              para <code>{l.userId}</code> por <code>{l.moderatorId}</code> ({l.source})
              {l.reason ? ` • ${l.reason}` : ''} • {new Date(l.createdAt).toLocaleString('pt-BR')}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}