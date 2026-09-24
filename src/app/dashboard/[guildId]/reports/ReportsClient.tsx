'use client';
import { useEffect, useState } from 'react';

type Config = {
  enabled: boolean;
  channelId: string;
  mentionStaff: boolean;
  staffRoleId: string;
};

type Report = {
  id: string;
  reporterId: string;
  targetId: string;
  reason: string;
  description: string | null;
  imageUrl: string | null;
  status: string;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
  reporter: { username: string; avatar: string | null };
  target: { username: string; avatar: string | null };
};

type Props = {
  guildId: string;
  config: Config;
  currentUserId: string;
  saveAction: (formData: FormData) => Promise<void>;
  resolveAction: (
    reportId: string,
    status: string,
    userId: string
  ) => Promise<void>;
};

const STATUS_LABELS: Record<string, string> = {
  pending: 'Pendente',
  resolved: 'Resolvido',
  ignored: 'Ignorado',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#ED4245',
  resolved: '#57F287',
  ignored: '#72767d',
};

export default function ReportsClient({
  guildId,
  config,
  currentUserId,
  saveAction,
  resolveAction,
}: Props) {
  const [enabled, setEnabled] = useState(config.enabled);
  const [channelId, setChannelId] = useState(config.channelId);
  const [mentionStaff, setMentionStaff] = useState(config.mentionStaff);
  const [staffRoleId, setStaffRoleId] = useState(config.staffRoleId);

  const [channels, setChannels] = useState<{ id: string; name: string }[]>([]);
  const [roles, setRoles] = useState<{ id: string; name: string }[]>([]);

  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState<
    'all' | 'pending' | 'resolved' | 'ignored'
  >('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/guilds/${guildId}/channels`)
      .then((r) => r.json())
      .then((data) => setChannels(Array.isArray(data) ? data : []))
      .catch(() => {});

    fetch(`/api/guilds/${guildId}/roles`)
      .then((r) => r.json())
      .then((data) => setRoles(Array.isArray(data) ? data : []))
      .catch(() => {});
  }, [guildId]);

  const loadReports = () => {
    setLoading(true);
    fetch(`/api/guilds/${guildId}/reports?status=${filter}`)
      .then((r) => r.json())
      .then((data) => setReports(Array.isArray(data) ? data : []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadReports();
  }, [filter]);

  const handleSaveConfig = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData();
    formData.set('enabled', enabled ? 'true' : 'false');
    formData.set('channelId', channelId);
    formData.set('mentionStaff', mentionStaff ? 'true' : 'false');
    formData.set('staffRoleId', staffRoleId);
    saveAction(formData);
  };

  const handleResolve = async (
    reportId: string,
    status: 'resolved' | 'ignored'
  ) => {
    await resolveAction(reportId, status, currentUserId);
    loadReports();
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
        Sistema de Report
      </h2>
      <p
        style={{
          fontSize: '13px',
          color: '#72767d',
          margin: '0 0 28px 0',
          lineHeight: '1.5',
        }}
      >
        Configure o canal onde os reports chegam. Membros usam{' '}
        <code style={{ color: '#C100FF' }}>/report @usuario</code> para
        reportar.
      </p>

      {/* Configuração */}
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
            <div
              style={{ fontSize: '14px', fontWeight: 500, color: '#dbdee1' }}
            >
              Ativar sistema de report
            </div>
            <div style={{ fontSize: '12px', color: '#72767d' }}>
              Permite que membros usem /report
            </div>
          </div>
        </div>

        {enabled && (
          <>
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
                Canal de Reports
              </label>
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

            <div
              style={{ display: 'flex', alignItems: 'center', gap: '12px' }}
            >
              <div
                style={{
                  width: '40px',
                  height: '24px',
                  borderRadius: '12px',
                  background: mentionStaff ? '#C100FF' : '#2b2d31',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.2s',
                }}
                onClick={() => setMentionStaff(!mentionStaff)}
              >
                <div
                  style={{
                    position: 'absolute',
                    width: '18px',
                    height: '18px',
                    borderRadius: '50%',
                    background: 'white',
                    top: '3px',
                    left: mentionStaff ? '19px' : '3px',
                    transition: 'left 0.2s',
                  }}
                />
              </div>
              <div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: 500,
                    color: '#dbdee1',
                  }}
                >
                  Mencionar cargo da staff
                </div>
                <div style={{ fontSize: '12px', color: '#72767d' }}>
                  Quando chega um report novo, marca o cargo abaixo
                </div>
              </div>
            </div>

            {mentionStaff && (
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
                  Cargo da Staff
                </label>
                <select
                  value={staffRoleId}
                  onChange={(e) => setStaffRoleId(e.target.value)}
                  className="field-select"
                >
                  <option value="">Nenhum</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      @{r.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </>
        )}

        <button type="submit" className="save-btn">
          Salvar configurações
        </button>
      </form>

      {/* Lista de Reports */}
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
            Reports Recebidos
          </h3>

          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {(['all', 'pending', 'resolved', 'ignored'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  background: filter === f ? '#C100FF' : '#0e0f11',
                  border:
                    filter === f
                      ? '1px solid #C100FF'
                      : '1px solid #1e2025',
                  color: filter === f ? '#fff' : '#dbdee1',
                  padding: '6px 12px',
                  borderRadius: '6px',
                  fontSize: '12px',
                  fontWeight: 500,
                  cursor: 'pointer',
                  textTransform: 'capitalize',
                }}
              >
                {f === 'all'
                  ? 'Todos'
                  : f === 'pending'
                  ? 'Pendentes'
                  : f === 'resolved'
                  ? 'Resolvidos'
                  : 'Ignorados'}
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
        ) : reports.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              color: '#72767d',
              fontSize: '13px',
            }}
          >
            Nenhum report encontrado.
          </div>
        ) : (
          <div
            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
          >
            {reports.map((r) => {
              const statusColor = STATUS_COLORS[r.status] || '#72767d';
              const statusLabel = STATUS_LABELS[r.status] || r.status;

              return (
                <div
                  key={r.id}
                  style={{
                    background: '#0e0f11',
                    border: '1px solid #1e2025',
                    borderLeft: `3px solid ${statusColor}`,
                    borderRadius: '8px',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                  }}
                >
                  {/* Header */}
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
                        gap: '20px',
                        flexWrap: 'wrap',
                      }}
                    >
                      {/* Reporter */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {r.reporter.avatar ? (
                          <img
                            src={r.reporter.avatar}
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
                              background: '#5865F2',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#fff',
                            }}
                          >
                            {r.reporter.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#72767d',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            Reportou
                          </div>
                          <div
                            style={{ fontSize: '13px', color: '#dbdee1' }}
                          >
                            {r.reporter.username}
                          </div>
                        </div>
                      </div>

                      <span style={{ color: '#72767d' }}>→</span>

                      {/* Target */}
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                        }}
                      >
                        {r.target.avatar ? (
                          <img
                            src={r.target.avatar}
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
                              background: '#ED4245',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '12px',
                              fontWeight: 700,
                              color: '#fff',
                            }}
                          >
                            {r.target.username.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div>
                          <div
                            style={{
                              fontSize: '11px',
                              color: '#72767d',
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                            }}
                          >
                            Reportado
                          </div>
                          <div
                            style={{ fontSize: '13px', color: '#dbdee1' }}
                          >
                            {r.target.username}
                          </div>
                        </div>
                      </div>
                    </div>

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

                  {/* Conteúdo */}
                  <div
                    style={{
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '6px',
                    }}
                  >
                    <div style={{ fontSize: '13px', color: '#f2f3f5' }}>
                      <strong>Motivo:</strong> {r.reason}
                    </div>
                    {r.description && (
                      <div style={{ fontSize: '13px', color: '#a3a6aa' }}>
                        {r.description}
                      </div>
                    )}
                    {r.imageUrl && (
                      <a
                        href={r.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          fontSize: '12px',
                          color: '#C100FF',
                          textDecoration: 'none',
                        }}
                      >
                        Ver imagem anexada
                      </a>
                    )}
                  </div>

                  {/* Footer */}
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
                    <span style={{ fontSize: '11px', color: '#72767d' }}>
                      {new Date(r.createdAt).toLocaleString('pt-BR')} • ID:{' '}
                      {r.id.slice(0, 8)}
                    </span>

                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          onClick={() => handleResolve(r.id, 'resolved')}
                          style={actionBtnStyle('#57F287')}
                        >
                          Resolver
                        </button>
                        <button
                          onClick={() => handleResolve(r.id, 'ignored')}
                          style={actionBtnStyle('#72767d')}
                        >
                          Ignorar
                        </button>
                      </div>
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