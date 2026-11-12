'use client';

import { useEffect, useState } from 'react';

type Currency = { id: string; name: string; symbol: string; isPrimary: boolean };
type Role = { id: string; name: string; color: number };
type ShopItem = {
  id: string;
  name: string;
  description: string | null;
  price: number;
  currencyId: string;
  currency: Currency;
  roleId: string;
  durationDays: number | null;
  stock: number | null;
  enabled: boolean;
};

const box: React.CSSProperties = {
  background: '#16181c',
  border: '1px solid #1e2025',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
};

const small: React.CSSProperties = { fontSize: '12px', color: '#b5bac1', marginBottom: '4px', display: 'block' };

const empty = {
  name: '',
  description: '',
  price: '',
  currencyId: '',
  roleId: '',
  durationDays: '',
  stock: '',
};

export default function ShopManager({ guildId, currencies }: { guildId: string; currencies: Currency[] }) {
  const [items, setItems] = useState<ShopItem[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [form, setForm] = useState({ ...empty });
  const [message, setMessage] = useState('');

  const load = () =>
    fetch(`/api/guilds/${guildId}/shop`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setItems(d))
      .catch(() => {});

  useEffect(() => {
    load();
    fetch(`/api/guilds/${guildId}/roles`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setRoles(d))
      .catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [guildId]);

  // Moeda padrão do formulário: a principal
  const defaultCurrencyId = (currencies.find((c) => c.isPrimary) || currencies[0])?.id || '';
  const currencyId = form.currencyId || defaultCurrencyId;

  const roleName = (id: string) => roles.find((r) => r.id === id)?.name || id;

  const create = async () => {
    setMessage('');
    const res = await fetch(`/api/guilds/${guildId}/shop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: form.name,
        description: form.description || null,
        price: Number(form.price),
        currencyId,
        roleId: form.roleId,
        durationDays: form.durationDays === '' ? null : Number(form.durationDays),
        stock: form.stock === '' ? null : Number(form.stock),
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage(data.error || 'Erro ao criar item.');
    setMessage(`Item "${data.name}" criado.`);
    setForm({ ...empty, currencyId });
    load();
  };

  const patch = async (item: ShopItem, body: Record<string, any>) => {
    const res = await fetch(`/api/guilds/${guildId}/shop/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return setMessage(data.error || 'Erro ao atualizar item.');
    load();
  };

  const editStock = (item: ShopItem) => {
    const v = window.prompt(
      `Novo estoque de "${item.name}" (deixe vazio para ilimitado):`,
      item.stock === null ? '' : String(item.stock)
    );
    if (v === null) return;
    patch(item, { stock: v.trim() === '' ? null : Number(v) });
  };

  const editPrice = (item: ShopItem) => {
    const v = window.prompt(`Novo preço de "${item.name}":`, String(item.price));
    if (v === null) return;
    patch(item, { price: Number(v) });
  };

  const remove = async (item: ShopItem) => {
    if (!window.confirm(`Remover "${item.name}" da loja? Quem já comprou cargo temporário continua com ele até vencer.`)) return;
    const res = await fetch(`/api/guilds/${guildId}/shop/${item.id}`, { method: 'DELETE' });
    if (res.ok) load();
  };

  const linkBtn: React.CSSProperties = {
    background: 'transparent',
    border: '1px solid #2b2d31',
    color: '#b5bac1',
    padding: '4px 10px',
    borderRadius: '6px',
    fontSize: '12px',
    cursor: 'pointer',
  };

  return (
    <div style={box}>
      <label className="field-label" style={{ marginBottom: '12px' }}>🛒 Loja de cargos</label>

      {currencies.length === 0 ? (
        <p style={{ color: '#72767d', fontSize: '13px' }}>Crie uma moeda primeiro para poder vender itens.</p>
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: '10px' }}>
            <div>
              <span style={small}>Nome do item</span>
              <input className="field-input" placeholder="Ex.: VIP Mensal" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <span style={small}>Cargo entregue</span>
              <select className="field-select" value={form.roleId} onChange={(e) => setForm({ ...form, roleId: e.target.value })}>
                <option value="">Escolha um cargo</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div>
              <span style={small}>Preço</span>
              <input className="field-input" type="number" min={1} value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} />
            </div>
            <div>
              <span style={small}>Moeda</span>
              <select className="field-select" value={currencyId} onChange={(e) => setForm({ ...form, currencyId: e.target.value })}>
                {currencies.map((c) => (
                  <option key={c.id} value={c.id}>{c.symbol} {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <span style={small}>Duração em dias (vazio = permanente)</span>
              <input className="field-input" type="number" min={1} placeholder="Permanente" value={form.durationDays} onChange={(e) => setForm({ ...form, durationDays: e.target.value })} />
            </div>
            <div>
              <span style={small}>Estoque (vazio = ilimitado)</span>
              <input className="field-input" type="number" min={0} placeholder="Ilimitado" value={form.stock} onChange={(e) => setForm({ ...form, stock: e.target.value })} />
            </div>
          </div>
          <div style={{ marginTop: '10px' }}>
            <span style={small}>Descrição (opcional)</span>
            <input className="field-input" placeholder="Ex.: Acesso aos canais VIP por 30 dias" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '12px' }}>
            <button className="save-btn" onClick={create} style={{ width: 'auto', padding: '10px 20px', marginTop: 0 }}>
              Adicionar à loja
            </button>
            {message && <span style={{ fontSize: '13px', color: '#b5bac1' }}>{message}</span>}
          </div>
          <p style={{ fontSize: '12px', color: '#72767d', marginTop: '8px' }}>
            💡 O cargo do bot precisa estar acima dos cargos vendidos, senão ele não consegue entregar.
          </p>
        </>
      )}

      <div style={{ marginTop: '16px' }}>
        {items.length === 0 && <p style={{ color: '#72767d', fontSize: '13px' }}>Nenhum item na loja ainda.</p>}
        {items.map((item) => (
          <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px', padding: '12px', border: '1px solid #1e2025', borderRadius: '8px', marginBottom: '8px', opacity: item.enabled ? 1 : 0.55 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 600 }}>
                {item.name}{' '}
                <span style={{ color: '#C100FF' }}>
                  • {item.price.toLocaleString('pt-BR')} {item.currency.symbol} {item.currency.name}
                </span>
              </div>
              <div style={{ fontSize: '12px', color: '#b5bac1', marginTop: '4px' }}>
                Cargo: @{roleName(item.roleId)} • {item.durationDays ? `⏳ ${item.durationDays} dia(s)` : '♾️ Permanente'} •{' '}
                {item.stock === null ? 'Estoque ilimitado' : item.stock > 0 ? `📦 ${item.stock} em estoque` : '❌ Esgotado'}
                {!item.enabled && ' • Desativado'}
              </div>
              {item.description && <div style={{ fontSize: '12px', color: '#72767d', marginTop: '2px' }}>{item.description}</div>}
            </div>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
              <button style={linkBtn} onClick={() => editPrice(item)}>Preço</button>
              <button style={linkBtn} onClick={() => editStock(item)}>Estoque</button>
              <button style={linkBtn} onClick={() => patch(item, { enabled: !item.enabled })}>
                {item.enabled ? 'Desativar' : 'Ativar'}
              </button>
              <button style={{ ...linkBtn, color: '#ED4245', borderColor: '#ED424540' }} onClick={() => remove(item)}>Remover</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}