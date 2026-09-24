// src/lib/discord.ts
const DISCORD_API = 'https://discord.com/api/v10'
const botToken = process.env.DISCORD_BOT_TOKEN

if (!botToken) {
  throw new Error('DISCORD_BOT_TOKEN não configurado')
}

async function discordFetch(endpoint: string, options?: RequestInit) {
  const headers: Record<string, string> = {
    Authorization: `Bot ${botToken}`,
    ...(options?.headers as Record<string, string>),
  }

  if (options?.body) {
    headers['Content-Type'] = 'application/json'
  }

  const res = await fetch(`${DISCORD_API}${endpoint}`, {
    ...options,
    headers,
  })

  if (!res.ok) {
    const text = await res.text()
    let error: any
    try {
      error = JSON.parse(text)
    } catch {
      error = { message: text }
    }
    throw new Error(error.message || `Erro ${res.status} na API do Discord`)
  }

  if (res.status === 204) return null
  return res.json()
}

export async function getGuilds(accessToken: string) {
  try {
    if (!accessToken) return []
    const response = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bearer ${accessToken}` },
      cache: "no-store"
    })
    if (!response.ok) return []
    return response.json()
  } catch {
    return []
  }
}

export async function getBotGuilds() {
  try {
    const response = await fetch("https://discord.com/api/users/@me/guilds", {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      cache: "no-store"
    })
    if (!response.ok) return []
    return response.json()
  } catch {
    return []
  }
}

export function isAdmin(permissions: string | number) {
  try {
    const permsStr = permissions.toString()
    const permsBigInt = BigInt(permsStr)
    return (permsBigInt & BigInt(0x8)) === BigInt(0x8)
  } catch {
    return false
  }
}

export function getGuildIcon(guildId: string, icon: string | null) {
  if (!icon) return null
  return `https://cdn.discordapp.com/icons/${guildId}/${icon}.png`
}

export async function getDiscordUser(userId: string) {
  try {
    const response = await fetch(`https://discord.com/api/users/${userId}`, {
      headers: { Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN}` },
      cache: "no-store"
    })
    if (!response.ok) return null
    return response.json()
  } catch {
    return null
  }
}

export async function getGuildEmojis(guildId: string) {
  return discordFetch(`/guilds/${guildId}/emojis`)
}

export async function createGuildEmoji(guildId: string, name: string, image: string) {
  return discordFetch(`/guilds/${guildId}/emojis`, {
    method: 'POST',
    body: JSON.stringify({ name, image }),
  })
}

export async function deleteGuildEmoji(guildId: string, emojiId: string) {
  return discordFetch(`/guilds/${guildId}/emojis/${emojiId}`, {
    method: 'DELETE',
  })
}