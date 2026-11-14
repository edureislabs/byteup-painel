// Carregador do bot da loja ByteUP.
// O código do bot fica criptografado no arquivo bot.pack e só abre para quem comprou:
// ao ligar, o bot confere que o aplicativo do Discord é da conta que comprou e pede a chave ao site.
// Sem internet, ele usa a última conferência por até 7 dias.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { createCipheriv, createDecipheriv, createHash, createPublicKey, randomBytes, verify } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import * as modulo from 'node:module';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

const RAIZ = new URL('./', import.meta.url);
const CHAVE_PUBLICA = '__CHAVE_PUBLICA__';
const VERSAO = '__VERSAO__';
const DIAS_SEM_INTERNET = 7;
const caminho = (rel) => fileURLToPath(new URL(rel, RAIZ));
dotenv.config({ path: caminho('.env'), quiet: true });

function sair(...linhas) {
  console.error(linhas.join('\n'));
  process.exit(1);
}

if (typeof modulo.register !== 'function') {
  sair('❌ Este bot precisa do Node.js 20.6 ou mais novo. Atualize o Node.js (o Inicializador faz isso sozinho) ou, na hospedagem, escolha a versão mais nova.');
}

// ---------------- licença ----------------
let licenca;
try {
  licenca = JSON.parse(readFileSync(caminho('licenca.json'), 'utf8'));
} catch {
  sair('❌ Não achei o arquivo licenca.json. Baixe o bot de novo em Minhas compras, no site da loja.');
}
{
  const texto = JSON.stringify(['formato', 'versao', 'id', 'comprador', 'bot', 'site', 'emitida'].map((k) => licenca[k]));
  const chave = createPublicKey({ key: Buffer.concat([Buffer.from('302a300506032b6570032100', 'hex'), Buffer.from(CHAVE_PUBLICA, 'base64')]), format: 'der', type: 'spki' });
  let ok = false;
  try {
    ok = verify(null, Buffer.from(texto), chave, Buffer.from(String(licenca.assinatura), 'base64'));
  } catch { /* assinatura inválida */ }
  if (!ok) sair('❌ O arquivo licenca.json foi alterado ou não é deste bot. Baixe o bot de novo em Minhas compras.');
}

const token = process.env.DISCORD_TOKEN;
if (!token) sair('❌ Falta o token do bot. Copie o arquivo .env.example para .env e preencha DISCORD_TOKEN (veja o README).');

// ---------------- o aplicativo do bot é de quem comprou? ----------------
let app;
try {
  const r = await fetch('https://discord.com/api/v10/oauth2/applications/@me', { headers: { Authorization: `Bot ${token}` } });
  if (r.status === 401) {
    sair('❌ Não consegui entrar no Discord: o token está errado.', '   Gere outro no Developer Portal → Bot → Reset Token e cole no .env.');
  }
  if (!r.ok) throw new Error(`Discord respondeu ${r.status}`);
  app = await r.json();
} catch (e) {
  sair(`❌ Não consegui falar com o Discord (${e.message}). Confira a internet e tente de novo.`);
}
const dono = app.team ? String(app.team.owner_user_id) : String(app.owner?.id ?? '');
if (dono !== licenca.comprador) {
  sair(
    '❌ Esta cópia do bot está licenciada para outra conta do Discord.',
    `   Ela só funciona com um bot criado na conta que comprou na loja (ID ${licenca.comprador}).`,
    '   Entre nessa conta no Discord Developer Portal, crie o bot lá e use o token dele.',
  );
}

// ---------------- chave do código (pede ao site; guarda por alguns dias) ----------------
const arqCache = caminho('data/.licenca');
const chaveCache = createHash('sha256').update(`${licenca.id}|${app.id}|${dono}|${licenca.assinatura}`).digest();
function lerCache() {
  try {
    const c = JSON.parse(readFileSync(arqCache, 'utf8'));
    if (!(c.ate > Date.now())) return null;
    const b = Buffer.from(c.dados, 'base64');
    const d = createDecipheriv('aes-256-gcm', chaveCache, b.subarray(0, 12));
    d.setAuthTag(b.subarray(12, 28));
    return { chave: Buffer.concat([d.update(b.subarray(28)), d.final()]), ate: c.ate };
  } catch {
    return null;
  }
}
function salvarCache(chave) {
  try {
    if (!existsSync(caminho('data'))) mkdirSync(caminho('data'), { recursive: true });
    const iv = randomBytes(12);
    const c = createCipheriv('aes-256-gcm', chaveCache, iv);
    const dados = Buffer.concat([c.update(chave), c.final()]);
    const ate = Date.now() + DIAS_SEM_INTERNET * 864e5;
    writeFileSync(arqCache, JSON.stringify({ ate, dados: Buffer.concat([iv, c.getAuthTag(), dados]).toString('base64') }));
  } catch { /* pasta só de leitura */ }
}

