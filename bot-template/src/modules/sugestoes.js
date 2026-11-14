import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, embed, responder, ehStaff, cortar, CORES } from '../core/util.js';

/**
 * Sugestões: /sugerir publica a ideia num canal com votos 👍/👎.
 * A equipe aprova ou recusa pelos botões, com um motivo.
 */

const sugestoes = colecao('sugestoes');
const PADRAO = { canal: null, contador: 0 };
const cfg = (guildId) => ajustes(guildId, 'sugestoes', PADRAO);

function botoes(s, encerrada = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('sg:sim').setLabel(String(s.sim.length)).setEmoji('👍').setStyle(ButtonStyle.Success).setDisabled(encerrada),
      new ButtonBuilder().setCustomId('sg:nao').setLabel(String(s.nao.length)).setEmoji('👎').setStyle(ButtonStyle.Danger).setDisabled(encerrada),
      new ButtonBuilder().setCustomId('sg:analisar').setLabel('Equipe').setEmoji('🛡️').setStyle(ButtonStyle.Secondary).setDisabled(encerrada)
    ),
  ];
}

const sugerir = {
  data: new SlashCommandBuilder()
    .setName('sugerir')
    .setDescription('Envia uma sugestão para o servidor')
    .addStringOption((o) => o.setName('sugestao').setDescription('A sua ideia').setRequired(true).setMinLength(10).setMaxLength(1500)),
  async executar(i) {
    const c = cfg(i.guildId);
    const canal = c.canal && i.guild.channels.cache.get(c.canal);
    if (!canal?.isTextBased()) return responder(i, 'O canal de sugestões não foi configurado. Avise a equipe (/config sugestoes canal).', 'erro');
    c.contador += 1;
    salvarAjustes();
    const s = { autor: i.user.id, sim: [], nao: [], status: 'aberta', numero: c.contador, canal: canal.id };
    const e = embed(i.guildId)
      .setAuthor({ name: i.member.displayName, iconURL: i.user.displayAvatarURL() })
      .setTitle(`💡 Sugestão #${s.numero}`)
      .setDescription(i.options.getString('sugestao'))
      .addFields({ name: 'Situação', value: '🕐 Em votação' })
      .setTimestamp();
    const msg = await canal.send({ embeds: [e], components: botoes(s) }).catch(() => null);
    if (!msg) return responder(i, `Não consegui enviar em ${canal}. Avise a equipe para conferir as minhas permissões.`, 'erro');
    sugestoes.de(i.guildId)[msg.id] = s;
    sugestoes.salvar();
    if (msg.channel.threads) await msg.startThread({ name: `Sugestão #${s.numero}`, autoArchiveDuration: 4320 }).catch(() => {});
    return responder(i, `Sugestão enviada em ${canal}!`, 'sucesso');
  },
};

async function decidir(i, msgId, aprovada, motivo) {
  if (!ehStaff(i.member)) return responder(i, 'Só a equipe pode decidir sugestões.', 'erro');
  const s = sugestoes.ler(i.guildId, msgId);
  if (!s) return responder(i, 'Sugestão não encontrada.', 'erro');
  if (s.status !== 'aberta') return responder(i, `Esta sugestão já foi ${s.status}.`, 'aviso');
  const canal = s.canal ? await i.client.channels.fetch(s.canal).catch(() => null) : i.channel;
  const msg = await canal?.messages.fetch(msgId).catch(() => null);
  if (!msg) return responder(i, 'Não achei a mensagem da sugestão.', 'erro');
  s.status = aprovada ? 'aprovada' : 'recusada';
  sugestoes.salvar();
  const e = EmbedBuilder.from(msg.embeds[0])
    .setColor(aprovada ? CORES.sucesso : CORES.erro)
    .setFields(
      { name: 'Situação', value: aprovada ? `✅ Aprovada por ${i.user}` : `❌ Recusada por ${i.user}` },
      ...(motivo ? [{ name: 'Motivo', value: cortar(motivo, 1000) }] : []),
      { name: 'Votos', value: `👍 ${s.sim.length} · 👎 ${s.nao.length}` },
    );
  await msg.edit({ embeds: [e], components: botoes(s, true) });
  const autor = await i.client.users.fetch(s.autor).catch(() => null);
  await autor
    ?.send({ embeds: [embed(i.guildId).setDescription(`Sua sugestão #${s.numero} em **${i.guild.name}** foi **${s.status}**.${motivo ? `\n**Motivo:** ${motivo}` : ''}`)] })
    .catch(() => {});
  return responder(i, `Sugestão #${s.numero} ${s.status}.`, 'sucesso');
}

