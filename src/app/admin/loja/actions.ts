"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/admin";
import { deleteObject, abortMultipart } from "@/lib/r2";
import { PRODUCT_KINDS, STORE_CATEGORIES, parsePrice, slugify } from "@/lib/storeShared";

/**
 * Ações da loja. Server actions são endpoints públicos, então cada uma
 * confere o admin de novo.
 */
async function requireAdmin() {
  const id = await getAdminUserId();
  if (!id) notFound();
  return id;
}

async function uniqueSlug(base: string, ignoreId?: string): Promise<string> {
  const root = base || "produto";
  for (let i = 0; i < 50; i++) {
    const slug = i === 0 ? root : `${root}-${i + 1}`;
    const exists = await prisma.storeProduct.findUnique({ where: { slug }, select: { id: true } });
    if (!exists || exists.id === ignoreId) return slug;
  }
  return `${root}-${Date.now()}`;
}

export async function createProduct(formData: FormData) {
  await requireAdmin();
  const name = String(formData.get("name") || "").trim().slice(0, 100);
  if (!name) return;
  const product = await prisma.storeProduct.create({
    data: { name, slug: await uniqueSlug(slugify(name)) },
  });
  redirect(`/admin/loja/${product.id}`);
}

export type SaveState = { ok?: boolean; error?: string } | null;

export async function updateProduct(_prev: SaveState, formData: FormData): Promise<SaveState> {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const product = await prisma.storeProduct.findUnique({ where: { id }, select: { id: true } });
  if (!product) return { error: "Produto não encontrado" };

  const name = String(formData.get("name") || "").trim().slice(0, 100);
  const slugInput = slugify(String(formData.get("slug") || "")) || slugify(name);
  const shortDescription = String(formData.get("shortDescription") || "").trim().slice(0, 200);
  const description = String(formData.get("description") || "").trim().slice(0, 10_000);
  const category = String(formData.get("category") || "");
  const kind = String(formData.get("kind") || "");
  const priceCents = parsePrice(String(formData.get("price") || ""));
  const sortOrder = Math.max(-999, Math.min(999, Number(formData.get("sortOrder")) || 0));
  const active = formData.get("active") === "on";

  if (!name) return { error: "Dê um nome ao produto" };
  if (!STORE_CATEGORIES.some((c) => c.value === category)) return { error: "Categoria inválida" };
  if (!PRODUCT_KINDS.some((k) => k.value === kind)) return { error: "Tipo inválido" };
  if (priceCents === null) return { error: "Preço inválido (ex.: 49,90)" };

  if (active && kind === "download") {
    const ready = await prisma.storeProductFile.count({ where: { productId: id, status: "ready" } });
    if (ready === 0) return { error: "Envie pelo menos um arquivo antes de ativar um produto de download" };
  }

  const slug = await uniqueSlug(slugInput, id);
  await prisma.storeProduct.update({
    where: { id },
    data: { name, slug, shortDescription, description, category, kind, priceCents, sortOrder, active },
  });

  revalidatePath("/admin/loja");
  revalidatePath(`/admin/loja/${id}`);
  revalidatePath("/loja");
  return { ok: true };
}

export async function deleteFile(formData: FormData) {
  await requireAdmin();
  const fileId = String(formData.get("fileId") || "");
  const file = await prisma.storeProductFile.findUnique({ where: { id: fileId } });
  if (!file) return;
  if (file.uploadId) await abortMultipart(file.key, file.uploadId);
  else await deleteObject(file.key);
  await prisma.storeProductFile.delete({ where: { id: fileId } });

  // Produto de download sem arquivo não pode ficar à venda
  const ready = await prisma.storeProductFile.count({ where: { productId: file.productId, status: "ready" } });
  if (ready === 0) {
    await prisma.storeProduct.updateMany({ where: { id: file.productId, kind: "download" }, data: { active: false } });
  }
  revalidatePath(`/admin/loja/${file.productId}`);
  revalidatePath("/loja");
}

export async function removeImage(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const product = await prisma.storeProduct.findUnique({ where: { id }, select: { imageKey: true } });
  if (!product?.imageKey) return;
  await prisma.storeProduct.update({ where: { id }, data: { imageKey: null } });
  await deleteObject(product.imageKey);
  revalidatePath(`/admin/loja/${id}`);
  revalidatePath("/loja");
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = String(formData.get("id") || "");
  const product = await prisma.storeProduct.findUnique({ where: { id }, include: { files: true } });
  if (!product) redirect("/admin/loja");

  // Quem já comprou precisa continuar baixando: produto vendido só pode ser desativado
  const sold = await prisma.storeOrderItem.count({ where: { productId: id, order: { status: "paid" } } });
  if (sold > 0) {
    await prisma.storeProduct.update({ where: { id }, data: { active: false } });
    redirect(`/admin/loja/${id}?aviso=vendido`);
  }

  for (const f of product.files) {
    if (f.uploadId) await abortMultipart(f.key, f.uploadId);
    else await deleteObject(f.key);
  }
  if (product.imageKey) await deleteObject(product.imageKey);
  await prisma.storeProduct.delete({ where: { id } });

  revalidatePath("/admin/loja");
  revalidatePath("/loja");
  redirect("/admin/loja");
}

export async function refreshProductPage(productId: string) {
  await requireAdmin();
  revalidatePath(`/admin/loja/${productId}`);
  revalidatePath("/loja");
}