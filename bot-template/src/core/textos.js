import fs from 'node:fs';
import { ButtonBuilder, ButtonStyle, ActionRowBuilder } from 'discord.js';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Textos do bot. Todo texto que o bot manda passa por aqui:
 *
 *   const t = textos('moderacao', { banido: '**{tag}** foi banido(a). Motivo: {motivo}' });
 *   responder(i, t('banido', { tag: user.tag, motivo }));
 *
 * Com o módulo Personalização, o dono do bot troca qualquer texto, as cores, os emojis
 * das respostas e o status pelo arquivo "Personalizar bot.html" + /personalizar.
 * O que foi personalizado fica em data/personalizacao.json.
 */

/** Limites do Discord para cada tipo de texto. */
export const LIMITES = {
  texto: 2000,
  resposta: 3900,
  descricao: 4000,
  conteudo: 2000,
  titulo: 256,
  campo: 256,
  valor: 1024,
  rodape: 2048,
  autor: 256,
  botao: 80,
  rotulo: 45,
  placeholder: 150,
  opcao: 100,
  motivo: 500,
  canal: 100,
};

export const EMOJIS_PADRAO = { sucesso: '✅', erro: '❌', aviso: '⚠️', info: 'ℹ️' };
export const CORES_PADRAO = { padrao: '', sucesso: '#22c55e', erro: '#ef4444', aviso: '#f59e0b' };
export const PRESENCA_TIPOS = ['personalizado', 'jogando', 'ouvindo', 'assistindo', 'competindo'];
export const PRESENCA_STATUS = ['online', 'idle', 'dnd'];

const ARQUIVO = path.join(fileURLToPath(new URL('../../data', import.meta.url)), 'personalizacao.json');

/** chave completa ("moderacao.banido") → { modulo, padrao, tipo, vars } */
const catalogo = new Map();
/** chave completa ("boasvindas.entrada") → { modulo, nome, padrao: { cor, imagem, miniatura, rodape }, vars } */
const catalogoVisuais = new Map();
const nomesModulos = new Map([['geral', 'Comandos gerais (/ajuda, /config…)']]);
/** chave completa ("tickets.fechar") → { modulo, chave, nome, rotulo, emoji, estilo, ocultavel, emojiFixo, rotuloInfo } */
const catalogoBotoes = new Map();
/** chave completa ("sugestoes.motivo") → { modulo, nome, textos: [chaves de texto do modal] } */
const catalogoModais = new Map();

const vazio = () => ({ textos: {}, visuais: {}, emojis: {}, cores: {}, presenca: {}, botoes: {}, criados: { paineis: [], formularios: [] } });
let valores = vazio();
let ativo = false;

const varsDe = (s) => [...new Set([...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]))];

/** Troca {chave} pelos valores. Chaves desconhecidas ficam como estão. */
export const preencher = (modelo, vars = {}) =>
  String(modelo ?? '').replace(/\{(\w+)\}/g, (m, k) => (k in vars && vars[k] != null ? String(vars[k]) : m));

const cortarEm = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/**
 * Registra os textos de um módulo e devolve a função t(chave, variáveis).
 * Cada texto é uma string ou [string, tipo] (o tipo define o limite do Discord; padrão "texto").
 */
export function textos(modulo, padroes) {
  for (const [chave, v] of Object.entries(padroes)) {
    const [padrao, tipo = 'texto'] = Array.isArray(v) ? v : [v];
    catalogo.set(`${modulo}.${chave}`, { modulo, chave, padrao, tipo, vars: varsDe(padrao) });
  }
  return (chave, vars) => texto(`${modulo}.${chave}`, vars);
}

/** Um texto pela chave completa ("moderacao.banido"). */
export function texto(chaveCompleta, vars = {}) {
  const item = catalogo.get(chaveCompleta);
  if (!item) return chaveCompleta;
  const personalizado = ativo ? valores.textos[chaveCompleta] : undefined;
  const modelo = typeof personalizado === 'string' && personalizado.trim() ? personalizado : item.padrao;
  return cortarEm(preencher(modelo, vars), LIMITES[item.tipo] ?? LIMITES.texto);
}

