import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, cor, embed, responder, cortar, sinais, CORES, imagens } from '../core/util.js';
import { textos, visuais, botoes, fileira, fileiras, comDica, modais } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('avaliacoes', {
  dica_comentario: ['', 'placeholder'],
  como_foi_seu_atendimento: ['⭐ Como foi o seu atendimento?', 'titulo'],
  atendente: ' (atendente: <@{atendente}>)',
  seu_ticket_foi_fechado: ['Seu ticket **#{numero}** em **{servidor}** foi fechado{atendente}.\nDê uma nota de 1 a 5:', 'descricao'],
  ticket: ['{estrelas}  Ticket #{numero}', 'titulo'],
  atendente_2: ['Atendente', 'campo'],
  cliente: ['Cliente', 'campo'],
  esta_avaliacao_expirou_obrigado: 'Esta avaliação expirou. Obrigado mesmo assim!',
  voce_ja_avaliou_este: 'Você já avaliou este atendimento com {estrelas}. Obrigado!',
  obrigado_voce_deu_ticket: ['Obrigado! Você deu **{estrelas}** para o ticket #{numero}.\nQuer deixar um comentário?', 'descricao'],
  comentar: ['Comentar', 'botao'],
  ticket_2: ['Ticket #{numero}', 'rotulo'],
  achou_atendimento: ['O que achou do atendimento?', 'rotulo'],
  comentario_ticket: ['💬 Comentário · Ticket #{numero}', 'titulo'],
  nota: ['Nota', 'campo'],
  obrigado_pelo_comentario: '💜 Obrigado pelo comentário!',
  so_quem_tem_gerenciar: ['Só quem tem **Gerenciar servidor** pode configurar.', 'resposta'],
  ligadas: 'ligadas',
  desligadas: 'desligadas',
  aparecem: ' · aparecem em <#{canal}>',
  avaliacoes: ['Avaliações {estado}{canal}.', 'resposta'],
  ainda_ha_avaliacoes: ['Ainda não há avaliações.', 'resposta'],
  avaliacao_oes: '**{posicao}.** <@{atendente}> · {media} ⭐ ({avaliacoes} avaliação(ões))',
  ranking_atendimento: ['🏆 Ranking de atendimento', 'titulo'],
  sem_atendentes_avaliados: 'Sem atendentes avaliados.',
  media_geral_avaliacao_oes: ['Média geral: {media} ⭐ em {total} avaliação(ões)', 'rodape'],
  ainda_tem_avaliacoes: ['{usuario} ainda não tem avaliações.', 'resposta'],
  media_avaliacao_oes: ['Média **{media}** em {total} avaliação(ões)\n\n{ultimas}', 'descricao'],
  avaliacao_atendimento: 'Avaliação de atendimento',
  ligadas_2: 'Ligadas',
  desligadas_2: 'Desligadas',
  nenhum: 'nenhum',
  canal_avaliacao_oes: '{estado} · canal: {canal} · {total} avaliação(ões)',
});

modais('avaliacoes', { comentario: { nome: 'Comentário da avaliação', textos: ['ticket_2', 'achou_atendimento', 'dica_comentario'] } });

// Botões (texto, emoji e cor personalizáveis; alguns podem ser escondidos)
const bt = botoes('avaliacoes', {
  nota: { nome: "Botões de nota (1 a 5)", emoji: '⭐', estilo: 'Secondary', rotuloInfo: "O texto é o número da nota. Sem cor escolhida: 4 e 5 verdes, 3 cinza, 1 e 2 vermelhos." },
  comentar: { nome: "Deixar comentário", rotulo: 'comentar', emoji: '💬', estilo: 'Primary', ocultavel: true },
});

// Aparência dos embeds principais (cor, imagem, miniatura e rodapé personalizáveis)
const vis = visuais('avaliacoes', {
  pedido: { nome: "Pedido de avaliação na DM", vars: ['servidor_icone'] },
});

/**
 * Avaliação de atendimento (complemento do módulo Tickets).
 * Quando um ticket fecha, quem abriu recebe na DM: "Como foi o atendimento?" (1 a 5 estrelas)
 * e pode deixar um comentário. As notas vão para um canal e viram ranking dos atendentes.
 */

const pendentes = colecao('avaliacoes_pendentes'); // id -> { guildId, numero, atendente, dono, criado }
const notas = colecao('avaliacoes'); // guild -> { lista: [...] }
const PADRAO = { ativo: true, canal: null };
const cfg = (guildId) => ajustes(guildId, 'avaliacoes', PADRAO);
const estrelas = (n) => '⭐'.repeat(n) + '☆'.repeat(5 - n);
const VALIDADE = 7 * 86400e3;

