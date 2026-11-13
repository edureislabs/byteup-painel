import { NextRequest, NextResponse } from 'next/server';
import { guardApi, isSnowflake } from '@/lib/apiGuard';
import { prisma } from '@/lib/prisma';
import { botGet } from '@/lib/discordcache';
import { CATEGORIES, normalizeTags } from '@/lib/listing';

const DISCORD_API = 'https://discord.com/api/v10';

// nsfw_level do Discord: 1 = explícito, 3 = restrito por idade
const isAdultGuild = (guild: { nsfw_level?: number } | null) =>
  guild?.nsfw_level === 1 || guild?.nsfw_level === 3;

/** Cria (ou reaproveita) um convite permanente no canal escolhido. */
async function createInvite(channelId: string): Promise<{ code?: string; error?: string }> {
  const res = await fetch(`${DISCORD_API}/channels/${channelId}/invites`, {
    method: 'POST',
    headers: {
      Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}`,
      'Content-Type': 'application/json',
      'X-Audit-Log-Reason': 'Convite da divulgacao ByteUP',
    },
    body: JSON.stringify({ max_age: 0, max_uses: 0, unique: false }),
  });

  if (res.status === 403) {
    return { error: 'O bot não tem permissão de "Criar convite" nesse canal.' };
  }
  if (!res.ok) return { error: 'Não consegui criar o convite nesse canal.' };

  const data = await res.json();
  return { code: data.code };
}

export async function GET(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const [listing, guildRes] = await Promise.all([
    prisma.serverListing.findUnique({ where: { guildId } }),
    botGet(`/guilds/${guildId}?with_counts=true`, 60_000),
  ]);

  const guild = guildRes.ok ? guildRes.data : null;

  return NextResponse.json({
    listing: listing ?? {
      guildId,
      enabled: false,
      shortDescription: '',
      description: '',
      tags: [],
      category: 'comunidade',
      language: 'pt-BR',
      nsfw: false,
      inviteChannelId: null,
      inviteCode: null,
      bumpChannelId: null,
      bumpedAt: null,
      bumpCount: 0,
      hidden: false,
      hiddenReason: null,
    },
    guild: guild
      ? {
          name: guild.name,
          icon: guild.icon,
          banner: guild.banner,
          memberCount: guild.approximate_member_count ?? 0,
          onlineCount: guild.approximate_presence_count ?? 0,
          adultByDiscord: isAdultGuild(guild),
        }
      : null,
  });
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ guildId: string }> }) {
  const { guildId } = await params;
  const denied = await guardApi(guildId);
  if (denied) return denied;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Corpo inválido' }, { status: 400 });
  }

  // ===== Validação =====
  const enabled = body.enabled === true;
  const shortDescription = String(body.shortDescription ?? '').trim();
  const description = String(body.description ?? '').trim();
  const tags = normalizeTags(body.tags);
  const category = String(body.category ?? 'comunidade');
  const language = String(body.language ?? 'pt-BR');
  let nsfw = body.nsfw === true;
  const inviteChannelId = body.inviteChannelId || null;
  const bumpChannelId = body.bumpChannelId || null;

  if (shortDescription.length > 160) {
    return NextResponse.json({ error: 'A descrição curta pode ter no máximo 160 caracteres.' }, { status: 400 });
  }
  if (description.length > 2000) {
    return NextResponse.json({ error: 'A descrição completa pode ter no máximo 2000 caracteres.' }, { status: 400 });
  }
  if (!CATEGORIES.some((c) => c.value === category)) {
    return NextResponse.json({ error: 'Categoria inválida.' }, { status: 400 });
  }
  if (!['pt-BR', 'en', 'es', 'outro'].includes(language)) {
    return NextResponse.json({ error: 'Idioma inválido.' }, { status: 400 });
  }
  if (inviteChannelId && !isSnowflake(inviteChannelId)) {
    return NextResponse.json({ error: 'Canal de convite inválido.' }, { status: 400 });
  }
  if (bumpChannelId && !isSnowflake(bumpChannelId)) {
    return NextResponse.json({ error: 'Canal do aviso de bump inválido.' }, { status: 400 });
  }
  if (enabled && (!shortDescription || !inviteChannelId)) {
    return NextResponse.json(
      { error: 'Para ativar a divulgação, preencha a descrição curta e escolha o canal do convite.' },
      { status: 400 }
    );
  }

  // Os canais precisam ser deste servidor
  const channelsRes = await botGet(`/guilds/${guildId}/channels`);
  const channelIds = new Set<string>(
    channelsRes.ok && Array.isArray(channelsRes.data) ? channelsRes.data.map((c: { id: string }) => c.id) : []
  );
  for (const id of [inviteChannelId, bumpChannelId]) {
    if (id && !channelIds.has(id)) {
      return NextResponse.json({ error: 'Canal não encontrado neste servidor.' }, { status: 400 });
    }
  }

  // Dados atuais do servidor no Discord
  const guildRes = await botGet(`/guilds/${guildId}?with_counts=true`, 60_000);
  const guild = guildRes.ok ? guildRes.data : null;

  // Servidor marcado como +18 no próprio Discord: não dá para desmarcar
  if (isAdultGuild(guild)) nsfw = true;

  const existing = await prisma.serverListing.findUnique({ where: { guildId } });

  // ===== Convite: cria quando muda o canal ou ainda não existe =====
  let inviteCode = existing?.inviteCode ?? null;
  if (inviteChannelId && (inviteChannelId !== existing?.inviteChannelId || !inviteCode)) {
    const invite = await createInvite(inviteChannelId);
    if (invite.error) return NextResponse.json({ error: invite.error }, { status: 400 });
    inviteCode = invite.code!;
  }
  if (!inviteChannelId) inviteCode = null;

  const data = {
    enabled,
    shortDescription: shortDescription || null,
    description: description || null,
    tags,
    category,
    language,
    nsfw,
    inviteChannelId,
    inviteCode,
    bumpChannelId,
    ...(guild
      ? {
          name: guild.name,
          icon: guild.icon,
          banner: guild.banner,
          memberCount: guild.approximate_member_count ?? 0,
          onlineCount: guild.approximate_presence_count ?? 0,
          syncedAt: new Date(),
        }
      : {}),
  };

  const saved = await prisma.serverListing.upsert({
    where: { guildId },
    update: data,
    create: { guildId, ...data },
  });

  return NextResponse.json({ listing: saved });
}