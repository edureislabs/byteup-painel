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
  StringSelectMenuBuilder,
} from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, embed, responder, preencher, ehStaff, cortar, CORES, sinais, imagens } from '../core/util.js';
import { textos, modeloOu, visuais, botoes, fileira, fileiras, emojiDeBotaoOk } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('tickets', {
  assunto_campo: ['Assunto', 'campo'],
  escolha_assunto: ['Escolha o assunto do seu ticket', 'placeholder'],
  crie_assuntos: ['Crie os assuntos primeiro com `/ticket assunto adicionar`.', 'resposta'],
  assunto_adicionado: ['Assunto **{nome}** adicionado ({total}/25). Para usar, envie o painel com `/ticket painel modo:Menu`.', 'resposta'],
  assunto_existe: ['Já existe um assunto com esse nome.', 'resposta'],
  assunto_limite: ['O Discord aceita no máximo 25 assuntos.', 'resposta'],
  assunto_removido: ['Assunto **{nome}** removido. Envie o painel de novo para atualizar o menu.', 'resposta'],
  assunto_nao_existe: ['Não achei esse assunto.', 'resposta'],
  assunto_emoji_invalido: ['Esse emoji não serve num menu. Use um emoji normal ou um do servidor (<:nome:id>).', 'resposta'],
  assuntos_titulo: ['📂 Assuntos dos tickets', 'titulo'],
  assuntos_vazio: ['Nenhum assunto. Crie com `/ticket assunto adicionar`.', 'descricao'],
  assunto_linha: '{emoji}**{nome}**{descricao}{extras}',
  assunto_extra_categoria: ' · categoria {categoria}',
  assunto_extra_equipe: ' · equipe {equipe}',
  assunto_extra_mensagem: ' · mensagem própria',
  assunto_indisponivel: ['Esse assunto não existe mais. Peça para a equipe enviar o painel de novo.', 'resposta'],
  resumo_assuntos: 'Assuntos: {total}',
  aguardando: ['aguardando', 'valor'],
  msg_ticket_padrao: 'Olá {usuario}! Descreva o que você precisa com o máximo de detalhes. A equipe já foi avisada e responde assim que puder.',
  fechar: ['Fechar', 'botao'],
  assumido: 'Assumido',
  assumir: 'Assumir',
  tickets_abertos: 'tickets abertos',
  ticket_aberto: 'um ticket aberto',
  voce_ja_tem: 'Você já tem {quantos}: {canais}',
  preciso_permissao_gerenciar_canais: '❌ Preciso da permissão **Gerenciar canais** para abrir tickets.',
  ticket: ['ticket-{numero}', 'canal'],
  ticket_2: 'Ticket de {tag} ({usuario_id})',
  consegui_criar_canal_ticket: '❌ Não consegui criar o canal do ticket. Avise a equipe: confira as minhas permissões (Gerenciar canais e Gerenciar cargos) e se a categoria não está cheia (máximo de 50 canais).',
  ticket_3: ['🎫 Ticket #{numero}', 'titulo'],
  aberto: ['Aberto por', 'campo'],
  atendente: ['Atendente', 'campo'],
  ticket_aberto_2: '✅ Ticket aberto: {canal}',
  anexos: ' [anexos: {anexos}]',
  embed: ' [embed: {embed}]',
  sem_motivo: 'Sem motivo',
  isto_ticket: ['Isto não é um ticket.', 'resposta'],
  so_quem_abriu_ou: ['Só quem abriu ou a equipe pode fechar.', 'resposta'],
  este_ticket_ja_esta: ['Este ticket já está sendo fechado.', 'resposta'],
  ticket_fechado_este_canal: ['🔒 Ticket fechado por {usuario}. Este canal será apagado em 5 segundos.', 'descricao'],
  ticket_txt: ['ticket-{numero}.txt', 'campo'],
  ticket_fechado: ['🎫 Ticket #{numero} fechado', 'titulo'],
  fechado: ['Fechado por', 'campo'],
  aberto_2: ['Aberto', 'campo'],
  motivo: ['Motivo', 'campo'],
  seu_ticket_foi_fechado: ['Seu ticket em **{servidor}** foi fechado. O histórico está em anexo.', 'descricao'],
  tem_certeza_quer_fechar: ['Tem certeza que quer fechar este ticket?', 'conteudo'],
  sim_fechar: ['Sim, fechar', 'botao'],
  fechado_pelo_botao: 'Fechado pelo botão',
  so_equipe_pode_assumir: ['Só a equipe pode assumir tickets.', 'resposta'],
  este_ticket_ja: ['Este ticket já é de <@{assumido}>.', 'resposta'],
  assumiu_este_ticket: ['🙋 {usuario} assumiu este ticket.', 'conteudo'],
  so_quem_tem_gerenciar: ['Só quem tem Gerenciar servidor pode enviar o painel.', 'resposta'],
  atendimento: '🎫 Atendimento',
  precisa_ajuda_clique_botao: 'Precisa de ajuda? Clique no botão abaixo e um canal privado será aberto para você falar com a equipe.',
  abrir_ticket: 'Abrir ticket',
  painel_enviado: ['Painel enviado em {canal}.', 'resposta'],
  use_este_comando_dentro: ['Use este comando dentro de um ticket.', 'resposta'],
  so_equipe_pode_fazer: ['Só a equipe pode fazer isso.', 'resposta'],
  consegui_adicionar_preciso_permissao: ['Não consegui adicionar. Preciso da permissão **Gerenciar cargos** para mexer nas permissões do canal.', 'resposta'],
  foi_adicionado_ticket: ['➕ {usuario} foi adicionado(a) ao ticket por {usuario2}.', 'conteudo'],
  remover_quem_abriu_ticket: ['Não dá para remover quem abriu o ticket.', 'resposta'],
  foi_removido_ticket: ['➖ {usuario} foi removido(a) do ticket.', 'conteudo'],
  ticket_renomeado: '✅ Ticket renomeado para **{nome}**.',
  consegui_renomear_agora: '❌ Não consegui renomear agora.',
  tickets_serao_criados: 'Os tickets serão criados em **{categoria}**.',
  tickets_serao_criados_sem: 'Os tickets serão criados sem categoria.',
  atende_tickets: '{cargo} atende os tickets.',
  tickets_usam_cargo_config: 'Os tickets usam o cargo de /config staff.',
  historico_tickets_vai: 'Histórico dos tickets vai para {canal}.',
  registro_tickets_desligado: 'Registro de tickets desligado.',
  mensagem_ticket_atualizada: 'Mensagem do ticket atualizada.',
  cada_pessoa_pode_ter: 'Cada pessoa pode ter até **{limite}** ticket(s) aberto(s).',
  nenhuma: 'nenhuma',
  categoria: 'Categoria: {categoria}',
  cargo_config_staff: 'cargo de /config staff',
  equipe: 'Equipe: {equipe}',
  desligado: 'desligado',
  registro: 'Registro: {registro}',
  abertos_agora_limite_pessoa: 'Abertos agora: {abertos} · Limite por pessoa: {limite}',
  tickets: 'Tickets',
});

