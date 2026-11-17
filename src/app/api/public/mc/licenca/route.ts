import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAdmin } from "@/lib/admin";
import { chaveDoPlugin, emitirPasse, licencaPluginValida } from "@/lib/mc/assinatura";
import { ATIVO_LICENCA_MS, SLUG, UUID, lerServidor, paisDaRequisicao, texto } from "@/lib/mc/dados";

/**
 * O porteiro de um plugin pago chama isto quando o servidor liga (e de tempos em tempos).
 * Corpo: { licenca: <licença assinada que vem no jar>, servidor: UUID, plugin, versao, ...dados do servidor }
 * Ok → { ok, chave (abre o plugin.pack), passe (deixa ligar sem internet por alguns dias) }
 * Negado → 403 { motivo: "invalida" | "plugin" | "pedido" | "bloqueada" | "limite", limite? }
 */
export const dynamic = "force-dynamic";

const negar = (motivo: string, extra: Record<string, unknown> = {}) =>
  NextResponse.json({ ok: false, motivo, ...extra }, { status: 403, headers: { "Cache-Control": "no-store" } });

export async function POST(req: Request) {
  let c: Record<string, unknown>;
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const { licenca } = c ?? {};
  if (!licencaPluginValida(licenca)) return negar("invalida");
  const servidor = typeof c.servidor === "string" ? c.servidor.toLowerCase() : "";
  const plugin = typeof c.plugin === "string" ? c.plugin.toLowerCase() : "";
  if (!UUID.test(servidor) || !SLUG.test(plugin)) return negar("invalida");
  if (licenca.plugin !== plugin) return negar("plugin");

  let limite = 0;
  if (licenca.id.startsWith("previa-")) {
    // jar de teste baixado pelo admin
    if (licenca.id !== `previa-${licenca.comprador}` || !isAdmin(licenca.comprador)) return negar("invalida");
  } else {
    if (!UUID.test(licenca.id)) return negar("invalida");
    const item = await prisma.storeOrderItem.findUnique({
      where: { id: licenca.id },
      select: { product: { select: { slug: true } }, order: { select: { userId: true, status: true } } },
    });
    if (!item || item.product?.slug !== plugin || item.order.userId !== licenca.comprador) return negar("invalida");
    if (item.order.status !== "paid") return negar("pedido");
    const [estado, cat] = await Promise.all([
      prisma.mcLicenca.findUnique({ where: { itemId: licenca.id } }),
      prisma.mcPlugin.findUnique({ where: { slug: plugin }, select: { maxServidores: true } }),
    ]);
    if (estado?.bloqueada) return negar("bloqueada");
    limite = estado?.maxServidores ?? cat?.maxServidores ?? 3;
    const outros = await prisma.mcInstalacao.count({
      where: {
        licencaId: licenca.id,
        servidorId: { not: servidor },
        lastSeen: { gt: new Date(Date.now() - ATIVO_LICENCA_MS) },
      },
    });
    if (limite > 0 && outros >= limite) return negar("limite", { limite });
  }

  // registra o servidor e a instalação (aparece no admin, na licença)
  const agora = new Date();
  const dados = lerServidor(c);
  const country = paisDaRequisicao(req);
  await prisma.mcServidor.upsert({
    where: { id: servidor },
    create: { id: servidor, ...dados, country, firstSeen: agora, lastSeen: agora },
    update: { ...dados, ...(country ? { country } : {}), lastSeen: agora },
  });
  const versao = texto(c.versao, 20);
  await prisma.mcInstalacao.upsert({
    where: { servidorId_plugin: { servidorId: servidor, plugin } },
    create: { servidorId: servidor, plugin, versao, edicao: "premium", licencaId: licenca.id, firstSeen: agora, lastSeen: agora },
    update: { versao, edicao: "premium", licencaId: licenca.id, lastSeen: agora },
  });

  return NextResponse.json(
    {
      ok: true,
      chave: chaveDoPlugin(licenca.id).toString("base64"),
      passe: emitirPasse({ licenca: licenca.id, servidor, plugin }, agora),
      limite,
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}
