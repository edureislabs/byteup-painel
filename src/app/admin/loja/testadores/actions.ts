"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/admin";

async function requireAdmin() {
  if (!(await getAdminUserId())) notFound();
}

/** Aceita o ID (só números) ou a menção <@123>. */
const lerId = (texto: string) => /^<?@?!?(\d{17,20})>?$/.exec(texto.trim())?.[1] ?? null;

export async function addTester(formData: FormData) {
  await requireAdmin();
  const userId = lerId(String(formData.get("userId") || ""));
  if (!userId) redirect(`/admin/loja/testadores?erro=${encodeURIComponent("ID inválido: são 17 a 20 números.")}`);
  const note = String(formData.get("note") || "").trim().slice(0, 100);
  await prisma.storeTester.upsert({ where: { userId }, create: { userId, note }, update: { note } });
  revalidatePath("/admin/loja/testadores");
  redirect("/admin/loja/testadores?salvo=1");
}

export async function removeTester(formData: FormData) {
  await requireAdmin();
  const userId = String(formData.get("userId") || "");
  await prisma.storeTester.deleteMany({ where: { userId } });
  revalidatePath("/admin/loja/testadores");
  redirect("/admin/loja/testadores");
}
