import { prisma } from "@/lib/prisma";
import { ONLINE_MS, diaDeHoje } from "@/lib/mc/dados";

export type Contagem = { nome: string; n: number };
export type EstatPlugin = {
  slug: string;
  online: number;
  dia: number;
  mes: number;
  premium: number;
  jogadores: number;
  versoes: Contagem[];
  paises: Contagem[];
  mc: Contagem[];
  software: Contagem[];
  porDia: { dia: string; n: number }[]; // últimos 30 dias
};

const top = (m: Map<string, number>, n = 6): Contagem[] =>
  [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n).map(([nome, k]) => ({ nome: nome || "?", n: k }));
const somar = (m: Map<string, number>, k: string) => m.set(k, (m.get(k) ?? 0) + 1);

/** Números de cada plugin (servidores online, últimas 24 h, 30 dias, versões, países...). */
export async function estatisticasPlugins(): Promise<EstatPlugin[]> {
  const agora = Date.now();
  const mesAtras = new Date(agora - 30 * 86_400_000);
  const [inst, dias] = await Promise.all([
    prisma.mcInstalacao.findMany({
      where: { lastSeen: { gt: mesAtras } },
      select: {
        plugin: true,
        versao: true,
        edicao: true,
        lastSeen: true,
        servidor: { select: { players: true, country: true, mcVersion: true, software: true } },
      },
      take: 50_000,
    }),
    prisma.mcPingDia.groupBy({
      by: ["plugin", "dia"],
      where: { dia: { gte: new Date(diaDeHoje().getTime() - 29 * 86_400_000) } },
      _count: { _all: true },
    }),
  ]);

  const porPlugin = new Map<string, typeof inst>();
  for (const i of inst) {
    const l = porPlugin.get(i.plugin) ?? [];
    l.push(i);
    porPlugin.set(i.plugin, l);
  }
  const hoje = diaDeHoje().getTime();
  const out: EstatPlugin[] = [];
  for (const [slug, lista] of porPlugin) {
    const versoes = new Map<string, number>(), paises = new Map<string, number>();
    const mc = new Map<string, number>(), software = new Map<string, number>();
    let online = 0, dia = 0, premium = 0, jogadores = 0;
    for (const i of lista) {
      const t = i.lastSeen.getTime();
      if (t > agora - ONLINE_MS) {
        online++;
        jogadores += i.servidor.players;
      }
      if (t > agora - 86_400_000) {
        dia++;
        somar(versoes, i.versao);
        somar(paises, i.servidor.country);
        somar(mc, i.servidor.mcVersion);
        somar(software, i.servidor.software);
      }
      if (i.edicao === "premium") premium++;
    }
    const contagemDia = new Map(dias.filter((d) => d.plugin === slug).map((d) => [d.dia.getTime(), d._count._all]));
    const porDia = Array.from({ length: 30 }, (_, k) => {
      const t = hoje - (29 - k) * 86_400_000;
      return { dia: new Date(t).toISOString().slice(5, 10).split("-").reverse().join("/"), n: contagemDia.get(t) ?? 0 };
    });
    out.push({
      slug, online, dia, mes: lista.length, premium, jogadores,
      versoes: top(versoes), paises: top(paises), mc: top(mc), software: top(software), porDia,
    });
  }
  return out.sort((a, b) => b.online - a.online || b.mes - a.mes);
}
