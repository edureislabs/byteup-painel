import {
  S3Client,
  CreateMultipartUploadCommand,
  UploadPartCommand,
  CompleteMultipartUploadCommand,
  AbortMultipartUploadCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

/**
 * Cloudflare R2 (compatível com S3). Guarda os arquivos da loja.
 *
 * Variáveis na Vercel:
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 *
 * O bucket é PRIVADO: ninguém baixa nada sem um link assinado gerado aqui.
 */

// Partes de 64 MB: um arquivo de 10 GB vira 160 partes.
export const PART_SIZE = 64 * 1024 * 1024;
export const MAX_FILE_SIZE = 50 * 1024 * 1024 * 1024; // 50 GB
export const MAX_IMAGE_SIZE = 5 * 1024 * 1024; // 5 MB

let client: S3Client | null = null;

export function r2Configured(): boolean {
  return Boolean(
    process.env.R2_ACCOUNT_ID && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY && process.env.R2_BUCKET
  );
}

function r2(): S3Client {
  if (!r2Configured()) throw new Error("R2 não configurado (variáveis R2_* faltando)");
  if (!client) {
    client = new S3Client({
      region: "auto",
      // R2_ENDPOINT só é usado em testes locais (servidor S3 falso)
      endpoint: process.env.R2_ENDPOINT || `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      forcePathStyle: Boolean(process.env.R2_ENDPOINT),
      credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID!,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
      },
    });
  }
  return client;
}

const bucket = () => process.env.R2_BUCKET!;

export async function startMultipart(key: string, contentType: string): Promise<string> {
  const res = await r2().send(new CreateMultipartUploadCommand({ Bucket: bucket(), Key: key, ContentType: contentType }));
  if (!res.UploadId) throw new Error("R2 não devolveu UploadId");
  return res.UploadId;
}

/** Links para o navegador enviar cada parte direto ao R2 (válidos por 1 h). */
export async function presignParts(key: string, uploadId: string, partNumbers: number[]): Promise<Record<number, string>> {
  const out: Record<number, string> = {};
  await Promise.all(
    partNumbers.map(async (n) => {
      out[n] = await getSignedUrl(
        r2(),
        new UploadPartCommand({ Bucket: bucket(), Key: key, UploadId: uploadId, PartNumber: n }),
        { expiresIn: 3600 }
      );
    })
  );
  return out;
}

export async function completeMultipart(key: string, uploadId: string, parts: { PartNumber: number; ETag: string }[]) {
  await r2().send(
    new CompleteMultipartUploadCommand({
      Bucket: bucket(),
      Key: key,
      UploadId: uploadId,
      MultipartUpload: { Parts: [...parts].sort((a, b) => a.PartNumber - b.PartNumber) },
    })
  );
}

export async function abortMultipart(key: string, uploadId: string) {
  try {
    await r2().send(new AbortMultipartUploadCommand({ Bucket: bucket(), Key: key, UploadId: uploadId }));
  } catch {
    // já finalizado ou inexistente
  }
}

/** Link de envio simples (para imagens pequenas). */
export async function presignPut(key: string, contentType: string, expiresIn = 600): Promise<string> {
  return getSignedUrl(r2(), new PutObjectCommand({ Bucket: bucket(), Key: key, ContentType: contentType }), { expiresIn });
}

/** Link de download que expira. `fileName` é o nome que aparece para quem baixa. */
export async function presignGet(key: string, opts: { fileName?: string; expiresIn?: number } = {}): Promise<string> {
  const disposition = opts.fileName
    ? `attachment; filename="${opts.fileName.replace(/["\\\r\n]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(opts.fileName)}`
    : undefined;
  return getSignedUrl(
    r2(),
    new GetObjectCommand({ Bucket: bucket(), Key: key, ResponseContentDisposition: disposition }),
    { expiresIn: opts.expiresIn ?? 3600 }
  );
}

export async function headObject(key: string): Promise<{ size: number; contentType: string } | null> {
  try {
    const res = await r2().send(new HeadObjectCommand({ Bucket: bucket(), Key: key }));
    return { size: Number(res.ContentLength ?? 0), contentType: res.ContentType ?? "" };
  } catch {
    return null;
  }
}

export async function deleteObject(key: string) {
  try {
    await r2().send(new DeleteObjectCommand({ Bucket: bucket(), Key: key }));
  } catch (err) {
    console.error("[r2] falha ao apagar", key, err);
  }
}

/** Nome seguro para usar no caminho do R2. */
export function safeFileName(name: string): string {
  const cleaned = name
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9._-]+/g, "_")
    .replace(/_+/g, "_")
    .replace(/^[._]+/, "")
    .slice(-120);
  return cleaned || "arquivo";
}