'use client';
import { useState, useRef } from 'react';

type Config = {
  hugEnabled: boolean;
  hugMessage: string;
  hugImageUrl: string;
  hugTitle: string;
  hugColor: string;
  hugThumbnail: string;
  hugFooter: string;
  hugTimestamp: boolean;
};

type Props = {
  guildId: string;
  config: Config;
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

export default function HugForm({ config, saveAction }: Props) {
  const [enabled, setEnabled] = useState(config.hugEnabled ?? true);
  const [title, setTitle] = useState(config.hugTitle || 'Abraco');
  const [color, setColor] = useState(config.hugColor || '#F472B6');
  const [message, setMessage] = useState(config.hugMessage || '{user} deu um abraco em {target}');
  const [imageUrl, setImageUrl] = useState(config.hugImageUrl || 'https://usagif.com/wp-content/uploads/gif/anime-hug-38.gif');
  const [thumbnail, setThumbnail] = useState(config.hugThumbnail || '');
  const [footer, setFooter] = useState(config.hugFooter || '');
  const [timestamp, setTimestamp] = useState(config.hugTimestamp ?? true);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState(config.hugImageUrl || 'https://usagif.com/wp-content/uploads/gif/anime-hug-38.gif');
  const [thumbnailFile, setThumbnailFile] = useState<File | null>(null);
  const [thumbnailPreview, setThumbnailPreview] = useState(config.hugThumbnail || '');
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

  const handleThumbnailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setThumbnailFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setThumbnailPreview(reader.result as string);
      reader.readAsDataURL(f);
    }
  };

  const handleSubmit = async (formData: FormData) => {
    formData.set('hugEnabled', enabled ? 'true' : 'false');
    formData.set('hugTitle', title);
    formData.set('hugColor', color);
    formData.set('hugMessage', message);
    formData.set('hugTimestamp', timestamp ? 'true' : 'false');
    formData.set('hugFooter', footer);
    formData.set('hugThumbnail', thumbnailPreview);
    if (file) {
      const reader = new FileReader();
      reader.onload = async () => {
        formData.set('hugImageUrl', reader.result as string);
        await saveAction(formData);
      };
      reader.readAsDataURL(file);
    } else {
      formData.set('hugImageUrl', imageUrl);
      await saveAction(formData);
    }
  };

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: '700px', color: '#dbdee1' }}>
      <h2 style={{ color: '#f2f3f5', marginBottom: '24px' }}>Configuracao do Abraco</h2>
      <form action={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#dbdee1' }}>Ativar comando de abraco</span>
          <button type="button" style={{ width: '44px', height: '24px', borderRadius: '12px', background: enabled ? '#5865f2' : '#2b2d31', border: 'none', cursor: 'pointer', position: 'relative', padding: 0 }} onClick={() => setEnabled(!enabled)}>
            <div style={{ position: 'absolute', width: '18px', height: '18px', borderRadius: '50%', background: 'white', top: '3px', left: enabled ? '23px' : '3px', transition: 'left 0.2s' }} />
          </button>
        </div>

        <div style={{ opacity: enabled ? 1 : 0.4, display: 'flex', flexDirection: 'column', gap: '20px', pointerEvents: enabled ? 'auto' : 'none' }}>
          <div>
            <label className="field-label">Titulo do Embed</label>
            <input className="field-input" value={title} onChange={e => setTitle(e.target.value)} />
          </div>

          <div>
            <label className="field-label">Cor do Embed</label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input className="field-input" type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: '60px', height: '40px', padding: '4px' }} />
              <input className="field-input" value={color} onChange={e => setColor(e.target.value)} />
            </div>
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
            />
            <p style={{ fontSize: '11px', color: '#72767d', marginTop: '4px' }}>
              Use {'{user}'} para quem abraca e {'{target}'} para quem recebe.
            </p>
          </div>

          <div>
            <label className="field-label">Imagem/GIF do Abraco</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
              <input type="file" accept="image/*" onChange={handleFileChange} />
              <span style={{ color: '#72767d' }}>ou</span>
              <input className="field-input" placeholder="URL da imagem" value={imageUrl} onChange={e => { setImageUrl(e.target.value); setPreview(e.target.value); setFile(null); }} />
            </div>
            {preview && (
              <div style={{ marginTop: '12px', borderRadius: '8px', overflow: 'hidden', maxWidth: '300px' }}>
                <img src={preview} alt="Preview" style={{ width: '100%', display: 'block' }} />
              </div>
            )}
          </div>

          <div>
            <label className="field-label">Thumbnail (icone pequeno)</label>
            <div style={{ display: 'flex', gap: '8px', marginTop: '8px', alignItems: 'center' }}>
              <input type="file" accept="image/*" onChange={handleThumbnailChange} />
              <span style={{ color: '#72767d' }}>ou</span>
              <input className="field-input" placeholder="URL do thumbnail" value={thumbnail} onChange={e => { setThumbnail(e.target.value); setThumbnailPreview(e.target.value); setThumbnailFile(null); }} />
            </div>
            {thumbnailPreview && (
              <div style={{ marginTop: '12px', borderRadius: '50%', overflow: 'hidden', width: '60px', height: '60px' }}>
                <img src={thumbnailPreview} alt="Thumb" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              </div>
            )}
          </div>

          <div>
            <label className="field-label">Rodape (footer)</label>
            <input className="field-input" value={footer} onChange={e => setFooter(e.target.value)} />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input type="checkbox" checked={timestamp} onChange={e => setTimestamp(e.target.checked)} />
            <span>Mostrar data/hora</span>
          </div>
        </div>

        <button type="submit" className="save-btn" disabled={!enabled}>Salvar alteracoes</button>
      </form>

      {/* Preview */}
      <div style={{ marginTop: '32px' }}>
        <label className="field-label" style={{ marginBottom: '12px' }}>Preview do Embed</label>
        <div style={{ background: '#1e2025', borderRadius: '8px', padding: '16px', borderLeft: `4px solid ${color}` }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
            {thumbnailPreview && <img src={thumbnailPreview} alt="Thumb" style={{ width: '24px', height: '24px', borderRadius: '50%' }} />}
            <strong style={{ color: '#f2f3f5' }}>{title}</strong>
          </div>
          <div style={{ color: '#dbdee1', margin: '8px 0' }} dangerouslySetInnerHTML={{ __html: renderMarkdown(message.replace('{user}', '@Voce').replace('{target}', '@Amigo')) }} />
          {preview && <img src={preview} alt="Preview" style={{ maxWidth: '100%', borderRadius: '8px', marginTop: '8px' }} />}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px', fontSize: '11px', color: '#72767d' }}>
            <span>{footer}</span>
            {timestamp && <span>{new Date().toLocaleString('pt-BR')}</span>}
          </div>
        </div>
      </div>

      <style jsx>{`
        .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #72767d; display: block; margin-bottom: 4px; }
        .field-input { background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #dbdee1; width: 100%; outline: none; box-sizing: border-box; }
        .save-btn { background: #5865f2; color: white; border: none; border-radius: 8px; padding: 11px 16px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; }
        .save-btn:hover { background: #4752c4; }
        .save-btn:disabled { opacity: 0.35; cursor: not-allowed; }
      `}</style>
    </div>
  );
}

const btnStyle: React.CSSProperties = {
  background: '#2b2d31',
  color: '#dbdee1',
  border: 'none',
  borderRadius: '4px',
  padding: '4px 10px',
  fontSize: '13px',
  fontWeight: 600,
  cursor: 'pointer',
  fontFamily: 'DM Sans, sans-serif',
};