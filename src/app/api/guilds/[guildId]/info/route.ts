import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/app/api/auth/[...nextauth]/route';

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const session = await getServerSession(authOptions);
  if (!session) return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });

  const { guildId } = await params;

  const res = await fetch(`https://discord.com/api/v10/guilds/${guildId}`, {
    headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
  });

  if (!res.ok) return NextResponse.json({ error: 'Erro ao buscar servidor' }, { status: 500 });

  const guild = await res.json();
  return NextResponse.json({
    id: guild.id,
    name: guild.name,
    icon: guild.icon,
    banner: guild.banner,
    description: guild.description,
    ownerId: guild.owner_id,
    memberCount: guild.approximate_member_count,
    presenceCount: guild.approximate_presence_count,
    vanityUrlCode: guild.vanity_url_code,
    features: guild.features,
    preferredLocale: guild.preferred_locale,
    premiumTier: guild.premium_tier,
    nsfwLevel: guild.nsfw_level,
    verificationLevel: guild.verification_level,
    joinedAt: guild.joined_at,
    maxMembers: guild.max_members,
    splash: guild.splash,
    discoverySplash: guild.discovery_splash,
  });
}