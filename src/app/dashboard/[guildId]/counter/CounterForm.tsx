'use client';
import { useState } from 'react';

type Channel = { id: string; name: string };

type Config = {
  counterEnabled: boolean;
  counterChannelId: string;
  counterTemplate: string;
};

type Props = {
  guildId: string;
  config: Config;
  channels: Channel[];
  saveAction: (formData: FormData) => Promise<void>;
};

export default function CounterForm({ config, channels, saveAction }: Props) {
  const [enabled, setEnabled] = useState(config.counterEnabled);
  const [channelId, setChannelId] = useState(config.counterChannelId);
  const [template, setTemplate] = useState(config.counterTemplate);

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set('counterEnabled', enabled ? 'true' : 'false');
    formData.set('counterChannelId', channelId);
    formData.set('counterTemplate', template);
    saveAction(formData);
  };

  const preview = template.replace(/{contmember}/g, '1.234');

  return (
    <div
      style={{
        fontFamily: 'DM Sans, sans-serif',
        maxWidth: '680px',
        color: '#dbdee1',
      }}
    >
      <h2
        style={{
          color: '#f2f3f5',
          fontSize: '20px',
          fontWeight: 600,
          marginBottom: '8px',
        }}
      >
        Contador de Membros
      </h2>
      <p
        style={{
          fontSize: '13px',
          color: '#72767d',
          margin: '0 0 28px 0',
          lineHeight: '1.5',
        }}
      >
        Crie um canal de voz que mostra automaticamente quantos membros o
        servidor tem. Atualiza a cada 5 minutos.
      </p>

      <form
        onSubmit={handleSubmit}
        style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}
      >
        {/* Toggle principal */}
        <div
          style={{
            background: '#16181c',
            border: '1px solid #1e2025',
            borderRadius: '12px',
            padding: '20px',
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'flex-start',
              gap: '12px',
              marginBottom: enabled ? '20px' : '0',
            }}
          >
            <div
              style={{
                width: '40px',
                height: '24px',
                borderRadius: '12px',
                background: enabled ? '#C100FF' : '#2b2d31',
                cursor: 'pointer',
                position: 'relative',
                flexShrink: 0,
                marginTop: '2px',
                transition: 'background 0.2s',
              }}
              onClick={() => setEnabled(!enabled)}
            >
              <div
                style={{
                  position: 'absolute',
                  width: '18px',
                  height: '18px',
                  borderRadius: '50%',
                  background: 'white',
                  top: '3px',
                  left: enabled ? '19px' : '3px',
                  transition: 'left 0.2s',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
                }}
              />
            </div>
            <div>
              <div
                style={{
                  fontSize: '14px',
                  fontWeight: 500,
                  color: '#dbdee1',
                  marginBottom: '3px',
                }}
              >
                Ativar contador de membros
              </div>
              <div style={{ fontSize: '12px', color: '#72767d' }}>
                O bot vai renomear o canal escolhido a cada 5 minutos com o
                total de membros.
              </div>
            </div>
          </div>

          {enabled && (
            <div
              style={{
                borderTop: '1px solid #1e2025',
                paddingTop: '20px',
                display: 'flex',
                flexDirection: 'column',
                gap: '16px',
              }}
            >
              {/* Canal */}
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: '#72767d',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Canal de Voz
                </label>
                <select
                  className="field-select"
                  value={channelId}
                  onChange={(e) => setChannelId(e.target.value)}
                >
                  <option value="">Selecione um canal de voz...</option>
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      🔊 {c.name}
                    </option>
                  ))}
                </select>
                {channels.length === 0 && (
                  <p
                    style={{
                      fontSize: '12px',
                      color: '#ED4245',
                      marginTop: '8px',
                    }}
                  >
                    Nenhum canal de voz encontrado. Crie um no Discord primeiro
                    (pode ser um canal vazio/travado).
                  </p>
                )}
              </div>

              {/* Template */}
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: '#72767d',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Texto do Canal
                </label>
                <input
                  type="text"
                  className="field-input"
                  value={template}
                  onChange={(e) => setTemplate(e.target.value)}
                  placeholder="Membros: {contmember}"
                  maxLength={100}
                />
                <p
                  style={{
                    fontSize: '11px',
                    color: '#72767d',
                    marginTop: '6px',
                  }}
                >
                  Use <code style={{ color: '#C100FF' }}>{'{contmember}'}</code>{' '}
                  onde o número de membros deve aparecer.
                </p>
              </div>

              {/* Preview */}
              <div>
                <label
                  style={{
                    fontSize: '11px',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.8px',
                    color: '#72767d',
                    display: 'block',
                    marginBottom: '8px',
                  }}
                >
                  Preview
                </label>
                <div
                  style={{
                    background: '#0e0f11',
                    border: '1px solid #1e2025',
                    borderRadius: '8px',
                    padding: '12px 16px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                  }}
                >
                  <span style={{ fontSize: '18px' }}>🔊</span>
                  <span
                    style={{
                      fontSize: '14px',
                      color: '#dbdee1',
                      fontFamily: 'monospace',
                    }}
                  >
                    {preview || 'Membros: 1.234'}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        <button type="submit" className="save-btn">
          Salvar alterações
        </button>
      </form>

      <style jsx>{`
        .field-input,
        .field-select {
          background: #0e0f11;
          border: 1px solid #1e2025;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 14px;
          color: #dbdee1;
          width: 100%;
          outline: none;
          box-sizing: border-box;
          transition: border-color 0.15s;
        }
        .field-input:focus,
        .field-select:focus {
          border-color: #c100ff;
        }
        .field-select {
          cursor: pointer;
          appearance: none;
        }
        .save-btn {
          background: #c100ff;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 12px 20px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          width: 100%;
          transition: background 0.15s;
        }
        .save-btn:hover {
          background: #8a2bff;
        }
      `}</style>
    </div>
  );
}
