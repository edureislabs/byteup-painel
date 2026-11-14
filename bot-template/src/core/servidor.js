import { ChannelType } from 'discord.js';
import { colecao } from './db.js';
import { emojiDeBotaoOk } from './textos.js';

/**
 * Configuração de cada servidor pelo "Personalizar bot.html".
 *
 * Cada módulo descreve o que pode ser configurado em `painel: { campos: [...] }`
 * (e, se os dados não ficam em ajustes, `onde: { colecao, chaves }`).
 * O /personalizar baixar manda os valores atuais; o painel edita; o /personalizar aplicar
 * confere tudo aqui (canal existe? cargo existe? número dentro do limite?) e grava.
 *
 * Tipos de campo (t): bool, int, texto, emoji, cor, url, escolha, varias, canal, canais,
 * cargo, cargos, duracao (ms), datahora (ms), palavras (lista de textos), mapa (número → cargo)
 * e lista (itens com os próprios campos; pode ter lista dentro).
 */

const ajustesDb = colecao('ajustes');
/** Módulos que não dá para desligar (o núcleo e a própria personalização). */
export const FIXOS = new Set(['nucleo', 'personalizar']);

/** O módulo está ligado neste servidor? (o dono desliga no Personalizar bot) */
export function moduloLigado(guildId, id) {
  if (!guildId || FIXOS.has(id)) return true;
  const lista = ajustesDb.ler(guildId, 'geral', 'desligados');
  return !(Array.isArray(lista) && lista.includes(id));
}

const SNOW = /^\d{15,22}$/;
const TIPO_CANAL = {
  texto: [ChannelType.GuildText, ChannelType.GuildAnnouncement],
  voz: [ChannelType.GuildVoice, ChannelType.GuildStageVoice],
  categoria: [ChannelType.GuildCategory],
};

function dadosDo(modulo, guildId) {
  const onde = modulo.painel.onde;
  if (onde) return colecao(onde.colecao).de(guildId, ...(onde.chaves ?? []));
  const obj = ajustesDb.de(guildId, modulo.id);
  for (const [k, v] of Object.entries(modulo.painel.padrao ?? {})) if (!(k in obj)) obj[k] = structuredClone(v);
  return obj;
}
function salvarDo(modulo) {
  const onde = modulo.painel.onde;
  if (onde) colecao(onde.colecao).salvar();
  else ajustesDb.salvar();
}

const valorPadrao = (c) => {
  if ('padrao' in c) return structuredClone(c.padrao);
  if (['canais', 'cargos', 'varias', 'palavras', 'lista'].includes(c.t)) return c.objeto ? {} : [];
  if (c.t === 'mapa') return {};
  if (c.t === 'bool') return false;
  if (c.t === 'int') return c.min ?? 0;
  if (c.t === 'texto' || c.t === 'emoji' || c.t === 'url') return '';
  return null;
};

/** Valor atual de um campo, no formato que o painel entende. */
function lerCampo(c, obj) {
  if (c.ler) return c.ler(obj);
  const v = obj?.[c.k];
  if (v === undefined || v === null) return c.t === 'canal' || c.t === 'cargo' || c.t === 'cor' || c.t === 'duracao' || c.t === 'datahora' ? null : valorPadrao(c);
  if (c.t === 'lista') {
    const itens = c.objeto ? Object.entries(v).map(([id, it]) => ({ id, ...it })) : v;
    return itens.map((it) => {
      const out = c.id ? { id: it.id } : {};
      for (const s of c.campos) out[s.k] = lerCampo(s, it);
      return out;
    });
  }
  return structuredClone(v);
}

/** Esquemas sem funções, para o painel desenhar os campos. */
function limparEsquema(campos) {
  return campos.map((c) => {
    const out = {};
    for (const [k, v] of Object.entries(c)) {
      if (typeof v === 'function') continue;
      out[k] = k === 'campos' ? limparEsquema(v) : v;
    }
    return out;
  });
}

export function esquemas(modulos) {
  return modulos
    .filter((m) => m.painel?.campos?.length || !FIXOS.has(m.id))
    .map((m) => ({ id: m.id, nome: m.nome, desligavel: !FIXOS.has(m.id), dica: m.painel?.dica ?? '', campos: m.painel?.campos ? limparEsquema(m.painel.campos) : [] }));
}

