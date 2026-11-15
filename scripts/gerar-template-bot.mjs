// Junta os arquivos da pasta bot-template/ num módulo TypeScript (src/lib/builder/templateFiles.ts).
// Assim o painel monta o .zip do "Monte o seu bot" sem ler arquivos do disco na Vercel.
// Roda sozinho antes do "npm run dev" e do "npm run build" (scripts predev/prebuild do package.json).
// O código do bot (index.js e src/**/*.js) também vai embaralhado (javascript-obfuscator) em TEMPLATE_OFUSCADO:
// é essa versão que vai criptografada no bot.pack de cada cliente.
import fs from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const origem = path.join(raiz, 'bot-template');
const destino = path.join(raiz, 'src', 'lib', 'builder', 'templateFiles.ts');
const IGNORAR = new Set(['node_modules', 'data', '.env', 'package-lock.json', 'README.md']);

if (!fs.existsSync(origem)) {
  console.error('[template do bot] pasta bot-template/ não encontrada');
  process.exit(1);
}

const arquivos = {};
(function ler(pasta, prefixo) {
  for (const item of fs.readdirSync(pasta, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name))) {
    if (IGNORAR.has(item.name)) continue;
    const caminho = path.join(pasta, item.name);
    const nome = prefixo ? `${prefixo}/${item.name}` : item.name;
    if (item.isDirectory()) ler(caminho, nome);
    else arquivos[nome] = fs.readFileSync(caminho, 'utf8').replace(/\r\n/g, '\n');
  }
})(origem, '');

const versao = crypto.createHash('sha1').update(JSON.stringify(arquivos)).digest('hex').slice(0, 12);
const linhas = Object.entries(arquivos).map(([nome, conteudo]) => `  ${JSON.stringify(nome)}: ${JSON.stringify(conteudo)},`);

// permissões especiais (intents) que cada módulo pede: lidas do código original, antes de embaralhar
const MARCAS = { members: 'GatewayIntentBits.GuildMembers', content: 'GatewayIntentBits.MessageContent', presence: 'GatewayIntentBits.GuildPresences' };
const intents = {};
for (const [nome, conteudo] of Object.entries(arquivos)) {
  const id = /^src\/modules\/([\w-]+)\.js$/.exec(nome)?.[1];
  if (id) intents[id] = Object.keys(MARCAS).filter((k) => conteudo.includes(MARCAS[k]));
}

// código embaralhado (sempre igual para a mesma versão: a semente vem da versão)
const ehCodigo = (nome) => nome === 'index.js' || /^src\/.+\.js$/.test(nome);
let ofuscado = {};
let obfuscator = null;
try {
  obfuscator = createRequire(import.meta.url)('javascript-obfuscator');
} catch {
  console.warn('[template do bot] ⚠️ javascript-obfuscator não está instalado (rode: npm install javascript-obfuscator). O código vai sem embaralhar.');
}
const anterior = fs.existsSync(destino) ? fs.readFileSync(destino, 'utf8') : '';
const reaproveitar = obfuscator && anterior.includes(`export const TEMPLATE_VERSION = ${JSON.stringify(versao)};`) && anterior.includes('TEMPLATE_OFUSCADO_OK = true');
if (obfuscator && !reaproveitar) {
  const semente = parseInt(versao.slice(0, 8), 16);
  const t0 = Date.now();
  for (const [nome, conteudo] of Object.entries(arquivos)) {
    if (!ehCodigo(nome)) continue;
    ofuscado[nome] = obfuscator
      .obfuscate(conteudo, {
        compact: true,
        controlFlowFlattening: true,
        controlFlowFlatteningThreshold: 0.25,
        deadCodeInjection: true,
        deadCodeInjectionThreshold: 0.1,
        identifierNamesGenerator: 'hexadecimal',
        numbersToExpressions: true,
        simplify: true,
        splitStrings: true,
        splitStringsChunkLength: 10,
        stringArray: true,
        stringArrayEncoding: ['base64'],
        stringArrayThreshold: 0.75,
        stringArrayRotate: true,
        stringArrayShuffle: true,
        stringArrayWrappersCount: 2,
        stringArrayWrappersType: 'function',
        transformObjectKeys: false,
        renameGlobals: false,
        target: 'node',
        sourceType: 'module',
        seed: semente,
      })
      .getObfuscatedCode();
  }
  console.log(`[template do bot] código embaralhado em ${((Date.now() - t0) / 1000).toFixed(1)} s`);
} else if (reaproveitar) {
  // mesma versão: reaproveita o que já foi embaralhado
  const m = /export const TEMPLATE_OFUSCADO: Record<string, string> = (\{[\s\S]*?\n\});\n/.exec(anterior);
  ofuscado = m ? JSON.parse(m[1]) : {};
}
const linhasOfusc = JSON.stringify(ofuscado, null, 1);
const saida = [
  '// GERADO AUTOMATICAMENTE por scripts/gerar-template-bot.mjs a partir da pasta bot-template/.',
  '// Não edite aqui: edite os arquivos em bot-template/ (o "npm run dev" e o "npm run build" geram de novo).',
  `export const TEMPLATE_VERSION = ${JSON.stringify(versao)};`,
  '',
  'export const TEMPLATE_FILES: Record<string, string> = {',
  ...linhas,
  '};',
  '',
  '/** Permissões especiais (intents) de cada módulo. */',
  `export const TEMPLATE_INTENTS: Record<string, string[]> = ${JSON.stringify(intents)};`,
  '',
  '/** Código do bot embaralhado (vai criptografado no bot.pack). Vazio = sem o javascript-obfuscator. */',
  `export const TEMPLATE_OFUSCADO: Record<string, string> = ${linhasOfusc};`,
  `export const TEMPLATE_OFUSCADO_OK = ${Object.keys(ofuscado).length > 0};`,
  '',
].join('\n');

const atual = anterior;
if (atual !== saida) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, saida);
  console.log(`[template do bot] ${Object.keys(arquivos).length} arquivos → src/lib/builder/templateFiles.ts (versão ${versao})`);
} else {
  console.log(`[template do bot] sem mudanças (versão ${versao})`);
}
