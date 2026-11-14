import fs from 'node:fs';
import { EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { colecao } from './db.js';

/** config.json: nome do bot, cor padrão e módulos instalados. */
export const CONFIG = JSON.parse(fs.readFileSync(new URL('../../config.json', import.meta.url), 'utf8'));

// ---------------- ajustes por servidor ----------------
const ajustesDb = colecao('ajustes');

/**
 * Ajustes de um módulo neste servidor. Campos que faltarem recebem o padrão.
 * Altere o objeto devolvido e chame salvarAjustes().
 */
export function ajustes(guildId, modulo, padrao = {}) {
  const g = ajustesDb.de(guildId, modulo);
  for (const [k, v] of Object.entries(padrao)) {
    if (!(k in g)) g[k] = structuredClone(v);
  }
  return g;
}
export const salvarAjustes = () => ajustesDb.salvar();

// ---------------- aparência ----------------
export function cor(guildId) {
  const c = guildId ? ajustesDb.ler(guildId, 'geral', 'cor') : null;
  return parseInt(String(c || CONFIG.cor || '#5865F2').replace('#', ''), 16);
}

export const embed = (guildId) => new EmbedBuilder().setColor(cor(guildId));

export const CORES = { sucesso: 0x22c55e, erro: 0xef4444, aviso: 0xf59e0b };

/** Resposta curta só para quem usou o comando. */
export async function responder(i, texto, tipo = 'info') {
  const icone = { sucesso: '✅', erro: '❌', aviso: '⚠️', info: 'ℹ️' }[tipo] ?? '';
  const e = new EmbedBuilder()
    .setColor(CORES[tipo] ?? cor(i.guildId))
    .setDescription(`${icone} ${texto}`.trim());
  const payload = { embeds: [e], flags: MessageFlags.Ephemeral };
  if (i.deferred || i.replied) return i.followUp(payload).catch(() => null);
  return i.reply(payload).catch(() => null);
}

// ---------------- texto e números ----------------
export const fmt = (n) => Number(n || 0).toLocaleString('pt-BR');

export const cortar = (t, n) => {
  const s = String(t ?? '');
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};

/** Troca {chave} pelos valores. Chaves desconhecidas ficam como estão. */
export const preencher = (modelo, vars) =>
  String(modelo ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars ? String(vars[k]) : m));

export function barra(fracao, tamanho = 12) {
  const f = Math.max(0, Math.min(1, fracao || 0));
  const cheio = Math.round(f * tamanho);
  return '▰'.repeat(cheio) + '▱'.repeat(tamanho - cheio);
}

/** "10m", "1h30m", "2d", "45s", "1w" → milissegundos (null se inválido). */
export function lerDuracao(texto) {
  const s = String(texto || '').toLowerCase().replace(/\s+/g, '');
  if (!s) return null;
  const re = /(\d+)(s|seg|m|min|h|d|w|sem)/g;
  const mult = { s: 1e3, seg: 1e3, m: 6e4, min: 6e4, h: 36e5, d: 864e5, w: 6048e5, sem: 6048e5 };
  let total = 0, lido = '';
  for (const m of s.matchAll(re)) {
    total += Number(m[1]) * mult[m[2]];
    lido += m[0];
  }
  return lido === s && total > 0 ? total : null;
}

export function duracaoTexto(ms) {
  const s = Math.round(ms / 1000);
  const partes = [];
  const d = Math.floor(s / 86400), h = Math.floor((s % 86400) / 3600), m = Math.floor((s % 3600) / 60), seg = s % 60;
  if (d) partes.push(`${d}d`);
  if (h) partes.push(`${h}h`);
  if (m) partes.push(`${m}min`);
  if (!d && !h && seg) partes.push(`${seg}s`);
  return partes.join(' ') || '0s';
}

export const ts = (ms, estilo = 'R') => `<t:${Math.floor(ms / 1000)}:${estilo}>`;

// ---------------- permissões ----------------
/** Tem "Gerenciar servidor" ou o cargo de staff definido em /config staff? */
export function ehStaff(member) {
  if (!member) return false;
  if (member.permissions?.has(PermissionFlagsBits.ManageGuild)) return true;
  const staff = ajustesDb.ler(member.guild.id, 'geral', 'staff');
  return Boolean(staff && member.roles?.cache?.has(staff));
}

/**
 * Confere se `autor` pode punir `alvo` (dono, hierarquia de cargos, o próprio bot).
 * Devolve uma mensagem de erro ou null.
 */
export function checarHierarquia(autor, alvo, bot) {
  if (!alvo) return null;
  if (alvo.id === autor.id) return 'Você não pode usar isso em você mesmo.';
  if (alvo.id === alvo.guild.ownerId) return 'Não dá para punir o dono do servidor.';
  if (alvo.id === bot.id) return 'Não posso fazer isso comigo mesmo.';
  if (autor.id !== autor.guild.ownerId && alvo.roles.highest.position >= autor.roles.highest.position) {
    return 'Esse membro tem um cargo igual ou maior que o seu.';
  }
  if (alvo.roles.highest.position >= bot.roles.highest.position) {
    return 'Esse membro tem um cargo igual ou maior que o meu. Suba o meu cargo na lista de cargos.';
  }
  return null;
}

export const sorteio = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

// ---------------- mensagens apagadas pelo AutoMod ----------------
// O AutoMod marca o que apagou: assim os Níveis não dão XP por ela e os Logs não registram em dobro.
const removidas = new Map(); // id da mensagem -> expira em
export function marcarRemovida(id) {
  const agora = Date.now();
  removidas.set(id, agora + 60_000);
  if (removidas.size > 300) for (const [k, t] of removidas) if (t < agora) removidas.delete(k);
}
export const foiRemovida = (id) => (removidas.get(id) ?? 0) > Date.now();

// ---------------- respostas longas ----------------
const tamanhoEmbed = (e) => {
  const d = e.data;
  return (
    (d.title?.length ?? 0) +
    (d.description?.length ?? 0) +
    (d.footer?.text?.length ?? 0) +
    (d.author?.name?.length ?? 0) +
    (d.fields ?? []).reduce((t, f) => t + f.name.length + f.value.length, 0)
  );
};

/**
 * Responde com uma lista de campos que pode passar do limite do Discord
 * (6000 caracteres e 25 campos por mensagem): divide em várias mensagens.
 * `base()` deve devolver um EmbedBuilder novo (título, cor, rodapé...).
 */
export async function responderCampos(i, base, campos, { efemero = false } = {}) {
  const partes = [];
  let atual = base();
  let n = 0;
  for (const c of campos) {
    const campo = { name: cortar(c.name, 256), value: cortar(c.value || '—', 1024), inline: c.inline ?? false };
    if (n >= 25 || tamanhoEmbed(atual) + campo.name.length + campo.value.length > 5800) {
      partes.push(atual);
      atual = base().setTitle(null).setThumbnail(null).setAuthor(null);
      n = 0;
    }
    atual.addFields(campo);
    n++;
  }
  partes.push(atual);
  const flags = efemero ? MessageFlags.Ephemeral : undefined;
  await i.reply({ embeds: [partes[0]], flags, allowedMentions: { parse: [] } });
  for (const e of partes.slice(1)) await i.followUp({ embeds: [e], flags, allowedMentions: { parse: [] } });
}
