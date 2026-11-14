import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { embed, responder, lerDuracao, ts, cortar, CORES } from '../core/util.js';
import { textos, visuais, botoes } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('sorteios', {
  encerrado: 'Encerrado {quando}',
  termina: 'Termina {quando} ({data})',
  vencedores: 'Vencedores: **{vencedores}**',
  so_participa_quem_tem: 'Só participa quem tem <@&{cargo}>',
  criado: 'Criado por <@{autor}>',
  participante: ['{participantes_total} participante(s)', 'rodape'],
  ganhador_es: ['Ganhador(es)', 'campo'],
  ninguem_participou: 'Ninguém participou.',
  encerrado_2: 'Encerrado',
  participar: 'Participar ({participantes_total})',
  ganharam: 's ganharam',
  ganhou: ' ganhou',
  parabens_voce: '🎉 Parabéns {ganhadores}! Você{verbo} **{premio}**!',
  sorteio_terminou_sem_participantes: '😕 O sorteio de **{premio}** terminou sem participantes.',
  duracao_invalida_ex_1h: ['Duração inválida (ex.: 1h, 2d; entre 10s e 60d).', 'resposta'],
  consegui_enviar_mensagens_confira: ['Não consegui enviar mensagens em {canal}. Confira as minhas permissões.', 'resposta'],
  sorteio_criado_termina: ['Sorteio criado em {canal}! Termina {quando}.', 'resposta'],
  sorteio_encontrado: ['Sorteio não encontrado.', 'resposta'],
  esse_sorteio_ja_terminou: ['Esse sorteio já terminou. Use /sorteio refazer para sortear de novo.', 'resposta'],
  sorteio_encerrado: '✅ Sorteio encerrado.',
  esse_sorteio_ainda_terminou: ['Esse sorteio ainda não terminou.', 'resposta'],
  ninguem_participou_desse_sorteio: ['Ninguém participou desse sorteio.', 'resposta'],
  novo_sorteio: ['🎉 Novo sorteio de **{premio}**: {ganhadores}!', 'conteudo'],
  nenhum_sorteio_andamento: ['Nenhum sorteio em andamento.', 'resposta'],
  termina_participante_id: '**{premio}** · <#{canal}> · termina {quando} · {participantes_total} participante(s) · ID `{id}`',
  sorteios_andamento: ['🎉 Sorteios em andamento', 'titulo'],
  este_sorteio_ja_terminou: ['Este sorteio já terminou.', 'resposta'],
  participar_voce_precisa_cargo: ['Para participar você precisa do cargo <@&{cargo}>.', 'resposta'],
  voce_saiu_sorteio: 'Você saiu do sorteio.',
  voce_esta_participando_clique: '🎉 Você está participando! Clique de novo para sair.',
  sorteios: 'Sorteios',
});

// Botões (texto, emoji e cor personalizáveis; alguns podem ser escondidos)
const bt = botoes('sorteios', {
  entrar: { nome: 'Participar do sorteio', rotulo: 'participar', emoji: '🎉', estilo: 'Primary', rotuloInfo: 'Quando o sorteio acaba, o texto vira o de "Encerrado".' },
});

