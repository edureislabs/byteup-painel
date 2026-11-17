import { createCipheriv, randomBytes } from "node:crypto";
import { createZip, type ZipEntry } from "@/lib/builder/zip";
import { lerZip } from "./zipLer";
import { chaveDoPlugin, chavePublicaMc, type LicencaPlugin } from "./assinatura";

/**
 * Monta o jar de um plugin pago para UMA licença:
 *  - todas as classes do plugin vão para byteup/plugin.pack, criptografadas (AES-256-GCM) com a
 *    chave desta licença. A chave não vai no jar: o porteiro pede ao site quando o servidor liga.
 *  - ficam abertos: o porteiro (com/byteup/porteiro/), o plugin.yml e os recursos (config, idiomas,
 *    imagens), que o plugin lê do próprio jar.
 *  - vão junto: byteup/licenca.json (licença assinada) e byteup/chave-publica.txt (confere assinaturas).
 *
 * Formato do pack: "BPK1" + iv (12) + tag (16) + dados; dentro, um zip só com as classes.
 */
export const PORTEIRO = "com/byteup/porteiro/";
const MAIN_PORTEIRO = "com.byteup.porteiro.Porteiro";

export class JarInvalido extends Error {}

export function conferirJarBase(entradas: { name: string; data: Buffer }[]): string {
  const yml = entradas.find((e) => e.name === "plugin.yml");
  if (!yml) throw new JarInvalido("o jar não tem plugin.yml");
  const texto = yml.data.toString("utf8");
  const main = /^main:\s*['"]?([\w.$]+)/m.exec(texto)?.[1];
  if (main !== MAIN_PORTEIRO) throw new JarInvalido(`o plugin.yml precisa ter main: ${MAIN_PORTEIRO} (está: ${main ?? "nenhum"}). Use o jar "premium" do Gradle.`);
  if (!/^\s+modulo:\s*\S+/m.test(texto) || !/^byteup:/m.test(texto)) throw new JarInvalido("o plugin.yml precisa da seção byteup: { plugin, modulo }");
  if (!entradas.some((e) => e.name.startsWith(PORTEIRO) && e.name.endsWith(".class"))) throw new JarInvalido("o jar não tem o porteiro (com/byteup/porteiro/)");
  return texto;
}

export function personalizarJar(jar: Buffer, licenca: LicencaPlugin): Buffer {
  const entradas = lerZip(jar).filter((e) => !/^META-INF\/.*\.(SF|RSA|DSA|EC)$/i.test(e.name)); // assinaturas de jar não valem mais
  conferirJarBase(entradas);
  const fechadas: ZipEntry[] = [];
  const abertas: ZipEntry[] = [];
  for (const e of entradas) {
    if (e.name.startsWith("byteup/")) continue; // de um jar já personalizado: refeito abaixo
    if (e.name.endsWith(".class") && !e.name.startsWith(PORTEIRO) && e.name !== "module-info.class") fechadas.push(e);
    else abertas.push(e);
  }
  if (fechadas.length === 0) throw new JarInvalido("o jar não tem classes do plugin para proteger");
  const interno = createZip(fechadas);
  const iv = randomBytes(12);
  const cifra = createCipheriv("aes-256-gcm", chaveDoPlugin(licenca.id), iv);
  const dados = Buffer.concat([cifra.update(interno), cifra.final()]);
  const pack = Buffer.concat([Buffer.from("BPK1"), iv, cifra.getAuthTag(), dados]);
  return createZip([
    ...abertas,
    { name: "byteup/plugin.pack", data: pack },
    { name: "byteup/licenca.json", data: JSON.stringify(licenca, null, 2) },
    { name: "byteup/chave-publica.txt", data: chavePublicaMc() },
  ]);
}
