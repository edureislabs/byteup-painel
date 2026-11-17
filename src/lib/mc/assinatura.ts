import { createHmac, createPrivateKey, createPublicKey, sign, verify } from "node:crypto";

/**
 * Licenças e passes dos plugins de Minecraft.
 *
 * Usa o MESMO par de chaves Ed25519 das licenças dos bots (derivado de BYTEUP_LICENCA_SEGREDO ou
 * NEXTAUTH_SECRET), então a chave pública é a mesma de src/lib/builder/licenca.ts. A ByteUpCore leva
 * essa chave pública dentro e confere tudo o que o site assina.
 *
 * - Licença: vai dentro do jar de quem comprou (download personalizado). Diz quem comprou e qual plugin.
 * - Passe: o site entrega quando confere a licença. Vale para UM servidor até "validoAte" e deixa
 *   o plugin ligar sem internet nesse prazo (se o site cair, o servidor do cliente não para).
 * - Chave do pack: abre o código do plugin (plugin.pack). Uma por licença; não vai no jar.
 */

export const FORMATO_LICENCA_PLUGIN = "byteup-plugin";
export const FORMATO_PASSE = "byteup-passe";
/** Quanto tempo o plugin pode ligar sem falar com o site. */
export const DIAS_OFFLINE = 7;

export type LicencaPlugin = {
  formato: typeof FORMATO_LICENCA_PLUGIN;
  versao: 1;
  id: string; // StoreOrderItem.id (ou "previa-<id do admin>")
  comprador: string; // ID do Discord
  plugin: string; // slug
  site: string;
  emitida: string;
  assinatura: string;
};
const CAMPOS_LICENCA = ["formato", "versao", "id", "comprador", "plugin", "site", "emitida"] as const;

export type Passe = {
  formato: typeof FORMATO_PASSE;
  versao: 1;
  licenca: string;
  servidor: string;
  plugin: string;
  validoAte: string;
  assinatura: string;
};
const CAMPOS_PASSE = ["formato", "versao", "licenca", "servidor", "plugin", "validoAte"] as const;

const PKCS8_ED25519 = Buffer.from("302e020100300506032b657004220420", "hex");
const SPKI_ED25519 = Buffer.from("302a300506032b6570032100", "hex");

function segredo(): string {
  const s = process.env.BYTEUP_LICENCA_SEGREDO || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("Falta BYTEUP_LICENCA_SEGREDO (ou NEXTAUTH_SECRET) para as licenças dos plugins.");
  return s;
}
const derivar = (rotulo: string) => createHmac("sha256", segredo()).update(`byteup:${rotulo}`).digest();

function chavePrivada() {
  return createPrivateKey({ key: Buffer.concat([PKCS8_ED25519, derivar("ed25519")]), format: "der", type: "pkcs8" });
}
function chavePublicaObj() {
  return createPublicKey(chavePrivada());
}
/** Chave pública (32 bytes, base64) que vai dentro da ByteUpCore. */
export function chavePublicaMc(): string {
  const der = chavePublicaObj().export({ format: "der", type: "spki" });
  return Buffer.from(der).subarray(SPKI_ED25519.length).toString("base64");
}

/** Chave AES-256 que abre o plugin.pack desta licença (sempre a mesma para a mesma licença). */
export function chaveDoPlugin(licencaId: string): Buffer {
  return derivar(`plugin-pack:${licencaId}`);
}

const assinar = (texto: string) => sign(null, Buffer.from(texto), chavePrivada()).toString("base64");
const confere = (texto: string, assinatura: string) => {
  try {
    return verify(null, Buffer.from(texto), chavePublicaObj(), Buffer.from(assinatura, "base64"));
  } catch {
    return false;
  }
};
const texto = (obj: Record<string, unknown>, campos: readonly string[]) => JSON.stringify(campos.map((k) => obj[k]));

export function emitirLicencaPlugin(d: { id: string; comprador: string; plugin: string; site: string }): LicencaPlugin {
  const base = { formato: FORMATO_LICENCA_PLUGIN as typeof FORMATO_LICENCA_PLUGIN, versao: 1 as const, ...d, emitida: new Date().toISOString() };
  return { ...base, assinatura: assinar(texto(base, CAMPOS_LICENCA)) };
}

export function licencaPluginValida(x: unknown): x is LicencaPlugin {
  if (!x || typeof x !== "object") return false;
  const l = x as Record<string, unknown>;
  if (l.formato !== FORMATO_LICENCA_PLUGIN || l.versao !== 1) return false;
  for (const k of ["id", "comprador", "plugin", "site", "emitida", "assinatura"]) {
    if (typeof l[k] !== "string" || (l[k] as string).length > 300) return false;
  }
  return confere(texto(l, CAMPOS_LICENCA), l.assinatura as string);
}

export function emitirPasse(d: { licenca: string; servidor: string; plugin: string }, agora = new Date()): Passe {
  const validoAte = new Date(agora.getTime() + DIAS_OFFLINE * 86_400_000).toISOString();
  const base = { formato: FORMATO_PASSE as typeof FORMATO_PASSE, versao: 1 as const, ...d, validoAte };
  return { ...base, assinatura: assinar(texto(base, CAMPOS_PASSE)) };
}

export function passeValido(x: unknown): x is Passe {
  if (!x || typeof x !== "object") return false;
  const p = x as Record<string, unknown>;
  if (p.formato !== FORMATO_PASSE || p.versao !== 1) return false;
  for (const k of ["licenca", "servidor", "plugin", "validoAte", "assinatura"]) {
    if (typeof p[k] !== "string" || (p[k] as string).length > 300) return false;
  }
  return confere(texto(p, CAMPOS_PASSE), p.assinatura as string);
}
