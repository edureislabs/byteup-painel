import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, embed, responder, checarHierarquia, lerDuracao, duracaoTexto, cortar, CORES, imagens } from '../core/util.js';
import { textos, visuais } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('moderacao', {
  membro: ['Membro', 'campo'],
  por: ['Por', 'campo'],
  automatico: 'automático',
  motivo: ['Motivo', 'campo'],
  sem_motivo: 'Sem motivo',
  consegui_confira_eu_tenho: 'Não consegui. Confira se eu tenho a permissão **{perm}** e se o meu cargo está acima do cargo dessa pessoa.',
  banir_membros: 'Banir membros',
  voce_foi_banido_motivo: '🔨 Você foi **banido(a)**.\n**Motivo:** {motivo}',
  banimento: ['🔨 Banimento', 'titulo'],
  foi_banido_motivo: ['**{tag}** foi banido(a). Motivo: {motivo}', 'resposta'],
  informe_id_usuario_so: ['Informe o ID do usuário (só números).', 'resposta'],
  esse_id_esta_lista: ['Esse ID não está na lista de banidos.', 'resposta'],
  por_2: '{motivo} (por {tag})',
  banimento_removido: ['🔓 Banimento removido', 'titulo'],
  foi_desbanido: ['**{tag}** foi desbanido(a).', 'resposta'],
  esse_usuario_esta_servidor: ['Esse usuário não está no servidor.', 'resposta'],
  expulsar_membros: 'Expulsar membros',
  voce_foi_expulso_motivo: '👢 Você foi **expulso(a)**.\n**Motivo:** {motivo}',
  expulsao: ['👢 Expulsão', 'titulo'],
  foi_expulso: ['**{tag}** foi expulso(a).', 'resposta'],
  voce_esta_castigo_motivo: '🔇 Você está de **castigo** por {duracao}.\n**Motivo:** {motivo}',
  castigo: ['🔇 Castigo', 'titulo'],
  duracao: ['Duração', 'campo'],
  castigar_membros: 'Castigar membros',
  administradores_podem_ficar_castigo: ['{erro} (Administradores não podem ficar de castigo.)', 'resposta'],
  duracao_invalida_use_algo: ['Duração inválida. Use algo como **10m**, **1h** ou **2d** (no máximo 28d).', 'resposta'],
  esta_castigo: ['**{tag}** está de castigo por **{duracao}**.', 'resposta'],
  esse_membro_esta_castigo: ['Esse membro não está de castigo.', 'resposta'],
  castigo_removido: ['🔊 Castigo removido', 'titulo'],
  castigo_foi_removido: ['O castigo de **{tag}** foi removido.', 'resposta'],
  advertir_bots: ['Não dá para advertir bots.', 'resposta'],
  voce_recebeu_advertencia_total: '⚠️ Você recebeu uma **advertência** ({total} no total).\n**Motivo:** {motivo}',
  advertencia: ['⚠️ Advertência', 'titulo'],
  total: ['Total', 'campo'],
  chegou_advertencias: 'Chegou a {total} advertências',
  voce_foi_banido_motivo_2: '🔨 Você foi **banido(a)**.\n**Motivo:** {motivoAuto}',
  banimento_automatico: ['🔨 Banimento automático', 'titulo'],
  punicao_automatica_banimento: '\nPunição automática: **banimento**.',
  voce_foi_expulso_motivo_2: '👢 Você foi **expulso(a)**.\n**Motivo:** {motivoAuto}',
  expulsao_automatica: ['👢 Expulsão automática', 'titulo'],
  punicao_automatica_expulsao: '\nPunição automática: **expulsão**.',
  punicao_automatica_castigo: '\nPunição automática: **castigo** de {duracao}.',
  consegui_aplicar_punicao_automatica: '\n(Não consegui aplicar a punição automática: confira as minhas permissões.)',
  recebeu_advertencia_total: ['**{tag}** recebeu uma advertência (**{total}** no total).{extra}', 'resposta'],
  tem_advertencias: ['**{tag}** não tem advertências.', 'resposta'],
  por_t_d: '**{numero}.** {motivo} · por <@{por}> · <t:{em}:d>',
  advertencias: ['⚠️ Advertências de {tag}', 'titulo'],
  todas_advertencias_foram_apagadas: ['Todas as advertências de **{tag}** foram apagadas.', 'resposta'],
  so_tem_advertencia: ['**{tag}** só tem {total} advertência(s).', 'resposta'],
  advertencia_removida_restam: ['Advertência {numero} de **{tag}** removida. Restam {total}.', 'resposta'],
  apagar_mensagens_aqui: ['Não dá para apagar mensagens aqui.', 'resposta'],
  achei_mensagens_apagar: 'Não achei mensagens para apagar.',
  consegui_apagar_preciso_permissao: '❌ Não consegui apagar. Preciso da permissão **Gerenciar mensagens** neste canal.',
  mensagens_apagadas: ['🧹 Mensagens apagadas', 'titulo'],
  canal: ['Canal', 'campo'],
  quantidade: ['Quantidade', 'campo'],
  so: ['Só de', 'campo'],
  discord_deixa_apagar_massa: ' (O Discord não deixa apagar em massa mensagens com mais de 14 dias.)',
  mensagem_ns_apagada: '🧹 {total} mensagem(ns) apagada(s).{aviso}',
  consegui_trancar_preciso_permissoes: 'Não consegui trancar. Preciso das permissões **Gerenciar canais** e **Gerenciar cargos** nesse canal.',
  motivo_2: '\n**Motivo:** {motivo}',
  canal_trancado_pela_moderacao: ['🔒 Canal trancado pela moderação.{motivo}', 'descricao'],
  canal_trancado: ['🔒 Canal trancado', 'titulo'],
  foi_trancado: ['{canal} foi trancado.', 'resposta'],
  consegui_liberar_preciso_permissoes: 'Não consegui liberar. Preciso das permissões **Gerenciar canais** e **Gerenciar cargos** nesse canal.',
  canal_liberado: ['🔓 Canal liberado.', 'descricao'],
  canal_liberado_2: ['🔓 Canal liberado', 'titulo'],
  foi_liberado: ['{canal} foi liberado.', 'resposta'],
  por_3: 'por {tag}',
  consegui_mudar_modo_lento: 'Não consegui mudar o modo lento. Preciso da permissão **Gerenciar canais** nesse canal.',
  modo_lento: ['🐢 Modo lento', 'titulo'],
  intervalo: ['Intervalo', 'campo'],
  desligado: 'desligado',
  modo_lento_entre_mensagens: 'Modo lento de {canal}: **{duracao}** entre mensagens.',
  modo_lento_desligado: 'Modo lento de {canal} desligado.',
  punicoes_serao_registradas: 'As punições serão registradas em {canal}.',
  registro_punicoes_desligado: 'Registro de punições desligado.',
  membros_serao_avisados_dm: 'Os membros serão avisados na DM.',
  aviso_dm_desligado: 'Aviso na DM desligado.',
  duracao_invalida_ex_30m: ['Duração inválida (ex.: 30m, 1h, 1d; máximo 28d).', 'resposta'],
  de: ' de {duracao}',
  cada_advertencias: 'A cada **{limite}** advertências: **{acao}**{duracao}.',
  punicao_automatica_desligada: 'Punição automática desligada.',
  registro: 'Registro: {registro}',
  sim: 'sim',
  nao: 'não',
  aviso_dm: 'Aviso na DM: {aviso_dm}',
  cada_advertencias_2: 'a cada {limite} advertências → {acao}',
  desligada: 'desligada',
  punicao_automatica: 'Punição automática: {limite}',
  moderacao: 'Moderação',
});

