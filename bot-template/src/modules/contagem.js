import { ChannelType, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { ajustes, salvarAjustes, embed, responder, fmt, foiRemovida } from '../core/util.js';

/**
 * Jogo de contar: num canal, todo mundo conta 1, 2, 3...
 * A mesma pessoa não pode contar duas vezes seguidas. Errou, volta para o 1.
 * Guarda o recorde do servidor.
 */

const PADRAO = { canal: null, atual: 0, ultimo: null, recorde: 0, recordeEm: null, recordeDaRodada: 0 }; // recordeDaRodada: o recorde quando a rodada começou
const cfg = (guildId) => ajustes(guildId, 'contagem', PADRAO);

async function aoMensagem(msg) {
  if (!msg.inGuild() || msg.author.bot) return;
  const c = cfg(msg.guildId);
  if (msg.channelId !== c.canal || foiRemovida(msg.id)) return;
  const texto = msg.content.trim().replace(/\./g, '');
  if (!/^\d{1,9}$/.test(texto)) return; // conversa normal: ignora
  const n = Number(texto);
  const esperado = c.atual + 1;

  const erro = n !== esperado ? `O próximo era **${fmt(esperado)}**.` : msg.author.id === c.ultimo ? 'Não vale contar duas vezes seguidas.' : null;
  if (erro) {
    const chegou = c.atual;
    c.atual = 0;
    c.ultimo = null;
    c.recordeDaRodada = c.recorde;
    salvarAjustes();
    await msg.react('❌').catch(() => {});
    await msg
      .reply({
        embeds: [embed(msg.guildId).setColor(0xef4444).setDescription(`💥 ${msg.author} errou! ${erro}\nVocês chegaram a **${fmt(chegou)}**. Recomeçando do **1**. (Recorde: ${fmt(c.recorde)})`)],
        allowedMentions: { users: [] },
      })
      .catch(() => {});
    return;
  }
  c.atual = n;
  c.ultimo = msg.author.id;
  // 🏆 só no número que passa o recorde anterior (não em todos os números de uma rodada nova)
  const bateuRecorde = c.recordeDaRodada > 0 && n === c.recordeDaRodada + 1;
  if (n > c.recorde) {
    c.recorde = n;
    c.recordeEm = Date.now();
  }
  salvarAjustes();
  await msg.react(bateuRecorde ? '🏆' : '✅').catch(() => {});
  if (bateuRecorde) await msg.channel.send({ embeds: [embed(msg.guildId).setDescription(`🏆 **Novo recorde!** Vocês passaram de ${fmt(n - 1)}.`)] }).catch(() => {});
}

const contagem = {
  data: new SlashCommandBuilder()
    .setName('contagem')
    .setDescription('Jogo de contar')
    .addSubcommand((s) => s.setName('status').setDescription('Número atual e recorde'))
    .addSubcommand((s) =>
      s
        .setName('canal')
        .setDescription('(Equipe) Escolhe o canal do jogo')
        .addChannelOption((o) => o.setName('canal').setDescription('Canal da contagem').setRequired(true).addChannelTypes(ChannelType.GuildText))
    )
    .addSubcommand((s) => s.setName('zerar').setDescription('(Equipe) Volta a contagem para 0')),
  async executar(i) {
    const c = cfg(i.guildId);
    const sub = i.options.getSubcommand();
    if (sub === 'status') {
      if (!c.canal) return responder(i, 'O jogo de contar não está ligado.', 'aviso');
      return responder(
        i,
        `🔢 Em <#${c.canal}>: estamos no **${fmt(c.atual)}** (próximo: ${fmt(c.atual + 1)}).\n🏆 Recorde: **${fmt(c.recorde)}**${c.recordeEm ? ` (<t:${Math.floor(c.recordeEm / 1000)}:R>)` : ''}`,
        'info'
      );
    }
    if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) return responder(i, 'Só quem tem **Gerenciar servidor** pode fazer isso.', 'erro');
    if (sub === 'zerar') {
      c.atual = 0;
      c.ultimo = null;
      c.recordeDaRodada = c.recorde;
      salvarAjustes();
      return responder(i, 'Contagem zerada. O próximo número é 1.', 'sucesso');
    }
    const canal = i.options.getChannel('canal');
    c.canal = canal.id;
    c.atual = 0;
    c.ultimo = null;
    c.recordeDaRodada = c.recorde;
    salvarAjustes();
    await canal.send({ embeds: [embed(i.guildId).setTitle('🔢 Jogo de contar').setDescription('Contem a partir do **1**, um número por mensagem.\nA mesma pessoa não pode contar duas vezes seguidas. Errou, volta para o 1!')] }).catch(() => {});
    return responder(i, `Jogo de contar ligado em ${canal}.`, 'sucesso');
  },
};

export default {
  id: 'contagem',
  nome: 'Jogo de contar',
  intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  comandos: [contagem],
  eventos: { messageCreate: aoMensagem },
  config: {
    resumo(guild) {
      const c = cfg(guild.id);
      return [c.canal ? `<#${c.canal}> · atual ${fmt(c.atual)} · recorde ${fmt(c.recorde)}` : 'Desligado (`/contagem canal`)'];
    },
  },
};
