import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { embed, responder, lerDuracao, ts, cortar, CORES } from '../core/util.js';

/**
 * Sorteios: botão para participar, cargo obrigatório opcional, sorteio automático
 * no fim, encerrar antes da hora e sortear de novo.
 */

const sorteios = colecao('sorteios');

function painel(guildId, s, encerrado = false) {
  const e = embed(guildId)
    .setTitle(`🎉 ${s.premio}`)
    .setDescription(
      [
        s.descricao ? `${s.descricao}\n` : '',
        encerrado ? `Encerrado ${ts(s.fim)}` : `Termina ${ts(s.fim)} (${ts(s.fim, 'f')})`,
        `Vencedores: **${s.vencedores}**`,
        s.cargo ? `Só participa quem tem <@&${s.cargo}>` : '',
        `Criado por <@${s.autor}>`,
      ]
        .filter(Boolean)
        .join('\n')
    )
    .setFooter({ text: `${s.participantes.length} participante(s)` });
  if (encerrado) {
    e.setColor(CORES.sucesso).addFields({ name: 'Ganhador(es)', value: s.ganhadores?.length ? s.ganhadores.map((id) => `<@${id}>`).join(', ') : 'Ninguém participou.' });
  }
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId('sr:entrar')
      .setLabel(encerrado ? 'Encerrado' : `Participar (${s.participantes.length})`)
      .setEmoji('🎉')
      .setStyle(ButtonStyle.Primary)
      .setDisabled(encerrado)
  );
  return { embeds: [e], components: [row] };
}

function sortear(lista, n) {
  const copia = [...lista];
  const out = [];
  while (copia.length && out.length < n) out.push(copia.splice(Math.floor(Math.random() * copia.length), 1)[0]);
  return out;
}

async function finalizar(client, guildId, msgId) {
  const s = sorteios.ler(guildId, msgId);
  if (!s || s.encerrado) return;
  s.encerrado = true;
  s.fim = Math.min(s.fim, Date.now());
  s.ganhadores = sortear(s.participantes, s.vencedores);
  sorteios.salvar();
  const canal = await client.channels.fetch(s.canal).catch(() => null);
  const msg = await canal?.messages.fetch(msgId).catch(() => null);
  if (msg) await msg.edit(painel(guildId, s, true)).catch(() => {});
  if (canal?.isTextBased()) {
    const texto = s.ganhadores.length
      ? `🎉 Parabéns ${s.ganhadores.map((id) => `<@${id}>`).join(', ')}! Você${s.ganhadores.length > 1 ? 's ganharam' : ' ganhou'} **${s.premio}**!`
      : `😕 O sorteio de **${s.premio}** terminou sem participantes.`;
    await canal.send({ content: texto, reply: msg ? { messageReference: msg.id, failIfNotExists: false } : undefined, allowedMentions: { users: s.ganhadores } }).catch(() => {});
  }
}

const idDaMensagem = (t) => String(t).split('/').pop().replace(/\D/g, '');