// Botões (texto, emoji e cor personalizáveis; alguns podem ser escondidos)
const bt = botoes('tickets', {
  abrir: { nome: 'Abrir ticket (painel)', rotulo: 'abrir_ticket', emoji: '🎫', estilo: 'Primary' },
  fechar: { nome: 'Fechar ticket', rotulo: 'fechar', emoji: '🔒', estilo: 'Danger' },
  assumir: { nome: 'Assumir ticket', rotulo: 'assumir', emoji: '🙋', estilo: 'Primary', rotuloInfo: 'Depois de assumido, o texto vira o de "Assumido".', ocultavel: true },
  confirmar: { nome: 'Confirmar fechamento', rotulo: 'sim_fechar', emoji: '-', estilo: 'Danger' },
});

// Aparência dos embeds principais (cor, imagem, miniatura e rodapé personalizáveis)
const vis = visuais('tickets', {
  painel: { nome: "Painel com o botão de abrir ticket", vars: ['servidor_icone'] },
  aberto: { nome: "Mensagem dentro do ticket aberto", vars: ['avatar', 'servidor_icone'] },
});

/**
 * Tickets: painel com botão "Abrir ticket", canal privado para cada atendimento,
 * botões de fechar e assumir, e histórico (.txt) enviado ao canal de registro ao fechar.
 */

