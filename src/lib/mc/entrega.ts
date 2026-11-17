import { getObjectBytes, headObject, presignGet, putObject } from "@/lib/r2";
import { siteUrl } from "@/lib/mercadopago";
import { emitirLicencaPlugin } from "./assinatura";
import { personalizarJar } from "./montarPlugin";

/**
 * Jar personalizado de uma licença: monta uma vez, guarda no R2 e devolve um link que vale 1 h.
 * Mudou o arquivo do produto (upload novo = ID novo) → monta de novo na próxima vez.
 */
export async function linkDoJar(d: {
  licencaId: string;
  comprador: string;
  plugin: string;
  arquivo: { id: string; key: string; fileName: string };
}): Promise<string> {
  const destino = `plugins-montados/${d.licencaId}/${d.arquivo.id}.jar`;
  if (!(await headObject(destino))) {
    const base = await getObjectBytes(d.arquivo.key);
    if (!base) throw new Error("arquivo do produto não encontrado no R2: " + d.arquivo.key);
    const licenca = emitirLicencaPlugin({ id: d.licencaId, comprador: d.comprador, plugin: d.plugin, site: siteUrl() });
    await putObject(destino, personalizarJar(base, licenca), "application/java-archive");
  }
  return presignGet(destino, { fileName: d.arquivo.fileName, expiresIn: 3600 });
}
