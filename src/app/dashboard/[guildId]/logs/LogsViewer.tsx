'use client';

import { useState, useEffect } from 'react';

type LogEntry = {
  id: string;
  guildId: string;
  userId: string | null;
  action: string;
  details: string | null;
  createdAt: string;
};

export default function LogsViewer({ guildId, initialLogs }: { guildId: string; initialLogs: LogEntry[] }) {
  const [logs, setLogs] = useState<LogEntry[]>(initialLogs);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const perPage = 25;

  const actionLabels: Record<string, string> = {
    memberJoin: 'Membro Entrou',
    memberLeave: 'Membro Saiu',
    messageDelete: 'Mensagem Deletada',
    messageEdit: 'Mensagem Editada',
    voiceJoin: 'Entrou em Voz',
    voiceLeave: 'Saiu de Voz',
    voiceMove: 'Trocou de Canal de Voz',
    avatarUpdate: 'Avatar Alterado',
    usernameUpdate: 'Username Alterado',
    memberBan: 'Membro Banido',
    memberUnban: 'Membro Desbanido',
    memberKick: 'Membro Expulso',
    emojiCreate: 'Emoji Criado',
    emojiDelete: 'Emoji Removido',
    warn: 'Advertencia',
    timeout: 'Silenciado',
    untimeout: 'Silencio Removido',
    lock: 'Canal Trancado',
    unlock: 'Canal Destrancado',
    levelUp: 'Subiu de Nivel',
    command: 'Comando Usado',
  };

  const filteredLogs = logs.filter(log => {
    if (filter !== 'all' && log.action !== filter) return false;
    if (search) {
      const searchLower = search.toLowerCase();
      const details = log.details ? JSON.parse(log.details) : {};
      const searchable = `${log.action} ${log.userId || ''} ${JSON.stringify(details)}`.toLowerCase();
      if (!searchable.includes(searchLower)) return false;
    }
    return true;
  });

  const totalPages = Math.ceil(filteredLogs.length / perPage);
  const paginatedLogs = filteredLogs.slice((page - 1) * perPage, page * perPage);

  const uniqueActions = [...new Set(logs.map(l => l.action))];

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: '1000px', color: '#dbdee1' }}>
      <h2 style={{ color: '#f2f3f5', marginBottom: '24px' }}>Logs de Atividade</h2>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', flexWrap: 'wrap' }}>
        <select className="field-select" value={filter} onChange={e => { setFilter(e.target.value); setPage(1); }} style={{ width: '200px' }}>
          <option value="all">Todas as acoes</option>
          {uniqueActions.map(action => (
            <option key={action} value={action}>{actionLabels[action] || action}</option>
          ))}
        </select>
        <input className="field-input" placeholder="Buscar..." value={search} onChange={e => { setSearch(e.target.value); setPage(1); }} style={{ width: '250px' }} />
      </div>

      {/* Tabela */}
      <div style={{ background: '#16181c', border: '1px solid #1e2025', borderRadius: '12px', overflow: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid #1e2025' }}>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#72767d', width: '140px' }}>Data</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#72767d', width: '160px' }}>Acao</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#72767d', width: '140px' }}>Usuario</th>
              <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600, color: '#72767d' }}>Detalhes</th>
            </tr>
          </thead>
          <tbody>
            {paginatedLogs.length === 0 && (
              <tr>
                <td colSpan={4} style={{ padding: '24px', textAlign: 'center', color: '#72767d' }}>
                  Nenhum log encontrado com esses filtros.
                </td>
              </tr>
            )}
            {paginatedLogs.map(log => {
              const details = log.details ? JSON.parse(log.details) : {};
              const detailText = Object.entries(details)
                .map(([key, value]) => `${key}: ${value}`)
                .join(' | ');
              return (
                <tr key={log.id} style={{ borderBottom: '1px solid #1e2025' }}>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#72767d' }}>
                    {new Date(log.createdAt).toLocaleString('pt-BR')}
                  </td>
                  <td style={{ padding: '12px 16px' }}>
                    {actionLabels[log.action] || log.action}
                  </td>
                  <td style={{ padding: '12px 16px', fontFamily: 'DM Mono, monospace', fontSize: '12px' }}>
                    {log.userId || 'N/A'}
                  </td>
                  <td style={{ padding: '12px 16px', fontSize: '12px', color: '#a3a6aa' }}>
                    {detailText || '-'}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '16px', justifyContent: 'center', alignItems: 'center' }}>
          <button className="save-btn" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1} style={{ width: 'auto', padding: '8px 16px', opacity: page === 1 ? 0.5 : 1 }}>
            Anterior
          </button>
          <span style={{ color: '#72767d', fontSize: '13px' }}>Pagina {page} de {totalPages}</span>
          <button className="save-btn" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages} style={{ width: 'auto', padding: '8px 16px', opacity: page === totalPages ? 0.5 : 1 }}>
            Proximo
          </button>
        </div>
      )}

      <style jsx>{`
        .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #72767d; display: block; margin-bottom: 4px; }
        .field-input, .field-select { background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #dbdee1; outline: none; box-sizing: border-box; }
        .field-select { cursor: pointer; }
        .save-btn { background: #5865f2; color: white; border: none; border-radius: 8px; padding: 10px 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
        .save-btn:hover { background: #4752c4; }
        .save-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>
    </div>
  );
}