// Aparência dos embeds principais (cor, imagem, miniatura e rodapé personalizáveis)
const vis = visuais('moderacao', {
  dm: { nome: "Aviso de punição na DM", vars: ['servidor_icone'] },
});

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
  if (alvo) campos.push({ name: tx('membro'), value: `${alvo} (${alvo.tag ?? alvo.user?.tag ?? alvo.id})`, inline: true });
  campos.push({ name: tx('por'), value: autor ? `${autor}` : tx('automatico'), inline: true });
  campos.push(...extra);
  if (motivo !== undefined) campos.push({ name: tx('motivo'), value: cortar(motivo || tx('sem_motivo'), 1000) });
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
  await user.send({ embeds: [vis(embed(guild.id).setTitle(guild.name).setDescription(texto), 'dm', imagens({ guild }))] }).catch(() => {});
}

const motivoDe = (i) => i.options.getString('motivo') || tx('sem_motivo');
const SEM_PERMISSAO = (perm) => tx('consegui_confira_eu_tenho', { perm });
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
      if (!membro.bannable) return responder(i, SEM_PERMISSAO(tx('banir_membros')), 'erro');
    } else if (!i.guild.members.me.permissions.has(PermissionFlagsBits.BanMembers)) {
      return responder(i, SEM_PERMISSAO(tx('banir_membros')), 'erro');
    }
    if (membro) await avisarDm(user, i.guild, tx('voce_foi_banido_motivo', { motivo }));
    const ok = await tentar(
      i,
      () => i.guild.members.ban(user, { reason: `${motivo} (por ${i.user.tag})`, deleteMessageSeconds: i.options.getInteger('apagar') ?? 0 }),
      SEM_PERMISSAO(tx('banir_membros'))
    );
    if (!ok) return;
    await registrar(i.guild, { acao: tx('banimento'), cor: CORES.erro, alvo: user, autor: i.user, motivo });
    return responder(i, tx('foi_banido_motivo', { tag: user.tag, motivo }), 'sucesso');
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
    if (!id) return responder(i, tx('informe_id_usuario_so'), 'erro');
    const ban = await i.guild.bans.fetch(id).catch(() => null);
    if (!ban) return responder(i, tx('esse_id_esta_lista'), 'erro');
    const ok = await tentar(i, () => i.guild.bans.remove(id, tx('por_2', { motivo, tag: i.user.tag })), SEM_PERMISSAO(tx('banir_membros')));
    if (!ok) return;
    await registrar(i.guild, { acao: tx('banimento_removido'), cor: CORES.sucesso, alvo: ban.user, autor: i.user, motivo });
    return responder(i, tx('foi_desbanido', { tag: ban.user.tag }), 'sucesso');
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
    if (!membro) return responder(i, tx('esse_usuario_esta_servidor'), 'erro');
    const erro = checarHierarquia(i.member, membro, i.guild.members.me);
    if (erro) return responder(i, erro, 'erro');
    if (!membro.kickable) return responder(i, SEM_PERMISSAO(tx('expulsar_membros')), 'erro');
    const motivo = motivoDe(i);
    await avisarDm(membro.user, i.guild, tx('voce_foi_expulso_motivo', { motivo }));
    const ok = await tentar(i, () => membro.kick(`${motivo} (por ${i.user.tag})`), SEM_PERMISSAO(tx('expulsar_membros')));
    if (!ok) return;
    await registrar(i.guild, { acao: tx('expulsao'), cor: CORES.erro, alvo: membro.user, autor: i.user, motivo });
    return responder(i, tx('foi_expulso', { tag: membro.user.tag }), 'sucesso');
  },
};

