import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { chaveDoBot, licencaValida } from "@/lib/builder/licenca";
import { lerEstado, registrarAtivacao } from "@/lib/builder/licencaEstado";
import { readBuilderOptions } from "@/lib/builder/catalog";

/**
 * O bot da loja chama isto quando liga (e a cada 12 h).
 * Confere a licença e entrega a chave que abre o código do bot (bot.pack).
 * Negado → 403 { motivo: "invalida" | "dono" | "bloqueada" | "pedido" }.
 * O token do bot nunca vem para cá: o próprio bot confere o dono no Discord e manda só os IDs.
 */
const SNOW = /^\d{15,22}$/;
const negar = (motivo: string) => NextResponse.json({ ok: false, motivo }, { status: 403 });

export async function POST(req: Request) {
  let corpo: Record<string, unknown>;
  try {
    corpo = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { licenca, app, dono } = corpo;
  if (!licencaValida(licenca)) return negar("invalida");
  if (typeof app !== "string" || !SNOW.test(app) || typeof dono !== "string") return negar("invalida");
  if (dono !== licenca.comprador) return negar("dono");

  // bot de teste do admin (baixado no Montador do admin)
  if (licenca.id.startsWith("previa-")) {
    if (licenca.id !== `previa-${licenca.comprador}`) return negar("invalida");
  } else {
    if (!/^[0-9a-f-]{36}$/i.test(licenca.id)) return negar("invalida");
    const item = await prisma.storeOrderItem.findUnique({
      where: { id: licenca.id },
      select: { options: true, order: { select: { userId: true, status: true } } },
    });
    if (!item || !readBuilderOptions(item.options) || item.order.userId !== licenca.comprador) return negar("invalida");
    if (item.order.status !== "paid") return negar("pedido");
    if (lerEstado(item.options).bloqueada) return negar("bloqueada");
    const nome = typeof corpo.nome === "string" ? corpo.nome.slice(0, 80) : "";
    const versao = typeof corpo.versao === "string" ? corpo.versao.slice(0, 20) : "";
    await registrarAtivacao(licenca.id, { app, nome, versao }).catch((e) => console.error("[licenca] registro", e));
  }

  return NextResponse.json({ ok: true, chave: chaveDoBot(licenca.id).toString("base64") }, { headers: { "Cache-Control": "no-store" } });
}
