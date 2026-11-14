import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { ajustes, salvarAjustes, embed, responder, fmt } from '../core/util.js';

/**
 * Contadores: calls trancadas cujo nome mostra um número do servidor
 * ("👥 Membros: 1.234"). Atualizam sozinhos a cada 10 minutos
 * (o Discord só deixa renomear um canal 2 vezes a cada 10 minutos).
 */

const TIPOS = {
  membros: { nome: 'Membros', modelo: '👥 Membros: {n}' },
  online: { nome: 'Online agora', modelo: '🟢 Online: {n}' },
  boosts: { nome: 'Boosts', modelo: '🚀 Boosts: {n}' },
  canais: { nome: 'Canais', modelo: '💬 Canais: {n}' },
  cargos: { nome: 'Cargos', modelo: '🎭 Cargos: {n}' },
};
const LIMITE = 5;
const cfg = (guildId) => ajustes(guildId, 'contadores', { lista: [] });

/** Números do servidor. Membros e online vêm da API (não precisa de intent especial). */
async function numeros(guild) {
  const g = await guild.client.guilds.fetch({ guild: guild.id, withCounts: true, force: true }).catch(() => guild);
  return {
    membros: g.approximateMemberCount ?? guild.memberCount ?? 0,
    online: g.approximatePresenceCount ?? 0,
    boosts: g.premiumSubscriptionCount ?? guild.premiumSubscriptionCount ?? 0,
    canais: guild.channels.cache.filter((c) => c.type !== ChannelType.GuildCategory && !c.isThread()).size,
    cargos: guild.roles.cache.size - 1,
  };
}
const nomeDo = (item, n) => item.modelo.replace('{n}', fmt(n[item.tipo])).slice(0, 100);

async function atualizar(guild) {
  const c = cfg(guild.id);
  if (!c.lista.length) return;
  const n = await numeros(guild);
  let mudou = false;
  for (const item of [...c.lista]) {
    const canal = guild.channels.cache.get(item.canal);
    if (!canal) {
      c.lista = c.lista.filter((x) => x.canal !== item.canal); // apagaram o canal
      mudou = true;
      continue;
    }
    const nome = nomeDo(item, n);
    if (canal.name !== nome) await canal.setName(nome, 'Contador').catch(() => {});
  }
  if (mudou) salvarAjustes();
}

const contadores = {
  data: new SlashCommandBuilder()
    .setName('contadores')
    .setDescription('Canais que mostram números do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('criar')
        .setDescription('Cria um contador')
        .addStringOption((o) =>
          o
            .setName('tipo')
            .setDescription('O que contar')
            .setRequired(true)
            .addChoices(...Object.entries(TIPOS).map(([value, t]) => ({ name: t.nome, value })))
        )
        .addStringOption((o) => o.setName('nome').setDescription('Nome do canal; {n} vira o número (ex.: "👥 Galera: {n}")').setMaxLength(80))
        .addChannelOption((o) => o.setName('categoria').setDescription('Categoria onde criar').addChannelTypes(ChannelType.GuildCategory))
    )
    .addSubcommand((s) =>
      s
        .setName('remover')
        .setDescription('Apaga um contador')
        .addChannelOption((o) => o.setName('canal').setDescription('O canal do contador').setRequired(true).addChannelTypes(ChannelType.GuildVoice))
    )
    .addSubcommand((s) => s.setName('lista').setDescription('Mostra os contadores')),
  async executar(i) {
    const c = cfg(i.guildId);
    const sub = i.options.getSubcommand();
    if (sub === 'lista') {
      if (!c.lista.length) return responder(i, 'Nenhum contador. Use `/contadores criar`.', 'aviso');
      return i.reply({ embeds: [embed(i.guildId).setTitle('📈 Contadores').setDescription(c.lista.map((x) => `<#${x.canal}> · ${TIPOS[x.tipo].nome}`).join('\n'))], flags: 64 });
    }
    if (sub === 'remover') {
      const canal = i.options.getChannel('canal');
      if (!c.lista.some((x) => x.canal === canal.id)) return responder(i, 'Esse canal não é um contador.', 'erro');
      c.lista = c.lista.filter((x) => x.canal !== canal.id);
      salvarAjustes();
      await canal.delete('Contador removido').catch(() => {});
      return responder(i, 'Contador removido.', 'sucesso');
    }
    // criar
    if (c.lista.length >= LIMITE) return responder(i, `No máximo ${LIMITE} contadores.`, 'erro');
    const tipo = i.options.getString('tipo');
    let modelo = i.options.getString('nome') || TIPOS[tipo].modelo;
    if (!modelo.includes('{n}')) modelo += ': {n}';
    await i.deferReply({ flags: 64 });
    const n = await numeros(i.guild);
    const canal = await i.guild.channels
      .create({
        name: nomeDo({ tipo, modelo }, n),
        type: ChannelType.GuildVoice,
        parent: i.options.getChannel('categoria')?.id,
        position: 0,
        permissionOverwrites: [
          { id: i.guild.roles.everyone.id, deny: [PermissionFlagsBits.Connect] },
          { id: i.guild.members.me.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.Connect, PermissionFlagsBits.ManageChannels] },
        ],
        reason: 'Contador',
      })
      .catch((e) => {
        console.error('[contadores]', e.message);
        return null;
      });
    if (!canal) return i.editReply('❌ Não consegui criar o canal. Preciso das permissões **Gerenciar canais** e **Conectar**.');
    c.lista.push({ canal: canal.id, tipo, modelo });
    salvarAjustes();
    return i.editReply(`✅ Contador criado: ${canal}. Ele se atualiza a cada 10 minutos.`);
  },
};

export default {
  id: 'contadores',
  nome: 'Contadores',
  comandos: [contadores],
  permissoes: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Connect],
  aoIniciar(client) {
    const rodar = async () => {
      for (const guild of client.guilds.cache.values()) await atualizar(guild).catch((e) => console.error('[contadores]', e.message));
    };
    rodar();
    setInterval(rodar, 10 * 60_000);
  },
  config: {
    resumo(guild) {
      const c = cfg(guild.id);
      return [c.lista.length ? c.lista.map((x) => `<#${x.canal}> (${TIPOS[x.tipo].nome})`).join(' · ') : 'Nenhum (`/contadores criar`)'];
    },
  },
};
