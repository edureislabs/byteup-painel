import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, embed, responder, checarHierarquia, lerDuracao, duracaoTexto, cortar, CORES } from '../core/util.js';

/** Moderação: banir, expulsar, castigo, advertências, limpar mensagens, trancar canais. */

const advertencias = colecao('advertencias');
const PADRAO = { canalLog: null, avisarDm: true, limite: 0, acaoLimite: 'castigo', duracaoLimite: 3_600_000 };
const cfg = (guildId) => ajustes(guildId, 'moderacao', PADRAO);
const MAX_CASTIGO = 28 * 86_400_000;

/**
 * Registra uma ação no canal de registro da moderação.
 * Com `alvo`, mostra Membro / Por / Motivo; sem alvo (ações em canais), só Por + `extra`.
 */
async function registrar(guild, { acao, cor = CORES.aviso, alvo, autor, motivo, extra = [] }) {
  const canalId = cfg(guild.id).canalLog;
  if (!canalId) return;
  const canal = guild.channels.cache.get(canalId);
  if (!canal?.isTextBased()) return;
  const campos = [];
  if (alvo) campos.push({ name: 'Membro', value: `${alvo} (${alvo.tag ?? alvo.user?.tag ?? alvo.id})`, inline: true });
  campos.push({ name: 'Por', value: autor ? `${autor}` : 'automático', inline: true });
  campos.push(...extra);
  if (motivo !== undefined) campos.push({ name: 'Motivo', value: cortar(motivo || 'Sem motivo', 1000) });
  const e = embed(guild.id).setColor(cor).setTitle(acao).addFields(campos).setTimestamp();
  if (alvo?.displayAvatarURL) e.setThumbnail(alvo.displayAvatarURL());
  await canal.send({ embeds: [e], allowedMentions: { parse: [] } }).catch(() => {});
}

/** Executa uma ação do Discord; se falhar, responde com uma mensagem clara. */
async function tentar(i, acao, erro) {
  try {
    await acao();
    return true;
  } catch (e) {
    console.error('[moderação]', e.message);
    await responder(i, erro, 'erro');
    return false;
  }
}

async function avisarDm(user, guild, texto) {
  if (!cfg(guild.id).avisarDm) return;
  await user.send({ embeds: [embed(guild.id).setTitle(guild.name).setDescription(texto)] }).catch(() => {});
}

const motivoDe = (i) => i.options.getString('motivo') || 'Sem motivo';
const SEM_PERMISSAO = (perm) => `Não consegui. Confira se eu tenho a permissão **${perm}** e se o meu cargo está acima do cargo dessa pessoa.`;
const opMotivo = (o, obrigatorio = false) => o.setName('motivo').setDescription('Motivo').setRequired(obrigatorio).setMaxLength(500);

// ---------------- comandos ----------------
const banir = {
  data: new SlashCommandBuilder()
    .setName('banir')
    .setDescription('Bane um membro do servidor')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addUserOption((o) => o.setName('usuario').setDescription('Quem banir').setRequired(true))
    .addStringOption((o) => opMotivo(o))
    .addIntegerOption((o) =>
      o.setName('apagar').setDescription('Apagar mensagens recentes dele').addChoices(
        { name: 'Não apagar', value: 0 },
        { name: 'Última hora', value: 3600 },
        { name: 'Últimas 24 horas', value: 86400 },
        { name: 'Últimos 7 dias', value: 604800 },
      )
    ),
  async executar(i) {
    const user = i.options.getUser('usuario');
    const membro = i.options.getMember('usuario');
    const motivo = motivoDe(i);
    if (membro) {
      const erro = checarHierarquia(i.member, membro, i.guild.members.me);
      if (erro) return responder(i, erro, 'erro');
      if (!membro.bannable) return responder(i, SEM_PERMISSAO('Banir membros'), 'erro');
    } else if (!i.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return responder(i, SEM_PERMISSAO('Banir membros'), 'erro');
    }
    if (membro) await avisarDm(user, i.guild, `🔨 Você foi **banido(a)**.\n**Motivo:** ${motivo}`);
    const ok = await tentar(
      i,
      () => i.guild.members.ban(user, { reason: `${motivo} (por ${i.user.tag})`, deleteMessageSeconds: i.options.getInteger('apagar') ?? 0 }),
      SEM_PERMISSAO('Banir membros')
    );
    if (!ok) return;
    await registrar(i.guild, { acao: '🔨 Banimento', cor: CORES.erro, alvo: user, autor: i.user, motivo });
    return responder(i, `**${user.tag}** foi banido(a). Motivo: ${motivo}`, 'sucesso');
  },
};

