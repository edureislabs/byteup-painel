import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  EmbedBuilder,
  GatewayIntentBits,
  MessageFlags,
  PermissionFlagsBits,
  SlashCommandBuilder,
} from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, embed, responder, preencher, ehStaff, cortar, CORES } from '../core/util.js';

/**
 * Tickets: painel com botão "Abrir ticket", canal privado para cada atendimento,
 * botões de fechar e assumir, e histórico (.txt) enviado ao canal de registro ao fechar.
 */

const tickets = colecao('tickets');
const PADRAO = {
  categoria: null,
  equipe: null, // se vazio, usa o cargo de /config staff
  registro: null,
  mensagem: 'Olá {usuario}! Descreva o que você precisa com o máximo de detalhes. A equipe já foi avisada e responde assim que puder.',
  limite: 1,
  contador: 0,
};
const cfg = (guildId) => ajustes(guildId, 'tickets', PADRAO);
const dados = (guildId, canalId) => tickets.ler(guildId, canalId);

function podeAtender(member) {
  const c = cfg(member.guild.id);
  return ehStaff(member) || (c.equipe && member.roles.cache.has(c.equipe));
}

const botoesTicket = (assumido = false) =>
  new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId('tk:fechar').setLabel('Fechar').setEmoji('🔒').setStyle(ButtonStyle.Danger),
    new ButtonBuilder().setCustomId('tk:assumir').setLabel(assumido ? 'Assumido' : 'Assumir').setEmoji('🙋').setStyle(ButtonStyle.Primary).setDisabled(assumido)
  );