const sorteio = {
  data: new SlashCommandBuilder()
    .setName('sorteio')
    .setDescription('Sorteios')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('criar')
        .setDescription('Cria um sorteio')
        .addStringOption((o) => o.setName('premio').setDescription('O que será sorteado').setRequired(true).setMaxLength(200))
        .addStringOption((o) => o.setName('duracao').setDescription('Ex.: 1h, 2d, 1w').setRequired(true).setMaxLength(20))
        .addIntegerOption((o) => o.setName('vencedores').setDescription('Quantos ganham (padrão 1)').setMinValue(1).setMaxValue(20))
        .addChannelOption((o) => o.setName('canal').setDescription('Padrão: este canal').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        .addRoleOption((o) => o.setName('cargo').setDescription('Só quem tem este cargo participa'))
        .addStringOption((o) => o.setName('descricao').setDescription('Detalhes do sorteio').setMaxLength(1000))
    )
    .addSubcommand((s) =>
      s.setName('encerrar').setDescription('Encerra um sorteio agora').addStringOption((o) => o.setName('mensagem').setDescription('ID ou link da mensagem do sorteio').setRequired(true).setMaxLength(120))
    )
    .addSubcommand((s) =>
      s
        .setName('refazer')
        .setDescription('Sorteia ganhadores de novo num sorteio encerrado')
        .addStringOption((o) => o.setName('mensagem').setDescription('ID ou link da mensagem do sorteio').setRequired(true).setMaxLength(120))
        .addIntegerOption((o) => o.setName('vencedores').setDescription('Quantos (padrão: o mesmo número)').setMinValue(1).setMaxValue(20))
    )
    .addSubcommand((s) => s.setName('lista').setDescription('Sorteios em andamento')),
  async executar(i) {
    const sub = i.options.getSubcommand();
    if (sub === 'criar') {
      const ms = lerDuracao(i.options.getString('duracao'));
      if (!ms || ms < 10_000 || ms > 60 * 86_400_000) return responder(i, 'Duração inválida (ex.: 1h, 2d; entre 10s e 60d).', 'erro');
      const canal = i.options.getChannel('canal') ?? i.channel;
      const s = {
        premio: i.options.getString('premio'),
        descricao: i.options.getString('descricao') || '',
        vencedores: i.options.getInteger('vencedores') ?? 1,
        cargo: i.options.getRole('cargo')?.id ?? null,
        fim: Date.now() + ms,
        canal: canal.id,
        autor: i.user.id,
        participantes: [],
        encerrado: false,
      };
      const msg = await canal.send(painel(i.guildId, s)).catch(() => null);
      if (!msg) return responder(i, `Não consegui enviar mensagens em ${canal}. Confira as minhas permissões.`, 'erro');
      sorteios.de(i.guildId)[msg.id] = s;
      sorteios.salvar();
      return responder(i, `Sorteio criado em ${canal}! Termina ${ts(s.fim)}.`, 'sucesso');
    }
    if (sub === 'encerrar') {
      const id = idDaMensagem(i.options.getString('mensagem'));
      const s = sorteios.ler(i.guildId, id);
      if (!s) return responder(i, 'Sorteio não encontrado.', 'erro');
      if (s.encerrado) return responder(i, 'Esse sorteio já terminou. Use /sorteio refazer para sortear de novo.', 'aviso');
      await i.deferReply({ flags: 64 });
      await finalizar(i.client, i.guildId, id);
      return i.editReply('✅ Sorteio encerrado.');
    }
    if (sub === 'refazer') {
      const id = idDaMensagem(i.options.getString('mensagem'));
      const s = sorteios.ler(i.guildId, id);
      if (!s) return responder(i, 'Sorteio não encontrado.', 'erro');
      if (!s.encerrado) return responder(i, 'Esse sorteio ainda não terminou.', 'aviso');
      const n = i.options.getInteger('vencedores') ?? s.vencedores;
      const novos = sortear(s.participantes, n);
      if (!novos.length) return responder(i, 'Ninguém participou desse sorteio.', 'aviso');
      return i.reply({ content: `🎉 Novo sorteio de **${cortar(s.premio, 100)}**: ${novos.map((u) => `<@${u}>`).join(', ')}!`, allowedMentions: { users: novos } });
    }
    if (sub === 'lista') {
      const ativos = Object.entries(sorteios.ler(i.guildId) ?? {}).filter(([, s]) => !s.encerrado);
      if (!ativos.length) return responder(i, 'Nenhum sorteio em andamento.', 'info');
      const linhas = ativos.map(([id, s]) => `**${cortar(s.premio, 60)}** · <#${s.canal}> · termina ${ts(s.fim)} · ${s.participantes.length} participante(s) · ID \`${id}\``);
      return i.reply({ embeds: [embed(i.guildId).setTitle('🎉 Sorteios em andamento').setDescription(linhas.join('\n'))], flags: 64 });
    }
  },
};

const componentes = {
  async sr(i, [acao]) {
    if (acao !== 'entrar') return;
    const s = sorteios.ler(i.guildId, i.message.id);
    if (!s || s.encerrado) return responder(i, 'Este sorteio já terminou.', 'aviso');
    if (s.cargo && !i.member.roles.cache.has(s.cargo)) return responder(i, `Para participar você precisa do cargo <@&${s.cargo}>.`, 'erro');
    const idx = s.participantes.indexOf(i.user.id);
    if (idx >= 0) s.participantes.splice(idx, 1);
    else s.participantes.push(i.user.id);
    sorteios.salvar();
    await i.update(painel(i.guildId, s));
    await i.followUp({ content: idx >= 0 ? 'Você saiu do sorteio.' : '🎉 Você está participando! Clique de novo para sair.', flags: 64 });
  },
};

export default {
  id: 'sorteios',
  nome: 'Sorteios',
  comandos: [sorteio],
  componentes,
  aoIniciar(client) {
    const checar = async () => {
      const agora = Date.now();
      for (const [guildId, lista] of Object.entries(sorteios.raiz)) {
        for (const [msgId, s] of Object.entries(lista)) {
          if (!s.encerrado && s.fim <= agora) await finalizar(client, guildId, msgId);
          if (s.encerrado && agora - s.fim > 30 * 86_400_000) delete lista[msgId];
        }
      }
    };
    checar();
    setInterval(checar, 15_000);
  },
};