// Aparência dos embeds principais (cor, imagem, miniatura e rodapé personalizáveis)
const vis = visuais('sorteios', {
  sorteio: { nome: "Mensagem do sorteio", vars: [] },
});

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
        encerrado ? tx('encerrado', { quando: ts(s.fim) }) : tx('termina', { quando: ts(s.fim), data: ts(s.fim, 'f') }),
        tx('vencedores', { vencedores: s.vencedores }),
        s.cargo ? tx('so_participa_quem_tem', { cargo: s.cargo }) : '',
        tx('criado', { autor: s.autor }),
      ]
        .filter(Boolean)
        .join('\n')
    )
    .setFooter({ text: tx('participante', { participantes_total: s.participantes.length }) });
  if (encerrado) {
    e.setColor(CORES.sucesso).addFields({ name: tx('ganhador_es'), value: s.ganhadores?.length ? s.ganhadores.map((id) => `<@${id}>`).join(', ') : tx('ninguem_participou') });
  }
  vis(e, 'sorteio', {});
  const row = new ActionRowBuilder().addComponents(
    bt('entrar', { rotulo: encerrado ? tx('encerrado_2') : tx('participar', { participantes_total: s.participantes.length }) })
      .setCustomId('sr:entrar')
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
      ? tx('parabens_voce', { ganhadores: s.ganhadores.map((id) => `<@${id}>`).join(', '), verbo: s.ganhadores.length > 1 ? tx('ganharam') : tx('ganhou'), premio: s.premio })
      : tx('sorteio_terminou_sem_participantes', { premio: s.premio });
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
      if (!ms || ms < 10_000 || ms > 60 * 86_400_000) return responder(i, tx('duracao_invalida_ex_1h'), 'erro');
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
      if (!msg) return responder(i, tx('consegui_enviar_mensagens_confira', { canal }), 'erro');
      sorteios.de(i.guildId)[msg.id] = s;
      sorteios.salvar();
      return responder(i, tx('sorteio_criado_termina', { canal, quando: ts(s.fim) }), 'sucesso');
    }
    if (sub === 'encerrar') {
      const id = idDaMensagem(i.options.getString('mensagem'));
      const s = sorteios.ler(i.guildId, id);
      if (!s) return responder(i, tx('sorteio_encontrado'), 'erro');
      if (s.encerrado) return responder(i, tx('esse_sorteio_ja_terminou'), 'aviso');
      await i.deferReply({ flags: 64 });
      await finalizar(i.client, i.guildId, id);
      return i.editReply(tx('sorteio_encerrado'));
    }
    if (sub === 'refazer') {
      const id = idDaMensagem(i.options.getString('mensagem'));
      const s = sorteios.ler(i.guildId, id);
      if (!s) return responder(i, tx('sorteio_encontrado'), 'erro');
      if (!s.encerrado) return responder(i, tx('esse_sorteio_ainda_terminou'), 'aviso');
      const n = i.options.getInteger('vencedores') ?? s.vencedores;
      const novos = sortear(s.participantes, n);
      if (!novos.length) return responder(i, tx('ninguem_participou_desse_sorteio'), 'aviso');
      return i.reply({ content: tx('novo_sorteio', { premio: cortar(s.premio, 100), ganhadores: novos.map((u) => `<@${u}>`).join(', ') }), allowedMentions: { users: novos } });
    }
    if (sub === 'lista') {
      const ativos = Object.entries(sorteios.ler(i.guildId) ?? {}).filter(([, s]) => !s.encerrado);
      if (!ativos.length) return responder(i, tx('nenhum_sorteio_andamento'), 'info');
      const linhas = ativos.map(([id, s]) => tx('termina_participante_id', { premio: cortar(s.premio, 60), canal: s.canal, quando: ts(s.fim), participantes_total: s.participantes.length, id }));
      return i.reply({ embeds: [embed(i.guildId).setTitle(tx('sorteios_andamento')).setDescription(linhas.join('\n'))], flags: 64 });
    }
  },
};

const componentes = {
  async sr(i, [acao]) {
    if (acao !== 'entrar') return;
    const s = sorteios.ler(i.guildId, i.message.id);
    if (!s || s.encerrado) return responder(i, tx('este_sorteio_ja_terminou'), 'aviso');
    if (s.cargo && !i.member.roles.cache.has(s.cargo)) return responder(i, tx('participar_voce_precisa_cargo', { cargo: s.cargo }), 'erro');
    const idx = s.participantes.indexOf(i.user.id);
    if (idx >= 0) s.participantes.splice(idx, 1);
    else s.participantes.push(i.user.id);
    sorteios.salvar();
    await i.update(painel(i.guildId, s));
    await i.followUp({ content: idx >= 0 ? tx('voce_saiu_sorteio') : tx('voce_esta_participando_clique'), flags: 64 });
  },
};

export default {
  id: 'sorteios',
  nome: tx('sorteios'),
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