// ---------------- abrir ----------------
async function abrir(i) {
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  const c = cfg(i.guildId);
  const g = tickets.de(i.guildId);

  // limpa registros de canais que não existem mais
  for (const canalId of Object.keys(g)) if (!i.guild.channels.cache.has(canalId)) delete g[canalId];
  const abertos = Object.entries(g).filter(([, t]) => t.dono === i.user.id);
  if (abertos.length >= c.limite) {
    return i.editReply(`Você já tem ${abertos.length > 1 ? 'tickets abertos' : 'um ticket aberto'}: ${abertos.map(([id]) => `<#${id}>`).join(' ')}`);
  }

  const me = i.guild.members.me;
  if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) return i.editReply('❌ Preciso da permissão **Gerenciar canais** para abrir tickets.');

  const equipe = c.equipe || ajustes(i.guildId, 'geral').staff;
  const categoria = c.categoria && i.guild.channels.cache.get(c.categoria)?.type === ChannelType.GuildCategory ? c.categoria : null;

  // o Discord só deixa o bot liberar no canal permissões que ele mesmo tem
  const soAsMinhas = (lista) => lista.filter((p) => me.permissions.has(p));
  const permitir = soAsMinhas([
    PermissionFlagsBits.ViewChannel,
    PermissionFlagsBits.SendMessages,
    PermissionFlagsBits.ReadMessageHistory,
    PermissionFlagsBits.AttachFiles,
    PermissionFlagsBits.EmbedLinks,
  ]);
  const sobrescritas = [
    { id: i.guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
    { id: i.user.id, allow: permitir },
    { id: me.id, allow: soAsMinhas([...permitir, PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageMessages]) },
  ];
  if (equipe && i.guild.roles.cache.has(equipe)) sobrescritas.push({ id: equipe, allow: soAsMinhas([...permitir, PermissionFlagsBits.ManageMessages]) });

  const numero = String(c.contador + 1).padStart(4, '0');
  let canal;
  try {
    canal = await i.guild.channels.create({
      name: `ticket-${numero}`,
      type: ChannelType.GuildText,
      parent: categoria ?? undefined,
      topic: `Ticket de ${i.user.tag} (${i.user.id})`,
      permissionOverwrites: sobrescritas,
      reason: `Ticket aberto por ${i.user.tag}`,
    });
  } catch (e) {
    console.error('[tickets] não consegui criar o canal:', e.message);
    return i.editReply('❌ Não consegui criar o canal do ticket. Avise a equipe: confira as minhas permissões (Gerenciar canais e Gerenciar cargos) e se a categoria não está cheia (máximo de 50 canais).');
  }
  c.contador += 1;
  salvarAjustes();

  g[canal.id] = { dono: i.user.id, numero, aberto: Date.now(), assumido: null };
  tickets.salvar();

  const e = embed(i.guildId)
    .setTitle(`🎫 Ticket #${numero}`)
    .setDescription(preencher(c.mensagem, { usuario: `${i.user}`, nome: i.member.displayName, servidor: i.guild.name }))
    .addFields({ name: 'Aberto por', value: `${i.user}`, inline: true }, { name: 'Atendente', value: 'aguardando', inline: true })
    .setTimestamp();
  await canal.send({
    content: `${i.user}${equipe ? ` <@&${equipe}>` : ''}`,
    embeds: [e],
    components: [botoesTicket()],
    allowedMentions: { users: [i.user.id], roles: equipe ? [equipe] : [] },
  });
  return i.editReply(`✅ Ticket aberto: ${canal}`);
}

// ---------------- fechar ----------------
async function historico(canal) {
  const todas = [];
  let antes;
  for (let n = 0; n < 10; n++) {
    const lote = await canal.messages.fetch({ limit: 100, before: antes }).catch(() => null);
    if (!lote?.size) break;
    todas.push(...lote.values());
    antes = lote.last().id;
    if (lote.size < 100) break;
  }
  todas.reverse();
  const data = (d) => d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return todas
    .map((m) => {
      const anexos = m.attachments.size ? ` [anexos: ${[...m.attachments.values()].map((a) => a.url).join(' ')}]` : '';
      const embeds = !m.content && m.embeds.length ? ` [embed: ${m.embeds[0].title ?? m.embeds[0].description?.slice(0, 80) ?? ''}]` : '';
      return `[${data(m.createdAt)}] ${m.author.tag}: ${m.content}${anexos}${embeds}`;
    })
    .join('\n');
}

const fechando = new Set(); // evita fechar o mesmo ticket duas vezes ao mesmo tempo

async function fechar(i, motivo = 'Sem motivo') {
  const t = dados(i.guildId, i.channelId);
  if (!t) return responder(i, 'Isto não é um ticket.', 'erro');
  if (i.user.id !== t.dono && !podeAtender(i.member)) return responder(i, 'Só quem abriu ou a equipe pode fechar.', 'erro');
  if (fechando.has(i.channelId)) return responder(i, 'Este ticket já está sendo fechado.', 'aviso');
  fechando.add(i.channelId);
  setTimeout(() => fechando.delete(i.channelId), 30_000);

  await i.reply({ embeds: [embed(i.guildId).setColor(CORES.erro).setDescription(`🔒 Ticket fechado por ${i.user}. Este canal será apagado em 5 segundos.`)] });

  const texto = await historico(i.channel);
  const arquivo = () => new AttachmentBuilder(Buffer.from(texto || '(sem mensagens)', 'utf8'), { name: `ticket-${t.numero}.txt` });
  const resumo = embed(i.guildId)
    .setTitle(`🎫 Ticket #${t.numero} fechado`)
    .addFields(
      { name: 'Aberto por', value: `<@${t.dono}>`, inline: true },
      { name: 'Fechado por', value: `${i.user}`, inline: true },
      { name: 'Atendente', value: t.assumido ? `<@${t.assumido}>` : '—', inline: true },
      { name: 'Aberto', value: `<t:${Math.floor(t.aberto / 1000)}:f>`, inline: true },
      { name: 'Motivo', value: cortar(motivo, 1000) },
    )
    .setTimestamp();

  const c = cfg(i.guildId);
  const reg = c.registro && i.guild.channels.cache.get(c.registro);
  if (reg?.isTextBased()) await reg.send({ embeds: [resumo], files: [arquivo()], allowedMentions: { parse: [] } }).catch(() => {});
  const dono = await i.client.users.fetch(t.dono).catch(() => null);
  if (dono) await dono.send({ embeds: [resumo.setDescription(`Seu ticket em **${i.guild.name}** foi fechado. O histórico está em anexo.`)], files: [arquivo()] }).catch(() => {});

  tickets.apagar(i.guildId, i.channelId);
  setTimeout(() => i.channel.delete(`Ticket fechado por ${i.user.tag}`).catch(() => {}), 5000);
}

// ---------------- botões ----------------
const componentes = {
  async tk(i, [acao]) {
    if (acao === 'abrir') return abrir(i);
    if (acao === 'fechar') {
      const t = dados(i.guildId, i.channelId);
      if (!t) return responder(i, 'Isto não é um ticket.', 'erro');
      return i.reply({
        content: 'Tem certeza que quer fechar este ticket?',
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('tk:confirmar').setLabel('Sim, fechar').setStyle(ButtonStyle.Danger))],
        flags: MessageFlags.Ephemeral,
      });
    }
    if (acao === 'confirmar') return fechar(i, 'Fechado pelo botão');
    if (acao === 'assumir') {
      const t = dados(i.guildId, i.channelId);
      if (!t) return responder(i, 'Isto não é um ticket.', 'erro');
      if (!podeAtender(i.member)) return responder(i, 'Só a equipe pode assumir tickets.', 'erro');
      if (t.assumido) return responder(i, `Este ticket já é de <@${t.assumido}>.`, 'aviso');
      t.assumido = i.user.id;
      tickets.salvar();
      const original = i.message.embeds[0];
      const e = original ? EmbedBuilder.from(original) : embed(i.guildId);
      if (original) e.setFields(original.fields.map((f) => (f.name === 'Atendente' ? { ...f, value: `${i.user}` } : f)));
      await i.update({ embeds: [e], components: [botoesTicket(true)] });
      return i.channel.send({ content: `🙋 ${i.user} assumiu este ticket.`, allowedMentions: { parse: [] } });
    }
  },
};

