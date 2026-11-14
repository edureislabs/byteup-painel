import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/admin";
import {
  MAX_FILE_SIZE,
  MAX_IMAGE_SIZE,
  PART_SIZE,
  abortMultipart,
  completeMultipart,
  deleteObject,
  headObject,
  presignParts,
  presignPut,
  r2Configured,
  safeFileName,
  startMultipart,
} from "@/lib/r2";

/**
 * Upload dos arquivos da loja direto do navegador para o R2.
 * O arquivo NÃO passa pela Vercel (que só aceita 4,5 MB por requisição):
 * aqui só geramos os links assinados.
 *
 * Ações (POST JSON):
 *  start     { productId, fileName, size, contentType }        -> { fileId, partSize, partCount }
 *  parts     { fileId, partNumbers: number[] }                  -> { urls: { [n]: url } }
 *  complete  { fileId, parts: [{ partNumber, etag }] }          -> { ok }
 *  abort     { fileId }                                         -> { ok }
 *  image     { productId, contentType, size }                   -> { url, key }
 *  imageDone { productId, key }                                 -> { ok }
 */

const bad = (error: string, status = 400) => NextResponse.json({ error }, { status });
const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp", "image/gif": "gif" };

export async function POST(req: NextRequest) {
  const adminId = await getAdminUserId();
  if (!adminId) return bad("Não autorizado", 403);
  if (!r2Configured()) return bad("Armazenamento (R2) não configurado na Vercel.", 503);

  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return bad("JSON inválido");
  }

  const action = String(body.action || "");

  try {
    switch (action) {
      case "start": {
        const productId = String(body.productId || "");
        const fileName = String(body.fileName || "").slice(0, 200);
        const size = Number(body.size);
        const contentType = String(body.contentType || "") || "application/octet-stream";
        if (!fileName) return bad("Nome do arquivo vazio");
        if (!Number.isFinite(size) || size <= 0) return bad("Arquivo vazio");
        if (size > MAX_FILE_SIZE) return bad("Arquivo maior que 50 GB");

        const product = await prisma.storeProduct.findUnique({ where: { id: productId }, select: { id: true } });
        if (!product) return bad("Produto não encontrado", 404);

        const key = `products/${productId}/${randomUUID()}-${safeFileName(fileName)}`;
        const uploadId = await startMultipart(key, contentType);
        const file = await prisma.storeProductFile.create({
          data: { productId, key, fileName, sizeBytes: BigInt(size), contentType, status: "uploading", uploadId },
        });
        return NextResponse.json({ fileId: file.id, partSize: PART_SIZE, partCount: Math.ceil(size / PART_SIZE) });
      }

      case "parts": {
        const file = await prisma.storeProductFile.findUnique({ where: { id: String(body.fileId || "") } });
        if (!file || file.status !== "uploading" || !file.uploadId) return bad("Upload não encontrado", 404);
        const maxPart = Math.ceil(Number(file.sizeBytes) / PART_SIZE);
        const nums = Array.isArray(body.partNumbers) ? body.partNumbers.map(Number) : [];
        if (nums.length === 0 || nums.length > 100 || nums.some((n) => !Number.isInteger(n) || n < 1 || n > maxPart)) {
          return bad("Partes inválidas");
        }
        const urls = await presignParts(file.key, file.uploadId, nums);
        return NextResponse.json({ urls });
      }

      case "complete": {
        const file = await prisma.storeProductFile.findUnique({ where: { id: String(body.fileId || "") } });
        if (!file || file.status !== "uploading" || !file.uploadId) return bad("Upload não encontrado", 404);
        const raw = Array.isArray(body.parts) ? body.parts : [];
        const parts = raw
          .map((p: { partNumber?: unknown; etag?: unknown }) => ({ PartNumber: Number(p.partNumber), ETag: String(p.etag || "") }))
          .filter((p) => Number.isInteger(p.PartNumber) && p.ETag);
        const expected = Math.ceil(Number(file.sizeBytes) / PART_SIZE);
        if (parts.length !== expected) return bad(`Esperava ${expected} partes, recebi ${parts.length}`);

        await completeMultipart(file.key, file.uploadId, parts);
        const head = await headObject(file.key);
        await prisma.storeProductFile.update({
          where: { id: file.id },
          data: { status: "ready", uploadId: null, sizeBytes: BigInt(head?.size ?? Number(file.sizeBytes)) },
        });
        return NextResponse.json({ ok: true });
      }

      case "abort": {
        const file = await prisma.storeProductFile.findUnique({ where: { id: String(body.fileId || "") } });
        if (!file) return NextResponse.json({ ok: true });
        if (file.uploadId) await abortMultipart(file.key, file.uploadId);
        if (file.status !== "ready") await prisma.storeProductFile.delete({ where: { id: file.id } });
        return NextResponse.json({ ok: true });
      }

      case "image": {
        const productId = String(body.productId || "");
        const contentType = String(body.contentType || "");
        const size = Number(body.size);
        const ext = IMAGE_TYPES[contentType];
        if (!ext) return bad("Use PNG, JPG, WEBP ou GIF");
        if (!Number.isFinite(size) || size <= 0 || size > MAX_IMAGE_SIZE) return bad("Imagem maior que 5 MB");
        const product = await prisma.storeProduct.findUnique({ where: { id: productId }, select: { id: true } });
        if (!product) return bad("Produto não encontrado", 404);

        const key = `images/${productId}/${randomUUID()}.${ext}`;
        const url = await presignPut(key, contentType);
        return NextResponse.json({ url, key });
      }

      case "imageDone": {
        const productId = String(body.productId || "");
        const key = String(body.key || "");
        if (!key.startsWith(`images/${productId}/`)) return bad("Imagem inválida");
        const head = await headObject(key);
        if (!head) return bad("A imagem não chegou ao armazenamento");
        if (head.size > MAX_IMAGE_SIZE || !IMAGE_TYPES[head.contentType]) {
          await deleteObject(key);
          return bad("Imagem inválida");
        }
        const product = await prisma.storeProduct.findUnique({ where: { id: productId }, select: { imageKey: true } });
        if (!product) return bad("Produto não encontrado", 404);
        await prisma.storeProduct.update({ where: { id: productId }, data: { imageKey: key } });
        if (product.imageKey && product.imageKey !== key) await deleteObject(product.imageKey);
        return NextResponse.json({ ok: true });
      }

      default:
        return bad("Ação desconhecida");
    }
  } catch (err) {
    console.error("[loja/upload]", action, err);
    return bad("Erro no armazenamento. Tente de novo.", 500);
  }
}
