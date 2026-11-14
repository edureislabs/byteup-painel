import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, GatewayIntentBits, GuildVerificationLevel, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { ajustes, salvarAjustes, embed, responder, ehStaff, duracaoTexto, marcarRemovida, CORES } from '../core/util.js';
import { textos, botoes } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('antiraid', {
  encerrar_modo_raid: ['Encerrar modo raid', 'botao'],
  anti_raid: 'Anti-raid',
  nivel_verificacao_maximo_precisa: 'nível de verificação no **máximo** (precisa de telefone verificado)',
  convites_pausados: '**convites pausados**',
  fiz: 'Fiz: {feitos}.',
  consegui_mudar_servidor_preciso: 'Não consegui mudar o servidor (preciso de **Gerenciar servidor**).',
  so_registro: 'só registro',
  modo_raid_ativado_entraram: '🚨 **Modo raid ativado!** Entraram **{quantos}** pessoas em {segundos}s.\n{feitos}\nQuem entrar agora: **{acao}**. Encerra sozinho em {duracao} ou pelo botão.',
  fim_modo_raid: 'Fim do modo raid',
  por: ' por <@{por}>',
  automaticamente: ' automaticamente',
  modo_raid_encerrado_servidor: '✅ Modo raid encerrado{por}. O servidor voltou ao normal.',
  voce_pode_entrar_agora: 'Você não pôde entrar em **{servidor}** agora ({motivo}). Tente de novo mais tarde.',
  sua_conta_nova_demais: 'Sua conta é nova demais para entrar em **{servidor}** (mínimo: {idadeMinima} dia(s)).',
  expulsei_conta_dia: '👶 Expulsei {tag} (`{id}`): conta com {dias} dia(s).',
  modo_raid: 'modo raid',
  so_equipe_pode_encerrar: ['Só a equipe pode encerrar o modo raid.', 'resposta'],
  modo_raid_encerrado: 'Modo raid encerrado.',
  modo_raid_ja_tinha: 'O modo raid já tinha acabado.',
  anti_raid_desligado: ['Anti-raid desligado.', 'resposta'],
  servidor_esta_modo_raid: 'O servidor não está em modo raid.',
  configure_primeiro_antiraid_configur: ['Configure primeiro com `/antiraid configurar`.', 'resposta'],
  modo_raid_ja_esta: ['O modo raid já está ligado.', 'resposta'],
  modo_raid_ligado_encerre: '🚨 Modo raid ligado. Encerre com `/antiraid encerrar` ou pelo botão no canal de alerta.',
  gerenciar_servidor: 'Gerenciar servidor',
  expulsar_membros: 'Expulsar membros',
  castigar_membros: 'Castigar membros',
  contas_menos_dia_sao: ' Contas com menos de {idadeMinima} dia(s) são expulsas.',
  me_falta: '\n⚠️ Me falta: {faltam}.',
  anti_raid_ligado_entradas: ['Anti-raid ligado: **{limite}** entradas em **{segundos}s** ativam o modo raid (ação: {acao}). Avisos em <#{alerta}>.{idadeMinima}{faltam}', 'resposta'],
  desligado_antiraid_configurar: 'Desligado (`/antiraid configurar`)',
  modo_raid_2: ' · 🚨 **EM MODO RAID**',
  entradas_acao_alerta: '{limite} entradas em {segundos}s · ação: {acao} · alerta em <#{alerta}>{modo_raid}',
});

// Botões (texto, emoji e cor personalizáveis; alguns podem ser escondidos)
const bt = botoes('antiraid', {
  fim: { nome: "Encerrar modo raid", rotulo: 'encerrar_modo_raid', emoji: '✅', estilo: 'Success' },
});

/**
 * Anti-raid: se entrar gente demais em pouco tempo, o bot ativa o "modo raid":
 * sobe o nível de verificação do servidor, pausa os convites (se der) e
 * expulsa ou castiga quem entrar enquanto durar. Avisa a equipe com um botão para encerrar.
 * Também pode barrar contas novas demais o tempo todo.
 */

const PADRAO = {
  ativo: false,
  limite: 10, // entradas...
  segundos: 30, // ...nesse intervalo
  acao: 'expulsar', // o que fazer com quem entra durante o raid: expulsar | castigo | nada
  alerta: null, // canal
  cargoAlerta: null,
  idadeMinima: 0, // dias; 0 = não barra contas novas
  emRaid: false,
  inicio: null,
  nivelAntes: null,
  convitesPausados: false,
};
const cfg = (guildId) => ajustes(guildId, 'antiraid', PADRAO);
const entradas = new Map(); // guildId -> [timestamps]
const DURACAO_RAID = 30 * 60_000;

async function alertar(guild, texto, botao = false) {
  const c = cfg(guild.id);
  const canal = c.alerta && guild.channels.cache.get(c.alerta);
  if (!canal?.isTextBased()) return;
  await canal
    .send({
      content: c.cargoAlerta ? `<@&${c.cargoAlerta}>` : undefined,
      embeds: [embed(guild.id).setColor(CORES.erro).setDescription(texto).setTimestamp()],
      components: botao ? [new ActionRowBuilder().addComponents(bt('fim').setCustomId('ar:fim'))] : [],
      allowedMentions: { roles: c.cargoAlerta ? [c.cargoAlerta] : [] },
    })
    .catch(() => {});
}