const tickets = colecao('tickets');
const PADRAO = {
  categoria: null,
  equipe: null, // se vazio, usa o cargo de /config staff
  registro: null,
  mensagem: null,
  limite: 1,
  contador: 0,
  assuntos: [], // { id, nome, emoji, descricao, categoria, equipe, mensagem } (menu do painel)
};
const cfg = (guildId) => ajustes(guildId, 'tickets', PADRAO);
const msgTicket = (c) => modeloOu(c.mensagem, 'Olá {usuario}! Descreva o que você precisa com o máximo de detalhes. A equipe já foi avisada e responde assim que puder.', tx('msg_ticket_padrao'));
const dados = (guildId, canalId) => tickets.ler(guildId, canalId);

function podeAtender(member) {
  const c = cfg(member.guild.id);
  return ehStaff(member) || (c.equipe && member.roles.cache.has(c.equipe));
}

const botoesTicket = (assumido = false) =>
  fileira(bt('fechar').setCustomId('tk:fechar'), bt('assumir', assumido ? { rotulo: tx('assumido') } : undefined)?.setCustomId('tk:assumir').setDisabled(assumido));

// ---------------- abrir ----------------
/**
 * Abre um ticket. assunto (opcional): { nome, emoji, categoria, equipe, mensagem }
 * Usado pelo botão/menu do /ticket painel e pelos painéis criados no Personalizar bot.
 */
export async function abrirTicket(i, assunto = null) {
  return abrir(i, assunto);
}

async function abrir(i, assunto = null) {
  await i.deferReply({ flags: MessageFlags.Ephemeral });
  const c = cfg(i.guildId);
  const g = tickets.de(i.guildId);

  // limpa registros de canais que não existem mais
  for (const canalId of Object.keys(g)) if (!i.guild.channels.cache.has(canalId)) delete g[canalId];
  const abertos = Object.entries(g).filter(([, t]) => t.dono === i.user.id);
  if (abertos.length >= c.limite) {
    return i.editReply(tx('voce_ja_tem', { quantos: abertos.length > 1 ? tx('tickets_abertos') : tx('ticket_aberto'), canais: abertos.map(([id]) => `<#${id}>`).join(' ') }));
  }

  const me = i.guild.members.me;
  if (!me.permissions.has(PermissionFlagsBits.ManageChannels)) return i.editReply(tx('preciso_permissao_gerenciar_canais'));

  const equipeGeral = c.equipe || ajustes(i.guildId, 'geral').staff;
  const equipeAssunto = assunto?.equipe && i.guild.roles.cache.has(assunto.equipe) ? assunto.equipe : null;
  const equipe = equipeAssunto || equipeGeral; // quem é avisado
  const ehCategoria = (id) => id && i.guild.channels.cache.get(id)?.type === ChannelType.GuildCategory;
  const categoria = ehCategoria(assunto?.categoria) ? assunto.categoria : ehCategoria(c.categoria) ? c.categoria : null;

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
  for (const r of new Set([equipeGeral, equipeAssunto])) {
    if (r && i.guild.roles.cache.has(r)) sobrescritas.push({ id: r, allow: soAsMinhas([...permitir, PermissionFlagsBits.ManageMessages]) });
  }

  const numero = String(c.contador + 1).padStart(4, '0');
  let canal;
  try {
    canal = await i.guild.channels.create({
      name: tx('ticket', { numero }),
      type: ChannelType.GuildText,
      parent: categoria ?? undefined,
      topic: tx('ticket_2', { tag: i.user.tag, usuario_id: i.user.id }),
      permissionOverwrites: sobrescritas,
      reason: `Ticket aberto por ${i.user.tag}`,
    });
  } catch (e) {
    console.error('[tickets] não consegui criar o canal:', e.message);
    return i.editReply(tx('consegui_criar_canal_ticket'));
  }
  c.contador += 1;
  salvarAjustes();

  const nomeAssunto = assunto?.nome ? `${assunto.emoji ? `${assunto.emoji} ` : ''}${assunto.nome}` : null;
  g[canal.id] = { dono: i.user.id, numero, aberto: Date.now(), assumido: null, assunto: nomeAssunto };
  tickets.salvar();

  const e = embed(i.guildId)
    .setTitle(tx('ticket_3', { numero }))
    .setDescription(preencher(assunto?.mensagem || msgTicket(c), { usuario: `${i.user}`, nome: i.member.displayName, servidor: i.guild.name, assunto: assunto?.nome ?? '' }))
    .addFields({ name: tx('aberto'), value: `${i.user}`, inline: true }, { name: tx('atendente'), value: tx('aguardando'), inline: true })
    .setTimestamp();
  if (nomeAssunto) e.addFields({ name: tx('assunto_campo'), value: nomeAssunto, inline: true }); // 3º campo (o 2º é o atendente)
  vis(e, 'aberto', imagens({ user: i.user, guild: i.guild }));
  await canal.send({
    content: `${i.user}${equipe ? ` <@&${equipe}>` : ''}`,
    embeds: [e],
    components: fileiras(botoesTicket()),
    allowedMentions: { users: [i.user.id], roles: equipe ? [equipe] : [] },
  });
  return i.editReply(tx('ticket_aberto_2', { canal }));
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
      const anexos = m.attachments.size ? tx('anexos', { anexos: [...m.attachments.values()].map((a) => a.url).join(' ') }) : '';
      const embeds = !m.content && m.embeds.length ? tx('embed', { embed: m.embeds[0].title ?? m.embeds[0].description?.slice(0, 80) ?? '' }) : '';
      return `[${data(m.createdAt)}] ${m.author.tag}: ${m.content}${anexos}${embeds}`;
    })
    .join('\n');
}

