'use client';
import { useState, useRef } from 'react';

type Channel = { id: string; name: string };
type Role = { id: string; name: string };
type Currency = { id: string; name: string; symbol: string };

type Config = {
  birthdayEnabled: boolean;
  birthdayChannelId: string | null;
  birthdayMessage: string;
  birthdayRoleId: string | null;
  birthdayCurrencyId: string | null;
  birthdayRewardAmount: number;
  birthdayImageUrl: string | null;
};

type Props = {
  guildId: string;
  config: Config;
  channels: Channel[];
  roles: Role[];
  currencies: Currency[];
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

export default function BirthdayForm({ config, channels, roles, currencies, saveAction }: Props) {
  const [enabled, setEnabled] = useState(config.birthdayEnabled);
  const [message, setMessage] = useState(config.birthdayMessage || 'Feliz aniversario, {user}!');
  const [roleId, setRoleId] = useState(config.birthdayRoleId || '');
  const [currencyId, setCurrencyId] = useState(config.birthdayCurrencyId || '');
  const [rewardAmount, setRewardAmount] = useState(config.birthdayRewardAmount || 0);
  const [imageUrl, setImageUrl] = useState(config.birthdayImageUrl || '');
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(config.birthdayImageUrl || '');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(reader.result as string);
      reader.readAsDataURL(f);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    formData.set('birthdayEnabled', enabled ? 'true' : 'false');
    formData.set('birthdayMessage', message);
    formData.set('birthdayRoleId', roleId);
    formData.set('birthdayCurrencyId', currencyId);
    formData.set('birthdayRewardAmount', String(rewardAmount));

    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        formData.set('birthdayImageUrl', reader.result as string);
        await saveAction(formData);
      };
      reader.readAsDataURL(file);
    } else {
      formData.set('birthdayImageUrl', imageUrl);
      await saveAction(formData);
    }
  };

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: '700px', color: '#dbdee1' }}>
      <h2 style={{ color: '#f2f3f5', marginBottom: '24px' }}>Aniversários</h2>
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#dbdee1' }}>Ativar felicitações</span>
          <button type="button" style={toggleStyle(enabled)} onClick={() => setEnabled(!enabled)}>
            <div style={toggleThumbStyle(enabled)} />
          </button>
        </div>

        <div style={{ opacity: enabled ? 1 : 0.4, display: 'flex', flexDirection: 'column', gap: '20px', pointerEvents: enabled ? 'auto' : 'none' }}>
          <div>
            <label className="field-label">Canal de Aniversários</label>
            <select className="field-select" name="birthdayChannelId" defaultValue={config.birthdayChannelId || ''} disabled={!enabled}>
              <option value="">{enabled ? 'Selecione um canal' : 'Ative os aniversários primeiro'}</option>
              {channels.map(ch => (
                <option key={ch.id} value={ch.id}># {ch.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="field-label">Mensagem</label>
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <button type="button" onClick={() => insertMarkdown('**{}**', 'negrito')} style={btnStyle}>B</button>
              <button type="button" onClick={() => insertMarkdown('*{}*', 'italico')} style={{ ...btnStyle, fontStyle: 'italic' }}>I</button>
              <button type="button" onClick={() => insertMarkdown('__{}__', 'sublinhado')} style={{ ...btnStyle, textDecoration: 'underline' }}>U</button>
              <button type="button" onClick={() => insertMarkdown('~~{}~~', 'tachado')} style={{ ...btnStyle, textDecoration: 'line-through' }}>S</button>
              <button type="button" onClick={() => insertMarkdown('`{}`', 'codigo')} style={{ ...btnStyle, fontFamily: 'monospace' }}>&lt;/&gt;</button>
              <button type="button" onClick={() => insertMarkdown('||{}||', 'spoiler')} style={btnStyle}>||</button>
              <button type="button" onClick={() => insertMarkdown('[{}](url)', 'link')} style={btnStyle}>🔗</button>
              <button type="button" onClick={() => setMessage(message + '\n- item')} style={btnStyle}>• Lista</button>
              <button type="button" onClick={() => setMessage(message + '\n> citacao')} style={btnStyle}>❝</button>
            </div>
            <textarea
              ref={textareaRef}
              className="field-input"
              value={message}
              onChange={e => setMessage(e.target.value)}
              rows={4}
              style={{ resize: 'vertical', minHeight: '80px' }}
              disabled={!enabled}
            />
            <p style={{ fontSize: '11px', color: '#72767d', marginTop: '4px' }}>
              Use {'{user}'} para mencionar o aniversariante.
            </p>
          </div>

          <div>
            <label className="field-label">Imagem/GIF (opcional)</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input type="file" accept="image/*" onChange={handleFileChange} disabled={!enabled} />
              <span style={{ color: '#72767d' }}>ou</span>
              <input
                className="field-input"
                placeholder="URL da imagem"
                value={imageUrl}
                onChange={e => { setImageUrl(e.target.value); setPreview(e.target.value); setFile(null); }}
                disabled={!enabled}
              />
            </div>
            {preview && (
              <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', maxWidth: '300px' }}>
                <img src={preview} alt="Preview" style={{ width: '100%', display: 'block' }} />
              </div>
            )}
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <div style={{ flex: 1 }}>
              <label className="field-label">Cargo de Aniversariante (opcional)</label>
              <select className="field-select" value={roleId} onChange={e => setRoleId(e.target.value)} disabled={!enabled}>
                <option value="">Nenhum</option>
                {roles.map(r => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label className="field-label">Moeda de Presente (opcional)</label>
              <select className="field-select" value={currencyId} onChange={e => setCurrencyId(e.target.value)} disabled={!enabled}>
                <option value="">Nenhuma</option>
                {currencies.map(c => (
                  <option key={c.id} value={c.id}>{c.name} ({c.symbol})</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 0.5 }}>
              <label className="field-label">Quantidade</label>
              <input
                className="field-input"
                type="number"
                value={rewardAmount}
                onChange={e => setRewardAmount(Number(e.target.value))}
                disabled={!enabled}
              />
            </div>
          </div>
        </div>

        <button type="submit" className="save-btn" disabled={!enabled}>Salvar alterações</button>
      </form>

      {/* Preview do Embed */}
      <div style={{ marginTop: '32px' }}>
        <label className="field-label" style={{ marginBottom: '12px' }}>Preview da Mensagem</label>
        <div style={{ background: '#1e2025', borderRadius: '8px', padding: '16px', borderLeft: '4px solid #5865f2' }}>
          <div style={{ color: '#dbdee1', margin: '8px 0' }}
            dangerouslySetInnerHTML={{
              __html: renderMarkdown(message.replace('{user}', '@Aniversariante'))
            }}
          />
          {preview && <img src={preview} alt="Preview" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '8px' }} />}
          <div style={{ fontSize: '11px', color: '#72767d', marginTop: '8px' }}>
            {roleId ? `Cargo: ${roles.find(r => r.id === roleId)?.name || roleId}` : 'Sem cargo'}
            {currencyId ? ` | ${currencies.find(c => c.id === currencyId)?.symbol || '?'} ${rewardAmount}` : ''}
          </div>
        </div>
      </div>

      <style jsx>{`
        .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #72767d; display: block; margin-bottom: 4px; }
        .field-input, .field-select { background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #dbdee1; width: 100%; outline: none; box-sizing: border-box; }
        .field-select:disabled { opacity: 0.35; cursor: not-allowed; }
        .save-btn { background: #5865f2; color: white; border: none; border-radius: 8px; padding: 11px 16px; font-size: 14px; font-weight: 600; cursor: pointer; width: 100%; transition: background 0.15s; }
        .save-btn:hover { background: #4752c4; }
        .save-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

const toggleStyle = (enabled: boolean): React.CSSProperties => ({
  width: '44px', height: '24px', borderRadius: '12px',
  background: enabled ? '#5865f2' : '#2b2d31',
  border: 'none', cursor: 'pointer', position: 'relative', padding: 0,
});

const toggleThumbStyle = (enabled: boolean): React.CSSProperties => ({
  position: 'absolute', width: '18px', height: '18px',
  borderRadius: '50%', background: 'white', top: '3px',
  left: enabled ? '23px' : '3px', transition: 'left 0.2s',
});

const btnStyle: React.CSSProperties = {
  background: '#2b2d31', color: '#dbdee1', border: 'none',
  borderRadius: '4px', padding: '4px 10px', fontSize: '13px',
  fontWeight: 600, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif',
};