/** Configuração atual de um servidor (vai junto no /personalizar baixar). */
export function exportarConfig(guildId, modulos) {
  const out = { modulos: {} };
  for (const m of modulos) {
    if (!m.painel?.campos?.length) continue;
    const obj = m.painel.onde ? colecao(m.painel.onde.colecao).ler(guildId, ...(m.painel.onde.chaves ?? [])) ?? {} : { ...m.painel.padrao, ...ajustesDb.ler(guildId, m.id) };
    const valores = {};
    for (const c of m.painel.campos) valores[c.k] = lerCampo(c, obj);
    out.modulos[m.id] = valores;
  }
  const desl = ajustesDb.ler(guildId, 'geral', 'desligados');
  out.desligados = Array.isArray(desl) ? desl.filter((id) => modulos.some((m) => m.id === id)) : [];
  return out;
}

// ---------------- conferência ----------------
const slug = (t, max = 24) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, max);

/**
 * Confere um valor. Devolve { v } se aceito ou { erro } se não.
 * ctx: { guild, avisos, onde } (onde = "Níveis › Canal do aviso", para o aviso fazer sentido)
 */
function conferir(c, x, ctx, antigo) {
  const g = ctx.guild;
  const vazio = x === null || x === undefined || x === '';
  switch (c.t) {
    case 'bool':
      return { v: x === true };
    case 'int': {
      const n = typeof x === 'number' ? x : parseInt(x, 10);
      if (!Number.isFinite(n)) return { erro: 'precisa ser um número' };
      return { v: Math.min(c.max ?? 1e12, Math.max(c.min ?? 0, Math.round(n))) };
    }
    case 'texto': {
      if (vazio) return c.obrigatorio ? { erro: 'não pode ficar vazio' } : { v: c.nulo ? null : '' };
      if (typeof x !== 'string') return { erro: 'precisa ser um texto' };
      const s = c.linhas ? x.replace(/\r/g, '').trim() : x.replace(/\s+/g, ' ').trim();
      if (!s && c.obrigatorio) return { erro: 'não pode ficar vazio' };
      return { v: s.slice(0, c.max ?? 2000) || (c.nulo ? null : '') };
    }
    case 'emoji': {
      if (vazio) return c.obrigatorio ? { erro: 'escolha um emoji' } : { v: '' };
      const s = String(x).trim();
      return emojiDeBotaoOk(s) ? { v: s } : { erro: 'emoji inválido (use um emoji ou <:nome:id>)' };
    }
    case 'cor':
      if (vazio) return { v: null };
      return /^#[0-9a-f]{6}$/i.test(x) ? { v: x } : { erro: 'use uma cor como #5865F2' };
    case 'url':
      if (vazio) return { v: c.nulo ? null : '' };
      return /^https?:\/\/\S+$/i.test(String(x).trim()) && String(x).length <= 500 ? { v: String(x).trim() } : { erro: 'precisa ser um link https://' };
    case 'escolha': {
      const ok = c.op.map((o) => o[0]);
      if (vazio && ok.includes(null)) return { v: null };
      return ok.includes(x) ? { v: x } : { erro: 'opção inválida' };
    }
    case 'varias': {
      if (!Array.isArray(x)) return { erro: 'lista inválida' };
      const ok = new Set(c.op.map((o) => o[0]));
      return { v: [...new Set(x.filter((y) => ok.has(y)))] };
    }
    case 'canal': {
      if (vazio) return c.obrigatorio ? { erro: 'escolha um canal' } : { v: null };
      const ch = SNOW.test(x) ? g.channels.cache.get(x) : null;
      if (!ch) return { erro: 'o canal não existe mais' };
      if (!TIPO_CANAL[c.canal ?? 'texto'].includes(ch.type)) return { erro: `o canal precisa ser ${c.canal === 'voz' ? 'de voz' : c.canal === 'categoria' ? 'uma categoria' : 'de texto'}` };
      return { v: ch.id };
    }
    case 'canais': {
      if (!Array.isArray(x)) return { erro: 'lista inválida' };
      const ok = x.filter((id) => SNOW.test(id) && TIPO_CANAL[c.canal ?? 'texto'].includes(g.channels.cache.get(id)?.type));
      if (ok.length < x.length) ctx.avisos.push(`${ctx.onde}: ${x.length - ok.length} canal(is) não existem mais (tirei da lista)`);
      return { v: [...new Set(ok)].slice(0, c.max ?? 50) };
    }
    case 'cargo': {
      if (vazio) return c.obrigatorio ? { erro: 'escolha um cargo' } : { v: null };
      const r = SNOW.test(x) ? g.roles.cache.get(x) : null;
      if (!r || r.id === g.id || r.managed) return { erro: 'o cargo não existe mais' };
      return { v: r.id };
    }
    case 'cargos': {
      if (!Array.isArray(x)) return { erro: 'lista inválida' };
      const ok = x.filter((id) => SNOW.test(id) && g.roles.cache.has(id) && id !== g.id && !g.roles.cache.get(id).managed);
      if (ok.length < x.length) ctx.avisos.push(`${ctx.onde}: ${x.length - ok.length} cargo(s) não existem mais (tirei da lista)`);
      return { v: [...new Set(ok)].slice(0, c.max ?? 50) };
    }
    case 'duracao': {
      if (vazio) return c.nulo ? { v: null } : { erro: 'escolha um tempo' };
      const n = Number(x);
      if (!Number.isFinite(n) || n <= 0) return { erro: 'tempo inválido' };
      if (c.min && n < c.min) return { erro: `o mínimo é ${Math.round(c.min / 60000)} min` };
      return { v: Math.min(c.max ?? 365 * 864e5, Math.round(n)) };
    }
    case 'datahora': {
      const n = Number(x);
      if (vazio || !Number.isFinite(n)) return { erro: 'escolha a data e a hora' };
      return { v: Math.round(n) };
    }
    case 'palavras': {
      if (!Array.isArray(x)) return { erro: 'lista inválida' };
      let l = x.filter((s) => typeof s === 'string').map((s) => s.trim()).filter(Boolean);
      if (c.minusculo) l = l.map((s) => s.toLowerCase());
      if (c.dominio) l = l.map((s) => s.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]).filter((s) => /^[a-z0-9.-]+\.[a-z]{2,}$/.test(s));
      return { v: [...new Set(l.map((s) => s.slice(0, c.itemMax ?? 100)))].slice(0, c.max ?? 100) };
    }
    case 'mapa': {
      if (!x || typeof x !== 'object' || Array.isArray(x)) return { erro: 'lista inválida' };
      const out = {};
      let perdidos = 0;
      for (const [k, cargo] of Object.entries(x)) {
        const n = parseInt(k, 10);
        if (!Number.isFinite(n) || n < (c.chaveMin ?? 1) || n > (c.chaveMax ?? 1e6)) continue;
        if (!SNOW.test(cargo) || !g.roles.cache.has(cargo)) { perdidos++; continue; }
        out[n] = cargo;
      }
      if (perdidos) ctx.avisos.push(`${ctx.onde}: ${perdidos} cargo(s) não existem mais (tirei da lista)`);
      return { v: Object.fromEntries(Object.entries(out).slice(0, c.max ?? 50)) };
    }
    case 'lista':
      return conferirLista(c, x, ctx, antigo);
    default:
      return { erro: 'tipo desconhecido' };
  }
}

