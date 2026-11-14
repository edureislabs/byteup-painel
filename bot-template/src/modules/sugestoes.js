import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, MessageFlags, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, embed, responder, ehStaff, cortar, CORES, imagens } from '../core/util.js';
import { textos, visuais, botoes as registrarBotoes, comDica, modais } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('sugestoes', {
  dica_motivo: ['', 'placeholder'],
  equipe: ['Equipe', 'botao'],
  canal_sugestoes_foi_configurado: ['O canal de sugestões não foi configurado. Avise a equipe (/config sugestoes canal).', 'resposta'],
  sugestao: ['💡 Sugestão #{numero}', 'titulo'],
  situacao: ['Situação', 'campo'],
  votacao: '🕐 Em votação',
  consegui_enviar_avise_equipe: ['Não consegui enviar em {canal}. Avise a equipe para conferir as minhas permissões.', 'resposta'],
  sugestao_2: ['Sugestão #{numero}', 'campo'],
  sugestao_enviada: ['Sugestão enviada em {canal}!', 'resposta'],
  so_equipe_pode_decidir: ['Só a equipe pode decidir sugestões.', 'resposta'],
  sugestao_encontrada: ['Sugestão não encontrada.', 'resposta'],
  esta_sugestao_ja_foi: ['Esta sugestão já foi {status}.', 'resposta'],
  achei_mensagem_sugestao: ['Não achei a mensagem da sugestão.', 'resposta'],
  aprovada: '✅ Aprovada por {usuario}',
  recusada: '❌ Recusada por {usuario}',
  motivo: ['Motivo', 'campo'],
  votos: ['Votos', 'campo'],
  motivo_2: '\n**Motivo:** {motivo}',
  sua_sugestao_foi: ['Sua sugestão #{numero} em **{servidor}** foi **{status}**.{motivo}', 'descricao'],
  sugestao_3: ['Sugestão #{numero} {status}.', 'resposta'],
  aprovar_sugestao: 'Aprovar sugestão',
  recusar_sugestao: 'Recusar sugestão',
  motivo_opcional: ['Motivo (opcional)', 'rotulo'],
  esta_sugestao_esta_mais: ['Esta sugestão não está mais no sistema.', 'resposta'],
  votacao_desta_sugestao_ja: ['A votação desta sugestão já terminou.', 'resposta'],
  so_equipe_pode_usar: ['Só a equipe pode usar este botão.', 'resposta'],
  fazer_esta_sugestao: ['O que fazer com esta sugestão?', 'conteudo'],
  aprovar: ['Aprovar', 'botao'],
  recusar: ['Recusar', 'botao'],
  sugestoes_serao_publicadas: 'Sugestões serão publicadas em {canal}.',
  sugestoes_desligadas: 'Sugestões desligadas.',
  definido: 'não definido',
  canal: 'Canal: {canal}',
  sugestoes_enviadas: 'Sugestões enviadas: {contador}',
  sugestoes: 'Sugestões',
});

// Botões (texto, emoji e cor personalizáveis; alguns podem ser escondidos)
const bt = registrarBotoes('sugestoes', {
  sim: { nome: 'Votar a favor', emoji: '👍', estilo: 'Success', rotuloInfo: 'O texto é a contagem de votos.' },
  nao: { nome: 'Votar contra', emoji: '👎', estilo: 'Danger', rotuloInfo: 'O texto é a contagem de votos.' },
  analisar: { nome: 'Equipe (aprovar/recusar)', rotulo: 'equipe', emoji: '🛡️', estilo: 'Secondary' },
  aprovar: { nome: 'Aprovar sugestão', rotulo: 'aprovar', emoji: '✅', estilo: 'Success' },
  recusar: { nome: 'Recusar sugestão', rotulo: 'recusar', emoji: '❌', estilo: 'Danger' },
});
modais('sugestoes', {
  motivo: { nome: 'Aprovar/recusar com motivo', textos: ['aprovar_sugestao', 'recusar_sugestao', 'motivo_opcional', 'dica_motivo'] },
});

// Aparência dos embeds principais (cor, imagem, miniatura e rodapé personalizáveis)
const vis = visuais('sugestoes', {
  sugestao: { nome: "Sugestão publicada", vars: ['avatar', 'servidor_icone'] },
});

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
      bt('sim', { rotulo: String(s.sim.length) }).setCustomId('sg:sim').setDisabled(encerrada),
      bt('nao', { rotulo: String(s.nao.length) }).setCustomId('sg:nao').setDisabled(encerrada),
      bt('analisar').setCustomId('sg:analisar').setDisabled(encerrada)
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
    if (!canal?.isTextBased()) return responder(i, tx('canal_sugestoes_foi_configurado'), 'erro');
    c.contador += 1;
    salvarAjustes();
    const s = { autor: i.user.id, sim: [], nao: [], status: 'aberta', numero: c.contador, canal: canal.id };
    const e = embed(i.guildId)
      .setAuthor({ name: i.member.displayName, iconURL: i.user.displayAvatarURL() })
      .setTitle(tx('sugestao', { numero: s.numero }))
      .setDescription(i.options.getString('sugestao'))
      .addFields({ name: tx('situacao'), value: tx('votacao') })
      .setTimestamp();
    vis(e, 'sugestao', imagens({ user: i.user, guild: i.guild }));
    const msg = await canal.send({ embeds: [e], components: botoes(s) }).catch(() => null);
    if (!msg) return responder(i, tx('consegui_enviar_avise_equipe', { canal }), 'erro');
    sugestoes.de(i.guildId)[msg.id] = s;
    sugestoes.salvar();
    if (msg.channel.threads) await msg.startThread({ name: tx('sugestao_2', { numero: s.numero }), autoArchiveDuration: 4320 }).catch(() => {});
    return responder(i, tx('sugestao_enviada', { canal }), 'sucesso');
  },
};

