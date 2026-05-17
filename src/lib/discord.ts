const DISCORD_API = 'https://discord.com/api/v10';

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error('DISCORD_BOT_TOKEN não configurado');
}

const botToken = process.env.DISCORD_BOT_TOKEN;

async function discordFetch(endpoint: string, options?: RequestInit) {
  const headers: Record<string, string> = {
    Authorization: `Bot ${botToken}`,
    ...(options?.headers as Record<string, string>),
  };

  // Só define Content-Type se houver corpo na requisição
  if (options?.body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${DISCORD_API}${endpoint}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const text = await res.text();
    let error: any;
    try {
      error = JSON.parse(text);
    } catch {
      error = { message: text };
    }
    throw new Error(error.message || `Erro ${res.status} na API do Discord`);
  }

  // DELETE e outras operações podem retornar 204 No Content
  if (res.status === 204) return null;
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
    // Sem body → sem Content-Type
  });
}