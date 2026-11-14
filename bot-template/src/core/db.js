import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Armazenamento simples em arquivos JSON (pasta "data", ao lado do index.js).
 * Não precisa instalar banco de dados: cada coleção vira um arquivo, ex.: data/niveis.json.
 * Para fazer backup, basta copiar a pasta "data".
 *
 *   const niveis = colecao('niveis');
 *   const membro = niveis.de(guildId, userId);   // cria o objeto se não existir
 *   membro.xp = (membro.xp ?? 0) + 10;
 *   niveis.salvar();                            // grava em até 1,5 s (junta várias mudanças)
 */

const PASTA = fileURLToPath(new URL('../../data', import.meta.url));
fs.mkdirSync(PASTA, { recursive: true });

const cache = new Map();
const timers = new Map();
const arquivo = (nome) => path.join(PASTA, `${nome}.json`);

function carregar(nome) {
  if (cache.has(nome)) return cache.get(nome);
  let dados = {};
  try {
    dados = JSON.parse(fs.readFileSync(arquivo(nome), 'utf8'));
  } catch (e) {
    if (e.code !== 'ENOENT') {
      // arquivo corrompido: guarda uma cópia e começa do zero, sem derrubar o bot
      const copia = arquivo(`${nome}.corrompido-${Date.now()}`);
      try { fs.renameSync(arquivo(nome), copia); } catch { /* sem cópia */ }
      console.error(`[dados] ${nome}.json estava corrompido. Cópia salva em ${copia}`);
    }
  }
  cache.set(nome, dados);
  return dados;
}

function gravar(nome) {
  const tmp = `${arquivo(nome)}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(cache.get(nome)));
  fs.renameSync(tmp, arquivo(nome)); // troca de uma vez: o arquivo nunca fica pela metade
}

function agendar(nome) {
  if (timers.has(nome)) return;
  timers.set(nome, setTimeout(() => {
    timers.delete(nome);
    try { gravar(nome); } catch (e) { console.error(`[dados] Falha ao salvar ${nome}:`, e.message); }
  }, 1500));
}

export function colecao(nome) {
  const raiz = carregar(nome);
  return {
    /** Objeto em raiz[a][b]..., criado se não existir. */
    de(...chaves) {
      let o = raiz;
      for (const k of chaves) {
        if (o[k] == null || typeof o[k] !== 'object') o[k] = {};
        o = o[k];
      }
      return o;
    },
    /** Lê raiz[a][b]... sem criar nada. */
    ler(...chaves) {
      let o = raiz;
      for (const k of chaves) {
        if (o == null) return undefined;
        o = o[k];
      }
      return o;
    },
    apagar(...chaves) {
      const ultima = chaves.pop();
      const pai = this.ler(...chaves);
      if (pai && ultima in pai) delete pai[ultima];
      agendar(nome);
    },
    raiz,
    salvar() { agendar(nome); },
  };
}

/** Grava tudo na hora (usado ao desligar o bot). */
export function salvarTudo() {
  for (const nome of cache.keys()) {
    clearTimeout(timers.get(nome));
    timers.delete(nome);
    try { gravar(nome); } catch (e) { console.error(`[dados] Falha ao salvar ${nome}:`, e.message); }
  }
}
