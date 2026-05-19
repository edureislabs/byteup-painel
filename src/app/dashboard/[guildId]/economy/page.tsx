'use client';

import { useState, useEffect, use } from 'react';

type Currency = {
  id: string;
  name: string;
  symbol: string;
  taxRate: number;
  exchangeRate: number;
};

type GameConfig = {
  id: string;
  gameName: string;
  enabled: boolean;
  currencyId: string | null;
};

type EconomyUser = {
  id: string;
  userId: string;
  balance: number;
  bank: number;
  currency: Currency;
};

type Props = {
  params: Promise<{ guildId: string }>;
};

export default function EconomyPage({ params }: Props) {
  const { guildId } = use(params);

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [games, setGames] = useState<GameConfig[]>([]);
  const [users, setUsers] = useState<EconomyUser[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<EconomyUser[]>([]);
  const [newName, setNewName] = useState('');
  const [newSymbol, setNewSymbol] = useState('$');
  const [message, setMessage] = useState('');

  // Filtros
  const [selectedCurrency, setSelectedCurrency] = useState('all');
  const [selectedGame, setSelectedGame] = useState('all');
  const [sortBy, setSortBy] = useState<'balance' | 'bank' | 'total'>('total');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchCurrencies();
    fetchGames();
    fetchUsers();
  }, [guildId]);

  useEffect(() => {
    applyFilters();
  }, [users, selectedCurrency, selectedGame, sortBy, sortOrder, searchTerm]);

  const fetchCurrencies = async () => {
    const res = await fetch(`/api/guilds/${guildId}/currencies`);
    const data = await res.json();
    if (Array.isArray(data)) setCurrencies(data);
  };

  const fetchGames = async () => {
    const res = await fetch(`/api/guilds/${guildId}/games`);
    const data = await res.json();
    if (Array.isArray(data)) setGames(data);
  };

  const fetchUsers = async () => {
    const res = await fetch(`/api/guilds/${guildId}/economy/users`);
    const data = await res.json();
    if (Array.isArray(data)) setUsers(data);
  };

  const addCurrency = async () => {
    if (!newName.trim()) {
      setMessage('O nome da moeda é obrigatório.');
      return;
    }
    const res = await fetch(`/api/guilds/${guildId}/currencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName.trim(), symbol: newSymbol, taxRate: 0, exchangeRate: 1.0 }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`Moeda "${data.name}" criada.`);
      setNewName('');
      setNewSymbol('$');
      fetchCurrencies();
    } else {
      setMessage(data.error || 'Erro ao criar moeda.');
    }
  };

  const deleteCurrency = async (id: string) => {
    const res = await fetch(`/api/guilds/${guildId}/currencies/${id}`, { method: 'DELETE' });
    if (res.ok) {
      setMessage('Moeda removida.');
      fetchCurrencies();
      fetchGames();
      fetchUsers();
    } else {
      const data = await res.json();
      setMessage(data.error || 'Erro ao remover moeda.');
    }
  };

  const applyFilters = () => {
    let result = [...users];

    // Filtro por moeda
    if (selectedCurrency !== 'all') {
      result = result.filter(u => u.currency.id === selectedCurrency);
    }

    // Filtro por jogo (busca nos gameConfigs a moeda associada)
    if (selectedGame !== 'all') {
      const game = games.find(g => g.gameName === selectedGame);
      if (game && game.currencyId) {
        result = result.filter(u => u.currency.id === game.currencyId);
      } else {
        result = [];
      }
    }

    // Busca por ID do usuário
    if (searchTerm.trim()) {
      result = result.filter(u => u.userId.includes(searchTerm.trim()));
    }

    // Ordenação
    result.sort((a, b) => {
      const totalA = sortBy === 'total' ? a.balance + a.bank : a[sortBy];
      const totalB = sortBy === 'total' ? b.balance + b.bank : b[sortBy];
      return sortOrder === 'desc' ? totalB - totalA : totalA - totalB;
    });

    setFilteredUsers(result);
  };

  const gamesByCurrency: Record<string, GameConfig[]> = {};
  for (const game of games) {
    if (!game.currencyId) continue;
    if (!gamesByCurrency[game.currencyId]) gamesByCurrency[game.currencyId] = [];
    gamesByCurrency[game.currencyId].push(game);
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: '900px', color: '#dbdee1' }}>
      <h2 style={{ color: '#f2f3f5', marginBottom: '24px' }}>Economia</h2>

      {/* Criação de moeda */}
      <div style={{ background: '#16181c', border: '1px solid #1e2025', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <label className="field-label" style={{ marginBottom: '8px' }}>Criar Moeda</label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input className="field-input" placeholder="Nome" value={newName} onChange={e => setNewName(e.target.value)} style={{ flex: 1 }} />
          <input className="field-input" placeholder="Símbolo" value={newSymbol} onChange={e => setNewSymbol(e.target.value)} style={{ width: '80px' }} />
          <button className="save-btn" onClick={addCurrency} style={{ width: 'auto', padding: '10px 20px', marginTop: 0 }}>Criar</button>
        </div>
      </div>

      {/* Lista de moedas */}
      <div style={{ marginBottom: '32px' }}>
        <label className="field-label" style={{ marginBottom: '12px' }}>Moedas existentes</label>
        {currencies.length === 0 && <p style={{ color: '#72767d' }}>Nenhuma moeda criada ainda.</p>}
        {currencies.map(c => {
          const currencyGames = gamesByCurrency[c.id] || [];
          return (
            <div key={c.id} style={{ background: '#16181c', border: '1px solid #1e2025', borderRadius: '8px', padding: '16px', marginBottom: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <span style={{ fontWeight: 600, fontSize: '16px' }}>{c.symbol} {c.name}</span>
                  {currencyGames.length > 0 && (
                    <div style={{ marginTop: '6px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      {currencyGames.map(game => (
                        <span key={game.id} style={{
                          background: game.enabled ? '#1a3a2a' : '#2b2d31',
                          color: game.enabled ? '#23a55a' : '#72767d',
                          padding: '2px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 500,
                        }}>
                          {game.gameName === 'caracoroa' ? 'Cara ou Coroa' : game.gameName}
                          {game.enabled ? ' (ativo)' : ' (inativo)'}
                        </span>
                      ))}
                    </div>
                  )}
                  {currencyGames.length === 0 && (
                    <p style={{ fontSize: '12px', color: '#72767d', margin: '6px 0 0 0' }}>Nenhum jogo usa esta moeda.</p>
                  )}
                </div>
                <button className="save-btn" onClick={() => deleteCurrency(c.id)} style={{ background: '#ed4245', width: 'auto', padding: '4px 12px', fontSize: '12px', marginTop: 0 }}>Remover</button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Ranking */}
      <div>
        <label className="field-label" style={{ marginBottom: '12px' }}>Ranking de Usuários</label>

        {/* Filtros */}
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
          <select className="field-select" value={selectedCurrency} onChange={e => setSelectedCurrency(e.target.value)} style={{ width: '180px' }}>
            <option value="all">Todas as moedas</option>
            {currencies.map(c => (
              <option key={c.id} value={c.id}>{c.symbol} {c.name}</option>
            ))}
          </select>
          <select className="field-select" value={selectedGame} onChange={e => setSelectedGame(e.target.value)} style={{ width: '180px' }}>
            <option value="all">Todos os jogos</option>
            {games.map(g => (
              <option key={g.id} value={g.gameName}>
                {g.gameName === 'caracoroa' ? 'Cara ou Coroa' : g.gameName}
              </option>
            ))}
          </select>
          <select className="field-select" value={sortBy} onChange={e => setSortBy(e.target.value as any)} style={{ width: '140px' }}>
            <option value="total">Saldo Total</option>
            <option value="balance">Carteira</option>
            <option value="bank">Banco</option>
          </select>
          <button
            className="save-btn"
            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
            style={{ width: 'auto', padding: '8px 12px', fontSize: '12px', marginTop: 0 }}
          >
            {sortOrder === 'desc' ? 'Maior → Menor' : 'Menor → Maior'}
          </button>
          <input
            className="field-input"
            placeholder="Buscar por ID..."
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
            style={{ width: '200px' }}
          />
        </div>

        {/* Tabela */}
        <div style={{ background: '#16181c', border: '1px solid #1e2025', borderRadius: '12px', overflow: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid #1e2025' }}>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#72767d' }}>Posição</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#72767d' }}>ID do Usuário</th>
                <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#72767d' }}>Moeda</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#72767d' }}>Carteira</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#72767d' }}>Banco</th>
                <th style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600, color: '#72767d' }}>Total</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 && (
                <tr>
                  <td colSpan={6} style={{ padding: '24px', textAlign: 'center', color: '#72767d' }}>
                    Nenhum usuário encontrado com esses filtros.
                  </td>
                </tr>
              )}
              {filteredUsers.map((user, index) => {
                const total = user.balance + user.bank;
                return (
                  <tr key={user.id} style={{ borderBottom: '1px solid #1e2025' }}>
                    <td style={{ padding: '12px 16px', color: '#72767d' }}>{index + 1}</td>
                    <td style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>{user.userId}</td>
                    <td style={{ padding: '12px 16px' }}>{user.currency.symbol} {user.currency.name}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{user.balance.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right' }}>{user.bank.toLocaleString()}</td>
                    <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 600 }}>{total.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {message && (
        <div style={{
          marginTop: '16px', padding: '10px', borderRadius: '8px',
          background: message.includes('Erro') ? '#3a1a1a' : '#1a3a2a',
          color: message.includes('Erro') ? '#ed4245' : '#23a55a', fontSize: '13px',
        }}>
          {message}
        </div>
      )}

      <style jsx>{`
        .field-input, .field-select {
          background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px;
          padding: 10px 14px; font-size: 14px; color: #dbdee1; outline: none; box-sizing: border-box;
        }
        .field-select { cursor: pointer; }
        .save-btn {
          background: #5865f2; color: white; border: none; border-radius: 8px;
          padding: 10px 16px; font-size: 14px; font-weight: 600; cursor: pointer;
          transition: background 0.15s;
        }
        .save-btn:hover { background: #4752c4; }
        .field-label {
          font-size: 11px; font-weight: 600; text-transform: uppercase;
          letter-spacing: 0.8px; color: #72767d; display: block;
        }
      `}</style>
    </div>
  );
}