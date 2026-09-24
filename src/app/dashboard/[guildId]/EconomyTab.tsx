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
  currency: Currency;
  minBet: number;
  maxBet: number;
  reward: number;
};

type Props = {
  guildId: string;
};

export default function EconomyTab({ guildId }: Props) {
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [games, setGames] = useState<GameConfig[]>([]);
  const [message, setMessage] = useState('');

  // Estados para nova moeda
  const [newName, setNewName] = useState('');
  const [newSymbol, setNewSymbol] = useState('$');
  const [newTax, setNewTax] = useState(0);
  const [newExchange, setNewExchange] = useState(1.0);

  useEffect(() => {
    fetchCurrencies();
    fetchGames();
  }, [guildId]);

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
    if (!newName) return setMessage('Nome da moeda é obrigatório.');
    const res = await fetch(`/api/guilds/${guildId}/currencies`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newName, symbol: newSymbol, taxRate: newTax, exchangeRate: newExchange }),
    });
    const data = await res.json();
    if (res.ok) {
      setMessage(`Moeda "${data.name}" criada.`);
      setNewName('');
      setNewSymbol('$');
      setNewTax(0);
      setNewExchange(1.0);
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

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Moedas */}
      <div className="field-group">
        <span className="field-label">Moedas</span>
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          <input className="field-input" placeholder="Nome" value={newName} onChange={e => setNewName(e.target.value)} />
          <input className="field-input" placeholder="Símbolo" value={newSymbol} onChange={e => setNewSymbol(e.target.value)} style={{ width: '80px' }} />
          <input className="field-input" type="number" placeholder="Taxa %" value={newTax} onChange={e => setNewTax(Number(e.target.value))} style={{ width: '80px' }} />
          <input className="field-input" type="number" placeholder="Cotação" value={newExchange} onChange={e => setNewExchange(Number(e.target.value))} style={{ width: '80px' }} />
          <button type="button" className="save-btn" onClick={addCurrency} style={{ width: 'auto', marginTop: '0' }}>Criar</button>
        </div>
        <div style={{ marginTop: '12px' }}>
          {currencies.map(c => (
            <div key={c.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: '1px solid #1e2025' }}>
              <span style={{ color: '#dbdee1' }}>{c.name} ({c.symbol}) - Taxa: {c.taxRate}% - Cotação: {c.exchangeRate}</span>
            <button 
  type="button" 
  className="save-btn" 
  onClick={() => deleteCurrency(c.id)} 
  style={{ width: 'auto', padding: '4px 12px', fontSize: '12px', marginTop: '0', background: '#ed4245' }}
>
  Remover
</button>
            </div>
          ))}
        </div>
      </div>

      {/* Jogos */}
      <div className="field-group">
        <span className="field-label">Configuração de Jogos</span>
        {['caracoroa'].map(gameName => {
          const game = games.find(g => g.gameName === gameName) || { gameName, enabled: false, currencyId: '', minBet: 10, maxBet: 1000, reward: 100, currency: null };
          return (
            <div key={gameName} style={{ background: '#1e2025', borderRadius: '8px', padding: '16px', marginTop: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#dbdee1', fontWeight: 600 }}>{gameName === 'caracoroa' ? 'Cara ou Coroa' : gameName}</span>
                <div className="toggle-row">
                  <button
                    type="button"
                    className={`toggle-track ${game.enabled ? 'enabled' : ''}`}
                    onClick={() => updateGame(gameName, { enabled: !game.enabled, currencyId: game.currencyId || currencies[0]?.id || '', minBet: game.minBet, maxBet: game.maxBet, reward: game.reward })}
                  >
                    <div className="toggle-thumb" />
                  </button>
                </div>
              </div>
              {game.enabled && (
                <div style={{ display: 'flex', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <select
                    className="field-select"
                    value={game.currencyId}
                    onChange={e => updateGame(gameName, { ...game, currencyId: e.target.value })}
                    style={{ width: '200px' }}
                  >
                    <option value="">Selecione uma moeda</option>
                    {currencies.map(c => (
                      <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>
                    ))}
                  </select>
                  <input className="field-input" type="number" placeholder="Aposta mín." value={game.minBet} onChange={e => updateGame(gameName, { ...game, minBet: Number(e.target.value) })} style={{ width: '100px' }} />
                  <input className="field-input" type="number" placeholder="Aposta máx." value={game.maxBet} onChange={e => updateGame(gameName, { ...game, maxBet: Number(e.target.value) })} style={{ width: '100px' }} />
                  <input className="field-input" type="number" placeholder="Recompensa" value={game.reward} onChange={e => updateGame(gameName, { ...game, reward: Number(e.target.value) })} style={{ width: '120px' }} />
                </div>
              )}
            </div>
          );
        })}
      </div>

      {message && <div className={message.includes('sucesso') || message.includes('criada') || message.includes('atualizado') ? 'message-success' : 'message-error'}>{message}</div>}
    <style jsx>{`
  .field-label {
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.8px;
    color: #72767d;
    display: block;
    margin-bottom: 4px;
  }
  .field-input, .field-select {
    background: #0e0f11;
    border: 1px solid #1e2025;
    border-radius: 8px;
    padding: 10px 14px;
    font-size: 14px;
    color: #dbdee1;
    width: 100%;
    outline: none;
    box-sizing: border-box;
  }
  .field-input:focus, .field-select:focus {
    border-color: #C100FF;
  }
  .field-select {
    cursor: pointer;
  }
  .save-btn {
    background: #C100FF;
    color: white;
    border: none;
    border-radius: 8px;
    padding: 10px 16px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    transition: background 0.15s;
    margin-top: 0;
  }
  .save-btn:hover {
    background: #8A2BFF;
  }
  .field-group {
    background: #16181c;
    border: 1px solid #1e2025;
    border-radius: 12px;
    padding: 20px;
  }
  .toggle-track {
    width: 44px;
    height: 24px;
    border-radius: 12px;
    background: #2b2d31;
    border: none;
    cursor: pointer;
    position: relative;
    padding: 0;
    transition: background 0.2s;
  }
  .toggle-track.enabled {
    background: #C100FF;
  }
  .toggle-thumb {
    position: absolute;
    width: 18px;
    height: 18px;
    border-radius: 50%;
    background: white;
    top: 3px;
    left: 3px;
    transition: left 0.2s;
  }
  .toggle-track.enabled .toggle-thumb {
    left: 23px;
  }
  .message-success {
    margin-top: 16px;
    padding: 10px;
    border-radius: 8px;
    background: #1a3a2a;
    color: #23a55a;
    font-size: 13px;
  }
  .message-error {
    margin-top: 16px;
    padding: 10px;
    border-radius: 8px;
    background: #3a1a1a;
    color: #ed4245;
    font-size: 13px;
  }
`}</style></div>
    
  );
}