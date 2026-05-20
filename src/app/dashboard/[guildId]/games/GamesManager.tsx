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
  dailyLimit: number;
};

type Props = {
  guildId: string;
};

export default function GamesManager({ guildId }: Props) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [games, setGames] = useState<GameConfig[]>([]);
  const [localGames, setLocalGames] = useState<Record<string, Partial<GameConfig>>>({});
  const [message, setMessage] = useState('');
  const [tempValues, setTempValues] = useState<Record<string, any>>({});

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

  const getGame = (gameName: string) => {
    const saved = games.find(g => g.gameName === gameName);
    const local = localGames[gameName] || {};
    return {
      gameName,
      enabled: false,
      currencyId: null,
      minBet: 10,
      maxBet: 1000,
      reward: 100,
      dailyLimit: 0,
      currency: null,
      ...saved,
      ...local,
    };
  };

  const setLocal = (gameName: string, updates: Partial<GameConfig>) => {
    setLocalGames(prev => ({
      ...prev,
      [gameName]: { ...prev[gameName], ...updates },
    }));
  };

  const saveGame = async (gameName: string) => {
    const local = localGames[gameName];
    if (!local) return;
    const res = await fetch(`/api/guilds/${guildId}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameName, ...local }),
    });
    if (res.ok) {
      setMessage('Jogo salvo.');
      setLocalGames(prev => ({ ...prev, [gameName]: {} }));
      fetchGames();
    } else {
      const data = await res.json();
      setMessage(data.error || 'Erro ao salvar jogo.');
    }
  };

  const toggleEnabled = async (gameName: string, current: boolean) => {
    const res = await fetch(`/api/guilds/${guildId}/games`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameName, enabled: !current }),
    });
    if (res.ok) {
      fetchGames();
    }
  };

  const availableGames = ['caracoroa', 'roll'];

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: '#dbdee1', maxWidth: '600px' }}>
      <h2 style={{ color: '#f2f3f5', marginBottom: '24px' }}>Configuracao de Jogos</h2>

      {availableGames.map(gameName => {
        const game = getGame(gameName);
        const isLocal = !!localGames[gameName] && Object.keys(localGames[gameName]).length > 0;

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
                {gameName === 'caracoroa' ? 'Cara ou Coroa' : gameName === 'roll' ? 'Rolar Dados' : gameName}
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
                  onClick={() => toggleEnabled(gameName, game.enabled)}
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
                    onChange={e => setLocal(gameName, { currencyId: e.target.value || null })}
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
                      onChange={e => setLocal(gameName, { minBet: Number(e.target.value) })}
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
                      onChange={e => setLocal(gameName, { maxBet: Number(e.target.value) })}
                      style={{
                        background: '#0e0f11', border: '1px solid #1e2025', borderRadius: '8px',
                        padding: '10px 14px', fontSize: '14px', color: '#dbdee1', width: '100%',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#72767d', display: 'block', marginBottom: '4px' }}>
                      Recompensa
                    </label>
                    <input
                      type="number"
                      value={game.reward}
                      onChange={e => setLocal(gameName, { reward: Number(e.target.value) })}
                      style={{
                        background: '#0e0f11', border: '1px solid #1e2025', borderRadius: '8px',
                        padding: '10px 14px', fontSize: '14px', color: '#dbdee1', width: '100%',
                        outline: 'none',
                      }}
                    />
                  </div>
                  <div style={{ flex: 1 }}>
  <label style={{ fontSize: '11px', fontWeight: 600, textTransform: 'uppercase', color: '#72767d', display: 'block', marginBottom: '4px' }}>
    Limite Diario
  </label>
  <input
    type="number"
    value={tempValues[`${gameName}_dailyLimit`] ?? game.dailyLimit ?? ''}
    onChange={e => {
      const val = e.target.value;
      setTempValues(prev => ({ ...prev, [`${gameName}_dailyLimit`]: val === '' ? '' : Number(val) }));
    }}
    onBlur={e => {
      const val = e.target.value;
      const num = val === '' ? 0 : Number(val);
      setLocal(gameName, { dailyLimit: num });
      setTempValues(prev => ({ ...prev, [`${gameName}_dailyLimit`]: undefined }));
    }}
    style={{
      background: '#0e0f11', border: '1px solid #1e2025', borderRadius: '8px',
      padding: '10px 14px', fontSize: '14px', color: '#dbdee1', width: '100%',
      outline: 'none',
    }}
  />
</div>
                </div>
                <button
                  onClick={() => saveGame(gameName)}
                  disabled={!isLocal}
                  style={{
                    background: isLocal ? '#5865f2' : '#2b2d31',
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '10px 16px',
                    fontSize: '14px',
                    fontWeight: 600,
                    cursor: isLocal ? 'pointer' : 'not-allowed',
                    transition: 'background 0.15s',
                    marginTop: '8px',
                  }}
                >
                  Salvar
                </button>
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
          background: message.includes('sucesso') || message.includes('salvo') ? '#1a3a2a' : '#3a1a1a',
          color: message.includes('sucesso') || message.includes('salvo') ? '#23a55a' : '#ed4245',
          fontSize: '13px',
        }}>
          {message}
        </div>
      )}
    </div>
  );
}