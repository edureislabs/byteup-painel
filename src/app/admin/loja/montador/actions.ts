"use server";

import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getAdminUserId } from "@/lib/admin";
import { parsePrice } from "@/lib/storeShared";
import { BUILDER_BASE, BUILDER_MODULES } from "@/lib/builder/catalog";

/** Salva os preços (e o que está à venda) do "Monte o seu bot". */
export async function saveBuilderPrices(formData: FormData) {
  if (!(await getAdminUserId())) notFound();

  const linhas: { moduleId: string; priceCents: number; active: boolean }[] = [];
  const erros: string[] = [];

  const base = parsePrice(String(formData.get("price_base") || ""));
  if (base === null || base < 100) erros.push(`${BUILDER_BASE.name}: mínimo R$ 1,00`);
  else linhas.push({ moduleId: "base", priceCents: base, active: true });

  for (const m of BUILDER_MODULES) {
    const preco = parsePrice(String(formData.get(`price_${m.id}`) || ""));
    if (preco === null) erros.push(`${m.name}: preço inválido`);
    else linhas.push({ moduleId: m.id, priceCents: preco, active: formData.get(`active_${m.id}`) === "on" });
  }

  if (erros.length) redirect(`/admin/loja/montador?erro=${encodeURIComponent(erros.join(" · "))}`);
  if (!linhas.some((l) => l.moduleId !== "base" && l.active)) {
    redirect(`/admin/loja/montador?erro=${encodeURIComponent("Deixe pelo menos um módulo à venda.")}`);
  }

  await prisma.$transaction(
    linhas.map((l) =>
      prisma.builderPrice.upsert({
        where: { moduleId: l.moduleId },
        create: l,
        update: { priceCents: l.priceCents, active: l.active },
      })
    )
  );
  revalidatePath("/admin/loja/montador");
  revalidatePath("/loja/monte-o-seu");
  redirect("/admin/loja/montador?salvo=1");
}

/** Volta todos os preços para os padrão do catalog.ts. */
export async function resetBuilderPrices() {
  if (!(await getAdminUserId())) notFound();
  await prisma.builderPrice.deleteMany({});
  revalidatePath("/admin/loja/montador");
  revalidatePath("/loja/monte-o-seu");
  redirect("/admin/loja/montador?salvo=1");
}