const MOTIVOS = {
  bloqueada: 'Esta licença foi bloqueada pela loja. Fale com o suporte da loja.',
  dono: `Este bot só funciona com um aplicativo da conta que comprou (ID ${licenca.comprador}).`,
  invalida: 'A licença não é válida. Baixe o bot de novo em Minhas compras.',
  pedido: 'O pedido deste bot não está pago ou foi cancelado.',
};
/** { ok, chave } | { negado: motivo } | { offline: true } */
async function conferirNoSite() {
  try {
    const r = await fetch(`${licenca.site.replace(/\/$/, '')}/api/public/licenca`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ licenca, app: app.id, dono, nome: app.name, versao: VERSAO }),
      signal: AbortSignal.timeout(15_000),
    });
    const j = await r.json().catch(() => ({}));
    if (r.ok && j.ok && j.chave) return { ok: true, chave: Buffer.from(j.chave, 'base64') };
    if (r.status === 403 && j.motivo) return { negado: j.motivo };
    return { offline: true };
  } catch {
    return { offline: true };
  }
}

let chave;
const resp = await conferirNoSite();
if (resp.negado) sair(`❌ ${MOTIVOS[resp.negado] ?? MOTIVOS.invalida}`);
if (resp.ok) {
  chave = resp.chave;
  salvarCache(chave);
} else {
  const c = lerCache();
  if (!c) sair('❌ Não consegui conferir a licença no site da loja (sem internet ou o site está fora do ar). Tente de novo em alguns minutos.');
  chave = c.chave;
  console.log(`⚠️ Não consegui falar com o site da loja: usando a última conferência (vale até ${new Date(c.ate).toLocaleString('pt-BR')}).`);
}

// ---------------- abre o código ----------------
let pacote;
try {
  const b = readFileSync(caminho('bot.pack'));
  if (b.subarray(0, 4).toString() !== 'BUP1') throw new Error('formato');
  const d = createDecipheriv('aes-256-gcm', chave, b.subarray(4, 16));
  d.setAuthTag(b.subarray(16, 32));
  pacote = JSON.parse(gunzipSync(Buffer.concat([d.update(b.subarray(32)), d.final()])).toString('utf8'));
} catch {
  sair('❌ Não consegui abrir o arquivo bot.pack (ele foi alterado ou é de outro bot). Baixe o bot de novo em Minhas compras.');
}
const arquivos = {};
for (const [rel, fonte] of Object.entries(pacote.arquivos)) arquivos[new URL(rel, RAIZ).href] = fonte;

const GANCHOS = `
let arquivos = {};
export async function initialize(d) { arquivos = d.arquivos; }
export async function resolve(spec, ctx, next) {
  if (arquivos[spec] !== undefined) return { url: spec, format: 'module', shortCircuit: true };
  if (ctx.parentURL && arquivos[ctx.parentURL] !== undefined && (spec.startsWith('./') || spec.startsWith('../'))) {
    const url = new URL(spec, ctx.parentURL).href;
    if (arquivos[url] !== undefined) return { url, format: 'module', shortCircuit: true };
  }
  return next(spec, ctx);
}
export async function load(url, ctx, next) {
  if (arquivos[url] !== undefined) return { format: 'module', source: arquivos[url], shortCircuit: true };
  return next(url, ctx);
}`;
modulo.register(`data:text/javascript,${encodeURIComponent(GANCHOS)}`, { data: { arquivos } });

console.log(`🔒 Licença conferida · ${app.name} · conta ${dono}`);

// confere de novo a cada 12 horas: licença bloqueada desliga o bot
setInterval(async () => {
  const r = await conferirNoSite();
  if (r.ok) return salvarCache(r.chave);
  if (r.negado || !lerCache()) {
    console.error(`❌ ${r.negado ? (MOTIVOS[r.negado] ?? MOTIVOS.invalida) : 'Faz mais de 7 dias que não consigo conferir a licença no site da loja.'} Desligando.`);
    process.emit('SIGTERM');
  }
}, 12 * 3600e3).unref();

await import(new URL('principal.js', RAIZ).href);
