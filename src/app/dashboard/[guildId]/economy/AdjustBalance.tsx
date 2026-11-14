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
  marginTop: '24px',
  marginBottom: '24px',
};

const small: React.CSSProperties = { fontSize: '12px', color: '#b5bac1', marginBottom: '6px', display: 'block' };

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
      <label className="field-label" style={{ marginBottom: '16px' }}>Ajustar saldo</label>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
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
        <button className="save-btn" onClick={() => submit(1)} style={{ background: '#23a55a' }}>
          ➕ Adicionar
        </button>
        <button className="save-btn" onClick={() => submit(-1)} style={{ background: '#ED4245' }}>
          ➖ Remover
        </button>
        {message && <span className="msg">{message}</span>}
      </div>

      <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #1e2025' }}>
      <p className="sub-title">🧾 Últimos ajustes</p>
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