const desbanir = {
  data: new SlashCommandBuilder()
    .setName('desbanir')
    .setDescription('Remove o banimento de alguém')
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers)
    .addStringOption((o) => o.setName('id').setDescription('ID do usuário banido').setRequired(true).setMaxLength(22))
    .addStringOption((o) => opMotivo(o)),
  async executar(i) {
    const id = i.options.getString('id').replace(/\D/g, '');
    const motivo = motivoDe(i);
    if (!id) return responder(i, 'Informe o ID do usuário (só números).', 'erro');
    const ban = await i.guild.bans.fetch(id).catch(() => null);
    if (!ban) return responder(i, 'Esse ID não está na lista de banidos.', 'erro');
    const ok = await tentar(i, () => i.guild.bans.remove(id, `${motivo} (por ${i.user.tag})`), SEM_PERMISSAO('Banir membros'));
    if (!ok) return;
    await registrar(i.guild, { acao: '🔓 Banimento removido', cor: CORES.sucesso, alvo: ban.user, autor: i.user, motivo });
    return responder(i, `**${ban.user.tag}** foi desbanido(a).`, 'sucesso');
  },
};

const expulsar = {
  data: new SlashCommandBuilder()
    .setName('expulsar')
    .setDescription('Expulsa um membro (ele pode voltar com convite)')
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers)
    .addUserOption((o) => o.setName('usuario').setDescription('Quem expulsar').setRequired(true))
    .addStringOption((o) => opMotivo(o)),
  async executar(i) {
    const membro = i.options.getMember('usuario');
    if (!membro) return responder(i, 'Esse usuário não está no servidor.', 'erro');
    const erro = checarHierarquia(i.member, membro, i.guild.members.me);
    if (erro) return responder(i, erro, 'erro');
    if (!membro.kickable) return responder(i, SEM_PERMISSAO('Expulsar membros'), 'erro');
    const motivo = motivoDe(i);
    await avisarDm(membro.user, i.guild, `👢 Você foi **expulso(a)**.\n**Motivo:** ${motivo}`);
    const ok = await tentar(i, () => membro.kick(`${motivo} (por ${i.user.tag})`), SEM_PERMISSAO('Expulsar membros'));
    if (!ok) return;
    await registrar(i.guild, { acao: '👢 Expulsão', cor: CORES.erro, alvo: membro.user, autor: i.user, motivo });
    return responder(i, `**${membro.user.tag}** foi expulso(a).`, 'sucesso');
  },
};

async function aplicarCastigo(i, membro, ms, motivo, autor = i.user) {
  await membro.timeout(ms, `${motivo} (por ${i.user.tag})`);
  await avisarDm(membro.user, i.guild, `🔇 Você está de **castigo** por ${duracaoTexto(ms)}.\n**Motivo:** ${motivo}`);
  await registrar(i.guild, {
    acao: '🔇 Castigo',
    alvo: membro.user,
    autor,
    motivo,
    extra: [{ name: 'Duração', value: duracaoTexto(ms), inline: true }],
  });
}

