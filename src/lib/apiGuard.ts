import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { canAccessPanel } from "@/lib/permissions";

const NO_CACHE = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

export function isSnowflake(value: unknown): value is string {
  return typeof value === "string" && /^\d{17,20}$/.test(value);
}

export async function guardApi(guildId: string): Promise<NextResponse | null> {
  if (!isSnowflake(guildId)) {
    return NextResponse.json(
      { error: "ID de servidor inválido" },
      { status: 400, headers: NO_CACHE }
    );
  }

  const session = await getServerSession(authOptions);
  if (!session?.user?.id) {
    return NextResponse.json(
      { error: "Não autorizado" },
      { status: 401, headers: NO_CACHE }
    );
  }

  const hasAccess = await canAccessPanel(guildId);
  if (!hasAccess) {
    return NextResponse.json(
      { error: "Acesso negado" },
      { status: 403, headers: NO_CACHE }
    );
  }

  return null;
}


export async function assertGuildAccess(guildId: string): Promise<string> {
  if (!isSnowflake(guildId)) {
    throw new Error("ID de servidor inválido");
  }

  const session = await getServerSession(authOptions);
  const userId = session?.user?.id;
  if (!userId) {
    throw new Error("Não autorizado");
  }

  const hasAccess = await canAccessPanel(guildId);
  if (!hasAccess) {
    throw new Error("Acesso negado");
  }

  return userId;
}