async function decidir(i, msgId, aprovada, motivo) {
  if (!ehStaff(i.member)) return responder(i, tx('so_equipe_pode_decidir'), 'erro');
  const s = sugestoes.ler(i.guildId, msgId);
  if (!s) return responder(i, tx('sugestao_encontrada'), 'erro');
  if (s.status !== 'aberta') return responder(i, tx('esta_sugestao_ja_foi', { status: s.status }), 'aviso');
  const canal = s.canal ? await i.client.channels.fetch(s.canal).catch(() => null) : i.channel;
  const msg = await canal?.messages.fetch(msgId).catch(() => null);
  if (!msg) return responder(i, tx('achei_mensagem_sugestao'), 'erro');
  s.status = aprovada ? 'aprovada' : 'recusada';
  sugestoes.salvar();
  const e = EmbedBuilder.from(msg.embeds[0])
    .setColor(aprovada ? CORES.sucesso : CORES.erro)
    .setFields(
      { name: tx('situacao'), value: aprovada ? tx('aprovada', { usuario: i.user }) : tx('recusada', { usuario: i.user }) },
      ...(motivo ? [{ name: tx('motivo'), value: cortar(motivo, 1000) }] : []),
      { name: tx('votos'), value: `👍 ${s.sim.length} · 👎 ${s.nao.length}` },
    );
  await msg.edit({ embeds: [e], components: botoes(s, true) });
  const autor = await i.client.users.fetch(s.autor).catch(() => null);
  await autor
    ?.send({ embeds: [embed(i.guildId).setDescription(tx('sua_sugestao_foi', { numero: s.numero, servidor: i.guild.name, status: s.status, motivo: motivo ? tx('motivo_2', { motivo }) : '' }))] })
    .catch(() => {});
  return responder(i, tx('sugestao_3', { numero: s.numero, status: s.status }), 'sucesso');
}

const componentes = {
  async sg(i, [acao, msgId, decisao]) {
    // formulário da equipe enviado
    if (i.isModalSubmit() && acao === 'motivo') {
      return decidir(i, msgId, decisao === 'aprovar', i.fields.getTextInputValue('motivo').trim());
    }
    // botões da equipe (resposta escondida com Aprovar/Recusar)
    if (acao === 'aprovar' || acao === 'recusar') {
      if (!ehStaff(i.member)) return responder(i, tx('so_equipe_pode_decidir'), 'erro');
      return i.showModal(
        new ModalBuilder()
          .setCustomId(`sg:motivo:${msgId}:${acao}`)
          .setTitle(acao === 'aprovar' ? tx('aprovar_sugestao') : tx('recusar_sugestao'))
          .addComponents(
            new ActionRowBuilder().addComponents(
              comDica(new TextInputBuilder().setCustomId('motivo').setLabel(tx('motivo_opcional')).setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500), tx('dica_motivo'))
            )
          )
      );
    }

    const s = sugestoes.ler(i.guildId, i.message?.id);
    if (!s) return responder(i, tx('esta_sugestao_esta_mais'), 'erro');
    if (s.status !== 'aberta') return responder(i, tx('votacao_desta_sugestao_ja'), 'aviso');

    if (acao === 'analisar') {
      if (!ehStaff(i.member)) return responder(i, tx('so_equipe_pode_usar'), 'erro');
      return i.reply({
        content: tx('fazer_esta_sugestao'),
        components: [
          new ActionRowBuilder().addComponents(
            bt('aprovar').setCustomId(`sg:aprovar:${i.message.id}`),
            bt('recusar').setCustomId(`sg:recusar:${i.message.id}`)
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
    return responder(i, ch ? tx('sugestoes_serao_publicadas', { canal: ch }) : tx('sugestoes_desligadas'), 'sucesso');
  },
  resumo(guild) {
    const c = cfg(guild.id);
    return [tx('canal', { canal: c.canal ? `<#${c.canal}>` : tx('definido') }), tx('sugestoes_enviadas', { contador: c.contador })];
  },
};

export default {
  id: 'sugestoes',
  nome: tx('sugestoes'),
  comandos: [sugerir],
  componentes,
  permissoes: [PermissionFlagsBits.CreatePublicThreads],
  config,
};