const castigo = {
  data: new SlashCommandBuilder()
    .setName('castigo')
    .setDescription('Deixa um membro sem falar por um tempo')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('usuario').setDescription('Quem colocar de castigo').setRequired(true))
    .addStringOption((o) => o.setName('duracao').setDescription('Ex.: 10m, 1h, 2d (máximo 28d)').setRequired(true).setMaxLength(20))
    .addStringOption((o) => opMotivo(o)),
  async executar(i) {
    const membro = i.options.getMember('usuario');
    if (!membro) return responder(i, 'Esse usuário não está no servidor.', 'erro');
    const erro = checarHierarquia(i.member, membro, i.guild.members.me);
    if (erro) return responder(i, erro, 'erro');
    if (!membro.moderatable) return responder(i, `${SEM_PERMISSAO('Castigar membros')} (Administradores não podem ficar de castigo.)`, 'erro');
    const ms = lerDuracao(i.options.getString('duracao'));
    if (!ms || ms > MAX_CASTIGO) return responder(i, 'Duração inválida. Use algo como **10m**, **1h** ou **2d** (no máximo 28d).', 'erro');
    const motivo = motivoDe(i);
    const ok = await tentar(i, () => aplicarCastigo(i, membro, ms, motivo), SEM_PERMISSAO('Castigar membros'));
    if (!ok) return;
    return responder(i, `**${membro.user.tag}** está de castigo por **${duracaoTexto(ms)}**.`, 'sucesso');
  },
};

const removerCastigo = {
  data: new SlashCommandBuilder()
    .setName('removercastigo')
    .setDescription('Tira o castigo de um membro')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('usuario').setDescription('Quem liberar').setRequired(true))
    .addStringOption((o) => opMotivo(o)),
  async executar(i) {
    const membro = i.options.getMember('usuario');
    if (!membro) return responder(i, 'Esse usuário não está no servidor.', 'erro');
    if (!membro.isCommunicationDisabled()) return responder(i, 'Esse membro não está de castigo.', 'aviso');
    const motivo = motivoDe(i);
    const ok = await tentar(i, () => membro.timeout(null, `${motivo} (por ${i.user.tag})`), SEM_PERMISSAO('Castigar membros'));
    if (!ok) return;
    await registrar(i.guild, { acao: '🔊 Castigo removido', cor: CORES.sucesso, alvo: membro.user, autor: i.user, motivo });
    return responder(i, `O castigo de **${membro.user.tag}** foi removido.`, 'sucesso');
  },
};

const advertir = {
  data: new SlashCommandBuilder()
    .setName('advertir')
    .setDescription('Dá uma advertência a um membro')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('usuario').setDescription('Quem advertir').setRequired(true))
    .addStringOption((o) => opMotivo(o, true)),
  async executar(i) {
    const membro = i.options.getMember('usuario');
    if (!membro) return responder(i, 'Esse usuário não está no servidor.', 'erro');
    if (membro.user.bot) return responder(i, 'Não dá para advertir bots.', 'erro');
    const erro = checarHierarquia(i.member, membro, i.guild.members.me);
    if (erro) return responder(i, erro, 'erro');
    const motivo = motivoDe(i);

    const g = advertencias.de(i.guildId);
    g[membro.id] ??= [];
    g[membro.id].push({ motivo, por: i.user.id, em: Date.now() });
    advertencias.salvar();
    const total = g[membro.id].length;

    await avisarDm(membro.user, i.guild, `⚠️ Você recebeu uma **advertência** (${total} no total).\n**Motivo:** ${motivo}`);
    await registrar(i.guild, { acao: '⚠️ Advertência', alvo: membro.user, autor: i.user, motivo, extra: [{ name: 'Total', value: String(total), inline: true }] });

    // punição automática ao chegar no limite
    const c = cfg(i.guildId);
    let extra = '';
    if (c.limite > 0 && total >= c.limite && total % c.limite === 0) {
      const motivoAuto = `Chegou a ${total} advertências`;
      try {
        if (c.acaoLimite === 'banir') {
          await avisarDm(membro.user, i.guild, `🔨 Você foi **banido(a)**.\n**Motivo:** ${motivoAuto}`);
          await i.guild.members.ban(membro, { reason: motivoAuto });
          await registrar(i.guild, { acao: '🔨 Banimento automático', cor: CORES.erro, alvo: membro.user, autor: null, motivo: motivoAuto });
          extra = '\nPunição automática: **banimento**.';
        } else if (c.acaoLimite === 'expulsar') {
          await avisarDm(membro.user, i.guild, `👢 Você foi **expulso(a)**.\n**Motivo:** ${motivoAuto}`);
          await membro.kick(motivoAuto);
          await registrar(i.guild, { acao: '👢 Expulsão automática', cor: CORES.erro, alvo: membro.user, autor: null, motivo: motivoAuto });
          extra = '\nPunição automática: **expulsão**.';
        } else {
          await aplicarCastigo(i, membro, c.duracaoLimite, motivoAuto, null);
          extra = `\nPunição automática: **castigo** de ${duracaoTexto(c.duracaoLimite)}.`;
        }
      } catch {
        extra = '\n(Não consegui aplicar a punição automática: confira as minhas permissões.)';
      }
    }
    return responder(i, `**${membro.user.tag}** recebeu uma advertência (**${total}** no total).${extra}`, 'sucesso');
  },
};