// ---------------- comando /ticket ----------------
const ticket = {
  data: new SlashCommandBuilder()
    .setName('ticket')
    .setDescription('Sistema de tickets')
    .addSubcommand((s) =>
      s
        .setName('painel')
        .setDescription('Envia o painel com o botão de abrir ticket (equipe)')
        .addChannelOption((o) => o.setName('canal').setDescription('Padrão: este canal').addChannelTypes(ChannelType.GuildText))
        .addStringOption((o) => o.setName('titulo').setDescription('Título do painel').setMaxLength(100))
        .addStringOption((o) => o.setName('descricao').setDescription('Texto do painel').setMaxLength(1500))
        .addStringOption((o) => o.setName('botao').setDescription('Texto do botão').setMaxLength(60))
    )
    .addSubcommand((s) => s.setName('fechar').setDescription('Fecha este ticket').addStringOption((o) => o.setName('motivo').setDescription('Motivo').setMaxLength(500)))
    .addSubcommand((s) => s.setName('adicionar').setDescription('Adiciona alguém a este ticket').addUserOption((o) => o.setName('usuario').setDescription('Quem').setRequired(true)))
    .addSubcommand((s) => s.setName('remover').setDescription('Remove alguém deste ticket').addUserOption((o) => o.setName('usuario').setDescription('Quem').setRequired(true)))
    .addSubcommand((s) =>
      s.setName('renomear').setDescription('Muda o nome deste ticket').addStringOption((o) => o.setName('nome').setDescription('Novo nome').setRequired(true).setMaxLength(90))
    ),
  async executar(i) {
    const sub = i.options.getSubcommand();
    if (sub === 'painel') {
      if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) return responder(i, 'Só quem tem Gerenciar servidor pode enviar o painel.', 'erro');
      const canal = i.options.getChannel('canal') ?? i.channel;
      const e = embed(i.guildId)
        .setTitle(i.options.getString('titulo') || '🎫 Atendimento')
        .setDescription(i.options.getString('descricao') || 'Precisa de ajuda? Clique no botão abaixo e um canal privado será aberto para você falar com a equipe.');
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('tk:abrir').setLabel(i.options.getString('botao') || 'Abrir ticket').setEmoji('🎫').setStyle(ButtonStyle.Primary)
      );
      await canal.send({ embeds: [e], components: [row] });
      return responder(i, `Painel enviado em ${canal}.`, 'sucesso');
    }
    if (sub === 'fechar') return fechar(i, i.options.getString('motivo') || 'Sem motivo');

    const t = dados(i.guildId, i.channelId);
    if (!t) return responder(i, 'Use este comando dentro de um ticket.', 'erro');
    if (!podeAtender(i.member)) return responder(i, 'Só a equipe pode fazer isso.', 'erro');
    if (sub === 'adicionar') {
      const u = i.options.getUser('usuario');
      const ok = await i.channel.permissionOverwrites
        .edit(u.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true })
        .then(() => true, () => false);
      if (!ok) return responder(i, 'Não consegui adicionar. Preciso da permissão **Gerenciar cargos** para mexer nas permissões do canal.', 'erro');
      return i.reply({ content: `➕ ${u} foi adicionado(a) ao ticket por ${i.user}.`, allowedMentions: { users: [u.id] } });
    }
    if (sub === 'remover') {
      const u = i.options.getUser('usuario');
      if (u.id === t.dono) return responder(i, 'Não dá para remover quem abriu o ticket.', 'erro');
      await i.channel.permissionOverwrites.delete(u.id).catch(() => {});
      return i.reply({ content: `➖ ${u} foi removido(a) do ticket.`, allowedMentions: { parse: [] } });
    }
    if (sub === 'renomear') {
      const nome = i.options.getString('nome').toLowerCase().replace(/\s+/g, '-');
      // o Discord só deixa renomear um canal 2 vezes a cada 10 minutos: responde antes de esperar
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const ok = await i.channel.setName(nome).then(() => true, () => false);
      return i.editReply(ok ? `✅ Ticket renomeado para **${nome}**.` : '❌ Não consegui renomear agora.');
    }
  },
};