async function iniciarRaid(guild, quantos) {
  const c = cfg(guild.id);
  c.emRaid = true;
  c.inicio = Date.now();
  c.nivelAntes = guild.verificationLevel;
  const feitos = [];
  if (guild.verificationLevel < GuildVerificationLevel.VeryHigh) {
    const ok = await guild.setVerificationLevel(GuildVerificationLevel.VeryHigh, tx('anti_raid')).then(() => true, () => false);
    if (ok) feitos.push(tx('nivel_verificacao_maximo_precisa'));
  }
  const pausou = await guild.disableInvites(true).then(() => true, () => false);
  c.convitesPausados = pausou;
  if (pausou) feitos.push(tx('convites_pausados'));
  salvarAjustes();
  await alertar(
    guild,
    tx('modo_raid_ativado_entraram', { quantos, segundos: c.segundos, feitos: feitos.length ? tx('fiz', { feitos: feitos.join(' e ') }) : tx('consegui_mudar_servidor_preciso'), acao: c.acao === 'nada' ? tx('so_registro') : c.acao, duracao: duracaoTexto(DURACAO_RAID) }),
    true
  );
}

async function encerrarRaid(guild, por) {
  const c = cfg(guild.id);
  if (!c.emRaid) return false;
  if (c.nivelAntes != null && guild.verificationLevel !== c.nivelAntes) await guild.setVerificationLevel(c.nivelAntes, tx('fim_modo_raid')).catch(() => {});
  if (c.convitesPausados) await guild.disableInvites(false).catch(() => {});
  Object.assign(c, { emRaid: false, inicio: null, nivelAntes: null, convitesPausados: false });
  salvarAjustes();
  await alertar(guild, tx('modo_raid_encerrado_servidor', { por: por ? tx('por', { por }) : tx('automaticamente') }));
  return true;
}

/** Avisa os outros módulos (ex.: Boas-vindas) que esta pessoa foi barrada. */
const barrar = (member) => marcarRemovida(`membro:${member.guild.id}:${member.id}`);

async function punir(member, motivo) {
  barrar(member);
  const c = cfg(member.guild.id);
  await member.send(tx('voce_pode_entrar_agora', { servidor: member.guild.name, motivo })).catch(() => {});
  if (c.acao === 'castigo' && member.moderatable) return member.timeout(60 * 60_000, `Anti-raid: ${motivo}`).catch(() => {});
  if (member.kickable) return member.kick(`Anti-raid: ${motivo}`).catch(() => {});
}

async function aoEntrar(member) {
  const guild = member.guild;
  const c = cfg(guild.id);
  if (!c.ativo || member.user.bot) return;

  // contas novas demais
  const dias = (Date.now() - member.user.createdTimestamp) / 86400e3;
  if (c.idadeMinima && dias < c.idadeMinima) {
    if (member.kickable) {
      barrar(member);
      await member.send(tx('sua_conta_nova_demais', { servidor: guild.name, idadeMinima: c.idadeMinima })).catch(() => {});
      await member.kick(`Anti-raid: conta com ${Math.floor(dias)} dia(s)`).catch(() => {});
      await alertar(guild, tx('expulsei_conta_dia', { tag: member.user.tag, id: member.id, dias: Math.floor(dias) }));
    }
    return;
  }

  // modo raid ligado: aplica a ação em quem entra
  if (c.emRaid) {
    if (Date.now() - c.inicio > DURACAO_RAID) await encerrarRaid(guild, null);
    else if (c.acao !== 'nada') return punir(member, tx('modo_raid'));
  }

  // conta as entradas recentes
  const agora = Date.now();
  const lista = (entradas.get(guild.id) ?? []).filter((t) => agora - t < c.segundos * 1000);
  lista.push(agora);
  entradas.set(guild.id, lista);
  if (!c.emRaid && lista.length >= c.limite) {
    entradas.set(guild.id, []);
    await iniciarRaid(guild, lista.length);
    if (c.acao !== 'nada') await punir(member, tx('modo_raid')); // quem disparou também faz parte do raid
  }
}

const componentes = {
  async ar(i, [acao]) {
    if (acao !== 'fim') return;
    if (!ehStaff(i.member)) return responder(i, tx('so_equipe_pode_encerrar'), 'erro');
    const ok = await encerrarRaid(i.guild, i.user.id);
    await i.message.edit({ components: [] }).catch(() => {});
    return responder(i, ok ? tx('modo_raid_encerrado') : tx('modo_raid_ja_tinha'), ok ? 'sucesso' : 'aviso');
  },
};

