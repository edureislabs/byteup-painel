import { inflateRawSync } from "node:zlib";

/**
 * Lê um .zip/.jar da memória (sem bibliotecas). Suporta arquivos guardados (0) e deflate (8),
 * que é o que o Gradle e o Maven geram. Zip64 (arquivos acima de 4 GB) não é suportado.
 */
export type ArquivoZip = { name: string; data: Buffer };

export function lerZip(buf: Buffer): ArquivoZip[] {
  // fim do diretório central: procura de trás para frente (o comentário pode ter até 64 KB)
  let fim = -1;
  for (let i = buf.length - 22; i >= Math.max(0, buf.length - 22 - 65_535); i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) {
      fim = i;
      break;
    }
  }
  if (fim < 0) throw new Error("não é um arquivo .zip/.jar válido");
  const total = buf.readUInt16LE(fim + 10);
  let p = buf.readUInt32LE(fim + 16);
  const out: ArquivoZip[] = [];
  for (let k = 0; k < total; k++) {
    if (buf.readUInt32LE(p) !== 0x02014b50) throw new Error("diretório do zip corrompido");
    const metodo = buf.readUInt16LE(p + 10);
    const tamComp = buf.readUInt32LE(p + 20);
    const tamNome = buf.readUInt16LE(p + 28);
    const tamExtra = buf.readUInt16LE(p + 30);
    const tamComent = buf.readUInt16LE(p + 32);
    const local = buf.readUInt32LE(p + 42);
    const name = buf.subarray(p + 46, p + 46 + tamNome).toString("utf8");
    p += 46 + tamNome + tamExtra + tamComent;
    if (name.endsWith("/")) continue; // pasta
    if (buf.readUInt32LE(local) !== 0x04034b50) throw new Error("arquivo do zip corrompido: " + name);
    const ini = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const corpo = buf.subarray(ini, ini + tamComp);
    if (metodo === 0) out.push({ name, data: Buffer.from(corpo) });
    else if (metodo === 8) out.push({ name, data: inflateRawSync(corpo) });
    else throw new Error(`compressão não suportada (${metodo}) em ${name}`);
  }
  return out;
}
