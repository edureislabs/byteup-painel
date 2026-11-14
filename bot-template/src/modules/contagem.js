import { ChannelType, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { ajustes, salvarAjustes, embed, responder, fmt, foiRemovida } from '../core/util.js';
import { textos } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('contagem', {
  proximo_era: 'O próximo era **{esperado}**.',
  vale_contar_duas_vezes: 'Não vale contar duas vezes seguidas.',
  errou_voces_chegaram_recomecando: ['💥 {autor} errou! {erro}\nVocês chegaram a **{chegou}**. Recomeçando do **1**. (Recorde: {recorde})', 'descricao'],
  novo_recorde_voces_passaram: ['🏆 **Novo recorde!** Vocês passaram de {recorde_anterior}.', 'descricao'],
  jogo_contar_esta_ligado: ['O jogo de contar não está ligado.', 'resposta'],
  estamos_proximo_recorde: ['🔢 Em <#{canal}>: estamos no **{atual}** (próximo: {proximo}).\n🏆 Recorde: **{recorde}**{quando_recorde}', 'resposta'],
  so_quem_tem_gerenciar: ['Só quem tem **Gerenciar servidor** pode fazer isso.', 'resposta'],
  contagem_zerada_proximo_numero: ['Contagem zerada. O próximo número é 1.', 'resposta'],
  jogo_contar: ['🔢 Jogo de contar', 'titulo'],
  contem_partir_numero_mensagem: ['Contem a partir do **1**, um número por mensagem.\nA mesma pessoa não pode contar duas vezes seguidas. Errou, volta para o 1!', 'descricao'],
  jogo_contar_ligado: ['Jogo de contar ligado em {canal}.', 'resposta'],
  jogo_contar_2: 'Jogo de contar',
  atual_recorde: '<#{canal}> · atual {atual} · recorde {recorde}',
  desligado_contagem_canal: 'Desligado (`/contagem canal`)',
});

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

  const erro = n !== esperado ? tx('proximo_era', { esperado: fmt(esperado) }) : msg.author.id === c.ultimo ? tx('vale_contar_duas_vezes') : null;
  if (erro) {
    const chegou = c.atual;
    c.atual = 0;
    c.ultimo = null;
    c.recordeDaRodada = c.recorde;
    salvarAjustes();
    await msg.react('❌').catch(() => {});
    await msg
      .reply({
        embeds: [embed(msg.guildId).setColor(0xef4444).setDescription(tx('errou_voces_chegaram_recomecando', { autor: msg.author, erro, chegou: fmt(chegou), recorde: fmt(c.recorde) }))],
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
  if (bateuRecorde) await msg.channel.send({ embeds: [embed(msg.guildId).setDescription(tx('novo_recorde_voces_passaram', { recorde_anterior: fmt(n - 1) }))] }).catch(() => {});
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
      if (!c.canal) return responder(i, tx('jogo_contar_esta_ligado'), 'aviso');
      return responder(
        i,
        tx('estamos_proximo_recorde', { canal: c.canal, atual: fmt(c.atual), proximo: fmt(c.atual + 1), recorde: fmt(c.recorde), quando_recorde: c.recordeEm ? ` (<t:${Math.floor(c.recordeEm / 1000)}:R>)` : '' }),
        'info'
      );
    }
    if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) return responder(i, tx('so_quem_tem_gerenciar'), 'erro');
    if (sub === 'zerar') {
      c.atual = 0;
      c.ultimo = null;
      c.recordeDaRodada = c.recorde;
      salvarAjustes();
      return responder(i, tx('contagem_zerada_proximo_numero'), 'sucesso');
    }
    const canal = i.options.getChannel('canal');
    c.canal = canal.id;
    c.atual = 0;
    c.ultimo = null;
    c.recordeDaRodada = c.recorde;
    salvarAjustes();
    await canal.send({ embeds: [embed(i.guildId).setTitle(tx('jogo_contar')).setDescription(tx('contem_partir_numero_mensagem'))] }).catch(() => {});
    return responder(i, tx('jogo_contar_ligado', { canal }), 'sucesso');
  },
};

export default {
  id: 'contagem',
  nome: tx('jogo_contar_2'),
  intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  comandos: [contagem],
  eventos: { messageCreate: aoMensagem },
  config: {
    resumo(guild) {
      const c = cfg(guild.id);
      return [c.canal ? tx('atual_recorde', { canal: c.canal, atual: fmt(c.atual), recorde: fmt(c.recorde) }) : tx('desligado_contagem_canal')];
    },
  },
};