const verAdvertencias = {
  data: new SlashCommandBuilder()
    .setName('advertencias')
    .setDescription('Mostra as advertências de um membro')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('usuario').setDescription('De quem').setRequired(true)),
  async executar(i) {
    const user = i.options.getUser('usuario');
    const lista = advertencias.ler(i.guildId, user.id) ?? [];
    if (!lista.length) return responder(i, `**${user.tag}** não tem advertências.`, 'info');
    const linhas = lista.map((a, n) => `**${n + 1}.** ${cortar(a.motivo, 120)} · por <@${a.por}> · <t:${Math.floor(a.em / 1000)}:d>`);
    return i.reply({
      embeds: [embed(i.guildId).setTitle(`⚠️ Advertências de ${user.tag}`).setDescription(linhas.join('\n').slice(0, 4000)).setThumbnail(user.displayAvatarURL())],
      flags: 64,
    });
  },
};

const removerAdvertencia = {
  data: new SlashCommandBuilder()
    .setName('removeradvertencia')
    .setDescription('Remove advertências de um membro')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addUserOption((o) => o.setName('usuario').setDescription('De quem').setRequired(true))
    .addIntegerOption((o) => o.setName('numero').setDescription('Número da advertência (0 = apagar todas)').setRequired(true).setMinValue(0)),
  async executar(i) {
    const user = i.options.getUser('usuario');
    const n = i.options.getInteger('numero');
    const lista = advertencias.ler(i.guildId, user.id) ?? [];
    if (!lista.length) return responder(i, `**${user.tag}** não tem advertências.`, 'info');
    if (n === 0) {
      advertencias.apagar(i.guildId, user.id);
      return responder(i, `Todas as advertências de **${user.tag}** foram apagadas.`, 'sucesso');
    }
    if (n > lista.length) return responder(i, `**${user.tag}** só tem ${lista.length} advertência(s).`, 'erro');
    lista.splice(n - 1, 1);
    advertencias.salvar();
    return responder(i, `Advertência ${n} de **${user.tag}** removida. Restam ${lista.length}.`, 'sucesso');
  },
};

const limpar = {
  data: new SlashCommandBuilder()
    .setName('limpar')
    .setDescription('Apaga mensagens recentes do canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addIntegerOption((o) => o.setName('quantidade').setDescription('De 1 a 100').setRequired(true).setMinValue(1).setMaxValue(100))
    .addUserOption((o) => o.setName('usuario').setDescription('Só as mensagens desta pessoa')),
  async executar(i) {
    if (!i.channel?.bulkDelete) return responder(i, 'Não dá para apagar mensagens aqui.', 'erro');
    await i.deferReply({ flags: 64 });
    const qtd = i.options.getInteger('quantidade');
    const alvo = i.options.getUser('usuario');
    let msgs = await i.channel.messages.fetch({ limit: 100 });
    msgs = msgs.filter((m) => !m.pinned && (!alvo || m.author.id === alvo.id)); // mensagens fixadas ficam
    msgs = [...msgs.values()].slice(0, qtd);
    if (!msgs.length) return i.editReply('Não achei mensagens para apagar.');
    const apagadas = await i.channel.bulkDelete(msgs, true).catch(() => null);
    if (!apagadas) return i.editReply('❌ Não consegui apagar. Preciso da permissão **Gerenciar mensagens** neste canal.');
    const n = apagadas.size;
    await registrar(i.guild, {
      acao: '🧹 Mensagens apagadas',
      autor: i.user,
      extra: [
        { name: 'Canal', value: `${i.channel}`, inline: true },
        { name: 'Quantidade', value: String(n), inline: true },
        ...(alvo ? [{ name: 'Só de', value: `${alvo} (${alvo.tag})`, inline: true }] : []),
      ],
    });
    return i.editReply(`🧹 ${n} mensagem(ns) apagada(s).${n < msgs.length ? ' (O Discord não deixa apagar em massa mensagens com mais de 14 dias.)' : ''}`);
  },
};

const opCanal = (o) => o.setName('canal').setDescription('Padrão: este canal').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement);

