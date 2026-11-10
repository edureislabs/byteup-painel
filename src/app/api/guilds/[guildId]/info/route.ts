import { NextRequest, NextResponse } from 'next/server';
import { botGet } from '@/lib/discordcache';
import { guardApi } from '@/lib/apiGuard';

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const res = await botGet(`/guilds/${guildId}?with_counts=true`, 60_000);

  if (!res.ok || !res.data) {
    return NextResponse.json({ error: 'Erro ao buscar servidor' }, { status: 500 });
  }

  const guild = res.data;
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