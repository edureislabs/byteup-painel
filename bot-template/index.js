import './src/core/env.js';
import {
  ActivityType,
  Client,
  Events,
  GatewayIntentBits,
  InteractionContextType,
  MessageFlags,
  OAuth2Scopes,
  PermissionFlagsBits,
  PermissionsBitField,
  REST,
  Routes,
  SlashCommandBuilder,
} from 'discord.js';
import { CONFIG } from './src/core/util.js';
import { salvarTudo } from './src/core/db.js';
import nucleo, { registrarModulos } from './src/core/nucleo.js';

const token = process.env.DISCORD_TOKEN;
if (!token) {
  console.error('❌ Falta o token do bot. Copie o arquivo .env.example para .env e preencha DISCORD_TOKEN (veja o README).');
  process.exit(1);
}

// ---------------- módulos ----------------
// A lista vem do config.json. Cada módulo é um arquivo em src/modules.
const modulos = [nucleo];
for (const id of CONFIG.modulos ?? []) {
  try {
    const m = (await import(`./src/modules/${id}.js`)).default;
    modulos.push(m);
  } catch (e) {
    console.error(`❌ Não consegui carregar o módulo "${id}": ${e.message}`);
  }
}
registrarModulos(modulos);

const intents = new Set([GatewayIntentBits.Guilds]);
const partials = new Set();
// permissões que o bot pede no link de convite: as básicas + as de cada módulo
const permissoes = new PermissionsBitField([
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.SendMessagesInThreads,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.UseExternalEmojis,
  PermissionFlagsBits.AddReactions,
]);
for (const m of modulos) {
  for (const x of m.intents ?? []) intents.add(x);
  for (const p of m.partials ?? []) partials.add(p);
  for (const p of m.permissoes ?? []) permissoes.add(p);
}

const client = new Client({ intents: [...intents], partials: [...partials] });

// ---------------- comandos ----------------
const comandos = new Map();
for (const m of modulos) {
  for (const c of m.comandos ?? []) comandos.set(c.data.name, { ...c, modulo: m });
}

// /config: os subcomandos gerais + um grupo para cada módulo que tem configuração
const config = new SlashCommandBuilder()
  .setName('config')
  .setDescription('Configura o bot neste servidor')
  .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild);
nucleo.montarConfigRaiz(config);
for (const m of modulos) {
  if (m.config) config.addSubcommandGroup((g) => m.config.montar(g.setName(m.config.grupo)));
}
comandos.set('config', {
  data: config,
  modulo: nucleo,
  async executar(i) {
    const grupo = i.options.getSubcommandGroup(false);
    const sub = i.options.getSubcommand();
    if (!grupo) return nucleo.executarConfigRaiz(i, sub);
    const m = modulos.find((x) => x.config?.grupo === grupo);
    return m?.config.executar(i, sub);
  },
});

// todos os comandos funcionam só dentro de servidores
for (const c of comandos.values()) c.data.setContexts?.(InteractionContextType.Guild);

// botões, menus e formulários: o customId começa com o prefixo do módulo ("tk:abrir", "sr:entrar:123"...)
const componentes = new Map();
for (const m of modulos) {
  for (const [prefixo, fn] of Object.entries(m.componentes ?? {})) componentes.set(prefixo, fn);
}

// ---------------- eventos dos módulos ----------------
// Cada evento chama os módulos em sequência. Quem tem "prioridade" menor roda antes
// (o AutoMod roda primeiro: assim os outros já sabem se a mensagem foi apagada).
const eventos = new Map();
for (const m of [...modulos].sort((a, b) => (a.prioridade ?? 10) - (b.prioridade ?? 10))) {
  for (const [nome, fn] of Object.entries(m.eventos ?? {})) {
    if (!eventos.has(nome)) eventos.set(nome, []);
    eventos.get(nome).push({ fn, modulo: m.id });
  }
}
for (const [nome, lista] of eventos) {
  client.on(nome, async (...args) => {
    for (const { fn, modulo } of lista) {
      try {
        await fn(...args);
      } catch (e) {
        console.error(`[${modulo}] erro no evento ${nome}:`, e);
      }
    }
  });
}

// ---------------- interações ----------------
async function avisarErro(i) {
  const payload = { content: '❌ Algo deu errado. Tente de novo em instantes.', flags: MessageFlags.Ephemeral };
  if (i.deferred || i.replied) await i.followUp(payload).catch(() => {});
  else await i.reply(payload).catch(() => {});
}

client.on(Events.InteractionCreate, async (i) => {
  if (!i.inGuild()) return;
  try {
    if (i.isAutocomplete()) {
      const c = comandos.get(i.commandName);
      if (c?.autocompletar) await c.autocompletar(i);
      return;
    }
    if (i.isChatInputCommand()) {
      const c = comandos.get(i.commandName);
      if (c) await c.executar(i);
      return;
    }
    if (i.isButton() || i.isAnySelectMenu() || i.isModalSubmit()) {
      const partes = i.customId.split(':');
      const fn = componentes.get(partes[0]);
      if (fn) await fn(i, partes.slice(1));
    }
  } catch (e) {
    console.error('[interação] erro:', e);
    if (i.isRepliable()) await avisarErro(i);
  }
});

// ---------------- ligar ----------------
client.once(Events.ClientReady, async (c) => {
  console.log(`✅ ${CONFIG.nome || c.user.username} online como ${c.user.tag} · em ${c.guilds.cache.size} servidor(es)`);
  console.log(`   Módulos: ${modulos.map((m) => m.nome).join(', ')}`);
  const convite = c.generateInvite({ scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands], permissions: permissoes });
  console.log(`   Link para adicionar o bot a um servidor:\n   ${convite}`);

  const corpo = [...comandos.values()].map((x) => x.data.toJSON());
  const rest = new REST({ version: '10' }).setToken(token);
  try {
    if (process.env.GUILD_ID) {
      await rest.put(Routes.applicationGuildCommands(c.user.id, process.env.GUILD_ID), { body: corpo });
      console.log(`   ${corpo.length} comandos registrados no servidor ${process.env.GUILD_ID}.`);
    } else {
      await rest.put(Routes.applicationCommands(c.user.id), { body: corpo });
      console.log(`   ${corpo.length} comandos registrados em todos os servidores.`);
    }
  } catch (e) {
    console.error('❌ Não consegui registrar os comandos:', e.message);
  }

  if (CONFIG.status) c.user.setPresence({ activities: [{ type: ActivityType.Custom, name: 'status', state: CONFIG.status }] });

  for (const m of modulos) {
    try {
      await m.aoIniciar?.(c);
    } catch (e) {
      console.error(`[${m.id}] erro ao iniciar:`, e);
    }
  }
});

// salva os dados antes de desligar
for (const sinal of ['SIGINT', 'SIGTERM']) {
  process.on(sinal, () => {
    salvarTudo();
    process.exit(0);
  });
}
process.on('unhandledRejection', (e) => console.error('[erro]', e));

client.login(token).catch((e) => {
  console.error('❌ Não consegui entrar no Discord:', e.message);
  if (e.code === 'TokenInvalid' || /invalid token/i.test(e.message)) {
    console.error('   O token está errado. Gere outro no Developer Portal → Bot → Reset Token e cole no .env.');
  }
  if (/disallowed intents/i.test(e.message)) {
    console.error('   Ative as "Privileged Gateway Intents" pedidas no README, no Developer Portal → Bot.');
  }
  process.exit(1);
});
