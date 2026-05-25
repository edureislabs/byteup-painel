import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { canAccessPanel } from "@/lib/permissions";

export async function guardApi(guildId: string) {
  const session = await getServerSession(authOptions);
  if (!session) {
    return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
  }

  const hasAccess = await canAccessPanel(guildId);
  if (!hasAccess) {
    return NextResponse.json({ error: "Acesso negado" }, { status: 403 });
  }

  return null;
}