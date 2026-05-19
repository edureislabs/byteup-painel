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
  currencyId: string | null;
  currency: Currency | null;
  minBet: number;
  maxBet: number;
  reward: number;
};

type Props = {
  guildId: string;
};

export default function GamesManager({ guildId }: Props) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [games, setGames] = useState<GameConfig[]>([]);
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

  const updateGame = async (gameName: string, updates: Partial<GameConfig>) => {
    const res = await fetch(`/api/guilds/${guildId}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameName, ...updates }),
    });
    if (res.ok) {
      setMessage('Jogo atualizado.');
      fetchGames();
    } else {
      const data = await res.json();
      setMessage(data.error || 'Erro ao atualizar jogo.');
    }
  };

  const availableGames = ['caracoroa'];

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: '#dbdee1', maxWidth: '600px' }}>
      <h2 style={{ color: '#f2f3f5', marginBottom: '24px' }}>Configuracao de Jogos</h2>

      {availableGames.map(gameName => {
        const game = games.find(g => g.gameName === gameName) || {
          gameName,
          enabled: false,
          currencyId: null,
          minBet: 10,
          maxBet: 1000,
          reward: 100,
          currency: null,
        };

        return (
          <div key={gameName} style={{
            background: '#16181c',
            border: '1px solid #1e2025',
            borderRadius: '12px',
            padding: '20px',
            marginBottom: '16px',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontWeight: 600, fontSize: '16px', color: '#f2f3f5' }}>
                {gameName === 'caracoroa' ? 'Cara ou Coroa' : gameName}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: game.enabled ? '#23a55a' : '#72767d' }}>
                  {game.enabled ? 'Ativo' : 'Desativado'}
                </span>
                <button
                  type="button"
                  style={{
                    width: '44px', height: '24px', borderRadius: '12px',
                    background: game.enabled ? '#5865f2' : '#2b2d31',
                    border: 'none', cursor: 'pointer', position: 'relative', padding: 0,
                  }}
                  onClick={() => updateGame(gameName, {
                    enabled: !game.enabled,
                    currencyId: game.currencyId,
                    minBet: game.minBet,
                    maxBet: game.maxBet,
                    reward: game.reward,
                  })}
                >
                  <div style={{
                    position: 'absolute', width: '18px', height: '18px',
                    borderRadius: '50%', background: 'white', top: '3px',
                    left: game.enabled ? '23px' : '3px', transition: 'left 0.2s',
                  }} />
                </button>
              </div>
            </div>

            {game.enabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <div>
                  <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#72767d', display: 'block', marginBottom: '4px' }}>
                    Moeda (opcional)
                  </label>
                  <select
                    value={game.currencyId || ''}
                    onChange={e => updateGame(gameName, { ...game, currencyId: e.target.value || null })}
                    style={{
                      background: '#0e0f11', border: '1px solid #1e2025', borderRadius: '8px',
                      padding: '10px 14px', fontSize: '14px', color: '#dbdee1', width: '100%',
                      outline: 'none', cursor: 'pointer',
                    }}
                  >
                    <option value="">Nenhuma (recompensa em texto)</option>
                    {currencies.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>
                    ))}
                  </select>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#72767d', display: 'block', marginBottom: '4px' }}>
                      Aposta Minima
                    </label>
                    <input
                      type="number"
                      value={game.minBet}
                      onChange={e => updateGame(gameName, { ...game, minBet: Number(e.target.value) })}
                      style={{
                        background: '#0e0f11', border: '1px solid #1e2025', borderRadius: '8px',
                        padding: '10px 14px', fontSize: '14px', color: '#dbdee1', width: '100%',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#72767d', display: 'block', marginBottom: '4px' }}>
                      Aposta Maxima
                    </label>
                    <input
                      type="number"
                      value={game.maxBet}
                      onChange={e => updateGame(gameName, { ...game, maxBet: Number(e.target.value) })}
                      style={{
                        background: '#0e0f11', border: '1px solid #1e2025', borderRadius: '8px',
                        padding: '10px 14px', fontSize: '14px', color: '#dbdee1', width: '100%',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#72767d', display: 'block', marginBottom: '4px' }}>
                      Recompensa (bonus)
                    </label>
                    <input
                      type="number"
                      value={game.reward}
                      onChange={e => updateGame(gameName, { ...game, reward: Number(e.target.value) })}
                      style={{
                        background: '#0e0f11', border: '1px solid #1e2025', borderRadius: '8px',
                        padding: '10px 14px', fontSize: '14px', color: '#dbdee1', width: '100%',
                        outline: 'none',
                      }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {message && (
        <div style={{
          marginTop: '16px',
          padding: '10px',
          borderRadius: '8px',
          background: message.includes('sucesso') || message.includes('atualizado') ? '#1a3a2a' : '#3a1a1a',
          color: message.includes('sucesso') || message.includes('atualizado') ? '#23a55a' : '#ed4245',
          fontSize: '13px',
        }}>
          {message}
        </div>
      )}
    </div>
  );
}