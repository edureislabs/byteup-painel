'use client';

import { useState, useEffect } from 'react';

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
  currencyId: string;
};

type Props = {
  guildId: string;
};

export default function EconomyPage({ guildId }: Props) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [games, setGames] = useState<GameConfig[]>([]);
  const [newName, setNewName] = useState('');
  const [newSymbol, setNewSymbol] = useState('$');
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchCurrencies();
    fetchGames();
  }, []);

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

  const addCurrency = async () => {
    if (!newName.trim()) {
      setMessage('O nome da moeda é obrigatório.');
      return;
    }
    const res = await fetch(`/api/guilds/${guildId}/currencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newName.trim(),
        symbol: newSymbol || '$',
        taxRate: 0,
        exchangeRate: 1.0,
      }),
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
    } else {
      const data = await res.json();
      setMessage(data.error || 'Erro ao remover moeda.');
    }
  };

  // Agrupa jogos por currencyId
  const gamesByCurrency: Record<string, GameConfig[]> = {};
  for (const game of games) {
    if (!gamesByCurrency[game.currencyId]) gamesByCurrency[game.currencyId] = [];
    gamesByCurrency[game.currencyId].push(game);
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: '600px', color: '#dbdee1' }}>
      <h2 style={{ color: '#f2f3f5', marginBottom: '24px' }}>Economia</h2>

      {/* Criação de moeda */}
      <div style={{ background: '#16181c', border: '1px solid #1e2025', borderRadius: '12px', padding: '20px', marginBottom: '24px' }}>
        <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#72767d', display: 'block', marginBottom: '8px' }}>
          Criar Moeda
        </label>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <input
            className="field-input"
            placeholder="Nome"
            value={newName}
            onChange={e => setNewName(e.target.value)}
            style={{ flex: 1 }}
          />
          <input
            className="field-input"
            placeholder="Símbolo"
            value={newSymbol}
            onChange={e => setNewSymbol(e.target.value)}
            style={{ width: '80px' }}
          />
          <button className="save-btn" onClick={addCurrency} style={{ width: 'auto', padding: '10px 20px', marginTop: 0 }}>
            Criar
          </button>
        </div>
      </div>

      {/* Lista de moedas */}
      <div>
        <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.8px', color: '#72767d', display: 'block', marginBottom: '12px' }}>
          Moedas existentes
        </label>
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
                        <span
                          key={game.id}
                          style={{
                            background: game.enabled ? '#1a3a2a' : '#2b2d31',
                            color: game.enabled ? '#23a55a' : '#72767d',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                          }}
                        >
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
                <button
                  className="save-btn"
                  onClick={() => deleteCurrency(c.id)}
                  style={{ background: '#ed4245', width: 'auto', padding: '4px 12px', fontSize: '12px', marginTop: 0 }}
                >
                  Remover
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {message && (
        <div style={{
          marginTop: '16px',
          padding: '10px',
          borderRadius: '8px',
          background: message.includes('Erro') ? '#3a1a1a' : '#1a3a2a',
          color: message.includes('Erro') ? '#ed4245' : '#23a55a',
          fontSize: '13px',
        }}>
          {message}
        </div>
      )}

      <style jsx>{`
        .field-input {
          background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px;
          padding: 10px 14px; font-size: 14px; color: #dbdee1; outline: none; box-sizing: border-box;
        }
        .save-btn {
          background: #5865f2; color: white; border: none; border-radius: 8px;
          padding: 10px 16px; font-size: 14px; font-weight: 600; cursor: pointer;
          transition: background 0.15s;
        }
        .save-btn:hover { background: #4752c4; }
      `}</style>
    </div>
  );
}