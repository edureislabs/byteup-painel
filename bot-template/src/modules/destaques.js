import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, GatewayIntentBits, Partials, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, embed, responder, cortar, imagens } from '../core/util.js';
import { textos, visuais, botoes, fileira, fileiras } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('destaques', {
  anexos: ['Anexos', 'campo'],
  ver_mensagem: ['Ver mensagem', 'botao'],
  destaques_desligados: ['Destaques desligados.', 'resposta'],
  destaques_ligados_mensagens_vao: ['Destaques ligados: mensagens com **{minimo}** {mostra} vão para {canal}.', 'resposta'],
  destaques: 'Destaques',
  reacao_oes: '<#{canal}> · {minimo} reação(ões)',
  desligado_destaques_configurar: 'Desligado (`/destaques configurar`)',
});

// Botões (texto, emoji e cor personalizáveis; alguns podem ser escondidos)
const bt = botoes('destaques', {
  ver: { nome: 'Ver mensagem original (link)', rotulo: 'ver_mensagem', emoji: '-', estilo: 'Link', ocultavel: true },
});

// Aparência dos embeds principais (cor, imagem, miniatura e rodapé personalizáveis)
const vis = visuais('destaques', {
  destaque: { nome: "Mensagem em destaque", vars: ['avatar', 'servidor_icone'] },
});

/**
 * Destaques (starboard): mensagem que juntar N reações ⭐ vai para o canal de destaques.
 * O contador do destaque acompanha as reações.
 */

const postados = colecao('destaques'); // guild -> msgOriginal -> idDoDestaque
const PADRAO = { canal: null, emoji: '⭐', minimo: 3 };
const cfg = (guildId) => ajustes(guildId, 'destaques', PADRAO);

const mesmoEmoji = (reacao, emoji) => reacao.emoji.id === emoji || reacao.emoji.name === emoji || reacao.emoji.toString() === emoji;

async function aoReagir(reacao) {
  if (reacao.partial) reacao = await reacao.fetch().catch(() => null);
  if (!reacao) return;
  const msg = reacao.message.partial ? await reacao.message.fetch().catch(() => null) : reacao.message;
  if (!msg?.guild) return;
  const c = cfg(msg.guild.id);
  if (!c.canal || msg.channelId === c.canal || msg.author?.bot || !mesmoEmoji(reacao, c.emoji)) return;
  const canal = msg.guild.channels.cache.get(c.canal);
  if (!canal?.isTextBased()) return;

  // não vale reagir na própria mensagem
  const usuarios = await reacao.users.fetch().catch(() => null);
  const total = usuarios ? usuarios.filter((u) => u.id !== msg.author.id && !u.bot).size : reacao.count;
  const jaPostado = postados.ler(msg.guild.id, msg.id);
  const cabecalho = `${c.emoji} **${total}** · ${msg.channel}`;

  if (jaPostado) {
    const destaque = await canal.messages.fetch(jaPostado).catch(() => null);
    if (destaque) await destaque.edit({ content: cabecalho }).catch(() => {});
    return;
  }
  if (total < c.minimo) return;

  const e = embed(msg.guild.id)
    .setAuthor({ name: msg.member?.displayName ?? msg.author.username, iconURL: msg.author.displayAvatarURL() })
    .setDescription(cortar(msg.content || '', 4000) || null)
    .setTimestamp(msg.createdAt);
  const imagem = msg.attachments.find((a) => a.contentType?.startsWith('image/')) ?? null;
  if (imagem) e.setImage(imagem.url);
  else if (msg.embeds[0]?.image?.url) e.setImage(msg.embeds[0].image.url);
  const outros = msg.attachments.filter((a) => a !== imagem).map((a) => `[${a.name}](${a.url})`);
  if (outros.length) e.addFields({ name: tx('anexos'), value: cortar(outros.join('\n'), 1024) });
  vis(e, 'destaque', imagens({ user: msg.author, guild: msg.guild }));

  const enviado = await canal
    .send({
      content: cabecalho,
      embeds: [e],
      components: fileiras(fileira(bt('ver')?.setURL(msg.url))),
      allowedMentions: { parse: [] },
    })
    .catch(() => null);
  if (enviado) {
    postados.de(msg.guild.id)[msg.id] = enviado.id;
    postados.salvar();
  }
}

const destaques = {
  data: new SlashCommandBuilder()
    .setName('destaques')
    .setDescription('Canal de destaques (mensagens com muitas ⭐)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('configurar')
        .setDescription('Liga os destaques')
        .addChannelOption((o) => o.setName('canal').setDescription('Canal dos destaques').setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        .addIntegerOption((o) => o.setName('minimo').setDescription('Quantas reações para ir ao destaque (padrão 3)').setMinValue(1).setMaxValue(100))
        .addStringOption((o) => o.setName('emoji').setDescription('Emoji que conta (padrão ⭐)').setMaxLength(60))
    )
    .addSubcommand((s) => s.setName('desligar').setDescription('Desliga os destaques')),
  async executar(i) {
    const c = cfg(i.guildId);
    if (i.options.getSubcommand() === 'desligar') {
      c.canal = null;
      salvarAjustes();
      return responder(i, tx('destaques_desligados'), 'sucesso');
    }
    const canal = i.options.getChannel('canal');
    c.canal = canal.id;
    const minimo = i.options.getInteger('minimo');
    if (minimo) c.minimo = minimo;
    const emoji = i.options.getString('emoji')?.trim();
    if (emoji) {
      const custom = /<a?:\w+:(\d+)>/.exec(emoji);
      c.emoji = custom ? custom[1] : emoji;
    }
    salvarAjustes();
    const mostra = /^\d+$/.test(c.emoji) ? (i.guild.emojis.cache.get(c.emoji)?.toString() ?? c.emoji) : c.emoji;
    return responder(i, tx('destaques_ligados_mensagens_vao', { minimo: c.minimo, mostra, canal }), 'sucesso');
  },
};

export default {
  id: 'destaques',
  nome: tx('destaques'),
  intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.GuildMessageReactions, GatewayIntentBits.MessageContent],
  partials: [Partials.Message, Partials.Reaction, Partials.User, Partials.Channel],
  comandos: [destaques],
  eventos: { messageReactionAdd: aoReagir, messageReactionRemove: aoReagir },
  config: {
    resumo(guild) {
      const c = cfg(guild.id);
      return [c.canal ? tx('reacao_oes', { canal: c.canal, minimo: c.minimo }) : tx('desligado_destaques_configurar')];
    },
  },
};
