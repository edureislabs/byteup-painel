// Junta os arquivos da pasta bot-template/ num módulo TypeScript (src/lib/builder/templateFiles.ts).
// Assim o painel monta o .zip do "Monte o seu bot" sem ler arquivos do disco na Vercel.
// Roda sozinho antes do "npm run dev" e do "npm run build" (scripts predev/prebuild do package.json).
import fs from 'node:fs';
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
const saida = [
  '// GERADO AUTOMATICAMENTE por scripts/gerar-template-bot.mjs a partir da pasta bot-template/.',
  '// Não edite aqui: edite os arquivos em bot-template/ (o "npm run dev" e o "npm run build" geram de novo).',
  `export const TEMPLATE_VERSION = ${JSON.stringify(versao)};`,
  '',
  'export const TEMPLATE_FILES: Record<string, string> = {',
  ...linhas,
  '};',
  '',
].join('\n');

const atual = fs.existsSync(destino) ? fs.readFileSync(destino, 'utf8') : '';
if (atual !== saida) {
  fs.mkdirSync(path.dirname(destino), { recursive: true });
  fs.writeFileSync(destino, saida);
  console.log(`[template do bot] ${Object.keys(arquivos).length} arquivos → src/lib/builder/templateFiles.ts (versão ${versao})`);
} else {
  console.log(`[template do bot] sem mudanças (versão ${versao})`);
}
