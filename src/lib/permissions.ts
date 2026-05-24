import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";

export async function getDiscordAccessToken(): Promise<string | null> {
  const session = await getServerSession(authOptions);
  return (session as any)?.accessToken || null;
}

export async function isGuildOwner(guildId: string): Promise<boolean> {
  const accessToken = await getDiscordAccessToken();
  if (!accessToken) return false;

  try {
    const res = await fetch(`https://discord.com/api/v10/users/@me/guilds`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!res.ok) return false;

    const guilds: any[] = await res.json();
    const guild = guilds.find(g => g.id === guildId);
    return guild?.owner === true;
  } catch {
    return false;
  }
}

export async function requireGuildOwner(guildId: string) {
  const isOwner = await isGuildOwner(guildId);
  if (!isOwner) {
    throw new Error("Acesso negado: você não é o dono deste servidor.");
  }
}