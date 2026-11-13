'use client';

import { use, useEffect, useState } from 'react';
import { CATEGORIES, MAX_TAGS, normalizeTags, guildIconUrl } from '@/lib/listingshared';

type Listing = {
  enabled: boolean;
  shortDescription: string | null;
  description: string | null;
  tags: string[];
  category: string;
  language: string;
  nsfw: boolean;
  inviteChannelId: string | null;
  inviteCode: string | null;
  bumpChannelId: string | null;
  bumpedAt: string | null;
  bumpCount: number;
  hidden: boolean;
  hiddenReason: string | null;
};

type GuildInfo = {
  name: string;
  icon: string | null;
  memberCount: number;
  onlineCount: number;
  adultByDiscord: boolean;
} | null;

type Channel = { id: string; name: string };

const card: React.CSSProperties = {
  background: '#16181c',
  border: '1px solid #1e2025',
  borderRadius: '12px',
  padding: '20px',
  marginBottom: '24px',
};

const small: React.CSSProperties = { fontSize: '12px', color: '#b5bac1', marginBottom: '6px', display: 'block' };

export default function DivulgacaoPage({ params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = use(params);

  const [listing, setListing] = useState<Listing | null>(null);
  const [guild, setGuild] = useState<GuildInfo>(null);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch(`/api/guilds/${guildId}/listing`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => {
        if (d.listing) setListing(d.listing);
        setGuild(d.guild ?? null);
      })
      .catch(() => setMessage('Erro ao carregar a divulgação.'));

    fetch(`/api/guilds/${guildId}/channels`, { cache: 'no-store' })
      .then((r) => r.json())
      .then((d) => Array.isArray(d) && setChannels(d))
      .catch(() => {});
  }, [guildId]);

  if (!listing) {
    return <p style={{ color: '#72767d' }}>Carregando...</p>;
  }

  const set = <K extends keyof Listing>(field: K, value: Listing[K]) =>
    setListing({ ...listing, [field]: value });

  const addTags = (text: string) => {
    const merged = normalizeTags([...listing.tags, ...text.split(/[\s,]+/)]);
    set('tags', merged);
    setTagInput('');
  };

  const removeTag = (tag: string) => set('tags', listing.tags.filter((t) => t !== tag));

  const save = async () => {
    setSaving(true);
    setMessage('');
    // Junta o que ficou digitado no campo de hashtag e não virou "chip"
    const tags = tagInput.trim() ? normalizeTags([...listing.tags, ...tagInput.split(/[\s,]+/)]) : listing.tags;
    const res = await fetch(`/api/guilds/${guildId}/listing`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...listing, tags }),
    });
    const data = await res.json().catch(() => ({}));
    setSaving(false);
    if (!res.ok) return setMessage(data.error || 'Erro ao salvar.');
    setListing(data.listing);
    setTagInput('');
    setMessage(data.listing.enabled ? 'Salvo! Seu servidor já aparece na lista.' : 'Salvo. A divulgação está desativada.');
  };

  const adultLocked = guild?.adultByDiscord === true;
  const nsfw = listing.nsfw || adultLocked;
  const icon = guildIconUrl(guildId, guild?.icon ?? null, 128);
  const category = CATEGORIES.find((c) => c.value === listing.category);
  const publicUrl = `/servidores/${guildId}`;

  return (
    <div style={{ fontFamily: 'DM Sans, sans-serif', maxWidth: '900px', color: '#dbdee1' }}>
      <h2 style={{ color: '#f2f3f5', marginBottom: '8px' }}>Divulgação</h2>
      <p style={{ color: '#949ba4', fontSize: '14px', marginTop: 0, marginBottom: '24px' }}>
        Coloque seu servidor na lista pública{' '}
        <a href="/servidores" target="_blank" style={{ color: '#C100FF' }}>Descobrir servidores</a>. Membros usam{' '}
        <code>/bump</code> a cada 2 horas para subir o servidor para o topo.
      </p>

      {listing.hidden && (
        <div style={{ ...card, borderColor: '#ED424560', background: '#2a1517' }}>
          <strong style={{ color: '#ED4245' }}>Seu servidor foi ocultado da lista pela moderação.</strong>
          {listing.hiddenReason && <p style={{ margin: '6px 0 0', fontSize: '13px' }}>Motivo: {listing.hiddenReason}</p>}
        </div>
      )}

      {/* Ativar + status */}
      <div style={card}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
          <label className="check" style={{ marginBottom: 0 }}>
            <input type="checkbox" checked={listing.enabled} onChange={(e) => set('enabled', e.target.checked)} />
            <span style={{ fontSize: '15px', color: '#f2f3f5', fontWeight: 600 }}>Mostrar meu servidor na lista pública</span>
          </label>
          {listing.enabled && listing.inviteCode && !listing.hidden && (
            <a href={publicUrl} target="_blank" className="ghost-btn">Ver página pública ↗</a>
          )}
        </div>
        <div style={{ display: 'flex', gap: '24px', marginTop: '16px', fontSize: '13px', color: '#b5bac1', flexWrap: 'wrap' }}>
          <span>🚀 Bumps: <strong style={{ color: '#f2f3f5' }}>{listing.bumpCount}</strong></span>
          <span>
            ⏱️ Último bump:{' '}
            <strong style={{ color: '#f2f3f5' }}>
              {listing.bumpedAt ? new Date(listing.bumpedAt).toLocaleString('pt-BR') : 'nunca'}
            </strong>
          </span>
          <span>🔗 Convite: <strong style={{ color: '#f2f3f5' }}>{listing.inviteCode ? `discord.gg/${listing.inviteCode}` : 'ainda não criado'}</strong></span>
        </div>
      </div>

      {/* Textos */}
      <div style={card}>
        <label className="field-label" style={{ marginBottom: '16px' }}>Apresentação</label>

        <span style={small}>Descrição curta (aparece no cartão da lista)</span>
        <input
          className="field-input"
          maxLength={160}
          placeholder="Ex.: Comunidade de jogos com eventos toda semana e sorteios"
          value={listing.shortDescription ?? ''}
          onChange={(e) => set('shortDescription', e.target.value)}
        />
        <p className="hint" style={{ textAlign: 'right' }}>{(listing.shortDescription ?? '').length}/160</p>

        <span style={{ ...small, marginTop: '8px' }}>Descrição completa (aparece na página do servidor)</span>
        <textarea
          className="field-input"
          rows={7}
          maxLength={2000}
          placeholder="Conte o que tem no servidor, regras principais, eventos..."
          value={listing.description ?? ''}
          onChange={(e) => set('description', e.target.value)}
          style={{ resize: 'vertical', lineHeight: 1.5 }}
        />
        <p className="hint" style={{ textAlign: 'right' }}>{(listing.description ?? '').length}/2000</p>

        <span style={{ ...small, marginTop: '8px' }}>Hashtags (até {MAX_TAGS}; aperte Enter ou vírgula para adicionar)</span>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', alignItems: 'center' }}>
          {listing.tags.map((t) => (
            <span key={t} className="tag">
              #{t}
              <button onClick={() => removeTag(t)} aria-label={`Remover ${t}`}>×</button>
            </span>
          ))}
          {listing.tags.length < MAX_TAGS && (
            <input
              className="field-input"
              style={{ width: '200px' }}
              placeholder="#jogos"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ',') {
                  e.preventDefault();
                  addTags(tagInput);
                }
              }}
              onBlur={() => tagInput.trim() && addTags(tagInput)}
            />
          )}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginTop: '16px' }}>
          <div>
            <span style={small}>Categoria</span>
            <select className="field-select" value={listing.category} onChange={(e) => set('category', e.target.value)}>
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>{c.emoji} {c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <span style={small}>Idioma principal</span>
            <select className="field-select" value={listing.language} onChange={(e) => set('language', e.target.value)}>
              <option value="pt-BR">Português</option>
              <option value="en">Inglês</option>
              <option value="es">Espanhol</option>
              <option value="outro">Outro</option>
            </select>
          </div>
        </div>

        <div style={{ marginTop: '16px', padding: '12px 14px', background: '#0e0f11', border: '1px solid #1e2025', borderRadius: '8px' }}>
          <label className="check" style={{ marginBottom: '4px' }}>
            <input type="checkbox" checked={nsfw} disabled={adultLocked} onChange={(e) => set('nsfw', e.target.checked)} />
            <span style={{ color: '#f2f3f5', fontWeight: 600 }}>🔞 Servidor +18</span>
          </label>
          <p className="hint" style={{ margin: 0 }}>
            {adultLocked
              ? 'Seu servidor está marcado como +18 nas configurações do Discord, então ele aparece como +18 automaticamente.'
              : 'Marque se o servidor tem conteúdo adulto. Ele só aparece para quem estiver logado e confirmar que tem 18 anos. Servidor +18 sem essa marcação pode ser removido.'}
          </p>
        </div>
      </div>

      {/* Canais */}
      <div style={card}>
        <label className="field-label" style={{ marginBottom: '16px' }}>Convite e avisos</label>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px' }}>
          <div>
            <span style={small}>Canal do convite (onde a pessoa chega)</span>
            <select className="field-select" value={listing.inviteChannelId ?? ''} onChange={(e) => set('inviteChannelId', e.target.value || null)}>
              <option value="">Escolha um canal</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>
            <p className="hint">O bot cria um convite permanente nesse canal. Ele precisa da permissão “Criar convite”.</p>
          </div>
          <div>
            <span style={small}>Canal do aviso “bump liberado”</span>
            <select className="field-select" value={listing.bumpChannelId ?? ''} onChange={(e) => set('bumpChannelId', e.target.value || null)}>
              <option value="">Onde usaram o /bump por último</option>
              {channels.map((c) => (
                <option key={c.id} value={c.id}>#{c.name}</option>
              ))}
            </select>
            <p className="hint">Depois de 2 horas o bot avisa que já dá para usar /bump de novo.</p>
          </div>
        </div>
      </div>

      {/* Prévia */}
      <div style={card}>
        <label className="field-label" style={{ marginBottom: '16px' }}>Prévia do cartão</label>
        <div style={{ maxWidth: '360px', background: '#111014', border: '1px solid rgba(255,255,255,0.09)', borderRadius: '16px', padding: '18px' }}>
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            {icon ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={icon} alt="" width={52} height={52} style={{ borderRadius: '14px' }} />
            ) : (
              <div style={{ width: 52, height: 52, borderRadius: '14px', background: '#2b2d31', display: 'grid', placeItems: 'center', fontWeight: 700 }}>
                {guild?.name?.charAt(0) ?? '?'}
              </div>
            )}
            <div style={{ minWidth: 0 }}>
              <div style={{ fontWeight: 700, color: '#f4f1f6', display: 'flex', gap: '6px', alignItems: 'center' }}>
                <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{guild?.name ?? 'Seu servidor'}</span>
                {nsfw && <span style={{ fontSize: '10px', background: '#ED4245', color: 'white', padding: '1px 6px', borderRadius: '999px' }}>+18</span>}
              </div>
              <div style={{ fontSize: '12px', color: '#7d7588' }}>
                {category?.emoji} {category?.label} • 👥 {(guild?.memberCount ?? 0).toLocaleString('pt-BR')} • 🟢 {(guild?.onlineCount ?? 0).toLocaleString('pt-BR')}
              </div>
            </div>
          </div>
          <p style={{ fontSize: '13px', color: '#aaa3b5', margin: '12px 0', lineHeight: 1.5 }}>
            {listing.shortDescription || 'Sua descrição curta aparece aqui.'}
          </p>
          <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
            {listing.tags.map((t) => (
              <span key={t} style={{ fontSize: '11px', color: '#d9b4ff', background: 'rgba(182,76,255,0.12)', padding: '2px 8px', borderRadius: '999px' }}>#{t}</span>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '40px' }}>
        <button className="save-btn" onClick={save} disabled={saving}>
          {saving ? 'Salvando...' : 'Salvar divulgação'}
        </button>
        {message && <span className="msg">{message}</span>}
      </div>

      <style jsx>{`
        .field-input, .field-select { width: 100%; background: #0e0f11; border: 1px solid #1e2025; border-radius: 8px; padding: 10px 14px; font-size: 14px; color: #dbdee1; outline: none; box-sizing: border-box; font-family: inherit; }
        .field-input::placeholder { color: #4e5058; }
        .field-select { cursor: pointer; }
        .field-input:focus, .field-select:focus { border-color: #C100FF; }
        .save-btn { background: #C100FF; color: white; border: none; border-radius: 8px; padding: 10px 18px; font-size: 14px; font-weight: 600; cursor: pointer; transition: background 0.15s; font-family: inherit; }
        .save-btn:hover { background: #8A2BFF; }
        .save-btn:disabled { opacity: 0.6; cursor: wait; }
        .field-label { font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.8px; color: #72767d; display: block; }
        .hint { font-size: 12px; color: #72767d; margin: 6px 0 0; line-height: 1.5; }
        .check { display: flex; align-items: center; gap: 8px; font-size: 13px; color: #b5bac1; margin-bottom: 12px; cursor: pointer; width: fit-content; }
        .check input { accent-color: #C100FF; width: 16px; height: 16px; cursor: pointer; }
        .check input:disabled { cursor: not-allowed; }
        .ghost-btn { background: transparent; border: 1px solid #2b2d31; color: #b5bac1; padding: 6px 12px; border-radius: 6px; font-size: 13px; text-decoration: none; transition: border-color 0.15s, color 0.15s; }
        .ghost-btn:hover { border-color: #C100FF; color: #f2f3f5; }
        .tag { display: inline-flex; align-items: center; gap: 4px; background: rgba(193, 0, 255, 0.12); color: #e3b5ff; border: 1px solid rgba(193, 0, 255, 0.3); padding: 4px 6px 4px 10px; border-radius: 999px; font-size: 13px; }
        .tag button { background: none; border: none; color: #e3b5ff; cursor: pointer; font-size: 15px; line-height: 1; padding: 0 4px; }
        .msg { font-size: 13px; color: #b5bac1; }
        code { background: #0e0f11; padding: 1px 6px; border-radius: 4px; font-size: 13px; }
      `}</style>
    </div>
  );
}