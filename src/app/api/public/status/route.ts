import { NextResponse } from "next/server";

import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type ServiceStatus = "operational" | "degraded" | "offline";

function getServiceLabel(status: ServiceStatus) {
  if (status === "operational") return "Operacional";
  if (status === "degraded") return "Instável";
  return "Offline";
}

function getOverallStatus(statuses: ServiceStatus[]): ServiceStatus {
  if (statuses.every((status) => status === "operational")) {
    return "operational";
  }

  if (statuses.some((status) => status === "operational")) {
    return "degraded";
  }

  return "offline";
}

export async function GET() {
  const checkedAt = new Date();

  let databaseStatus: ServiceStatus = "operational";
  let databaseLatency = 0;

  try {
    const startedAt = Date.now();

    await prisma.$queryRaw`SELECT 1`;

    databaseLatency = Date.now() - startedAt;
  } catch {
    databaseStatus = "offline";
  }

  const heartbeat = await prisma.botHeartbeat
    .findUnique({
      where: {
        id: "main",
      },
    })
    .catch(() => null);

  const botLastSeenMs = heartbeat
    ? checkedAt.getTime() - heartbeat.updatedAt.getTime()
    : Number.POSITIVE_INFINITY;

  const botStatus: ServiceStatus =
    heartbeat && botLastSeenMs <= 90_000 ? "operational" : "offline";

  const discordAuthConfigured =
    Boolean(process.env.DISCORD_CLIENT_ID) &&
    Boolean(process.env.DISCORD_CLIENT_SECRET) &&
    Boolean(process.env.NEXTAUTH_SECRET);

  const authStatus: ServiceStatus = discordAuthConfigured
    ? "operational"
    : "degraded";

  const panelStatus: ServiceStatus = "operational";

  const services = [
    {
      key: "bot",
      name: "Bot Discord",
      status: botStatus,
      label: getServiceLabel(botStatus),
      description:
        botStatus === "operational"
          ? "O bot está enviando heartbeat normalmente."
          : "O bot não envia heartbeat há mais de 90 segundos.",
      latencyMs: heartbeat?.ping ?? null,
      lastCheckedAt: checkedAt.toISOString(),
      lastSeenAt: heartbeat?.updatedAt?.toISOString() ?? null,
    },
    {
      key: "panel",
      name: "Painel Web",
      status: panelStatus,
      label: getServiceLabel(panelStatus),
      description: "O painel está respondendo normalmente.",
      latencyMs: null,
      lastCheckedAt: checkedAt.toISOString(),
      lastSeenAt: checkedAt.toISOString(),
    },
    {
      key: "database",
      name: "Banco de Dados",
      status: databaseStatus,
      label: getServiceLabel(databaseStatus),
      description:
        databaseStatus === "operational"
          ? "A conexão com o banco foi validada com sucesso."
          : "Não foi possível conectar ao banco de dados.",
      latencyMs: databaseLatency,
      lastCheckedAt: checkedAt.toISOString(),
      lastSeenAt: checkedAt.toISOString(),
    },
    {
      key: "auth",
      name: "Autenticação Discord",
      status: authStatus,
      label: getServiceLabel(authStatus),
      description:
        authStatus === "operational"
          ? "As variáveis de autenticação Discord estão configuradas."
          : "Alguma variável de autenticação Discord está ausente.",
      latencyMs: null,
      lastCheckedAt: checkedAt.toISOString(),
      lastSeenAt: checkedAt.toISOString(),
    },
  ];

  const overallStatus = getOverallStatus(
    services.map((service) => service.status)
  );

  return NextResponse.json({
    overall: {
      status: overallStatus,
      label: getServiceLabel(overallStatus),
      checkedAt: checkedAt.toISOString(),
    },
    bot: heartbeat
      ? {
          status: botStatus,
          tag: heartbeat.tag,
          clientId: heartbeat.clientId,
          guildCount: heartbeat.guildCount,
          userCount: heartbeat.userCount,
          ping: heartbeat.ping,
          uptimeSeconds: heartbeat.uptimeSeconds,
          startedAt: heartbeat.startedAt?.toISOString() ?? null,
          updatedAt: heartbeat.updatedAt.toISOString(),
        }
      : null,
    services,
  });
}