// ---------------- /config tickets ----------------
const config = {
  grupo: 'tickets',
  montar: (g) =>
    g
      .setDescription('Sistema de tickets')
      .addSubcommand((s) =>
        s.setName('categoria').setDescription('Categoria onde os tickets são criados').addChannelOption((o) => o.setName('categoria').setDescription('Vazio = sem categoria').addChannelTypes(ChannelType.GuildCategory))
      )
      .addSubcommand((s) => s.setName('equipe').setDescription('Cargo que atende os tickets').addRoleOption((o) => o.setName('cargo').setDescription('Vazio = usa /config staff')))
      .addSubcommand((s) =>
        s.setName('registro').setDescription('Canal que recebe o histórico dos tickets fechados').addChannelOption((o) => o.setName('canal').setDescription('Vazio desliga').addChannelTypes(ChannelType.GuildText))
      )
      .addSubcommand((s) =>
        s.setName('mensagem').setDescription('Mensagem de boas-vindas do ticket').addStringOption((o) => o.setName('texto').setDescription('Variáveis: {usuario} {nome} {servidor}').setRequired(true).setMaxLength(1500))
      )
      .addSubcommand((s) =>
        s.setName('limite').setDescription('Tickets abertos ao mesmo tempo por pessoa').addIntegerOption((o) => o.setName('quantidade').setDescription('De 1 a 5').setRequired(true).setMinValue(1).setMaxValue(5))
      ),
  async executar(i, sub) {
    const c = cfg(i.guildId);
    let msg;
    if (sub === 'categoria') {
      const cat = i.options.getChannel('categoria');
      c.categoria = cat?.id ?? null;
      msg = cat ? `Os tickets serão criados em **${cat.name}**.` : 'Os tickets serão criados sem categoria.';
    } else if (sub === 'equipe') {
      const r = i.options.getRole('cargo');
      c.equipe = r?.id ?? null;
      msg = r ? `${r} atende os tickets.` : 'Os tickets usam o cargo de /config staff.';
    } else if (sub === 'registro') {
      const ch = i.options.getChannel('canal');
      c.registro = ch?.id ?? null;
      msg = ch ? `Histórico dos tickets vai para ${ch}.` : 'Registro de tickets desligado.';
    } else if (sub === 'mensagem') {
      c.mensagem = i.options.getString('texto');
      msg = 'Mensagem do ticket atualizada.';
    } else if (sub === 'limite') {
      c.limite = i.options.getInteger('quantidade');
      msg = `Cada pessoa pode ter até **${c.limite}** ticket(s) aberto(s).`;
    }
    salvarAjustes();
    return responder(i, msg, 'sucesso');
  },
  resumo(guild) {
    const c = cfg(guild.id);
    const abertos = Object.keys(tickets.ler(guild.id) ?? {}).length;
    return [
      `Categoria: ${c.categoria ? `<#${c.categoria}>` : 'nenhuma'}`,
      `Equipe: ${c.equipe ? `<@&${c.equipe}>` : 'cargo de /config staff'}`,
      `Registro: ${c.registro ? `<#${c.registro}>` : 'desligado'}`,
      `Abertos agora: ${abertos} · Limite por pessoa: ${c.limite}`,
    ];
  },
};

export default {
  id: 'tickets',
  nome: 'Tickets',
  // o conteúdo das mensagens é necessário para salvar o histórico ao fechar
  intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  permissoes: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageMessages],
  comandos: [ticket],
  componentes,
  config,
};
