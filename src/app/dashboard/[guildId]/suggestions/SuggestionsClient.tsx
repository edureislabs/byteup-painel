'use client';
import { useEffect, useState } from 'react';

type Config = {
  enabled: boolean;
  channelId: string;
  anonymous: boolean;
  autoApprove: boolean;
  duration: string;
};

type Suggestion = {
  id: string;
  authorId: string;
  title: string;
  description: string;
  status: string;
  upvotes: number;
  downvotes: number;
  staffComment: string | null;
  expiresAt: string | null;
  createdAt: string;
  author: { username: string; avatar: string | null };
};

type Props = {
  guildId: string;
  config: Config;
  currentUserId: string;
  saveAction: (formData: FormData) => Promise<void>;
  updateAction: (
    suggestionId: string,
    status: string,
    userId: string,
    staffComment: string | null
  ) => Promise<void>;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  approved: 'Aprovada',
  denied: 'Negada',
  implemented: 'Implementada',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#FEE75C',
  approved: '#57F287',
  denied: '#ED4245',
  implemented: '#C100FF',
};

const DURATION_OPTIONS = [
  { value: '1h', label: '1 hora' },
  { value: '6h', label: '6 horas' },
  { value: '12h', label: '12 horas' },
  { value: '1d', label: '1 dia' },
  { value: '3d', label: '3 dias' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: 'never', label: 'Nunca expira' },
];

