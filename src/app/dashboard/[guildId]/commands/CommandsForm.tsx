'use client';
import { useState } from 'react';

type Channel = { id: string; name: string };

type Config = {
  blockedCommandChannels: string;
  blockedCommandMessage: string;
  blockedCommandNotify: boolean;
};

type Props = {
  guildId: string;
  config: Config;
  channels: Channel[];
  saveAction: (formData: FormData) => Promise<void>;
};

export default function CommandsForm({ config, channels, saveAction }: Props) {
  const [blockedChannels, setBlockedChannels] = useState<string[]>(
    JSON.parse(config.blockedCommandChannels || '[]')
  );
  const [notify, setNotify] = useState(config.blockedCommandNotify);
  const [message, setMessage] = useState(config.blockedCommandMessage);

  const addChannel = (chId: string) => {
    if (!blockedChannels.includes(chId)) {
      setBlockedChannels([...blockedChannels, chId]);
    }
  };

  const removeChannel = (chId: string) => {
    setBlockedChannels(blockedChannels.filter(id => id !== chId));
  };

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('blockedCommandChannels', JSON.stringify(blockedChannels));
    formData.set('blockedCommandMessage', message);
    formData.set('blockedCommandNotify', notify ? 'true' : 'false');
    saveAction(formData);
  };

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: '600px', color: '#dbdee1' }}>
      <h2 style={{ color: '#f2f3f5', marginBottom: '24px' }}>Canais Bloqueados para Comandos</h2>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div>
          <label className="field-label">Canais que serao bloqueados</label>
          <p style={{ fontSize: '12px', color: '#72767d', margin: '4px 0 12px 0' }}>
            Nestes canais os comandos serao ignorados. O XP continua sendo contado normalmente.
          </p>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
            {blockedChannels.map(chId => (
              <span key={chId} style={{
                background: '#1e2025', padding: '6px 10px', borderRadius: '6px',
                display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px',
              }}>
                # {channels.find(c => c.id === chId)?.name || chId}
                <button
                  type="button"
                  onClick={() => removeChannel(chId)}
                  style={{
                    background: 'none', border: 'none', color: '#ed4245',
                    cursor: 'pointer', fontSize: '14px', fontWeight: 700, padding: 0,
                  }}
                >
                  X
                </button>
              </span>
            ))}
          </div>

          <select
            className="field-select"
            value=""
            onChange={e => { if (e.target.value) addChannel(e.target.value); }}
          >
            <option value="">Adicionar canal...</option>
            {channels.filter(c => !blockedChannels.includes(c.id)).map(c => (
              <option key={c.id} value={c.id}># {c.name}</option>
            ))}
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <input
            type="checkbox"
            checked={notify}
            onChange={e => setNotify(e.target.checked)}
          />
          <span>Enviar mensagem ao usuario quando tentar usar comandos em canais bloqueados</span>
        </div>

        {notify && (
          <div>
            <label className="field-label">Mensagem</label>
            <input
              className="field-input"
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>
        )}

        <button type="submit" className="save-btn">Salvar alterações</button>
      </form>

      <style jsx>{`
        .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #72767d; display: block; margin-bottom: 4px; }
        .field-input, .field-select { background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #dbdee1; width: 100%; outline: none; box-sizing: border-box; }
        .save-btn { background: #5865f2; color: white; border: none; border-radius: 8px; padding: 11px 16px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%; transition: background 0.15s; }
        .save-btn:hover { background: #4752c4; }
      `}</style>
    </div>
  );
}