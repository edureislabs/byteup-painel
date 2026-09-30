'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';

type Currency = {
  id: string;
  name: string;
  symbol: string;
  isPrimary: boolean;
};

type GameCurrencyEntry = {
  currencyId: string;
  minBet: number | null;
  maxBet: number | null;
  reward: number | null;
};

type GameCurrencyWithCurrency = {
  id: string;
  currencyId: string;
  currency: Currency;
  minBet: number | null;
  maxBet: number | null;
  reward: number | null;
};

type GameConfig = {
  id: string;
  gameName: string;
  enabled: boolean;
  currencyMode: 'single' | 'multi_fixed' | 'multi_user';
  minBet: number;
  maxBet: number;
  reward: number;
  dailyLimit: number;
  currencies: GameCurrencyWithCurrency[];
};

type Props = {
  guildId: string;
};

const GAME_LABELS: Record<string, string> = {
  caracoroa: 'Cara ou Coroa',
  roll: 'Rolar Dados',
};

const AVAILABLE_GAMES = ['caracoroa', 'roll'];

const MODE_LABELS = {
  single: 'Moeda única',
  multi_fixed: 'Múltiplas fixas (todas ao mesmo tempo)',
  multi_user: 'Múltiplas livres (usuário escolhe)',
};

export default function GamesManager({ guildId }: Props) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [games, setGames] = useState<GameConfig[]>([]);
  const [localGames, setLocalGames] = useState<Record<string, any>>({});
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
    Promise.all([fetchCurrencies(), fetchGames()]).finally(() =>
      setLoading(false)
    );
  }, [fetchCurrencies, fetchGames]);

  // ===== GET GAME =====
  const getGame = useCallback(
    (gameName: string) => {
      const saved = games.find((g) => g.gameName === gameName);
      const local = localGames[gameName] || {};

      const base = {
        gameName,
        enabled: false,
        currencyMode: 'single' as const,
        minBet: 10,
        maxBet: 1000,
        reward: 100,
        dailyLimit: 0,
        currencies: [] as GameCurrencyWithCurrency[],
        ...saved,
      };

      return {
        ...base,
        ...local,
        currencies: local.currencies ?? base.currencies ?? [],
      };
    },
    [games, localGames]
  );

  const setLocal = useCallback((gameName: string, updates: any) => {
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
        const payload: any = { gameName, ...local };

        // Normaliza currencies se vierem do local
        if (local.currencies) {
          payload.currencies = local.currencies.map((c: any) => ({
            currencyId: c.currencyId,
            minBet: c.minBet ?? null,
            maxBet: c.maxBet ?? null,
            reward: c.reward ?? null,
          }));
        }

        const res = await fetch(`/api/guilds/${guildId}/games`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
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
          setMessage(data.error || 'Erro ao alterar status.');
        }
      } catch (err) {
        console.error('Erro:', err);
        setMessage('Erro de rede.');
      } finally {
        setSavingGame(null);
      }
    },
    [guildId, fetchGames]
  );

  // ===== CURRENCIES HELPERS =====
  const addCurrencyToGame = useCallback(
    (gameName: string, game: any) => {
      const current = game.currencies || [];
      const usedIds = current.map((c: any) => c.currencyId);
      const available = currencies.find((c) => !usedIds.includes(c.id));

      if (!available) {
        setMessage('Todas as moedas já foram adicionadas.');
        return;
      }

      const next = [
        ...current,
        {
          currencyId: available.id,
          currency: available,
          minBet: null,
          maxBet: null,
          reward: null,
        },
      ];

      setLocal(gameName, { currencies: next });
    },
    [currencies, setLocal]
  );

  const updateCurrencyInGame = useCallback(
    (gameName: string, game: any, currencyId: string, updates: any) => {
      const next = game.currencies.map((c: any) =>
        c.currencyId === currencyId ? { ...c, ...updates } : c
      );
      setLocal(gameName, { currencies: next });
    },
    [setLocal]
  );

  const removeCurrencyFromGame = useCallback(
    (gameName: string, game: any, currencyId: string) => {
      const next = game.currencies.filter(
        (c: any) => c.currencyId !== currencyId
      );
      setLocal(gameName, { currencies: next });
    },
    [setLocal]
  );

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
    <div style={{ fontFamily: 'DM Sans, sans-serif', color: '#dbdee1', maxWidth: '720px' }}>
      <h2 style={{ color: '#f2f3f5', marginBottom: '8px' }}>Configuração de Jogos</h2>
      <p style={{ color: '#72767d', fontSize: '13px', marginBottom: '24px' }}>
        Configure moedas, limites e recompensas para cada jogo.
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

            {game.enabled && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {/* Modo de moeda */}
                <div>
                  <label style={labelStyle}>Modo de moeda</label>
                  <select
                    value={game.currencyMode}
                    onChange={(e) => setLocal(gameName, { currencyMode: e.target.value })}
                    style={selectStyle}
                  >
                    <option value="single">Moeda única</option>
                    <option value="multi_fixed">Múltiplas fixas (todas ao mesmo tempo)</option>
                    <option value="multi_user">Múltiplas livres (usuário escolhe)</option>
                  </select>
                </div>

                {/* Valores padrão do jogo */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={labelStyle}>Aposta mín. padrão</label>
                    <input
                      type="number"
                      min={0}
                      value={game.minBet}
                      onChange={(e) => setLocal(gameName, { minBet: Number(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Aposta máx. padrão</label>
                    <input
                      type="number"
                      min={0}
                      value={game.maxBet}
                      onChange={(e) => setLocal(gameName, { maxBet: Number(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Recompensa padrão</label>
                    <input
                      type="number"
                      min={0}
                      value={game.reward}
                      onChange={(e) => setLocal(gameName, { reward: Number(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Limite diário</label>
                    <input
                      type="number"
                      min={0}
                      value={game.dailyLimit}
                      onChange={(e) => setLocal(gameName, { dailyLimit: Number(e.target.value) })}
                      style={inputStyle}
                    />
                  </div>
                </div>

                {/* Se NÃO for single, mostra moedas */}
                {game.currencyMode !== 'single' && (
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                      <label style={{ ...labelStyle, marginBottom: 0 }}>
                        Moedas do jogo
                      </label>
                      <button
                        type="button"
                        onClick={() => addCurrencyToGame(gameName, game)}
                        style={{
                          background: '#C100FF',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          cursor: 'pointer',
                          fontWeight: 600,
                        }}
                      >
                        + Adicionar moeda
                      </button>
                    </div>

                    {currencies.length === 0 ? (
  <p style={{ fontSize: '12px', color: '#ed4245', fontStyle: 'italic' }}>
    Nenhuma moeda cadastrada no servidor. Vá em Economia → Criar Moeda.
  </p>
) : game.currencies.length === 0 ? (
  <p style={{ fontSize: '12px', color: '#72767d', fontStyle: 'italic' }}>
    Nenhuma moeda adicionada. Clique em "+ Adicionar moeda".
  </p>
) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {game.currencies.map((entry: any) => {
                          const currency =
                            entry.currency ||
                            currencies.find((c) => c.id === entry.currencyId);

                          return (
                            <div
                              key={entry.currencyId}
                              style={{
                                background: '#0e0f11',
                                border: '1px solid #1e2025',
                                borderRadius: '8px',
                                padding: '12px',
                                display: 'grid',
                                gridTemplateColumns: '1.5fr 1fr 1fr 1fr auto',
                                gap: '8px',
                                alignItems: 'center',
                              }}
                            >
                              <span style={{ fontSize: '13px', color: '#dbdee1', fontWeight: 600 }}>
                                {currency?.symbol} {currency?.name}
                                {currency?.isPrimary && (
                                  <span style={{ marginLeft: '6px', fontSize: '10px', color: '#C100FF' }}>
                                    (primária)
                                  </span>
                                )}
                              </span>
                              <input
                                type="number"
                                placeholder={`${game.minBet}`}
                                value={entry.minBet ?? ''}
                                onChange={(e) =>
                                  updateCurrencyInGame(gameName, game, entry.currencyId, {
                                    minBet: e.target.value === '' ? null : Number(e.target.value),
                                  })
                                }
                                style={smallInputStyle}
                                title="Aposta mínima (vazio = usa padrão)"
                              />
                              <input
                                type="number"
                                placeholder={`${game.maxBet}`}
                                value={entry.maxBet ?? ''}
                                onChange={(e) =>
                                  updateCurrencyInGame(gameName, game, entry.currencyId, {
                                    maxBet: e.target.value === '' ? null : Number(e.target.value),
                                  })
                                }
                                style={smallInputStyle}
                                title="Aposta máxima (vazio = usa padrão)"
                              />
                              <input
                                type="number"
                                placeholder={`${game.reward}`}
                                value={entry.reward ?? ''}
                                onChange={(e) =>
                                  updateCurrencyInGame(gameName, game, entry.currencyId, {
                                    reward: e.target.value === '' ? null : Number(e.target.value),
                                  })
                                }
                                style={smallInputStyle}
                                title="Recompensa (vazio = usa padrão)"
                              />
                              <button
                                type="button"
                                onClick={() => removeCurrencyFromGame(gameName, game, entry.currencyId)}
                                style={{
                                  background: 'transparent',
                                  border: '1px solid #ed424540',
                                  borderRadius: '6px',
                                  color: '#ed4245',
                                  padding: '6px 10px',
                                  fontSize: '12px',
                                  cursor: 'pointer',
                                }}
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                        <p style={{ fontSize: '10px', color: '#72767d', marginTop: '4px' }}>
                          Vazio = usa o valor padrão do jogo.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Botões */}
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => saveGame(gameName)}
                    disabled={!isLocal || isSaving}
                    style={{
                      background: isLocal && !isSaving ? '#C100FF' : '#2b2d31',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      padding: '10px 16px',
                      fontSize: '14px',
                      fontWeight: 600,
                      cursor: isLocal && !isSaving ? 'pointer' : 'not-allowed',
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

const smallInputStyle: React.CSSProperties = {
  background: '#16181c',
  border: '1px solid #1e2025',
  borderRadius: '6px',
  padding: '6px 8px',
  fontSize: '12px',
  color: '#dbdee1',
  width: '100%',
  outline: 'none',
  boxSizing: 'border-box',
};