const antiraid = {
  data: new SlashCommandBuilder()
    .setName('antiraid')
    .setDescription('Proteção contra raids (muita gente entrando de uma vez)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('configurar')
        .setDescription('Liga e ajusta o anti-raid')
        .addChannelOption((o) => o.setName('alerta').setDescription('Canal onde a equipe é avisada').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addIntegerOption((o) => o.setName('limite').setDescription('Quantas entradas disparam o modo raid (padrão 10)').setMinValue(3).setMaxValue(100))
        .addIntegerOption((o) => o.setName('segundos').setDescription('Em quantos segundos (padrão 30)').setMinValue(5).setMaxValue(600))
        .addStringOption((o) =>
          o
            .setName('acao')
            .setDescription('O que fazer com quem entra durante o raid (padrão: expulsar)')
            .addChoices({ name: 'Expulsar', value: 'expulsar' }, { name: 'Castigo de 1 hora', value: 'castigo' }, { name: 'Nada (só travar o servidor)', value: 'nada' })
        )
        .addRoleOption((o) => o.setName('cargo-alerta').setDescription('Cargo marcado no aviso (opcional)'))
        .addIntegerOption((o) => o.setName('idade-minima').setDescription('Expulsa contas com menos dias que isso, sempre (0 = não)').setMinValue(0).setMaxValue(60))
    )
    .addSubcommand((s) => s.setName('desligar').setDescription('Desliga o anti-raid'))
    .addSubcommand((s) => s.setName('encerrar').setDescription('Encerra o modo raid agora'))
    .addSubcommand((s) => s.setName('ativar-raid').setDescription('Liga o modo raid manualmente (trava o servidor)')),
  async executar(i) {
    const c = cfg(i.guildId);
    const sub = i.options.getSubcommand();
    if (sub === 'desligar') {
      if (c.emRaid) await encerrarRaid(i.guild, i.user.id);
      c.ativo = false;
      salvarAjustes();
      return responder(i, tx('anti_raid_desligado'), 'sucesso');
    }
    if (sub === 'encerrar') return responder(i, (await encerrarRaid(i.guild, i.user.id)) ? tx('modo_raid_encerrado') : tx('servidor_esta_modo_raid'), 'sucesso');
    if (sub === 'ativar-raid') {
      if (!c.ativo) return responder(i, tx('configure_primeiro_antiraid_configur'), 'erro');
      if (c.emRaid) return responder(i, tx('modo_raid_ja_esta'), 'aviso');
      await i.deferReply({ flags: 64 });
      await iniciarRaid(i.guild, 0);
      return i.editReply(tx('modo_raid_ligado_encerre'));
    }
    c.ativo = true;
    c.alerta = i.options.getChannel('alerta').id;
    for (const [opcao, campo] of [['limite', 'limite'], ['segundos', 'segundos'], ['idade-minima', 'idadeMinima']]) {
      const v = i.options.getInteger(opcao);
      if (v !== null) c[campo] = v;
    }
    const acao = i.options.getString('acao');
    if (acao) c.acao = acao;
    const cargo = i.options.getRole('cargo-alerta');
    if (cargo) c.cargoAlerta = cargo.id;
    salvarAjustes();
    const me = i.guild.members.me.permissions;
    const faltam = [
      [PermissionFlagsBits.ManageGuild, tx('gerenciar_servidor')],
      [PermissionFlagsBits.KickMembers, tx('expulsar_membros')],
      [PermissionFlagsBits.ModerateMembers, tx('castigar_membros')],
    ]
      .filter(([p]) => !me.has(p))
      .map(([, n]) => n);
    return responder(
      i,
      tx('anti_raid_ligado_entradas', { limite: c.limite, segundos: c.segundos, acao: c.acao, alerta: c.alerta, idadeMinima: c.idadeMinima ? tx('contas_menos_dia_sao', { idadeMinima: c.idadeMinima }) : '', faltam: faltam.length ? tx('me_falta', { faltam: faltam.join(', ') }) : '' }),
      faltam.length ? 'aviso' : 'sucesso'
    );
  },
};

export default {
  id: 'antiraid',
  nome: tx('anti_raid'),
  prioridade: 1, // antes das boas-vindas: quem é expulso nem recebe a mensagem
  intents: [GatewayIntentBits.GuildMembers],
  permissoes: [PermissionFlagsBits.ManageGuild, PermissionFlagsBits.KickMembers, PermissionFlagsBits.ModerateMembers],
  comandos: [antiraid],
  componentes,
  eventos: { guildMemberAdd: aoEntrar },
  aoIniciar(client) {
    // encerra modos raid esquecidos (ex.: bot ficou desligado)
    setInterval(() => {
      for (const guild of client.guilds.cache.values()) {
        const c = cfg(guild.id);
        if (c.emRaid && Date.now() - c.inicio > DURACAO_RAID) encerrarRaid(guild, null).catch(() => {});
      }
    }, 60_000);
  },
  config: {
    resumo(guild) {
      const c = cfg(guild.id);
      if (!c.ativo) return [tx('desligado_antiraid_configurar')];
      return [tx('entradas_acao_alerta', { limite: c.limite, segundos: c.segundos, acao: c.acao, alerta: c.alerta, modo_raid: c.emRaid ? tx('modo_raid_2') : '' })];
    },
  },
};