async function aplicarCastigo(i, membro, ms, motivo, autor = i.user) {
  await membro.timeout(ms, `${motivo} (por ${i.user.tag})`);
  await avisarDm(membro.user, i.guild, tx('voce_esta_castigo_motivo', { duracao: duracaoTexto(ms), motivo }));
  await registrar(i.guild, {
    acao: tx('castigo'),
    alvo: membro.user,
    autor,
    motivo,
    extra: [{ name: tx('duracao'), value: duracaoTexto(ms), inline: true }],
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
    if (!membro) return responder(i, tx('esse_usuario_esta_servidor'), 'erro');
    const erro = checarHierarquia(i.member, membro, i.guild.members.me);
    if (erro) return responder(i, erro, 'erro');
    if (!membro.moderatable) return responder(i, tx('administradores_podem_ficar_castigo', { erro: SEM_PERMISSAO(tx('castigar_membros')) }), 'erro');
    const ms = lerDuracao(i.options.getString('duracao'));
    if (!ms || ms > MAX_CASTIGO) return responder(i, tx('duracao_invalida_use_algo'), 'erro');
    const motivo = motivoDe(i);
    const ok = await tentar(i, () => aplicarCastigo(i, membro, ms, motivo), SEM_PERMISSAO(tx('castigar_membros')));
    if (!ok) return;
    return responder(i, tx('esta_castigo', { tag: membro.user.tag, duracao: duracaoTexto(ms) }), 'sucesso');
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
    if (!membro) return responder(i, tx('esse_usuario_esta_servidor'), 'erro');
    if (!membro.isCommunicationDisabled()) return responder(i, tx('esse_membro_esta_castigo'), 'aviso');
    const motivo = motivoDe(i);
    const ok = await tentar(i, () => membro.timeout(null, `${motivo} (por ${i.user.tag})`), SEM_PERMISSAO(tx('castigar_membros')));
    if (!ok) return;
    await registrar(i.guild, { acao: tx('castigo_removido'), cor: CORES.sucesso, alvo: membro.user, autor: i.user, motivo });
    return responder(i, tx('castigo_foi_removido', { tag: membro.user.tag }), 'sucesso');
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
    if (!membro) return responder(i, tx('esse_usuario_esta_servidor'), 'erro');
    if (membro.user.bot) return responder(i, tx('advertir_bots'), 'erro');
    const erro = checarHierarquia(i.member, membro, i.guild.members.me);
    if (erro) return responder(i, erro, 'erro');
    const motivo = motivoDe(i);

    const g = advertencias.de(i.guildId);
    g[membro.id] ??= [];
    g[membro.id].push({ motivo, por: i.user.id, em: Date.now() });
    advertencias.salvar();
    const total = g[membro.id].length;

    await avisarDm(membro.user, i.guild, tx('voce_recebeu_advertencia_total', { total, motivo }));
    await registrar(i.guild, { acao: tx('advertencia'), alvo: membro.user, autor: i.user, motivo, extra: [{ name: tx('total'), value: String(total), inline: true }] });

    // punição automática ao chegar no limite
    const c = cfg(i.guildId);
    let extra = '';
    if (c.limite > 0 && total >= c.limite && total % c.limite === 0) {
      const motivoAuto = tx('chegou_advertencias', { total });
      try {
        if (c.acaoLimite === 'banir') {
          await avisarDm(membro.user, i.guild, tx('voce_foi_banido_motivo_2', { motivoAuto }));
          await i.guild.members.ban(membro, { reason: motivoAuto });
          await registrar(i.guild, { acao: tx('banimento_automatico'), cor: CORES.erro, alvo: membro.user, autor: null, motivo: motivoAuto });
          extra = tx('punicao_automatica_banimento');
        } else if (c.acaoLimite === 'expulsar') {
          await avisarDm(membro.user, i.guild, tx('voce_foi_expulso_motivo_2', { motivoAuto }));
          await membro.kick(motivoAuto);
          await registrar(i.guild, { acao: tx('expulsao_automatica'), cor: CORES.erro, alvo: membro.user, autor: null, motivo: motivoAuto });
          extra = tx('punicao_automatica_expulsao');
        } else {
          await aplicarCastigo(i, membro, c.duracaoLimite, motivoAuto, null);
          extra = tx('punicao_automatica_castigo', { duracao: duracaoTexto(c.duracaoLimite) });
        }
      } catch {
        extra = tx('consegui_aplicar_punicao_automatica');
      }
    }
    return responder(i, tx('recebeu_advertencia_total', { tag: membro.user.tag, total, extra }), 'sucesso');
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
    if (!lista.length) return responder(i, tx('tem_advertencias', { tag: user.tag }), 'info');
    const linhas = lista.map((a, n) => tx('por_t_d', { numero: n + 1, motivo: cortar(a.motivo, 120), por: a.por, em: Math.floor(a.em / 1000) }));
    return i.reply({
      embeds: [embed(i.guildId).setTitle(tx('advertencias', { tag: user.tag })).setDescription(linhas.join('\n').slice(0, 4000)).setThumbnail(user.displayAvatarURL())],
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
    if (!lista.length) return responder(i, tx('tem_advertencias', { tag: user.tag }), 'info');
    if (n === 0) {
      advertencias.apagar(i.guildId, user.id);
      return responder(i, tx('todas_advertencias_foram_apagadas', { tag: user.tag }), 'sucesso');
    }
    if (n > lista.length) return responder(i, tx('so_tem_advertencia', { tag: user.tag, total: lista.length }), 'erro');
    lista.splice(n - 1, 1);
    advertencias.salvar();
    return responder(i, tx('advertencia_removida_restam', { numero: n, tag: user.tag, total: lista.length }), 'sucesso');
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
    if (!i.channel?.bulkDelete) return responder(i, tx('apagar_mensagens_aqui'), 'erro');
    await i.deferReply({ flags: 64 });
    const qtd = i.options.getInteger('quantidade');
    const alvo = i.options.getUser('usuario');
    let msgs = await i.channel.messages.fetch({ limit: 100 });
    msgs = msgs.filter((m) => !m.pinned && (!alvo || m.author.id === alvo.id)); // mensagens fixadas ficam
    msgs = [...msgs.values()].slice(0, qtd);
    if (!msgs.length) return i.editReply(tx('achei_mensagens_apagar'));
    const apagadas = await i.channel.bulkDelete(msgs, true).catch(() => null);
    if (!apagadas) return i.editReply(tx('consegui_apagar_preciso_permissao'));
    const n = apagadas.size;
    await registrar(i.guild, {
      acao: tx('mensagens_apagadas'),
      autor: i.user,
      extra: [
        { name: tx('canal'), value: `${i.channel}`, inline: true },
        { name: tx('quantidade'), value: String(n), inline: true },
        ...(alvo ? [{ name: tx('so'), value: `${alvo} (${alvo.tag})`, inline: true }] : []),
      ],
    });
    return i.editReply(tx('mensagem_ns_apagada', { total: n, aviso: n < msgs.length ? tx('discord_deixa_apagar_massa') : '' }));
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
      tx('consegui_trancar_preciso_permissoes')
    );
    if (!ok) return;
    const motivo = motivoDe(i);
    await canal.send({ embeds: [embed(i.guildId).setDescription(tx('canal_trancado_pela_moderacao', { motivo: motivo !== tx('sem_motivo') ? tx('motivo_2', { motivo }) : '' }))] }).catch(() => {});
    await registrar(i.guild, { acao: tx('canal_trancado'), autor: i.user, motivo, extra: [{ name: tx('canal'), value: `${canal}`, inline: true }] });
    return responder(i, tx('foi_trancado', { canal }), 'sucesso');
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
      tx('consegui_liberar_preciso_permissoes')
    );
    if (!ok) return;
    await canal.send({ embeds: [embed(i.guildId).setDescription(tx('canal_liberado'))] }).catch(() => {});
    await registrar(i.guild, { acao: tx('canal_liberado_2'), cor: CORES.sucesso, autor: i.user, extra: [{ name: tx('canal'), value: `${canal}`, inline: true }] });
    return responder(i, tx('foi_liberado', { canal }), 'sucesso');
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
    const ok = await tentar(i, () => canal.setRateLimitPerUser(s, tx('por_3', { tag: i.user.tag })), tx('consegui_mudar_modo_lento'));
    if (!ok) return;
    await registrar(i.guild, {
      acao: tx('modo_lento'),
      autor: i.user,
      extra: [
        { name: tx('canal'), value: `${canal}`, inline: true },
        { name: tx('intervalo'), value: s ? duracaoTexto(s * 1000) : tx('desligado'), inline: true },
      ],
    });
    return responder(i, s ? tx('modo_lento_entre_mensagens', { canal, duracao: duracaoTexto(s * 1000) }) : tx('modo_lento_desligado', { canal }), 'sucesso');
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
      return responder(i, canal ? tx('punicoes_serao_registradas', { canal }) : tx('registro_punicoes_desligado'), 'sucesso');
    }
    if (sub === 'dm') {
      c.avisarDm = i.options.getBoolean('ativar');
      salvarAjustes();
      return responder(i, c.avisarDm ? tx('membros_serao_avisados_dm') : tx('aviso_dm_desligado'), 'sucesso');
    }
    if (sub === 'limite') {
      c.limite = i.options.getInteger('advertencias');
      c.acaoLimite = i.options.getString('acao') ?? c.acaoLimite;
      const d = i.options.getString('duracao');
      if (d) {
        const ms = lerDuracao(d);
        if (!ms || ms > MAX_CASTIGO) return responder(i, tx('duracao_invalida_ex_30m'), 'erro');
        c.duracaoLimite = ms;
      }
      salvarAjustes();
      return responder(
        i,
        c.limite ? tx('cada_advertencias', { limite: c.limite, acao: c.acaoLimite, duracao: c.acaoLimite === 'castigo' ? tx('de', { duracao: duracaoTexto(c.duracaoLimite) }) : '' }) : tx('punicao_automatica_desligada'),
        'sucesso'
      );
    }
  },
  resumo(guild) {
    const c = cfg(guild.id);
    return [
      tx('registro', { registro: c.canalLog ? `<#${c.canalLog}>` : tx('desligado') }),
      tx('aviso_dm', { aviso_dm: c.avisarDm ? tx('sim') : tx('nao') }),
      tx('punicao_automatica', { limite: c.limite ? tx('cada_advertencias_2', { limite: c.limite, acao: c.acaoLimite }) : tx('desligada') }),
    ];
  },
};

export default {
  id: 'moderacao',
  nome: tx('moderacao'),
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
