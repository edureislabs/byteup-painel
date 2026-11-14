import { slugify } from "@/lib/storeShared";
import { BUILDER_MODULES, botModulesOnly, builderModule, type BuilderOptions } from "./catalog";
import { generateReadme } from "./readme";
import { TEMPLATE_FILES, TEMPLATE_VERSION } from "./templateFiles";
import { createZip, type ZipEntry } from "./zip";

/** Arquivos que mudam em cada pedido (o resto vem igual da pasta bot-template/). */
export const GENERATED_FILES = ["README.md", "package.json", "config.json", "discloud.config", "squarecloud.app"] as const;

export function generatedFiles(opts: BuilderOptions, siteUrl: string): Record<(typeof GENERATED_FILES)[number], string> {
  const slug = slugify(opts.nome) || "meu-bot";
  const pkg = JSON.parse(TEMPLATE_FILES["package.json"]);
  pkg.name = slug;
  const modulos = botModulesOnly(opts.modulos); // ferramentas extras não entram no config.json
  pkg.description = `${opts.nome}: bot para Discord (módulos: ${modulos.join(", ")})`;
  const config = { nome: opts.nome, cor: opts.cor, status: "Use /ajuda", modulos };
  const nomeHost = opts.nome.replace(/[\r\n=]/g, " ").slice(0, 32);
  return {
    "README.md": generateReadme(opts, siteUrl),
    "package.json": `${JSON.stringify(pkg, null, 2)}\n`,
    "config.json": `${JSON.stringify(config, null, 2)}\n`,
    // hospedagens brasileiras: já vão prontos (o README explica)
    "discloud.config": `NAME=${nomeHost}\nTYPE=bot\nMAIN=index.js\nRAM=100\nVERSION=latest\n`,
    "squarecloud.app": `MAIN=index.js\nMEMORY=256\nVERSION=recommended\nDISPLAY_NAME=${nomeHost}\nDESCRIPTION=Bot para Discord\n`,
  };
}

/** Em qual módulo (ou ferramenta extra) cada arquivo do template entra (null = vai em todo bot). */
export function moduleOfFile(nome: string): string | null {
  return /^src\/modules\/([\w-]+)\.js$/.exec(nome)?.[1] ?? /^extras\/([\w-]+)\//.exec(nome)?.[1] ?? null;
}

/** Onde o arquivo fica dentro do bot (as ferramentas extras vão para a raiz). */
const destinoNoBot = (nome: string) => nome.replace(/^extras\/[\w-]+\//, "");

/** Arquivos do Windows (.bat, .ps1) precisam de quebra de linha CRLF. */
const paraWindows = (nome: string, conteudo: string) => (/\.(bat|cmd|ps1)$/i.test(nome) ? conteudo.replace(/\r?\n/g, "\r\n") : conteudo);

/**
 * Monta o .zip do "Monte o seu bot" com os módulos escolhidos.
 * O código vem da pasta bot-template/ (empacotada em templateFiles.ts);
 * package.json, config.json e README.md são gerados para cada pedido.
 */
export function buildBotZip(opts: BuilderOptions, siteUrl: string) {
  const slug = slugify(opts.nome) || "meu-bot";
  const escolhidos = new Set(opts.modulos);
  const vendidos = new Set(BUILDER_MODULES.map((m) => m.id));
  const entries: ZipEntry[] = [];

  const gerados = generatedFiles(opts, siteUrl);
  for (const nome of GENERATED_FILES) entries.push({ name: `${slug}/${nome}`, data: gerados[nome] });

  for (const [nome, conteudo] of Object.entries(TEMPLATE_FILES)) {
    if ((GENERATED_FILES as readonly string[]).includes(nome)) continue;
    const modulo = moduleOfFile(nome);
    if (modulo && (!vendidos.has(modulo) || !escolhidos.has(modulo))) continue;
    // ferramentas "fora" (ex.: Inicializador) ficam na raiz do .zip, ao lado da pasta do bot
    const fora = modulo ? builderModule(modulo)?.fora : false;
    entries.push({ name: fora ? destinoNoBot(nome) : `${slug}/${destinoNoBot(nome)}`, data: paraWindows(nome, conteudo) });
  }

  return { fileName: `${slug}.zip`, buffer: createZip(entries), version: TEMPLATE_VERSION };
}