const trancar = {
  data: new SlashCommandBuilder()
    .setName('trancar')
    .setDescription('Impede os membros de falar no canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(opCanal)
    .addStringOption((o) => opMotivo(o)),
  async executar(i) {
    const canal = i.options.getChannel('canal') ?? i.channel;
    const ok = await tentar(
      i,
      () => canal.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: false, SendMessagesInThreads: false, CreatePublicThreads: false }),
      'Não consegui trancar. Preciso das permissões **Gerenciar canais** e **Gerenciar cargos** nesse canal.'
    );
    if (!ok) return;
    const motivo = motivoDe(i);
    await canal.send({ embeds: [embed(i.guildId).setDescription(`🔒 Canal trancado pela moderação.${motivo !== 'Sem motivo' ? `\n**Motivo:** ${motivo}` : ''}`)] }).catch(() => {});
    await registrar(i.guild, { acao: '🔒 Canal trancado', autor: i.user, motivo, extra: [{ name: 'Canal', value: `${canal}`, inline: true }] });
    return responder(i, `${canal} foi trancado.`, 'sucesso');
  },
};

const destrancar = {
  data: new SlashCommandBuilder()
    .setName('destrancar')
    .setDescription('Libera o canal de novo')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addChannelOption(opCanal),
  async executar(i) {
    const canal = i.options.getChannel('canal') ?? i.channel;
    const ok = await tentar(
      i,
      () => canal.permissionOverwrites.edit(i.guild.roles.everyone, { SendMessages: null, SendMessagesInThreads: null, CreatePublicThreads: null }),
      'Não consegui liberar. Preciso das permissões **Gerenciar canais** e **Gerenciar cargos** nesse canal.'
    );
    if (!ok) return;
    await canal.send({ embeds: [embed(i.guildId).setDescription('🔓 Canal liberado.')] }).catch(() => {});
    await registrar(i.guild, { acao: '🔓 Canal liberado', cor: CORES.sucesso, autor: i.user, extra: [{ name: 'Canal', value: `${canal}`, inline: true }] });
    return responder(i, `${canal} foi liberado.`, 'sucesso');
  },
};

const lentidao = {
  data: new SlashCommandBuilder()
    .setName('lentidao')
    .setDescription('Define o modo lento do canal')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels)
    .addIntegerOption((o) => o.setName('segundos').setDescription('0 desliga (máximo 21600 = 6h)').setRequired(true).setMinValue(0).setMaxValue(21600))
    .addChannelOption(opCanal),
  async executar(i) {
    const canal = i.options.getChannel('canal') ?? i.channel;
    const s = i.options.getInteger('segundos');
    const ok = await tentar(i, () => canal.setRateLimitPerUser(s, `por ${i.user.tag}`), 'Não consegui mudar o modo lento. Preciso da permissão **Gerenciar canais** nesse canal.');
    if (!ok) return;
    await registrar(i.guild, {
      acao: '🐢 Modo lento',
      autor: i.user,
      extra: [
        { name: 'Canal', value: `${canal}`, inline: true },
        { name: 'Intervalo', value: s ? duracaoTexto(s * 1000) : 'desligado', inline: true },
      ],
    });
    return responder(i, s ? `Modo lento de ${canal}: **${duracaoTexto(s * 1000)}** entre mensagens.` : `Modo lento de ${canal} desligado.`, 'sucesso');
  },
};

