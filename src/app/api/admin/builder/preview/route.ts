import { NextRequest, NextResponse } from "next/server";
import { getAdminUserId } from "@/lib/admin";
import { siteUrl } from "@/lib/mercadopago";
import { BUILDER_MODULES, cleanBotName, cleanColor, parseModules } from "@/lib/builder/catalog";
import { buildBotZip } from "@/lib/builder/build";

/**
 * Só admin: baixa um bot de teste, igual ao que o cliente recebe.
 * ?modulos=moderacao,tickets (vazio = todos) &nome=Bot de Teste
 */
export async function GET(req: NextRequest) {
  if (!(await getAdminUserId())) return new NextResponse("Não encontrado", { status: 404 });
  const q = req.nextUrl.searchParams;
  const lista = (q.get("modulos") || "").split(",").filter(Boolean);
  const modulos = parseModules(lista.length ? lista : BUILDER_MODULES.map((m) => m.id));
  if (!modulos) return new NextResponse("Módulos inválidos", { status: 400 });
  const nome = cleanBotName(q.get("nome")) ?? "Bot de Teste";

  const zip = buildBotZip({ tipo: "monte-o-seu", modulos, nome, cor: cleanColor(q.get("cor")) }, siteUrl());
  return new NextResponse(new Uint8Array(zip.buffer), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${zip.fileName}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