// respostas na DM (lá não tem servidor, então não dá para usar o "responder" de sempre)
const respostaDM = (guildId, texto, tipo) => ({
  embeds: [new EmbedBuilder().setColor(tipo === 'erro' ? CORES.erro : guildId ? cor(guildId) : 0x5865f2).setDescription(texto)],
  components: [],
});

sinais.on('ticketFechado', async ({ guild, client, dono, atendente, numero }) => {
  const c = cfg(guild.id);
  if (!c.ativo || !dono || dono === atendente) return;
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
  pendentes.raiz[id] = { guildId: guild.id, numero, atendente: atendente ?? null, dono, criado: Date.now() };
  pendentes.salvar();
  const user = await client.users.fetch(dono).catch(() => null);
  await user
    ?.send({
      embeds: [
        vis(
          embed(guild.id)
          .setTitle(tx('como_foi_seu_atendimento'))
          .setDescription(tx('seu_ticket_foi_fechado', { numero, servidor: guild.name, atendente: atendente ? tx('atendente', { atendente }) : '' })),
          'pedido',
          imagens({ guild }),
        ),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          [1, 2, 3, 4, 5].map((n) => bt('nota', { rotulo: String(n), estilo: n >= 4 ? 'Success' : n === 3 ? 'Secondary' : 'Danger' }).setCustomId(`av:nota:${id}:${n}`))
        ),
      ],
    })
    .catch(() => {});
});

async function registrar(client, p, nota, comentario) {
  const guild = client.guilds.cache.get(p.guildId);
  const lista = (notas.de(p.guildId).lista ??= []);
  lista.push({ numero: p.numero, atendente: p.atendente, dono: p.dono, nota, comentario: comentario || null, em: Date.now() });
  if (lista.length > 5000) lista.splice(0, lista.length - 5000);
  notas.salvar();
  const canalId = cfg(p.guildId).canal;
  const canal = guild && canalId && guild.channels.cache.get(canalId);
  if (canal?.isTextBased()) {
    const e = embed(p.guildId)
      .setTitle(tx('ticket', { estrelas: estrelas(nota), numero: p.numero }))
      .addFields({ name: tx('atendente_2'), value: p.atendente ? `<@${p.atendente}>` : '—', inline: true }, { name: tx('cliente'), value: `<@${p.dono}>`, inline: true })
      .setTimestamp();
    if (comentario) e.setDescription(cortar(comentario, 1000));
    await canal.send({ embeds: [e], allowedMentions: { parse: [] } }).catch(() => {});
  }
}

const componentes = {
  async av(i, [acao, id, valor]) {
    const p = pendentes.raiz[id];
    if (!p || Date.now() - p.criado > VALIDADE) {
      return i.update(respostaDM(p?.guildId, tx('esta_avaliacao_expirou_obrigado'), 'erro')).catch(() => {});
    }
    if (i.user.id !== p.dono) return;

    if (acao === 'nota') {
      if (p.nota) return i.update(respostaDM(p.guildId, tx('voce_ja_avaliou_este', { estrelas: estrelas(p.nota) })));
      const nota = Math.min(5, Math.max(1, Number(valor) || 0));
      p.nota = nota;
      pendentes.salvar();
      await registrar(i.client, p, nota, null);
      return i.update({
        embeds: [new EmbedBuilder().setColor(cor(p.guildId)).setDescription(tx('obrigado_voce_deu_ticket', { estrelas: estrelas(nota), numero: p.numero }))],
        components: fileiras(fileira(bt('comentar')?.setCustomId(`av:comentar:${id}`))),
      });
    }
    if (acao === 'comentar') {
      return i.showModal(
        new ModalBuilder()
          .setCustomId(`av:texto:${id}`)
          .setTitle(tx('ticket_2', { numero: p.numero }))
          .addComponents(
            new ActionRowBuilder().addComponents(
              comDica(new TextInputBuilder().setCustomId('texto').setLabel(tx('achou_atendimento')).setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(800), tx('dica_comentario'))
            )
          )
      );
    }
    if (acao === 'texto' && i.isModalSubmit()) {
      const texto = i.fields.getTextInputValue('texto').trim();
      // troca a última nota (sem comentário) pela mesma nota com comentário
      const lista = notas.ler(p.guildId, 'lista') ?? [];
      const ultima = [...lista].reverse().find((x) => x.numero === p.numero && x.dono === p.dono && !x.comentario);
      if (ultima) {
        ultima.comentario = texto;
        notas.salvar();
        const guild = i.client.guilds.cache.get(p.guildId);
        const canal = guild && cfg(p.guildId).canal && guild.channels.cache.get(cfg(p.guildId).canal);
        if (canal?.isTextBased()) {
          await canal
            .send({ embeds: [embed(p.guildId).setTitle(tx('comentario_ticket', { numero: p.numero })).setDescription(cortar(texto, 1000)).addFields({ name: tx('nota'), value: estrelas(ultima.nota), inline: true })], allowedMentions: { parse: [] } })
            .catch(() => {});
        }
      }
      delete pendentes.raiz[id];
      pendentes.salvar();
      const fim = respostaDM(p.guildId, tx('obrigado_pelo_comentario'));
      return i.update(fim).catch(() => i.reply(fim));
    }
  },
};

