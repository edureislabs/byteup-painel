const DISCORD_API = 'https://discord.com/api/v10';

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error('DISCORD_BOT_TOKEN não configurado');
}

const botToken = process.env.DISCORD_BOT_TOKEN;

async function discordFetch(endpoint: string, options?: RequestInit) {
  const res = await fetch(`${DISCORD_API}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bot ${botToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({}));
    throw new Error(error.message || `Erro ${res.status} na API do Discord`);
  }
  return res.json();
}

export async function getGuildEmojis(guildId: string) {
  return discordFetch(`/guilds/${guildId}/emojis`);
}

export async function createGuildEmoji(guildId: string, name: string, image: string) {
  return discordFetch(`/guilds/${guildId}/emojis`, {
    method: 'POST',
    body: JSON.stringify({ name, image }),
  });
}

export async function deleteGuildEmoji(guildId: string, emojiId: string) {
  return discordFetch(`/guilds/${guildId}/emojis/${emojiId}`, {
    method: 'DELETE',
  });
}