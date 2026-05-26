'use client';
import { useState, useRef } from 'react';

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

function renderMarkdown(text: string) {
  let html = text
    .replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>')
    .replace(/__\*\*(.*?)\*\*__/g, '<strong><u>$1</u></strong>')
    .replace(/__\*(.*?)\*__/g, '<em><u>$1</u></em>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/__(.*?)__/g, '<u>$1</u>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/~~(.*?)~~/g, '<del>$1</del>')
    .replace(/\|\|(.*?)\|\|/g, '<span style="background:#333;border-radius:4px;padding:0 4px;cursor:pointer;">$1</span>')
    .replace(/`(.*?)`/g, '<code style="background:#2b2d31;padding:2px 6px;border-radius:4px;font-family:monospace;">$1</code>')
    .replace(/\n/g, '<br/>');
  return html;
}

export default function CommandsForm({ config, channels, saveAction }: Props) {
  const [blockedChannels, setBlockedChannels] = useState<string[]>(
    JSON.parse(config.blockedCommandChannels || '[]')
  );
  const [notify, setNotify] = useState(config.blockedCommandNotify);
  const [message, setMessage] = useState(config.blockedCommandMessage);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const addChannel = (chId: string) => {
    if (!blockedChannels.includes(chId)) {
      setBlockedChannels([...blockedChannels, chId]);
    }
  };

  const removeChannel = (chId: string) => {
    setBlockedChannels(blockedChannels.filter(id => id !== chId));
  };

  const insertMarkdown = (syntax: string, placeholder: string = 'texto') => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = message.substring(start, end) || placeholder;
    const before = message.substring(0, start);
    const after = message.substring(end);
    const newText = before + syntax.replace('{}', selected) + after;
    setMessage(newText);
    setTimeout(() => {
      textarea.focus();
      const newCursor = start + syntax.indexOf('{}');
      textarea.setSelectionRange(newCursor, newCursor + selected.length);
    }, 0);
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
    <div style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: '680px', color: '#dbdee1' }}>
      <h2 style={{ color: '#f2f3f5', fontSize: '20px', fontWeight: 600, marginBottom: '8px' }}>
        Canais Bloqueados para Comandos
      </h2>
      <p style={{ fontSize: '13px', color: '#72767d', margin: '0 0 28px 0', lineHeight: '1.5' }}>
        Nestes canais os comandos serao ignorados, como se o bot nao estivesse presente.
        O sistema de XP continua funcionando normalmente.
      </p>

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
        {/* Lista de canais bloqueados */}
        <div style={{
          background: '#16181c',
          border: '1px solid #1e2025',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <label style={{
            fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
            letterSpacing: '0.8px', color: '#72767d',
            display: 'block', marginBottom: '12px',
          }}>
            Canais Bloqueados
          </label>

          {blockedChannels.length > 0 ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '16px' }}>
              {blockedChannels.map(chId => (
                <span key={chId} style={{
                  background: 'rgba(237, 66, 69, 0.08)',
                  border: '1px solid rgba(237, 66, 69, 0.15)',
                  padding: '7px 12px',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  fontSize: '13px',
                  color: '#dbdee1',
                  transition: 'all 0.15s',
                }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ed4245" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10H3M21 6H3M21 14H3M21 18H3"/>
                  </svg>
                  <span style={{ color: '#a3a6aa' }}>#</span>
                  {channels.find(c => c.id === chId)?.name || chId}
                  <button
                    type="button"
                    onClick={() => removeChannel(chId)}
                    style={{
                      background: 'none', border: 'none', color: '#72767d',
                      cursor: 'pointer', fontSize: '14px', fontWeight: 600,
                      padding: '0 0 0 4px', lineHeight: 1,
                      transition: 'color 0.15s',
                    }}
                    onMouseEnter={e => e.currentTarget.style.color = '#ed4245'}
                    onMouseLeave={e => e.currentTarget.style.color = '#72767d'}
                  >
                    X
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <div style={{
              textAlign: 'center', padding: '16px',
              color: '#72767d', fontSize: '13px',
              background: 'rgba(255,255,255,0.01)',
              borderRadius: '8px',
              marginBottom: '16px',
            }}>
              Nenhum canal bloqueado. Todos os canais aceitam comandos.
            </div>
          )}

          <div style={{ position: 'relative' }}>
            <select
              className="field-select"
              value=""
              onChange={e => { if (e.target.value) addChannel(e.target.value); }}
              style={{ paddingRight: '40px' }}
            >
              <option value="">Adicionar canal...</option>
              {channels.filter(c => !blockedChannels.includes(c.id)).map(c => (
                <option key={c.id} value={c.id}># {c.name}</option>
              ))}
            </select>
            <svg style={{
              position: 'absolute', right: '14px', top: '50%', transform: 'translateY(-50%)',
              pointerEvents: 'none',
            }} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#72767d" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14"/>
            </svg>
          </div>
        </div>

        {/* Notificação */}
        <div style={{
          background: '#16181c',
          border: '1px solid #1e2025',
          borderRadius: '12px',
          padding: '20px',
        }}>
          <div style={{
            display: 'flex', alignItems: 'flex-start', gap: '12px',
            marginBottom: notify ? '16px' : '0',
          }}>
            <div style={{
  width: '40px', height: '24px', borderRadius: '12px',
  background: notify ? '#C100FF' : '#2b2d31',
  border: 'none', cursor: 'pointer', position: 'relative',
  flexShrink: 0, marginTop: '2px',
  transition: 'background 0.2s',
}}
  onClick={() => setNotify(!notify)}
>
              <div style={{
                position: 'absolute', width: '18px', height: '18px',
                borderRadius: '50%', background: 'white', top: '3px',
                left: notify ? '19px' : '3px', transition: 'left 0.2s',
                boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
              }} />
            </div>
            <div>
              <div style={{ fontSize: '14px', fontWeight: 500, color: '#dbdee1', marginBottom: '3px' }}>
                Enviar mensagem ao usuario
              </div>
              <div style={{ fontSize: '12px', color: '#72767d' }}>
                Quando alguem tentar usar um comando em um canal bloqueado, o bot enviara uma mensagem de aviso.
              </div>
            </div>
          </div>

          {notify && (
            <div style={{
              borderTop: '1px solid #1e2025',
              paddingTop: '16px',
              display: 'flex', flexDirection: 'column', gap: '12px',
            }}>
              <label style={{
                fontSize: '11px', fontWeight: 600, textTransform: 'uppercase',
                letterSpacing: '0.8px', color: '#72767d',
              }}>
                Mensagem de Aviso
              </label>

              {/* Barra de formatação */}
              <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                <button type="button" onClick={() => insertMarkdown('**{}**', 'negrito')} style={btnStyle}>B</button>
                <button type="button" onClick={() => insertMarkdown('*{}*', 'italico')} style={{ ...btnStyle, fontStyle: 'italic' }}>I</button>
                <button type="button" onClick={() => insertMarkdown('__{}__', 'sublinhado')} style={{ ...btnStyle, textDecoration: 'underline' }}>U</button>
                <button type="button" onClick={() => insertMarkdown('~~{}~~', 'tachado')} style={{ ...btnStyle, textDecoration: 'line-through' }}>S</button>
                <button type="button" onClick={() => insertMarkdown('`{}`', 'codigo')} style={{ ...btnStyle, fontFamily: 'monospace' }}>&lt;/&gt;</button>
                <button type="button" onClick={() => insertMarkdown('||{}||', 'spoiler')} style={btnStyle}>||</button>
              </div>

              <textarea
                ref={textareaRef}
                className="field-input"
                value={message}
                onChange={e => setMessage(e.target.value)}
                rows={3}
                style={{ resize: 'vertical', minHeight: '60px' }}
              />

              {/* Preview do embed */}
              <div style={{
  background: '#1e2025',
  borderRadius: '8px',
  padding: '12px 16px',
  borderLeft: '4px solid #C100FF',
  fontSize: '13px',
  lineHeight: '1.5',
}}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                  <img src="/byteup-avatar.png" alt="" style={{ width: '20px', height: '20px', borderRadius: '50%' }} />
                  <span style={{ fontWeight: 600, color: '#f2f3f5', fontSize: '12px' }}>ByteUP BOT</span>
                  <span style={{ color: '#72767d', fontSize: '10px' }}>hoje</span>
                </div>
                <div
                  style={{ color: '#dbdee1' }}
                  dangerouslySetInnerHTML={{ __html: renderMarkdown(message) }}
                />
              </div>
            </div>
          )}
        </div>

        <button type="submit" className="save-btn">Salvar alteracoes</button>
      </form>

      <style jsx>{`
  .field-input, .field-select {
    background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px;
    padding: 10px 14px; font-size: 14px; color: #dbdee1;
    width: 100%; outline: none; box-sizing: border-box;
    transition: border-color 0.15s;
  }
  .field-input:focus, .field-select:focus { border-color: #C100FF; }
  .field-select { cursor: pointer; appearance: none; }
  .save-btn {
    background: #C100FF; color: white; border: none; border-radius: 8px;
    padding: 12px 20px; font-size: 14px; font-weight: 600; cursor: pointer;
    width: 100%; transition: background 0.15s;
  }
  .save-btn:hover { background: #8A2BFF; }
`}</style>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: '#2b2d31', color: '#dbdee1', border: 'none',
  borderRadius: '4px', padding: '4px 10px', fontSize: '13px',
  fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
};