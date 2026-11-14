"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getAdminUserId } from "@/lib/admin";
import { definirBloqueio } from "@/lib/builder/licencaEstado";

export async function alternarBloqueio(formData: FormData) {
  if (!(await getAdminUserId())) notFound();
  const id = String(formData.get("id") || "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const bloquear = formData.get("bloquear") === "1";
  await definirBloqueio(id, bloquear);
  revalidatePath("/admin/loja/licencas");
  redirect(`/admin/loja/licencas?${bloquear ? "bloqueada" : "liberada"}=1`);
}