/**
 * Registra a aparência personalizável de embeds importantes (cor, imagem, miniatura, rodapé)
 * e devolve aplicar(embed, chave, variáveis).
 */
export function visuais(modulo, lista) {
  for (const [chave, v] of Object.entries(lista)) {
    const { nome, vars = [], ...padrao } = v;
    catalogoVisuais.set(`${modulo}.${chave}`, { modulo, chave, nome, vars, padrao });
  }
  return (e, chave, vars) => aplicarVisual(e, `${modulo}.${chave}`, vars);
}

const ehUrl = (s) => /^https?:\/\/\S+$/i.test(s);

/** Aplica o que o dono personalizou neste embed. "-" remove o item. */
export function aplicarVisual(e, chaveCompleta, vars = {}) {
  if (!ativo) return e;
  const v = valores.visuais[chaveCompleta];
  if (!v) return e;
  if (v.cor && /^#[0-9a-f]{6}$/i.test(v.cor)) e.setColor(parseInt(v.cor.slice(1), 16));
  for (const [campo, fn] of [
    ['imagem', (x) => e.setImage(x)],
    ['miniatura', (x) => e.setThumbnail(x)],
  ]) {
    if (!v[campo]) continue;
    if (v[campo] === '-') fn(null);
    else {
      const url = preencher(v[campo], vars).trim();
      if (ehUrl(url)) fn(url);
    }
  }
  if (v.rodape === '-') e.setFooter(null);
  else if (v.rodape) e.setFooter({ text: cortarEm(preencher(v.rodape, vars), LIMITES.rodape) });
  return e;
}

// ---------------- botões ----------------
export const ESTILOS = ['Primary', 'Secondary', 'Success', 'Danger'];
/** Emoji que o Discord aceita num botão: emoji normal ou <a:nome:id> / <:nome:id>. */
export const emojiDeBotaoOk = (e) =>
  typeof e === 'string' &&
  e.length <= 64 &&
  (/^<a?:\w{2,32}:\d{15,22}>$/.test(e) || (/^[\p{Extended_Pictographic}\p{Regional_Indicator}\p{Emoji_Modifier}\u200d\ufe0f\u20e3#*0-9]+$/u.test(e) && /[\p{Extended_Pictographic}\p{Regional_Indicator}\u20e3]/u.test(e)));

/**
 * Registra os botões de um módulo e devolve bt(chave, extra) → ButtonBuilder (ou null, se o dono escondeu).
 * Cada botão: { nome, rotulo?: chave de texto do módulo, emoji?, estilo: Primary|Secondary|Success|Danger|Link,
 *               ocultavel?: o dono pode esconder, emojiFixo?: o emoji não muda (ex.: letras da enquete), rotuloInfo?: explica rótulos automáticos }
 * extra: { rotulo, emoji, estilo } do momento (ex.: contagem de votos). O personalizado vence o estilo; o extra vence o rótulo e o emoji.
 */
export function botoes(modulo, defs) {
  for (const [chave, d] of Object.entries(defs)) catalogoBotoes.set(`${modulo}.${chave}`, { modulo, chave, ...d });
  return (chave, extra) => criarBotao(`${modulo}.${chave}`, extra);
}

export function criarBotao(chaveCompleta, extra = {}) {
  const d = catalogoBotoes.get(chaveCompleta);
  if (!d) throw new Error(`botão desconhecido: ${chaveCompleta}`);
  const v = (ativo && valores.botoes[chaveCompleta]) || {};
  if (d.ocultavel && v.oculto) return null;
  const b = new ButtonBuilder();
  const rotulo = extra.rotulo ?? (d.rotulo ? texto(`${d.modulo}.${d.rotulo}`) : '');
  if (rotulo) b.setLabel(cortarEm(String(rotulo), LIMITES.botao));
  let emoji = d.emojiFixo ? extra.emoji ?? d.emoji : extra.emoji ?? v.emoji ?? d.emoji;
  if (emoji === '-') emoji = null;
  if (!rotulo && !emoji) emoji = extra.emoji || d.emoji || '▫️'; // o Discord exige texto ou emoji
  if (emoji) b.setEmoji(emoji);
  const estilo = d.estilo === 'Link' ? 'Link' : v.estilo || extra.estilo || d.estilo || 'Secondary';
  b.setStyle(ButtonStyle[estilo] ?? ButtonStyle.Secondary);
  return b;
}

/** Uma fileira com os botões que sobraram (sem os escondidos). Devolve null se ficou vazia. */
export function fileira(...lista) {
  const bs = lista.flat().filter(Boolean);
  return bs.length ? new ActionRowBuilder().addComponents(bs.slice(0, 5)) : null;
}
/** Lista de fileiras sem as vazias (para components: [...]). */
export const fileiras = (...lista) => lista.flat().filter(Boolean);

/** Registra os modais (formulários) de um módulo, só para o painel agrupar os textos deles. */
export function modais(modulo, defs) {
  for (const [chave, d] of Object.entries(defs)) catalogoModais.set(`${modulo}.${chave}`, { modulo, chave, nome: d.nome, textos: d.textos.map((k) => `${modulo}.${k}`) });
}

/** Painéis e formulários criados pelo dono no Personalizar bot.html. */
export const criados = () => (ativo ? valores.criados : { paineis: [], formularios: [] });

/** Emoji das respostas rápidas (sucesso, erro, aviso, info). */
export const emojiTipo = (tipo) => (ativo && valores.emojis[tipo]) || EMOJIS_PADRAO[tipo] || '';

/** Cor personalizada ("padrao", "sucesso", "erro", "aviso") como número, ou null. */
export function corPersonalizada(tipo) {
  const c = (ativo && valores.cores[tipo]) || CORES_PADRAO[tipo];
  return c && /^#[0-9a-f]{6}$/i.test(c) ? parseInt(c.slice(1), 16) : null;
}

export const registrarNomeModulo = (id, nome) => nomesModulos.set(id, nome);

// ---------------- arquivo data/personalizacao.json ----------------
function carregar() {
  try {
    const dados = JSON.parse(fs.readFileSync(ARQUIVO, 'utf8'));
    valores = { ...vazio(), ...(dados.valores ?? dados) };
  } catch (e) {
    if (e.code !== 'ENOENT') console.error('[personalização] não consegui ler data/personalizacao.json:', e.message);
    valores = vazio();
  }
}

function gravar() {
  fs.mkdirSync(path.dirname(ARQUIVO), { recursive: true });
  const tmp = `${ARQUIVO}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify({ formato: 'byteup-personalizacao', versao: 1, valores }, null, 2));
  fs.renameSync(tmp, ARQUIVO);
}

/** Liga a personalização (o módulo Personalização chama isto ao carregar). */
export function ativarPersonalizacao() {
  ativo = true;
  carregar();
}
export const personalizacaoAtiva = () => ativo;
export const valoresAtuais = () => structuredClone(valores);

/** Status do bot (o que aparece embaixo do nome). */
export function presenca(padraoTexto) {
  const p = ativo ? valores.presenca : {};
  return {
    texto: p.texto?.trim() || padraoTexto || '',
    tipo: PRESENCA_TIPOS.includes(p.tipo) ? p.tipo : 'personalizado',
    status: PRESENCA_STATUS.includes(p.status) ? p.status : 'online',
  };
}

/** O arquivo que o painel abre: catálogo (textos padrão) + o que já foi personalizado. */
export function exportar({ nomeBot, modulos, servidores = [] }) {
  const ordem = new Map((modulos ?? []).map((m, n) => [m.id, n]));
  const grupos = [...nomesModulos].map(([id, nome]) => ({ id, nome })).sort((a, b) => (ordem.get(a.id) ?? -1) - (ordem.get(b.id) ?? -1));
  return {
    formato: 'byteup-personalizacao',
    versao: 1,
    bot: nomeBot,
    gerado: new Date().toISOString(),
    modulos: grupos,
    limites: LIMITES,
    catalogo: {
      textos: Object.fromEntries([...catalogo].map(([k, v]) => [k, { modulo: v.modulo, padrao: v.padrao, tipo: v.tipo, vars: v.vars }])),
      visuais: Object.fromEntries([...catalogoVisuais].map(([k, v]) => [k, { modulo: v.modulo, nome: v.nome, vars: v.vars, padrao: v.padrao }])),
      botoes: Object.fromEntries([...catalogoBotoes].map(([k, v]) => [k, { modulo: v.modulo, nome: v.nome, rotulo: v.rotulo ? `${v.modulo}.${v.rotulo}` : null, rotuloInfo: v.rotuloInfo ?? null, emoji: v.emoji ?? null, estilo: v.estilo, ocultavel: !!v.ocultavel, emojiFixo: !!v.emojiFixo }])),
      modais: Object.fromEntries([...catalogoModais].map(([k, v]) => [k, { modulo: v.modulo, nome: v.nome, textos: v.textos }])),
      emojis: EMOJIS_PADRAO,
      cores: CORES_PADRAO,
      presenca: { tipos: PRESENCA_TIPOS, status: PRESENCA_STATUS },
    },
    servidores,
    valores: structuredClone(valores),
  };
}

const HEX = /^#[0-9a-f]{6}$/i;
const EMOJI_OK = (s) => typeof s === 'string' && s.length <= 100 && (/^<a?:\w{2,32}:\d{15,22}>$/.test(s) || !/[<>@#]/.test(s));

/**
 * Confere um arquivo enviado pelo /personalizar aplicar e grava.
 * Devolve { ok, erro?, avisos, total }.
 */
export function importar(arquivo) {
  if (!arquivo || typeof arquivo !== 'object') return { ok: false, erro: 'O arquivo não é um JSON válido.' };
  if (arquivo.formato !== 'byteup-personalizacao') return { ok: false, erro: 'Esse arquivo não é de personalização (salve pelo "Personalizar bot.html").' };
  const v = arquivo.valores ?? {};
  const novo = vazio();
  const avisos = [];
  let total = 0;

  for (const [k, s] of Object.entries(v.textos ?? {})) {
    const item = catalogo.get(k);
    if (!item) { avisos.push(`texto "${k}" não existe neste bot (ignorado)`); continue; }
    if (typeof s !== 'string' || !s.trim() || s === item.padrao) continue;
    if (s.length > 6000) { avisos.push(`texto "${k}" grande demais (ignorado)`); continue; }
    novo.textos[k] = s;
    total++;
  }
  for (const [k, x] of Object.entries(v.visuais ?? {})) {
    if (!catalogoVisuais.has(k)) { avisos.push(`aparência "${k}" não existe neste bot (ignorada)`); continue; }
    if (!x || typeof x !== 'object') continue;
    const limpo = {};
    if (typeof x.cor === 'string' && HEX.test(x.cor)) limpo.cor = x.cor;
    for (const campo of ['imagem', 'miniatura']) {
      const u = typeof x[campo] === 'string' ? x[campo].trim() : '';
      if (!u) continue;
      if (u === '-' || ehUrl(u) || /^\{\w+\}$/.test(u)) limpo[campo] = u;
      else avisos.push(`${campo} de "${k}" precisa ser um link https:// (ignorado)`);
    }
    if (typeof x.rodape === 'string' && x.rodape.trim()) limpo.rodape = x.rodape.slice(0, LIMITES.rodape);
    if (Object.keys(limpo).length) { novo.visuais[k] = limpo; total++; }
  }
  for (const [k, e] of Object.entries(v.emojis ?? {})) {
    if (!(k in EMOJIS_PADRAO) || !e || e === EMOJIS_PADRAO[k]) continue;
    if (!EMOJI_OK(e)) { avisos.push(`emoji de "${k}" inválido (ignorado)`); continue; }
    novo.emojis[k] = e;
    total++;
  }
  for (const [k, c] of Object.entries(v.cores ?? {})) {
    if (!(k in CORES_PADRAO) || !c || c === CORES_PADRAO[k]) continue;
    if (!HEX.test(c)) { avisos.push(`cor "${k}" inválida (use #RRGGBB)`); continue; }
    novo.cores[k] = c;
    total++;
  }
  for (const [k, x] of Object.entries(v.botoes ?? {})) {
    const d = catalogoBotoes.get(k);
    if (!d) { avisos.push(`botão "${k}" não existe neste bot (ignorado)`); continue; }
    if (!x || typeof x !== 'object') continue;
    const limpo = {};
    if (x.emoji && !d.emojiFixo) {
      if (x.emoji === '-' || emojiDeBotaoOk(x.emoji)) limpo.emoji = x.emoji;
      else avisos.push(`emoji do botão "${d.nome}" inválido (use um emoji ou <:nome:id>)`);
    }
    if (x.estilo && d.estilo !== 'Link') {
      if (ESTILOS.includes(x.estilo)) limpo.estilo = x.estilo;
      else avisos.push(`cor do botão "${d.nome}" inválida`);
    }
    if (x.oculto === true && d.ocultavel) limpo.oculto = true;
    if (Object.keys(limpo).length) { novo.botoes[k] = limpo; total++; }
  }
  novo.criados = limparCriados(v.criados, avisos);
  total += novo.criados.paineis.length + novo.criados.formularios.length;

  const p = v.presenca ?? {};
  if (typeof p.texto === 'string' && p.texto.trim()) { novo.presenca.texto = p.texto.trim().slice(0, 128); total++; }
  if (PRESENCA_TIPOS.includes(p.tipo) && p.tipo !== 'personalizado') novo.presenca.tipo = p.tipo;
  if (PRESENCA_STATUS.includes(p.status) && p.status !== 'online') novo.presenca.status = p.status;

  valores = novo;
  gravar();
  return { ok: true, avisos, total };
}

// ---------------- painéis e formulários criados ----------------
const ID = /^[a-z0-9-]{1,32}$/;
const SNOW = /^\d{15,22}$/;
const str = (x, max) => (typeof x === 'string' ? x.trim().slice(0, max) : '');
const snow = (x) => (typeof x === 'string' && SNOW.test(x) ? x : '');
const url = (x) => {
  const u = str(x, 500);
  return u && (ehUrl(u) || /^\{\w+\}$/.test(u)) ? u : '';
};
export const ACOES = ['cargo', 'mensagem', 'formulario', 'ticket', 'link'];

function limparCriados(c, avisos) {
  const out = { paineis: [], formularios: [] };
  if (!c || typeof c !== 'object') return out;
  const idsForm = new Set();
  for (const f of (Array.isArray(c.formularios) ? c.formularios : []).slice(0, 25)) {
    if (!f || !ID.test(f.id ?? '') || idsForm.has(f.id)) { avisos.push('um formulário sem identificação válida foi ignorado'); continue; }
    const titulo = str(f.titulo, 45);
    const perguntas = (Array.isArray(f.perguntas) ? f.perguntas : []).slice(0, 5).map((q) => {
      const max = Math.min(4000, Math.max(1, Number(q?.max) || (q?.longa ? 1000 : 200)));
      return {
        rotulo: str(q?.rotulo, 45),
        placeholder: str(q?.placeholder, 100),
        longa: !!q?.longa,
        obrigatoria: q?.obrigatoria !== false,
        min: Math.min(max, Math.max(0, Number(q?.min) || 0)),
        max,
      };
    }).filter((q) => q.rotulo);
    if (!titulo || !perguntas.length) { avisos.push(`formulário "${f.id}" precisa de título e de pelo menos 1 pergunta (ignorado)`); continue; }
    idsForm.add(f.id);
    out.formularios.push({
      id: f.id, titulo, servidor: snow(f.servidor), canal: snow(f.canal), cargo: snow(f.cargo),
      mensagem: str(f.mensagem, 2000), perguntas,
    });
  }
  const idsPainel = new Set();
  for (const pn of (Array.isArray(c.paineis) ? c.paineis : []).slice(0, 25)) {
    if (!pn || !ID.test(pn.id ?? '') || idsPainel.has(pn.id)) { avisos.push('um painel sem identificação válida foi ignorado'); continue; }
    const menu = pn.tipo === 'menu';
    const e = pn.embed ?? {};
    const embed = {
      titulo: str(e.titulo, 256), descricao: str(e.descricao, 4000), cor: HEX.test(e.cor ?? '') ? e.cor : '',
      imagem: url(e.imagem), miniatura: url(e.miniatura), rodape: str(e.rodape, 2048),
    };
    const conteudo = str(pn.conteudo, 2000);
    if (!embed.titulo && !embed.descricao && !conteudo) { avisos.push(`painel "${pn.nome || pn.id}" precisa de um título ou texto (ignorado)`); continue; }
    const idsItem = new Set();
    const itens = [];
    for (const it of (Array.isArray(pn.itens) ? pn.itens : []).slice(0, 25)) {
      if (!it || !ID.test(it.id ?? '') || idsItem.has(it.id)) continue;
      const a = it.acao ?? {};
      const tipo = ACOES.includes(a.tipo) ? a.tipo : null;
      if (!tipo || (menu && tipo === 'link')) { avisos.push(`item "${it.rotulo || it.id}" do painel "${pn.nome || pn.id}" sem ação válida (ignorado)`); continue; }
      const acao = { tipo };
      if (tipo === 'cargo') {
        acao.cargo = snow(a.cargo);
        acao.modo = ['alternar', 'dar', 'tirar'].includes(a.modo) ? a.modo : 'alternar';
        if (!acao.cargo) { avisos.push(`item "${it.rotulo || it.id}": escolha o cargo (ignorado)`); continue; }
      }
      if (tipo === 'formulario') {
        acao.formulario = ID.test(a.formulario ?? '') && idsForm.has(a.formulario) ? a.formulario : '';
        if (!acao.formulario) { avisos.push(`item "${it.rotulo || it.id}": o formulário escolhido não existe (ignorado)`); continue; }
      }
      if (tipo === 'link') {
        acao.url = ehUrl(str(a.url, 500)) ? str(a.url, 500) : '';
        if (!acao.url) { avisos.push(`item "${it.rotulo || it.id}": link precisa começar com https:// (ignorado)`); continue; }
      }
      if (tipo === 'ticket') {
        acao.assunto = str(a.assunto, 80);
        acao.categoria = snow(a.categoria);
        acao.equipe = snow(a.equipe);
      }
      acao.mensagem = str(a.mensagem, 2000);
      const rotulo = str(it.rotulo, menu ? 100 : 80);
      const emoji = emojiDeBotaoOk(it.emoji) ? it.emoji : '';
      if (it.emoji && !emoji) avisos.push(`emoji de "${rotulo || it.id}" inválido (removido)`);
      if (!rotulo && (menu || !emoji)) { avisos.push(`item "${it.id}" precisa de um nome${menu ? '' : ' ou emoji'} (ignorado)`); continue; }
      idsItem.add(it.id);
      itens.push({ id: it.id, rotulo, emoji, descricao: menu ? str(it.descricao, 100) : '', estilo: tipo === 'link' ? 'Link' : ESTILOS.includes(it.estilo) ? it.estilo : 'Secondary', acao });
    }
    if (!itens.length) { avisos.push(`painel "${pn.nome || pn.id}" ficou sem botões/opções válidos (ignorado)`); continue; }
    idsPainel.add(pn.id);
    out.paineis.push({
      id: pn.id, nome: str(pn.nome, 80) || pn.id, servidor: snow(pn.servidor), tipo: menu ? 'menu' : 'botoes',
      placeholder: str(pn.placeholder, 150), conteudo, embed, itens,
    });
  }
  return out;
}

/** Volta tudo ao padrão (apaga a personalização). */
export function resetar() {
  valores = vazio();
  gravar();
}

/**
 * Mensagens que cada servidor pode trocar no /config (boas-vindas, nível...).
 * Sem mensagem própria (ou com o texto padrão antigo, salvo por versões anteriores), usa o texto do bot,
 * que o dono pode personalizar.
 */
export const modeloOu = (salvo, antigoPadrao, textoDoBot) => (salvo && salvo !== antigoPadrao ? salvo : textoDoBot);

/** Coloca a dica (placeholder) num campo de modal, se o texto não estiver vazio. */
export const comDica = (campo, dica) => (dica ? campo.setPlaceholder(cortarEm(String(dica), LIMITES.placeholder)) : campo);