function conferirLista(c, x, ctx, antigo) {
  if (!Array.isArray(x)) return { erro: 'lista inválida' };
  const antigos = c.objeto ? Object.entries(antigo ?? {}).map(([id, it]) => ({ ...it, id })) : Array.isArray(antigo) ? antigo : [];
  const usados = new Set();
  const pedidos = new Set(x.map((y) => y?.id).filter((id) => typeof id === 'string'));
  const out = [];
  for (const [n, bruto] of x.slice(0, c.max ?? 50).entries()) {
    if (!bruto || typeof bruto !== 'object') continue;
    const nome = c.titulo ? String(bruto[c.titulo] ?? '').slice(0, 40) : '';
    const onde = `${ctx.onde} › ${nome || `item ${n + 1}`}`;
    const velho = c.id && typeof bruto.id === 'string' ? antigos.find((a) => a.id === bruto.id) : null;
    const item = velho ? structuredClone(velho) : {};
    let ok = true;
    for (const s of c.campos) {
      const r = conferir(s, bruto[s.k], { ...ctx, onde: `${onde} › ${s.r}` }, velho?.[s.k]);
      if (r.erro) {
        if (velho) { ctx.avisos.push(`${onde} › ${s.r}: ${r.erro} (mantive o anterior)`); continue; }
        if (!s.obrigatorio) { ctx.avisos.push(`${onde} › ${s.r}: ${r.erro} (deixei vazio)`); item[s.k] = s.nulo || ['canal', 'cargo', 'cor', 'duracao'].includes(s.t) ? null : valorPadrao(s); continue; }
        ctx.avisos.push(`${onde} › ${s.r}: ${r.erro} (item ignorado)`);
        ok = false;
        break;
      }
      item[s.k] = r.v;
    }
    if (!ok) continue;
    if (c.id) {
      let id = typeof bruto.id === 'string' && /^[\w-]{1,40}$/.test(bruto.id) ? bruto.id : '';
      if (!id || usados.has(id)) {
        const base = c.id === 'tempo' ? Date.now().toString(36).slice(-6) : slug(item[c.id.slice(5)], c.idMax ?? 24) || 'item';
        id = base;
        for (let k = 2; usados.has(id) || pedidos.has(id); k++) id = `${base.slice(0, (c.idMax ?? 24) - 3)}-${k}`;
      }
      item.id = id;
      usados.add(id);
    }
    const final = c.item ? c.item(item, velho, { ...ctx, onde }) : item;
    if (final) out.push(final);
  }
  if (c.objeto) return { v: Object.fromEntries(out.map(({ id, ...resto }) => [id, resto])) };
  return { v: out };
}

