import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { redirect } from "next/navigation";
import LogsViewer from "./LogsViewer";

type Props = {
  params: Promise<{ guildId: string }>;
};

export default async function LogsPage({ params }: Props) {
  const session = await getServerSession(authOptions);
  if (!session) redirect("/login");

  const { guildId } = await params;

  // Busca os logs do servidor (últimos 200)
  const logs = await prisma.activityLog.findMany({
    where: { guildId },
    orderBy: { createdAt: 'desc' },
    take: 200,
  });

  return <LogsViewer guildId={guildId} initialLogs={JSON.parse(JSON.stringify(logs))} />;
}