const avaliacoes = {
  data: new SlashCommandBuilder()
    .setName('avaliacoes')
    .setDescription('Avaliações dos atendimentos (tickets)')
    .addSubcommand((s) => s.setName('ranking').setDescription('Ranking dos atendentes pela nota média'))
    .addSubcommand((s) =>
      s
        .setName('atendente')
        .setDescription('Notas de um atendente')
        .addUserOption((o) => o.setName('usuario').setDescription('Atendente').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('configurar')
        .setDescription('(Equipe) Canal das avaliações e ligar/desligar')
        .addChannelOption((o) => o.setName('canal').setDescription('Onde mostrar as avaliações').addChannelTypes(ChannelType.GuildText))
        .addBooleanOption((o) => o.setName('ativo').setDescription('Pedir avaliação ao fechar ticket'))
    ),
  async executar(i) {
    const sub = i.options.getSubcommand();
    const lista = notas.ler(i.guildId, 'lista') ?? [];
    if (sub === 'configurar') {
      if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) return responder(i, tx('so_quem_tem_gerenciar'), 'erro');
      const c = cfg(i.guildId);
      const canal = i.options.getChannel('canal');
      const ativo = i.options.getBoolean('ativo');
      if (canal) c.canal = canal.id;
      if (ativo !== null) c.ativo = ativo;
      salvarAjustes();
      return responder(i, tx('avaliacoes', { estado: c.ativo ? tx('ligadas') : tx('desligadas'), canal: c.canal ? tx('aparecem', { canal: c.canal }) : '' }), 'sucesso');
    }
    if (!lista.length) return responder(i, tx('ainda_ha_avaliacoes'), 'aviso');
    if (sub === 'ranking') {
      const por = {};
      for (const x of lista) if (x.atendente) (por[x.atendente] ??= []).push(x.nota);
      const linhas = Object.entries(por)
        .map(([id, ns]) => ({ id, media: ns.reduce((a, b) => a + b, 0) / ns.length, n: ns.length }))
        .sort((a, b) => b.media - a.media || b.n - a.n)
        .slice(0, 15)
        .map((x, k) => tx('avaliacao_oes', { posicao: k + 1, atendente: x.id, media: x.media.toFixed(1).replace('.', ','), avaliacoes: x.n }));
      const geral = lista.reduce((a, b) => a + b.nota, 0) / lista.length;
      return i.reply({
        embeds: [embed(i.guildId).setTitle(tx('ranking_atendimento')).setDescription(linhas.join('\n') || tx('sem_atendentes_avaliados')).setFooter({ text: tx('media_geral_avaliacao_oes', { media: geral.toFixed(1), total: lista.length }) })],
        allowedMentions: { parse: [] },
      });
    }
    const u = i.options.getUser('usuario');
    const deles = lista.filter((x) => x.atendente === u.id);
    if (!deles.length) return responder(i, tx('ainda_tem_avaliacoes', { usuario: u }), 'aviso');
    const media = deles.reduce((a, b) => a + b.nota, 0) / deles.length;
    const ultimas = deles
      .slice(-8)
      .reverse()
      .map((x) => `${estrelas(x.nota)} · #${x.numero}${x.comentario ? ` · "${cortar(x.comentario, 80)}"` : ''}`);
    return i.reply({
      embeds: [embed(i.guildId).setTitle(`⭐ ${u.username}`).setDescription(tx('media_avaliacao_oes', { media: media.toFixed(1).replace('.', ','), total: deles.length, ultimas: ultimas.join('\n') }))],
      flags: 64,
    });
  },
};

export default {
  id: 'avaliacoes',
  nome: tx('avaliacao_atendimento'),
  comandos: [avaliacoes],
  componentes,
  componentesDM: ['av'],
  aoIniciar() {
    // limpa pedidos de avaliação vencidos
    const limpar = () => {
      for (const [id, p] of Object.entries(pendentes.raiz)) if (Date.now() - p.criado > VALIDADE) delete pendentes.raiz[id];
      pendentes.salvar();
    };
    limpar();
    setInterval(limpar, 6 * 3600e3);
  },
  config: {
    resumo(guild) {
      const c = cfg(guild.id);
      const n = notas.ler(guild.id, 'lista')?.length ?? 0;
      return [tx('canal_avaliacao_oes', { estado: c.ativo ? tx('ligadas_2') : tx('desligadas_2'), canal: c.canal ? `<#${c.canal}>` : tx('nenhum'), total: n })];
    },
  },
};