export default function SuggestionsClient({
  guildId,
  config,
  currentUserId,
  saveAction,
  updateAction,
}: Props) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [channelId, setChannelId] = useState(config.channelId);
  const [anonymous, setAnonymous] = useState(config.anonymous);
  const [autoApprove, setAutoApprove] = useState(config.autoApprove);
  const [duration, setDuration] = useState(config.duration || '7d');

  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'approved' | 'denied' | 'implemented'
  >('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/guilds/${guildId}/channels`)
      .then((r) => r.json())
      .then((data) => setChannels(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [guildId]);

  const loadSuggestions = () => {
    setLoading(true);
    fetch(`/api/guilds/${guildId}/suggestions?status=${filter}`)
      .then((r) => r.json())
      .then((data) => setSuggestions(Array.isArray(data) ? data : []))
      .catch(() => setSuggestions([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSuggestions();
  }, [filter]);

  const handleSaveConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set('enabled', enabled ? 'true' : 'false');
    formData.set('channelId', channelId);
    formData.set('anonymous', anonymous ? 'true' : 'false');
    formData.set('autoApprove', autoApprove ? 'true' : 'false');
    formData.set('duration', duration);
    saveAction(formData);
  };

  const handleUpdate = async (
    suggestionId: string,
    status: 'approved' | 'denied' | 'implemented'
  ) => {
    await updateAction(suggestionId, status, currentUserId, null);
    loadSuggestions();
  };

  return (
    <div
      style={{
        fontFamily: 'DM Sans, sans-serif',
        maxWidth: '1100px',
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
        Sistema de Sugestões
      </h2>
      <p
        style={{
          fontSize: '13px',
          color: '#72767d',
          margin: '0 0 28px 0',
          lineHeight: '1.5',
        }}
      >
        Configure o canal onde as sugestões chegam. Membros usam{' '}
        <code style={{ color: '#C100FF' }}>/sugerir</code> para enviar.
      </p>

      <form
        onSubmit={handleSaveConfig}
        style={{
          background: '#16181c',
          border: '1px solid #1e2025',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div
            style={{
              width: '40px',
              height: '24px',
              borderRadius: '12px',
              background: enabled ? '#C100FF' : '#2b2d31',
              cursor: 'pointer',
              position: 'relative',
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
              }}
            />
          </div>
          <div>
            <div style={{ fontSize: '14px', fontWeight: 500, color: '#dbdee1' }}>
              Ativar sistema de sugestões
            </div>
            <div style={{ fontSize: '12px', color: '#72767d' }}>
              Permite que membros usem /sugerir
            </div>
          </div>
        </div>

        {enabled && (
          <>
            <div>
              <label style={labelStyle}>Canal de Sugestões</label>
              <select
                value={channelId}
                onChange={(e) => setChannelId(e.target.value)}
                className="field-select"
              >
                <option value="">Selecione um canal...</option>
                {channels.map((c) => (
                  <option key={c.id} value={c.id}>
                    # {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={labelStyle}>Tempo de votação</label>
              <select
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                className="field-select"
              >
                {DURATION_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
              <p
                style={{
                  fontSize: '11px',
                  color: '#72767d',
                  marginTop: '6px',
                }}
              >
                Depois desse tempo, os botões de voto são removidos
                automaticamente.
              </p>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '24px',
                  borderRadius: '12px',
                  background: anonymous ? '#C100FF' : '#2b2d31',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
                onClick={() => setAnonymous(!anonymous)}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'white',
                    top: '3px',
                    left: anonymous ? '19px' : '3px',
                    transition: 'left 0.2s',
                  }}
                />
              </div>
              <div>
                <div
                  style={{ fontSize: '14px', fontWeight: 500, color: '#dbdee1' }}
                >
                  Modo anônimo
                </div>
                <div style={{ fontSize: '12px', color: '#72767d' }}>
                  Sugestões não mostram quem enviou
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div
                style={{
                  width: '40px',
                  height: '24px',
                  borderRadius: '12px',
                  background: autoApprove ? '#C100FF' : '#2b2d31',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
                onClick={() => setAutoApprove(!autoApprove)}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'white',
                    top: '3px',
                    left: autoApprove ? '19px' : '3px',
                    transition: 'left 0.2s',
                  }}
                />
              </div>
              <div>
                <div
                  style={{ fontSize: '14px', fontWeight: 500, color: '#dbdee1' }}
                >
                  Aprovar automaticamente
                </div>
                <div style={{ fontSize: '12px', color: '#72767d' }}>
                  Sugestões já entram como aprovadas (sem revisão)
                </div>
              </div>
            </div>
          </>
        )}

        <button type="submit" className="save-btn">
          Salvar configurações
        </button>
      </form>

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
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px',
            flexWrap: 'wrap',
            gap: '12px',
          }}
        >
          <h3
            style={{
              color: '#f2f3f5',
              fontSize: '16px',
              fontWeight: 600,
              margin: 0,
            }}
          >
            Sugestões Recebidas
          </h3>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(
              ['all', 'pending', 'approved', 'denied', 'implemented'] as const
            ).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? '#C100FF' : '#0e0f11',
                  border:
                    filter === f ? '1px solid #C100FF' : '1px solid #1e2025',
                  color: filter === f ? '#fff' : '#dbdee1',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                }}
              >
                {f === 'all'
                  ? 'Todas'
                  : f === 'pending'
                  ? 'Pendentes'
                  : f === 'approved'
                  ? 'Aprovadas'
                  : f === 'denied'
                  ? 'Negadas'
                  : 'Implementadas'}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div
            style={{ padding: '20px', textAlign: 'center', color: '#72767d' }}
          >
            Carregando...
          </div>
        ) : suggestions.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#72767d',
              fontSize: '13px',
            }}
          >
            Nenhuma sugestão encontrada.
          </div>
        ) : (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {suggestions.map((s) => {
              const statusColor = STATUS_COLORS[s.status] || '#72767d';
              const statusLabel = STATUS_LABELS[s.status] || s.status;

              const isExpired =
                s.expiresAt && new Date(s.expiresAt).getTime() < Date.now();

              return (
                <div
                  key={s.id}
                  style={{
                    background: '#0e0f11',
                    border: '1px solid #1e2025',
                    borderLeft: `3px solid ${statusColor}`,
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    opacity: isExpired ? 0.6 : 1,
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '10px',
                      }}
                    >
                      {s.author.avatar ? (
                        <img
                          src={s.author.avatar}
                          alt=""
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                          }}
                        />
                      ) : (
                        <div
                          style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: '#C100FF',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px',
                            fontWeight: 700,
                            color: '#fff',
                          }}
                        >
                          {s.author.username.charAt(0).toUpperCase()}
                        </div>
                      )}
                      <div>
                        <div style={{ fontSize: '13px', color: '#dbdee1' }}>
                          {s.author.username}
                        </div>
                        <div style={{ fontSize: '11px', color: '#72767d' }}>
                          {new Date(s.createdAt).toLocaleString('pt-BR')}
                        </div>
                      </div>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        gap: '6px',
                        alignItems: 'center',
                      }}
                    >
                      {isExpired && (
                        <span
                          style={{
                            fontSize: '11px',
                            color: '#72767d',
                            padding: '4px 8px',
                            background: '#72767d20',
                            border: '1px solid #72767d40',
                            borderRadius: '6px',
                          }}
                        >
                          Encerrada
                        </span>
                      )}
                      <span
                        style={{
                          fontSize: '12px',
                          color: statusColor,
                          fontWeight: 600,
                          padding: '4px 10px',
                          background: `${statusColor}15`,
                          border: `1px solid ${statusColor}40`,
                          borderRadius: '6px',
                        }}
                      >
                        {statusLabel}
                      </span>
                    </div>
                  </div>

                  <div>
                    <div
                      style={{
                        fontSize: '15px',
                        fontWeight: 600,
                        color: '#f2f3f5',
                        marginBottom: '6px',
                      }}
                    >
                      {s.title}
                    </div>
                    <div style={{ fontSize: '13px', color: '#a3a6aa' }}>
                      {s.description}
                    </div>
                  </div>

                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '8px',
                      borderTop: '1px solid #1e2025',
                      paddingTop: '10px',
                    }}
                  >
                    <div style={{ display: 'flex', gap: '16px' }}>
                      <span style={{ fontSize: '12px', color: '#57F287' }}>
                        {s.upvotes} a favor
                      </span>
                      <span style={{ fontSize: '12px', color: '#ED4245' }}>
                        {s.downvotes} contra
                      </span>
                      {s.expiresAt && (
                        <span style={{ fontSize: '12px', color: '#72767d' }}>
                          {isExpired
                            ? 'Encerrada'
                            : `Encerra ${new Date(
                                s.expiresAt
                              ).toLocaleString('pt-BR')}`}
                        </span>
                      )}
                    </div>

                    {s.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleUpdate(s.id, 'approved')}
                          style={actionBtnStyle('#57F287')}
                        >
                          Aprovar
                        </button>
                        <button
                          onClick={() => handleUpdate(s.id, 'denied')}
                          style={actionBtnStyle('#ED4245')}
                        >
                          Negar
                        </button>
                      </div>
                    )}

                    {s.status === 'approved' && (
                      <button
                        onClick={() => handleUpdate(s.id, 'implemented')}
                        style={actionBtnStyle('#C100FF')}
                      >
                        Marcar como implementada
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <style jsx>{`
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
          cursor: pointer;
          appearance: none;
        }
        .field-select:focus {
          border-color: #c100ff;
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

const labelStyle: React.CSSProperties = {
  fontSize: '11px',
  fontWeight: 600,
  textTransform: 'uppercase',
  letterSpacing: '0.8px',
  color: '#72767d',
  display: 'block',
  marginBottom: '8px',
};

function actionBtnStyle(color: string): React.CSSProperties {
  return {
    background: `${color}15`,
    border: `1px solid ${color}40`,
    color,
    borderRadius: '6px',
    padding: '6px 12px',
    fontSize: '12px',
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: 'DM Sans, sans-serif',
  };
}