const fechando = new Set(); // evita fechar o mesmo ticket duas vezes ao mesmo tempo

async function fechar(i, motivo = tx('sem_motivo')) {
  const t = dados(i.guildId, i.channelId);
  if (!t) return responder(i, tx('isto_ticket'), 'erro');
  if (i.user.id !== t.dono && !podeAtender(i.member)) return responder(i, tx('so_quem_abriu_ou'), 'erro');
  if (fechando.has(i.channelId)) return responder(i, tx('este_ticket_ja_esta'), 'aviso');
  fechando.add(i.channelId);
  setTimeout(() => fechando.delete(i.channelId), 30_000);

  await i.reply({ embeds: [embed(i.guildId).setColor(CORES.erro).setDescription(tx('ticket_fechado_este_canal', { usuario: i.user }))] });

  const texto = await historico(i.channel);
  const arquivo = () => new AttachmentBuilder(Buffer.from(texto || '(sem mensagens)', 'utf8'), { name: tx('ticket_txt', { numero: t.numero }) });
  const resumo = embed(i.guildId)
    .setTitle(tx('ticket_fechado', { numero: t.numero }))
    .addFields(
      { name: tx('aberto'), value: `<@${t.dono}>`, inline: true },
      { name: tx('fechado'), value: `${i.user}`, inline: true },
      { name: tx('atendente'), value: t.assumido ? `<@${t.assumido}>` : '—', inline: true },
      { name: tx('aberto_2'), value: `<t:${Math.floor(t.aberto / 1000)}:f>`, inline: true },
      ...(t.assunto ? [{ name: tx('assunto_campo'), value: cortar(t.assunto, 1000), inline: true }] : []),
      { name: tx('motivo'), value: cortar(motivo, 1000) },
    )
    .setTimestamp();

  const c = cfg(i.guildId);
  const reg = c.registro && i.guild.channels.cache.get(c.registro);
  if (reg?.isTextBased()) await reg.send({ embeds: [resumo], files: [arquivo()], allowedMentions: { parse: [] } }).catch(() => {});
  const dono = await i.client.users.fetch(t.dono).catch(() => null);
  if (dono) await dono.send({ embeds: [resumo.setDescription(tx('seu_ticket_foi_fechado', { servidor: i.guild.name }))], files: [arquivo()] }).catch(() => {});

  // outros módulos (ex.: Avaliação de atendimento) ficam sabendo
  sinais.emit('ticketFechado', { guild: i.guild, client: i.client, dono: t.dono, atendente: t.assumido, fechadoPor: i.user.id, numero: t.numero });

  tickets.apagar(i.guildId, i.channelId);
  setTimeout(() => i.channel.delete(`Ticket fechado por ${i.user.tag}`).catch(() => {}), 5000);
}

