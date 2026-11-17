"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminUserId } from "@/lib/admin";
import { prisma } from "@/lib/prisma";
import { SLUG, inteiro, texto } from "@/lib/mc/dados";

/** Cria ou atualiza um plugin do catálogo (nome, última versão, link de download, limite de servidores). */
export async function salvarPlugin(formData: FormData) {
  if (!(await getAdminUserId())) notFound();
  const slug = texto(formData.get("slug"), 41).toLowerCase();
  if (!SLUG.test(slug)) redirect("/admin/plugins?erro=slug");
  const dados = {
    nome: texto(formData.get("nome"), 80) || slug,
    ultimaVersao: texto(formData.get("ultimaVersao"), 20),
    urlDownload: texto(formData.get("urlDownload"), 300),
    maxServidores: inteiro(formData.get("maxServidores"), 0, 1000),
  };
  if (dados.urlDownload && !/^https:\/\//.test(dados.urlDownload)) redirect("/admin/plugins?erro=url");
  await prisma.mcPlugin.upsert({ where: { slug }, create: { slug, ...dados }, update: dados });
  revalidatePath("/admin/plugins");
  redirect("/admin/plugins?salvo=1");
}

/** Bloqueia ou libera a licença de um plugin pago. */
export async function alternarBloqueioPlugin(formData: FormData) {
  if (!(await getAdminUserId())) notFound();
  const id = String(formData.get("id") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const bloqueada = formData.get("bloquear") === "1";
  await prisma.mcLicenca.upsert({ where: { itemId: id }, create: { itemId: id, bloqueada }, update: { bloqueada } });
  revalidatePath("/admin/plugins/licencas");
  redirect(`/admin/plugins/licencas?${bloqueada ? "bloqueada" : "liberada"}=1`);
}

/** Muda o limite de servidores de uma licença (vazio = o padrão do plugin). */
export async function definirLimite(formData: FormData) {
  if (!(await getAdminUserId())) notFound();
  const id = String(formData.get("id") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const bruto = String(formData.get("maxServidores") ?? "").trim();
  const maxServidores = bruto === "" ? null : inteiro(bruto, 0, 1000);
  await prisma.mcLicenca.upsert({ where: { itemId: id }, create: { itemId: id, maxServidores }, update: { maxServidores } });
  revalidatePath("/admin/plugins/licencas");
  redirect("/admin/plugins/licencas?limite=1");
}
