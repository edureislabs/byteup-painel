import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";
import { canAccessPanel } from "@/lib/permissions";

const NO_CACHE = { "Cache-Control": "no-store, max-age=0, must-revalidate" };

/**
 * IDs do Discord (snowflakes) são só números, com 17 a 20 dígitos.
 * Validar isso impede que alguém mande "../../" num ID e faça o bot
 * chamar outra rota da API do Discord com o token dele.
 */
export function isSnowflake(value: unknown): value is string {
  return typeof value === "string" && /^\d{17,20}$/.test(value);
}

/**
 * Use no começo de TODA rota em /api/guilds/[guildId]/...
 *
 *   const denied = await guardApi(guildId);
 *   if (denied) return denied;
 *
 * Retorna null quando o acesso é permitido, ou a resposta de erro pronta.
 */
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

/**
 * Use no começo de TODA server action ("use server") que recebe guildId.
 * Server actions são endpoints públicos: qualquer um pode chamá-las com
 * qualquer argumento, então a checagem tem que estar dentro delas.
 *
 * Lança erro se o usuário não tiver acesso. Retorna o ID do usuário logado
 * (use esse ID em vez de qualquer userId vindo do navegador).
 */
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
