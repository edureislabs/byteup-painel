import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v10';

if (!process.env.DISCORD_BOT_TOKEN) {
  throw new Error('DISCORD_BOT_TOKEN não configurado');
}

export const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_BOT_TOKEN);

export async function getGuildEmojis(guildId: string) {
  return rest.get(Routes.guildEmojis(guildId)) as Promise<any[]>;
}

export async function createGuildEmoji(guildId: string, name: string, image: string) {
  return rest.post(Routes.guildEmojis(guildId), {
    body: { name, image },
  }) as Promise<any>;
}

export async function deleteGuildEmoji(guildId: string, emojiId: string) {
  return rest.delete(Routes.guildEmoji(guildId, emojiId)) as Promise<any>;
}