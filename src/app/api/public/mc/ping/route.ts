import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { UUID, diaDeHoje, lerPlugins, lerServidor, paisDaRequisicao } from "@/lib/mc/dados";

/**
 * A ByteUpCore chama isto quando o servidor liga e a cada 30 minutos.
 * Corpo: { servidor: UUID, software, mc, java, core, online, jogadores, max,
 *          plugins: [{ id, versao, edicao: "free"|"premium", licenca? }] }
 * Resposta: { ok, versoes: { [plugin]: { versao, url } } } (para o aviso de atualização).
 * O IP não é guardado: só o país, que a Vercel informa.
 */
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  let c: Record<string, unknown>;
  try {
    c = await req.json();
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  if (!c || typeof c !== "object" || typeof c.servidor !== "string" || !UUID.test(c.servidor)) {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
  const id = c.servidor.toLowerCase();
  const dados = lerServidor(c);
  const plugins = lerPlugins(c.plugins);
  const agora = new Date();
  const country = paisDaRequisicao(req);

  await prisma.mcServidor.upsert({
    where: { id },
    create: { id, ...dados, country, firstSeen: agora, lastSeen: agora },
    update: { ...dados, ...(country ? { country } : {}), lastSeen: agora },
  });
  for (const p of plugins) {
    await prisma.mcInstalacao.upsert({
      where: { servidorId_plugin: { servidorId: id, plugin: p.id } },
      create: { servidorId: id, plugin: p.id, versao: p.versao, edicao: p.edicao, licencaId: p.licenca, firstSeen: agora, lastSeen: agora },
      update: { versao: p.versao, edicao: p.edicao, ...(p.licenca ? { licencaId: p.licenca } : {}), lastSeen: agora },
    });
  }
  if (plugins.length) {
    await prisma.mcPingDia.createMany({
      data: plugins.map((p) => ({ dia: diaDeHoje(agora), servidorId: id, plugin: p.id })),
      skipDuplicates: true,
    });
  }
  // limpeza de vez em quando: dias com mais de 180 dias
  if (Math.random() < 0.01) {
    await prisma.mcPingDia
      .deleteMany({ where: { dia: { lt: new Date(agora.getTime() - 180 * 86_400_000) } } })
      .catch((e) => console.error("[mc/ping] limpeza", e));
  }

  const catalogo = plugins.length
    ? await prisma.mcPlugin.findMany({ where: { slug: { in: plugins.map((p) => p.id) } }, select: { slug: true, ultimaVersao: true, urlDownload: true } })
    : [];
  const versoes = Object.fromEntries(catalogo.filter((p) => p.ultimaVersao).map((p) => [p.slug, { versao: p.ultimaVersao, url: p.urlDownload }]));
  return NextResponse.json({ ok: true, versoes }, { headers: { "Cache-Control": "no-store" } });
}