/**
 * Grava a configuração que veio do painel. `entrada` = valores.servidores do arquivo:
 * { [guildId]: { modulos: { [moduloId]: { campo: valor } }, desligados?: [...] } }
 * Só os módulos que o dono mexeu vêm no arquivo; o resto fica como está.
 */
export function aplicarConfig(client, entrada, modulos) {
  const avisos = [];
  let servidores = 0;
  let campos = 0;
  if (!entrada || typeof entrada !== 'object') return { avisos, servidores, campos };
  for (const [gid, cfg] of Object.entries(entrada).slice(0, 25)) {
    const guild = client.guilds.cache.get(gid);
    if (!guild) { avisos.push(`servidor ${gid}: o bot não está mais nele (ignorado)`); continue; }
    if (!cfg || typeof cfg !== 'object') continue;
    let mexeu = false;
    if (Array.isArray(cfg.desligados)) {
      const validos = cfg.desligados.filter((id) => !FIXOS.has(id) && modulos.some((m) => m.id === id));
      ajustesDb.de(gid, 'geral').desligados = [...new Set(validos)];
      ajustesDb.salvar();
      mexeu = true;
      campos++;
    }
    for (const [mid, valores] of Object.entries(cfg.modulos ?? {})) {
      const m = modulos.find((x) => x.id === mid);
      if (!m?.painel?.campos) { avisos.push(`${guild.name}: o módulo "${mid}" não está neste bot (ignorado)`); continue; }
      if (!valores || typeof valores !== 'object') continue;
      const obj = dadosDo(m, gid);
      const antes = structuredClone(obj);
      for (const c of m.painel.campos) {
        if (!(c.k in valores)) continue;
        const onde = c.r === m.nome ? `${guild.name} › ${m.nome}` : `${guild.name} › ${m.nome} › ${c.r}`;
        const r = conferir(c, valores[c.k], { guild, avisos, onde }, obj[c.k]);
        if (r.erro) { avisos.push(`${onde}: ${r.erro} (mantive o anterior)`); continue; }
        if (c.gravar) c.gravar(obj, r.v);
        else obj[c.k] = r.v;
        campos++;
      }
      try {
        m.painel.depois?.(obj, antes, guild, avisos);
      } catch (e) {
        console.error(`[personalizar] ${mid}:`, e.message);
      }
      salvarDo(m);
      mexeu = true;
    }
    if (mexeu) servidores++;
  }
  return { avisos, servidores, campos };
}