// ---------------- botões ----------------
const componentes = {
  async tk(i, [acao]) {
    if (acao === 'abrir') return abrir(i);
    if (acao === 'assunto' && i.isStringSelectMenu()) {
      const a = cfg(i.guildId).assuntos.find((x) => x.id === i.values[0]);
      if (!a) return responder(i, tx('assunto_indisponivel'), 'erro');
      return abrir(i, a);
    }
    if (acao === 'fechar') {
      const t = dados(i.guildId, i.channelId);
      if (!t) return responder(i, tx('isto_ticket'), 'erro');
      return i.reply({
        content: tx('tem_certeza_quer_fechar'),
        components: [new ActionRowBuilder().addComponents(bt('confirmar').setCustomId('tk:confirmar'))],
        flags: MessageFlags.Ephemeral,
      });
    }
    if (acao === 'confirmar') return fechar(i, tx('fechado_pelo_botao'));
    if (acao === 'assumir') {
      const t = dados(i.guildId, i.channelId);
      if (!t) return responder(i, tx('isto_ticket'), 'erro');
      if (!podeAtender(i.member)) return responder(i, tx('so_equipe_pode_assumir'), 'erro');
      if (t.assumido) return responder(i, tx('este_ticket_ja', { assumido: t.assumido }), 'aviso');
      t.assumido = i.user.id;
      tickets.salvar();
      const original = i.message.embeds[0];
      const e = original ? EmbedBuilder.from(original) : embed(i.guildId);
      if (original) e.setFields(original.fields.map((f, n) => (n === 1 ? { ...f, value: `${i.user}` } : f))); // 2º campo = Atendente (o nome pode ter sido personalizado)
      await i.update({ embeds: [e], components: fileiras(botoesTicket(true)) });
      return i.channel.send({ content: tx('assumiu_este_ticket', { usuario: i.user }), allowedMentions: { parse: [] } });
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
        .addStringOption((o) =>
          o.setName('modo').setDescription('Botão (padrão) ou menu com os assuntos').addChoices({ name: 'Botão', value: 'botao' }, { name: 'Menu de assuntos', value: 'menu' })
        )
    )
    .addSubcommandGroup((g) =>
      g
        .setName('assunto')
        .setDescription('Assuntos do menu de tickets (equipe)')
        .addSubcommand((s) =>
          s
            .setName('adicionar')
            .setDescription('Cria um assunto para o menu do painel')
            .addStringOption((o) => o.setName('nome').setDescription('Ex.: Suporte, Compras, Denúncia').setRequired(true).setMaxLength(80))
            .addStringOption((o) => o.setName('emoji').setDescription('Emoji do assunto').setMaxLength(64))
            .addStringOption((o) => o.setName('descricao').setDescription('Texto pequeno embaixo do nome no menu').setMaxLength(100))
            .addChannelOption((o) => o.setName('categoria').setDescription('Categoria dos tickets deste assunto').addChannelTypes(ChannelType.GuildCategory))
            .addRoleOption((o) => o.setName('equipe').setDescription('Cargo que atende este assunto'))
            .addStringOption((o) => o.setName('mensagem').setDescription('Mensagem de abertura. Variáveis: {usuario} {nome} {servidor} {assunto}').setMaxLength(1500))
        )
        .addSubcommand((s) =>
          s.setName('remover').setDescription('Apaga um assunto').addStringOption((o) => o.setName('nome').setDescription('Assunto').setRequired(true).setAutocomplete(true))
        )
        .addSubcommand((s) => s.setName('lista').setDescription('Mostra os assuntos'))
    )
    .addSubcommand((s) => s.setName('fechar').setDescription('Fecha este ticket').addStringOption((o) => o.setName('motivo').setDescription('Motivo').setMaxLength(500)))
    .addSubcommand((s) => s.setName('adicionar').setDescription('Adiciona alguém a este ticket').addUserOption((o) => o.setName('usuario').setDescription('Quem').setRequired(true)))
    .addSubcommand((s) => s.setName('remover').setDescription('Remove alguém deste ticket').addUserOption((o) => o.setName('usuario').setDescription('Quem').setRequired(true)))
    .addSubcommand((s) =>
      s.setName('renomear').setDescription('Muda o nome deste ticket').addStringOption((o) => o.setName('nome').setDescription('Novo nome').setRequired(true).setMaxLength(90))
    ),
  async autocompletar(i) {
    const busca = i.options.getFocused().toLowerCase();
    const lista = cfg(i.guildId).assuntos.filter((a) => a.nome.toLowerCase().includes(busca)).slice(0, 25);
    return i.respond(lista.map((a) => ({ name: a.nome, value: a.id })));
  },
  async executar(i) {
    const grupo = i.options.getSubcommandGroup(false);
    const sub = i.options.getSubcommand();
    if (grupo === 'assunto') return assuntos(i, sub);
    if (sub === 'painel') {
      if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) return responder(i, tx('so_quem_tem_gerenciar'), 'erro');
      const c = cfg(i.guildId);
      const menu = i.options.getString('modo') === 'menu';
      if (menu && !c.assuntos.length) return responder(i, tx('crie_assuntos'), 'erro');
      const canal = i.options.getChannel('canal') ?? i.channel;
      const e = embed(i.guildId)
        .setTitle(i.options.getString('titulo') || tx('atendimento'))
        .setDescription(i.options.getString('descricao') || tx('precisa_ajuda_clique_botao'));
      vis(e, 'painel', imagens({ guild: i.guild }));
      const row = menu
        ? new ActionRowBuilder().addComponents(
            new StringSelectMenuBuilder()
              .setCustomId('tk:assunto')
              .setPlaceholder(tx('escolha_assunto'))
              .addOptions(
                c.assuntos.slice(0, 25).map((a) => {
                  const op = { label: cortar(a.nome, 100), value: a.id };
                  if (a.descricao) op.description = cortar(a.descricao, 100);
                  if (a.emoji) op.emoji = a.emoji;
                  return op;
                })
              )
          )
        : new ActionRowBuilder().addComponents(bt('abrir', i.options.getString('botao') ? { rotulo: i.options.getString('botao') } : undefined).setCustomId('tk:abrir'));
      await canal.send({ embeds: [e], components: [row] });
      return responder(i, tx('painel_enviado', { canal }), 'sucesso');
    }
    if (sub === 'fechar') return fechar(i, i.options.getString('motivo') || tx('sem_motivo'));

    const t = dados(i.guildId, i.channelId);
    if (!t) return responder(i, tx('use_este_comando_dentro'), 'erro');
    if (!podeAtender(i.member)) return responder(i, tx('so_equipe_pode_fazer'), 'erro');
    if (sub === 'adicionar') {
      const u = i.options.getUser('usuario');
      const ok = await i.channel.permissionOverwrites
        .edit(u.id, { ViewChannel: true, SendMessages: true, ReadMessageHistory: true, AttachFiles: true })
        .then(() => true, () => false);
      if (!ok) return responder(i, tx('consegui_adicionar_preciso_permissao'), 'erro');
      return i.reply({ content: tx('foi_adicionado_ticket', { usuario: u, usuario2: i.user }), allowedMentions: { users: [u.id] } });
    }
    if (sub === 'remover') {
      const u = i.options.getUser('usuario');
      if (u.id === t.dono) return responder(i, tx('remover_quem_abriu_ticket'), 'erro');
      await i.channel.permissionOverwrites.delete(u.id).catch(() => {});
      return i.reply({ content: tx('foi_removido_ticket', { usuario: u }), allowedMentions: { parse: [] } });
    }
    if (sub === 'renomear') {
      const nome = i.options.getString('nome').toLowerCase().replace(/\s+/g, '-');
      // o Discord só deixa renomear um canal 2 vezes a cada 10 minutos: responde antes de esperar
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const ok = await i.channel.setName(nome).then(() => true, () => false);
      return i.editReply(ok ? tx('ticket_renomeado', { nome }) : tx('consegui_renomear_agora'));
    }
  },
};