// ---------------- /config moderacao ----------------
const config = {
  grupo: 'moderacao',
  montar: (g) =>
    g
      .setDescription('Moderação: canal de registro, aviso na DM e punição automática')
      .addSubcommand((s) =>
        s.setName('canal').setDescription('Canal onde as punições ficam registradas').addChannelOption((o) =>
          o.setName('canal').setDescription('Deixe vazio para desligar').addChannelTypes(ChannelType.GuildText)
        )
      )
      .addSubcommand((s) =>
        s.setName('dm').setDescription('Avisar o membro na DM quando for punido').addBooleanOption((o) => o.setName('ativar').setDescription('Ligar ou desligar').setRequired(true))
      )
      .addSubcommand((s) =>
        s
          .setName('limite')
          .setDescription('Punição automática ao juntar advertências')
          .addIntegerOption((o) => o.setName('advertencias').setDescription('Quantas advertências (0 desliga)').setRequired(true).setMinValue(0).setMaxValue(20))
          .addStringOption((o) =>
            o.setName('acao').setDescription('O que fazer').addChoices(
              { name: 'Castigo', value: 'castigo' },
              { name: 'Expulsar', value: 'expulsar' },
              { name: 'Banir', value: 'banir' },
            )
          )
          .addStringOption((o) => o.setName('duracao').setDescription('Duração do castigo, ex.: 1h (padrão 1h)').setMaxLength(20))
      ),
  async executar(i, sub) {
    const c = cfg(i.guildId);
    if (sub === 'canal') {
      const canal = i.options.getChannel('canal');
      c.canalLog = canal?.id ?? null;
      salvarAjustes();
      return responder(i, canal ? `As punições serão registradas em ${canal}.` : 'Registro de punições desligado.', 'sucesso');
    }
    if (sub === 'dm') {
      c.avisarDm = i.options.getBoolean('ativar');
      salvarAjustes();
      return responder(i, c.avisarDm ? 'Os membros serão avisados na DM.' : 'Aviso na DM desligado.', 'sucesso');
    }
    if (sub === 'limite') {
      c.limite = i.options.getInteger('advertencias');
      c.acaoLimite = i.options.getString('acao') ?? c.acaoLimite;
      const d = i.options.getString('duracao');
      if (d) {
        const ms = lerDuracao(d);
        if (!ms || ms > MAX_CASTIGO) return responder(i, 'Duração inválida (ex.: 30m, 1h, 1d; máximo 28d).', 'erro');
        c.duracaoLimite = ms;
      }
      salvarAjustes();
      return responder(
        i,
        c.limite ? `A cada **${c.limite}** advertências: **${c.acaoLimite}**${c.acaoLimite === 'castigo' ? ` de ${duracaoTexto(c.duracaoLimite)}` : ''}.` : 'Punição automática desligada.',
        'sucesso'
      );
    }
  },
  resumo(guild) {
    const c = cfg(guild.id);
    return [
      `Registro: ${c.canalLog ? `<#${c.canalLog}>` : 'desligado'}`,
      `Aviso na DM: ${c.avisarDm ? 'sim' : 'não'}`,
      `Punição automática: ${c.limite ? `a cada ${c.limite} advertências → ${c.acaoLimite}` : 'desligada'}`,
    ];
  },
};

export default {
  id: 'moderacao',
  nome: 'Moderação',
  comandos: [banir, desbanir, expulsar, castigo, removerCastigo, advertir, verAdvertencias, removerAdvertencia, limpar, trancar, destrancar, lentidao],
  permissoes: [
    PermissionFlagsBits.BanMembers,
    PermissionFlagsBits.KickMembers,
    PermissionFlagsBits.ModerateMembers,
    PermissionFlagsBits.ManageMessages,
    PermissionFlagsBits.ManageChannels,
    PermissionFlagsBits.ManageRoles,
  ],
  config,
};
