import { createCipheriv, createHmac, createPrivateKey, createPublicKey, randomBytes, sign, verify } from "node:crypto";
import { gzipSync } from "node:zlib";

/**
 * Licença do "Monte o seu bot".
 *
 * - Cada bot vendido tem uma licença assinada (Ed25519) com o ID do Discord de quem comprou.
 * - O código do bot vai criptografado (AES-256-GCM) no arquivo bot.pack. A chave NÃO vai no .zip:
 *   o bot pede ao site quando liga (/api/public/licenca), e o site só entrega se o aplicativo do
 *   bot for da conta que comprou e a licença não estiver bloqueada.
 * - Tudo é derivado de um segredo do servidor (BYTEUP_LICENCA_SEGREDO ou, se não existir,
 *   NEXTAUTH_SECRET). Trocar esse segredo invalida todos os bots já vendidos.
 */

export const FORMATO_LICENCA = "byteup-licenca";
const CAMPOS = ["formato", "versao", "id", "comprador", "bot", "site", "emitida"] as const;
export type Licenca = {
  formato: typeof FORMATO_LICENCA;
  versao: 1;
  id: string;
  comprador: string;
  bot: string;
  site: string;
  emitida: string;
  assinatura: string;
};

const PKCS8_ED25519 = Buffer.from("302e020100300506032b657004220420", "hex");
const SPKI_ED25519 = Buffer.from("302a300506032b6570032100", "hex");

function segredo(): string {
  const s = process.env.BYTEUP_LICENCA_SEGREDO || process.env.NEXTAUTH_SECRET;
  if (!s) throw new Error("Falta BYTEUP_LICENCA_SEGREDO (ou NEXTAUTH_SECRET) para gerar a licença do bot.");
  return s;
}
const derivar = (rotulo: string) => createHmac("sha256", segredo()).update(`byteup:${rotulo}`).digest();

function chavePrivada() {
  return createPrivateKey({ key: Buffer.concat([PKCS8_ED25519, derivar("ed25519")]), format: "der", type: "pkcs8" });
}
/** Chave pública (32 bytes em base64) que vai dentro do bot para conferir a licença. */
export function chavePublica(): string {
  const der = createPublicKey(chavePrivada()).export({ format: "der", type: "spki" });
  return Buffer.from(der).subarray(SPKI_ED25519.length).toString("base64");
}

/** Chave que criptografa o código de um bot (sempre a mesma para a mesma licença). */
export function chaveDoBot(licencaId: string): Buffer {
  return derivar(`pack:${licencaId}`);
}

const textoAssinado = (l: Omit<Licenca, "assinatura">) => JSON.stringify(CAMPOS.map((k) => l[k]));

export function emitirLicenca(dados: { id: string; comprador: string; bot: string; site: string }): Licenca {
  const base = { formato: FORMATO_LICENCA as typeof FORMATO_LICENCA, versao: 1 as const, ...dados, emitida: new Date().toISOString() };
  const assinatura = sign(null, Buffer.from(textoAssinado(base)), chavePrivada()).toString("base64");
  return { ...base, assinatura };
}

export function licencaValida(x: unknown): x is Licenca {
  if (!x || typeof x !== "object") return false;
  const l = x as Record<string, unknown>;
  if (l.formato !== FORMATO_LICENCA || l.versao !== 1) return false;
  for (const k of ["id", "comprador", "bot", "site", "emitida", "assinatura"]) if (typeof l[k] !== "string" || (l[k] as string).length > 300) return false;
  try {
    const pub = createPublicKey({ key: Buffer.concat([SPKI_ED25519, Buffer.from(chavePublica(), "base64")]), format: "der", type: "spki" });
    return verify(null, Buffer.from(textoAssinado(l as Licenca)), pub, Buffer.from(l.assinatura as string, "base64"));
  } catch {
    return false;
  }
}

/**
 * Criptografa o código do bot: "BUP1" + iv (12) + tag (16) + dados.
 * Dentro: gzip de { licenca, arquivos: { "src/core/util.js": "..." } }.
 */
export function empacotar(arquivos: Record<string, string>, licencaId: string): Buffer {
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chaveDoBot(licencaId), iv);
  const dados = Buffer.concat([cifra.update(gzipSync(JSON.stringify({ licenca: licencaId, arquivos }), { level: 9 })), cifra.final()]);
  return Buffer.concat([Buffer.from("BUP1"), iv, cifra.getAuthTag(), dados]);
}
