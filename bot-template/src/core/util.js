import fs from 'node:fs';
import { EventEmitter } from 'node:events';
import { ActivityType, EmbedBuilder, MessageFlags, PermissionFlagsBits } from 'discord.js';
import { colecao } from './db.js';
import { textos, preencher, emojiTipo, corPersonalizada, presenca } from './textos.js';

export { preencher };

const tx = textos('geral', {
  voce_mesmo: 'Você não pode usar isso em você mesmo.',
  dono_servidor: 'Não dá para punir o dono do servidor.',
  eu_mesmo: 'Não posso fazer isso comigo mesmo.',
  cargo_maior_seu: 'Esse membro tem um cargo igual ou maior que o seu.',
  cargo_maior_meu: 'Esse membro tem um cargo igual ou maior que o meu. Suba o meu cargo na lista de cargos.',
  erro_generico: 'Algo deu errado. Tente de novo em instantes.',
});

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
  if (c) return parseInt(String(c).replace('#', ''), 16);
  return corPersonalizada('padrao') ?? parseInt(String(CONFIG.cor || '#5865F2').replace('#', ''), 16);
}

export const embed = (guildId) => new EmbedBuilder().setColor(cor(guildId));

/** Cores de sucesso, erro e aviso (o dono pode trocar no Personalizar bot). */
export const CORES = {
  get sucesso() { return corPersonalizada('sucesso') ?? 0x22c55e; },
  get erro() { return corPersonalizada('erro') ?? 0xef4444; },
  get aviso() { return corPersonalizada('aviso') ?? 0xf59e0b; },
};

/** Resposta curta só para quem usou o comando. */
export async function responder(i, texto, tipo = 'info') {
  const icone = emojiTipo(tipo);
  const e = new EmbedBuilder()
    .setColor(tipo in CORES ? CORES[tipo] : cor(i.guildId))
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


export function barra(fracao, tamanho = 12) {
  const f = Math.max(0, Math.min(1, fracao || 0));
  const cheio = Math.round(f * tamanho);
  return '▰'.repeat(cheio) + '▱'.repeat(tamanho - cheio);
}

/** "10m", "1h30m", "2d", "45s", "1w" → milissegundos (null se inválido). */
export function lerDuracao(texto) {
  const s = String(texto || '').toLowerCase().replace(/\s+/g, '');
  if (!s) return null;
  // as palavras mais longas vêm antes ("min" antes de "m"), senão "10min" não seria entendido
  const re = /(\d+)(segundos?|seg|minutos?|min|horas?|dias?|semanas?|sem|s|m|h|d|w)/g;
  const UNIDADE = { s: 1e3, m: 6e4, h: 36e5, d: 864e5, w: 6048e5 };
  const mult = (u) => UNIDADE[u.startsWith('seg') ? 's' : u.startsWith('min') ? 'm' : u.startsWith('hora') ? 'h' : u.startsWith('dia') ? 'd' : u.startsWith('sem') ? 'w' : u];
  let total = 0, lido = '';
  for (const m of s.matchAll(re)) {
    total += Number(m[1]) * mult(m[2]);
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
  if (alvo.id === autor.id) return tx('voce_mesmo');
  if (alvo.id === alvo.guild.ownerId) return tx('dono_servidor');
  if (alvo.id === bot.id) return tx('eu_mesmo');
  if (autor.id !== autor.guild.ownerId && alvo.roles.highest.position >= autor.roles.highest.position) {
    return tx('cargo_maior_seu');
  }
  if (alvo.roles.highest.position >= bot.roles.highest.position) {
    return tx('cargo_maior_meu');
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

// ---------------- avisos entre módulos ----------------
/**
 * Um módulo avisa, outro escuta (sem um depender do outro).
 * Ex.: o Tickets avisa "ticketFechado" e a Avaliação de atendimento pergunta a nota.
 *   sinais.emit('ticketFechado', { guild, dono, atendente, numero })
 *   sinais.on('ticketFechado', (dados) => { ... })
 */
export const sinais = new EventEmitter();
sinais.setMaxListeners(50);

/** Mensagem padrão quando algo dá errado numa interação. */
export const erroGenerico = () => `${emojiTipo('erro')} ${tx('erro_generico')}`;

/** Status do bot (o que aparece embaixo do nome). O Personalizar bot pode trocar. */
export function aplicarPresenca(c) {
  const p = presenca(CONFIG.status);
  if (!p.texto) return c.user.setPresence({ activities: [], status: p.status });
  const tipos = { jogando: ActivityType.Playing, ouvindo: ActivityType.Listening, assistindo: ActivityType.Watching, competindo: ActivityType.Competing };
  const atividade = p.tipo === 'personalizado' ? { type: ActivityType.Custom, name: 'status', state: p.texto } : { type: tipos[p.tipo], name: p.texto };
  c.user.setPresence({ activities: [atividade], status: p.status });
}

/** Links de imagem que o dono pode usar na aparência dos embeds: {avatar} e {servidor_icone}. */
export const imagens = ({ user, guild } = {}) => ({
  avatar: user?.displayAvatarURL?.({ size: 256 }) ?? '',
  servidor_icone: guild?.iconURL?.({ size: 256 }) ?? '',
});
