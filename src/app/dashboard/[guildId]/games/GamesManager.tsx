'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

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

const GAME_LABELS: Record<string, string> = {
  caracoroa: 'Cara ou Coroa',
  roll: 'Rolar Dados',
};

const AVAILABLE_GAMES = ['caracoroa', 'roll'];

export default function GamesManager({ guildId }: Props) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [games, setGames] = useState<GameConfig[]>([]);
  const [localGames, setLocalGames] = useState<Record<string, Partial<GameConfig>>>({});
  const [message, setMessage] = useState('');
  const [savingGame, setSavingGame] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // ===== FETCH =====
  const fetchCurrencies = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/currencies`);
      const data = await res.json();
      if (Array.isArray(data)) setCurrencies(data);
    } catch (err) {
      console.error('Erro ao buscar moedas:', err);
    }
  }, [guildId]);

  const fetchGames = useCallback(async () => {
    try {
      const res = await fetch(`/api/guilds/${guildId}/games`);
      const data = await res.json();
      if (Array.isArray(data)) setGames(data);
    } catch (err) {
      console.error('Erro ao buscar jogos:', err);
    }
  }, [guildId]);

  useEffect(() => {
    Promise.all([fetchCurrencies(), fetchGames()]).finally(() => setLoading(false));
  }, [fetchCurrencies, fetchGames]);

  // ===== GET GAME (mesclado) =====
  const getGame = useCallback(
    (gameName: string) => {
      const saved = games.find((g) => g.gameName === gameName);
      const local = localGames[gameName] || {};

      return {
        gameName,
        enabled: false,
        currencyId: null as string | null,
        minBet: 10,
        maxBet: 1000,
        reward: 100,
        dailyLimit: 0,
        currency: null,
        ...saved,
        ...local,
      };
    },
    [games, localGames]
  );

  // ===== SET LOCAL =====
  const setLocal = useCallback((gameName: string, updates: Partial<GameConfig>) => {
    setLocalGames((prev) => ({
      ...prev,
      [gameName]: { ...prev[gameName], ...updates },
    }));
  }, []);

  // ===== SALVAR =====
  const saveGame = useCallback(
    async (gameName: string) => {
      const local = localGames[gameName];
      if (!local || Object.keys(local).length === 0) return;

      setSavingGame(gameName);
      setMessage('');

      try {
        const res = await fetch(`/api/guilds/${guildId}/games`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameName, ...local }),
        });

        const data = await res.json();

        if (res.ok) {
          setMessage(`${GAME_LABELS[gameName] || gameName} salvo com sucesso.`);
          setLocalGames((prev) => ({ ...prev, [gameName]: {} }));
          await fetchGames();
        } else {
          setMessage(data.error || 'Erro ao salvar jogo.');
        }
      } catch (err) {
        console.error('Erro ao salvar:', err);
        setMessage('Erro de rede ao salvar jogo.');
      } finally {
        setSavingGame(null);
      }
    },
    [guildId, localGames, fetchGames]
  );

  // ===== TOGGLE ENABLED =====
  const toggleEnabled = useCallback(
    async (gameName: string, current: boolean) => {
      setSavingGame(gameName);
      setMessage('');

      try {
        const res = await fetch(`/api/guilds/${guildId}/games`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ gameName, enabled: !current }),
        });

        const data = await res.json();

        if (res.ok) {
          await fetchGames();
        } else {
          setMessage(data.error || 'Erro ao alterar status do jogo.');
        }
      } catch (err) {
        console.error('Erro ao alternar status:', err);
        setMessage('Erro de rede ao alterar status.');
      } finally {
        setSavingGame(null);
      }
    },
    [guildId, fetchGames]
  );

  // ===== RESET LOCAL =====
  const resetLocal = useCallback((gameName: string) => {
    setLocalGames((prev) => ({ ...prev, [gameName]: {} }));
    setMessage('');
  }, []);

  // ===== MENSAGEM =====
  const messageType = useMemo(() => {
    if (!message) return null;
    if (message.includes('sucesso') || message.includes('salvo')) return 'success';
    return 'error';
  }, [message]);

  // ===== AUTO-LIMPAR MENSAGEM =====
  useEffect(() => {
    if (!message) return;
    const timeout = setTimeout(() => setMessage(''), 4000);
    return () => clearTimeout(timeout);
  }, [message]);

  if (loading) {
    return (
      <div style={{ fontFamily: 'DM Sans, sans-serif', color: '#72767d', padding: '40px', textAlign: 'center' }}>
        Carregando configurações...
      </div>
    );
  }

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: '#dbdee1', maxWidth: '640px' }}>
      <h2 style={{ color: '#f2f3f5', marginBottom: '8px' }}>Configuração de Jogos</h2>
      <p style={{ color: '#72767d', fontSize: '13px', marginBottom: '24px' }}>
        Configure moeda, limites e recompensas para cada jogo.
      </p>

      {AVAILABLE_GAMES.map((gameName) => {
        const game = getGame(gameName);
        const isLocal = !!localGames[gameName] && Object.keys(localGames[gameName]).length > 0;
        const isSaving = savingGame === gameName;

        return (
          <div
            key={gameName}
            style={{
              background: '#16181c',
              border: isLocal ? '1px solid #C100FF' : '1px solid #1e2025',
              borderRadius: '12px',
              padding: '20px',
              marginBottom: '16px',
              transition: 'border-color 0.2s',
            }}
          >
            {/* Cabeçalho */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: game.enabled ? '16px' : 0 }}>
              <div>
                <span style={{ fontWeight: 600, fontSize: '16px', color: '#f2f3f5' }}>
                  {GAME_LABELS[gameName] || gameName}
                </span>
                {isLocal && (
                  <span style={{ marginLeft: '8px', fontSize: '11px', color: '#C100FF', fontWeight: 600 }}>
                    ● não salvo
                  </span>
                )}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: game.enabled ? '#23a55a' : '#72767d' }}>
                  {game.enabled ? 'Ativo' : 'Desativado'}
                </span>
                <button
                  type="button"
                  disabled={isSaving}
                  style={{
                    width: '44px',
                    height: '24px',
                    borderRadius: '12px',
                    background: game.enabled ? '#C100FF' : '#2b2d31',
                    border: 'none',
                    cursor: isSaving ? 'wait' : 'pointer',
                    position: 'relative',
                    padding: 0,
                    opacity: isSaving ? 0.6 : 1,
                  }}
                  onClick={() => toggleEnabled(gameName, game.enabled)}
                >
                  <div
                    style={{
                      position: 'absolute',
                      width: '18px',
                      height: '18px',
                      borderRadius: '50%',
                      background: 'white',
                      top: '3px',
                      left: game.enabled ? '23px' : '3px',
                      transition: 'left 0.2s',
                    }}
                  />
                </button>
              </div>
            </div>

            {/* Campos (só quando ativo) */}
            {game.enabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {/* Moeda */}
                <div>
                  <label style={labelStyle}>Moeda</label>
                  <select
                    value={game.currencyId || ''}
                    onChange={(e) => setLocal(gameName, { currencyId: e.target.value || null })}
                    style={selectStyle}
                  >
                    <option value="">Nenhuma (recompensa em texto)</option>
                    {currencies.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.symbol})
                      </option>
                    ))}
                  </select>
                  {currencies.length === 0 && (
                    <p style={{ fontSize: '11px', color: '#ed4245', marginTop: '4px' }}>
                      Nenhuma moeda cadastrada. Crie uma em Economia → Moedas.
                    </p>
                  )}
                </div>

                {/* Apostas + Recompensa + Limite */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Aposta Mínima</label>
                    <input
                      type="number"
                      min={0}
                      value={game.minBet}
                      onChange={(e) => setLocal(gameName, { minBet: Number(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Aposta Máxima</label>
                    <input
                      type="number"
                      min={0}
                      value={game.maxBet}
                      onChange={(e) => setLocal(gameName, { maxBet: Number(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Recompensa</label>
                    <input
                      type="number"
                      min={0}
                      value={game.reward}
                      onChange={(e) => setLocal(gameName, { reward: Number(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Limite Diário</label>
                    <input
                      type="number"
                      min={0}
                      placeholder="0 = ilimitado"
                      value={game.dailyLimit ?? ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setLocal(gameName, {
                          dailyLimit: val === '' ? 0 : Number(val),
                        });
                      }}
                      style={inputStyle}
                    />
                    <p style={{ fontSize: '10px', color: '#72767d', marginTop: '4px' }}>
                      0 = sem limite
                    </p>
                  </div>
                </div>

                {/* Validação */}
                {game.minBet > game.maxBet && (
                  <p style={{ fontSize: '12px', color: '#ed4245' }}>
                    ⚠️ Aposta mínima não pode ser maior que a máxima.
                  </p>
                )}

                {/* Botões */}
                <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                  <button
                    type="button"
                    onClick={() => saveGame(gameName)}
                    disabled={!isLocal || isSaving || game.minBet > game.maxBet}
                    style={{
                      background: isLocal && !isSaving && game.minBet <= game.maxBet ? '#C100FF' : '#2b2d31',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: isLocal && !isSaving ? 'pointer' : 'not-allowed',
                      transition: 'background 0.15s',
                      flex: 1,
                    }}
                  >
                    {isSaving ? 'Salvando...' : 'Salvar'}
                  </button>
                  {isLocal && (
                    <button
                      type="button"
                      onClick={() => resetLocal(gameName)}
                      disabled={isSaving}
                      style={{
                        background: 'transparent',
                        color: '#72767d',
                        border: '1px solid #2b2d31',
                        borderRadius: '8px',
                        padding: '10px 16px',
                        fontSize: '14px',
                        cursor: 'pointer',
                      }}
                    >
                      Descartar
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Mensagem */}
      {message && messageType && (
        <div
          style={{
            marginTop: '16px',
            padding: '12px 16px',
            borderRadius: '8px',
            background: messageType === 'success' ? '#1a3a2a' : '#3a1a1a',
            color: messageType === 'success' ? '#23a55a' : '#ed4245',
            fontSize: '13px',
            border: `1px solid ${messageType === 'success' ? '#23a55a40' : '#ed424540'}`,
          }}
        >
          {message}
        </div>
      )}
    </div>
  );
}

// ===== ESTILOS =====
const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  color: '#72767d',
  display: 'block',
  marginBottom: '4px',
};

const inputStyle: React.CSSProperties = {
  background: '#0e0f11',
  border: '1px solid #1e2025',
  borderRadius: '8px',
  padding: '10px 14px',
  fontSize: '14px',
  color: '#dbdee1',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
};

const selectStyle: React.CSSProperties = {
  ...inputStyle,
  cursor: 'pointer',
};