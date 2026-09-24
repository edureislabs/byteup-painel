import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { prisma } from "@/lib/prisma";

export async function getDiscordAccessToken(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session as any)?.accessToken || null;
}

export async function canAccessPanel(guildId: string): Promise<boolean> {
  const accessToken = await getDiscordAccessToken();
  if (!accessToken) return false;

  try {
    const res = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return false;

    const guilds: any[] = await res.json();
    const guild = guilds.find(g => g.id === guildId);
    if (!guild) return false;

    // Dono sempre tem acesso
    if (guild.owner === true) return true;

    // Administrador tem acesso
    const permissions = typeof guild.permissions === 'string' ? parseInt(guild.permissions) : guild.permissions;
    const hasAdmin = (permissions & 0x8) === 0x8;
    if (hasAdmin) return true;

    // Verifica lista de acesso
    const session = await getServerSession(authOptions);
    const userId = (session?.user as any)?.id;
    if (!userId) return false;

    const access = await prisma.panelAccess.findUnique({
      where: { guildId_userId: { guildId, userId } },
    });

    return !!access;
  } catch (error) {
    console.error('Erro no canAccessPanel:', error);
    return false;
  }
}