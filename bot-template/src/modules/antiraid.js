import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, GatewayIntentBits, GuildVerificationLevel, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { ajustes, salvarAjustes, embed, responder, ehStaff, duracaoTexto, marcarRemovida, CORES } from '../core/util.js';

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
      components: botao ? [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('ar:fim').setLabel('Encerrar modo raid').setEmoji('✅').setStyle(ButtonStyle.Success))] : [],
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
    const ok = await guild.setVerificationLevel(GuildVerificationLevel.VeryHigh, 'Anti-raid').then(() => true, () => false);
    if (ok) feitos.push('nível de verificação no **máximo** (precisa de telefone verificado)');
  }
  const pausou = await guild.disableInvites(true).then(() => true, () => false);
  c.convitesPausados = pausou;
  if (pausou) feitos.push('**convites pausados**');
  salvarAjustes();
  await alertar(
    guild,
    `🚨 **Modo raid ativado!** Entraram **${quantos}** pessoas em ${c.segundos}s.\n${feitos.length ? `Fiz: ${feitos.join(' e ')}.` : 'Não consegui mudar o servidor (preciso de **Gerenciar servidor**).'}\nQuem entrar agora: **${c.acao === 'nada' ? 'só registro' : c.acao}**. Encerra sozinho em ${duracaoTexto(DURACAO_RAID)} ou pelo botão.`,
    true
  );
}

async function encerrarRaid(guild, por) {
  const c = cfg(guild.id);
  if (!c.emRaid) return false;
  if (c.nivelAntes != null && guild.verificationLevel !== c.nivelAntes) await guild.setVerificationLevel(c.nivelAntes, 'Fim do modo raid').catch(() => {});
  if (c.convitesPausados) await guild.disableInvites(false).catch(() => {});
  Object.assign(c, { emRaid: false, inicio: null, nivelAntes: null, convitesPausados: false });
  salvarAjustes();
  await alertar(guild, `✅ Modo raid encerrado${por ? ` por <@${por}>` : ' automaticamente'}. O servidor voltou ao normal.`);
  return true;
}

/** Avisa os outros módulos (ex.: Boas-vindas) que esta pessoa foi barrada. */
const barrar = (member) => marcarRemovida(`membro:${member.guild.id}:${member.id}`);

async function punir(member, motivo) {
  barrar(member);
  const c = cfg(member.guild.id);
  await member.send(`Você não pôde entrar em **${member.guild.name}** agora (${motivo}). Tente de novo mais tarde.`).catch(() => {});
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
      await member.send(`Sua conta é nova demais para entrar em **${guild.name}** (mínimo: ${c.idadeMinima} dia(s)).`).catch(() => {});
      await member.kick(`Anti-raid: conta com ${Math.floor(dias)} dia(s)`).catch(() => {});
      await alertar(guild, `👶 Expulsei ${member.user.tag} (\`${member.id}\`): conta com ${Math.floor(dias)} dia(s).`);
    }
    return;
  }

  // modo raid ligado: aplica a ação em quem entra
  if (c.emRaid) {
    if (Date.now() - c.inicio > DURACAO_RAID) await encerrarRaid(guild, null);
    else if (c.acao !== 'nada') return punir(member, 'modo raid');
  }

  // conta as entradas recentes
  const agora = Date.now();
  const lista = (entradas.get(guild.id) ?? []).filter((t) => agora - t < c.segundos * 1000);
  lista.push(agora);
  entradas.set(guild.id, lista);
  if (!c.emRaid && lista.length >= c.limite) {
    entradas.set(guild.id, []);
    await iniciarRaid(guild, lista.length);
    if (c.acao !== 'nada') await punir(member, 'modo raid'); // quem disparou também faz parte do raid
  }
}

const componentes = {
  async ar(i, [acao]) {
    if (acao !== 'fim') return;
    if (!ehStaff(i.member)) return responder(i, 'Só a equipe pode encerrar o modo raid.', 'erro');
    const ok = await encerrarRaid(i.guild, i.user.id);
    await i.message.edit({ components: [] }).catch(() => {});
    return responder(i, ok ? 'Modo raid encerrado.' : 'O modo raid já tinha acabado.', ok ? 'sucesso' : 'aviso');
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
      return responder(i, 'Anti-raid desligado.', 'sucesso');
    }
    if (sub === 'encerrar') return responder(i, (await encerrarRaid(i.guild, i.user.id)) ? 'Modo raid encerrado.' : 'O servidor não está em modo raid.', 'sucesso');
    if (sub === 'ativar-raid') {
      if (!c.ativo) return responder(i, 'Configure primeiro com `/antiraid configurar`.', 'erro');
      if (c.emRaid) return responder(i, 'O modo raid já está ligado.', 'aviso');
      await i.deferReply({ flags: 64 });
      await iniciarRaid(i.guild, 0);
      return i.editReply('🚨 Modo raid ligado. Encerre com `/antiraid encerrar` ou pelo botão no canal de alerta.');
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
      [PermissionFlagsBits.ManageGuild, 'Gerenciar servidor'],
      [PermissionFlagsBits.KickMembers, 'Expulsar membros'],
      [PermissionFlagsBits.ModerateMembers, 'Castigar membros'],
    ]
      .filter(([p]) => !me.has(p))
      .map(([, n]) => n);
    return responder(
      i,
      `Anti-raid ligado: **${c.limite}** entradas em **${c.segundos}s** ativam o modo raid (ação: ${c.acao}). Avisos em <#${c.alerta}>.${c.idadeMinima ? ` Contas com menos de ${c.idadeMinima} dia(s) são expulsas.` : ''}${faltam.length ? `\n⚠️ Me falta: ${faltam.join(', ')}.` : ''}`,
      faltam.length ? 'aviso' : 'sucesso'
    );
  },
};

export default {
  id: 'antiraid',
  nome: 'Anti-raid',
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
      if (!c.ativo) return ['Desligado (`/antiraid configurar`)'];
      return [`${c.limite} entradas em ${c.segundos}s · ação: ${c.acao} · alerta em <#${c.alerta}>${c.emRaid ? ' · 🚨 **EM MODO RAID**' : ''}`];
    },
  },
};
