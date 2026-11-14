import { slugify } from "@/lib/storeShared";
import { BUILDER_MODULES, type BuilderOptions } from "./catalog";
import { generateReadme } from "./readme";
import { TEMPLATE_FILES, TEMPLATE_VERSION } from "./templateFiles";
import { createZip, type ZipEntry } from "./zip";

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

  for (const [nome, conteudo] of Object.entries(TEMPLATE_FILES)) {
    if (nome === "package.json" || nome === "config.json" || nome === "README.md") continue;
    const modulo = /^src\/modules\/([\w-]+)\.js$/.exec(nome)?.[1];
    if (modulo && (!vendidos.has(modulo) || !escolhidos.has(modulo))) continue;
    entries.push({ name: `${slug}/${nome}`, data: conteudo });
  }

  const pkg = JSON.parse(TEMPLATE_FILES["package.json"]);
  pkg.name = slug;
  pkg.description = `${opts.nome}: bot para Discord (módulos: ${opts.modulos.join(", ")})`;
  const config = { nome: opts.nome, cor: opts.cor, status: "Use /ajuda", modulos: opts.modulos };

  entries.unshift(
    { name: `${slug}/README.md`, data: generateReadme(opts, siteUrl) },
    { name: `${slug}/package.json`, data: `${JSON.stringify(pkg, null, 2)}\n` },
    { name: `${slug}/config.json`, data: `${JSON.stringify(config, null, 2)}\n` }
  );

  return { fileName: `${slug}.zip`, buffer: createZip(entries), version: TEMPLATE_VERSION };
}