// ---------------- /ticket assunto ----------------
function assuntos(i, sub) {
  if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) return responder(i, tx('so_quem_tem_gerenciar'), 'erro');
  const c = cfg(i.guildId);
  if (sub === 'adicionar') {
    const nome = i.options.getString('nome').trim();
    if (c.assuntos.length >= 25) return responder(i, tx('assunto_limite'), 'erro');
    if (c.assuntos.some((a) => a.nome.toLowerCase() === nome.toLowerCase())) return responder(i, tx('assunto_existe'), 'erro');
    const emoji = i.options.getString('emoji')?.trim() || '';
    if (emoji && !emojiDeBotaoOk(emoji)) return responder(i, tx('assunto_emoji_invalido'), 'erro');
    const base = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 24) || 'assunto';
    let id = base;
    for (let n = 2; c.assuntos.some((a) => a.id === id); n++) id = `${base}-${n}`;
    c.assuntos.push({
      id,
      nome,
      emoji,
      descricao: i.options.getString('descricao') || '',
      categoria: i.options.getChannel('categoria')?.id ?? null,
      equipe: i.options.getRole('equipe')?.id ?? null,
      mensagem: i.options.getString('mensagem') || '',
    });
    salvarAjustes();
    return responder(i, tx('assunto_adicionado', { nome, total: c.assuntos.length }), 'sucesso');
  }
  if (sub === 'remover') {
    const alvo = i.options.getString('nome');
    const n = c.assuntos.findIndex((a) => a.id === alvo || a.nome.toLowerCase() === alvo.toLowerCase());
    if (n < 0) return responder(i, tx('assunto_nao_existe'), 'erro');
    const [a] = c.assuntos.splice(n, 1);
    salvarAjustes();
    return responder(i, tx('assunto_removido', { nome: a.nome }), 'sucesso');
  }
  const linhas = c.assuntos.map((a) =>
    tx('assunto_linha', {
      emoji: a.emoji ? `${a.emoji} ` : '',
      nome: a.nome,
      descricao: a.descricao ? ` — ${a.descricao}` : '',
      extras:
        (a.categoria ? tx('assunto_extra_categoria', { categoria: `<#${a.categoria}>` }) : '') +
        (a.equipe ? tx('assunto_extra_equipe', { equipe: `<@&${a.equipe}>` }) : '') +
        (a.mensagem ? tx('assunto_extra_mensagem') : ''),
    })
  );
  return i.reply({ embeds: [embed(i.guildId).setTitle(tx('assuntos_titulo')).setDescription(linhas.join('\n') || tx('assuntos_vazio'))], flags: MessageFlags.Ephemeral });
}

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
      msg = cat ? tx('tickets_serao_criados', { categoria: cat.name }) : tx('tickets_serao_criados_sem');
    } else if (sub === 'equipe') {
      const r = i.options.getRole('cargo');
      c.equipe = r?.id ?? null;
      msg = r ? tx('atende_tickets', { cargo: r }) : tx('tickets_usam_cargo_config');
    } else if (sub === 'registro') {
      const ch = i.options.getChannel('canal');
      c.registro = ch?.id ?? null;
      msg = ch ? tx('historico_tickets_vai', { canal: ch }) : tx('registro_tickets_desligado');
    } else if (sub === 'mensagem') {
      c.mensagem = i.options.getString('texto');
      msg = tx('mensagem_ticket_atualizada');
    } else if (sub === 'limite') {
      c.limite = i.options.getInteger('quantidade');
      msg = tx('cada_pessoa_pode_ter', { limite: c.limite });
    }
    salvarAjustes();
    return responder(i, msg, 'sucesso');
  },
  resumo(guild) {
    const c = cfg(guild.id);
    const abertos = Object.keys(tickets.ler(guild.id) ?? {}).length;
    return [
      tx('categoria', { categoria: c.categoria ? `<#${c.categoria}>` : tx('nenhuma') }),
      tx('equipe', { equipe: c.equipe ? `<@&${c.equipe}>` : tx('cargo_config_staff') }),
      tx('registro', { registro: c.registro ? `<#${c.registro}>` : tx('desligado') }),
      tx('abertos_agora_limite_pessoa', { abertos, limite: c.limite }),
      tx('resumo_assuntos', { total: c.assuntos.length }),
    ];
  },
};

export default {
  id: 'tickets',
  nome: tx('tickets'),
  // o conteúdo das mensagens é necessário para salvar o histórico ao fechar
  intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  permissoes: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.ManageMessages],
  comandos: [ticket],
  componentes,
  config,
};