const componentes = {
  async sg(i, [acao, msgId, decisao]) {
    // formulário da equipe enviado
    if (i.isModalSubmit() && acao === 'motivo') {
      return decidir(i, msgId, decisao === 'aprovar', i.fields.getTextInputValue('motivo').trim());
    }
    // botões da equipe (resposta escondida com Aprovar/Recusar)
    if (acao === 'aprovar' || acao === 'recusar') {
      if (!ehStaff(i.member)) return responder(i, 'Só a equipe pode decidir sugestões.', 'erro');
      return i.showModal(
        new ModalBuilder()
          .setCustomId(`sg:motivo:${msgId}:${acao}`)
          .setTitle(acao === 'aprovar' ? 'Aprovar sugestão' : 'Recusar sugestão')
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('motivo').setLabel('Motivo (opcional)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500)
            )
          )
      );
    }

    const s = sugestoes.ler(i.guildId, i.message?.id);
    if (!s) return responder(i, 'Esta sugestão não está mais no sistema.', 'erro');
    if (s.status !== 'aberta') return responder(i, 'A votação desta sugestão já terminou.', 'aviso');

    if (acao === 'analisar') {
      if (!ehStaff(i.member)) return responder(i, 'Só a equipe pode usar este botão.', 'erro');
      return i.reply({
        content: 'O que fazer com esta sugestão?',
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`sg:aprovar:${i.message.id}`).setLabel('Aprovar').setEmoji('✅').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`sg:recusar:${i.message.id}`).setLabel('Recusar').setEmoji('❌').setStyle(ButtonStyle.Danger)
          ),
        ],
        flags: MessageFlags.Ephemeral,
      });
    }

    // voto: clicar de novo tira o voto; votar no outro lado troca
    const lado = acao === 'sim' ? 'sim' : 'nao';
    const outro = lado === 'sim' ? 'nao' : 'sim';
    const id = i.user.id;
    s[outro] = s[outro].filter((x) => x !== id);
    if (s[lado].includes(id)) s[lado] = s[lado].filter((x) => x !== id);
    else s[lado].push(id);
    sugestoes.salvar();
    return i.update({ components: botoes(s) });
  },
};

const config = {
  grupo: 'sugestoes',
  montar: (g) =>
    g
      .setDescription('Canal de sugestões')
      .addSubcommand((s) =>
        s.setName('canal').setDescription('Canal onde as sugestões são publicadas').addChannelOption((o) => o.setName('canal').setDescription('Vazio desliga').addChannelTypes(ChannelType.GuildText))
      ),
  async executar(i) {
    const c = cfg(i.guildId);
    const ch = i.options.getChannel('canal');
    c.canal = ch?.id ?? null;
    salvarAjustes();
    return responder(i, ch ? `Sugestões serão publicadas em ${ch}.` : 'Sugestões desligadas.', 'sucesso');
  },
  resumo(guild) {
    const c = cfg(guild.id);
    return [`Canal: ${c.canal ? `<#${c.canal}>` : 'não definido'}`, `Sugestões enviadas: ${c.contador}`];
  },
};

export default {
  id: 'sugestoes',
  nome: 'Sugestões',
  comandos: [sugerir],
  componentes,
  permissoes: [PermissionFlagsBits.CreatePublicThreads],
  config,
};
