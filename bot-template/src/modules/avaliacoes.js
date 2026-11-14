import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, cor, embed, responder, cortar, sinais, CORES } from '../core/util.js';

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
        embed(guild.id)
          .setTitle('⭐ Como foi o seu atendimento?')
          .setDescription(`Seu ticket **#${numero}** em **${guild.name}** foi fechado${atendente ? ` (atendente: <@${atendente}>)` : ''}.\nDê uma nota de 1 a 5:`),
      ],
      components: [
        new ActionRowBuilder().addComponents(
          [1, 2, 3, 4, 5].map((n) => new ButtonBuilder().setCustomId(`av:nota:${id}:${n}`).setLabel(String(n)).setEmoji('⭐').setStyle(n >= 4 ? ButtonStyle.Success : n === 3 ? ButtonStyle.Secondary : ButtonStyle.Danger))
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
      .setTitle(`${estrelas(nota)}  Ticket #${p.numero}`)
      .addFields({ name: 'Atendente', value: p.atendente ? `<@${p.atendente}>` : '—', inline: true }, { name: 'Cliente', value: `<@${p.dono}>`, inline: true })
      .setTimestamp();
    if (comentario) e.setDescription(cortar(comentario, 1000));
    await canal.send({ embeds: [e], allowedMentions: { parse: [] } }).catch(() => {});
  }
}

const componentes = {
  async av(i, [acao, id, valor]) {
    const p = pendentes.raiz[id];
    if (!p || Date.now() - p.criado > VALIDADE) {
      return i.update(respostaDM(p?.guildId, 'Esta avaliação expirou. Obrigado mesmo assim!', 'erro')).catch(() => {});
    }
    if (i.user.id !== p.dono) return;

    if (acao === 'nota') {
      if (p.nota) return i.update(respostaDM(p.guildId, `Você já avaliou este atendimento com ${estrelas(p.nota)}. Obrigado!`));
      const nota = Math.min(5, Math.max(1, Number(valor) || 0));
      p.nota = nota;
      pendentes.salvar();
      await registrar(i.client, p, nota, null);
      return i.update({
        embeds: [new EmbedBuilder().setColor(cor(p.guildId)).setDescription(`Obrigado! Você deu **${estrelas(nota)}** para o ticket #${p.numero}.\nQuer deixar um comentário?`)],
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`av:comentar:${id}`).setLabel('Comentar').setEmoji('💬').setStyle(ButtonStyle.Primary))],
      });
    }
    if (acao === 'comentar') {
      return i.showModal(
        new ModalBuilder()
          .setCustomId(`av:texto:${id}`)
          .setTitle(`Ticket #${p.numero}`)
          .addComponents(
            new ActionRowBuilder().addComponents(
              new TextInputBuilder().setCustomId('texto').setLabel('O que achou do atendimento?').setStyle(TextInputStyle.Paragraph).setRequired(true).setMaxLength(800)
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
            .send({ embeds: [embed(p.guildId).setTitle(`💬 Comentário · Ticket #${p.numero}`).setDescription(cortar(texto, 1000)).addFields({ name: 'Nota', value: estrelas(ultima.nota), inline: true })], allowedMentions: { parse: [] } })
            .catch(() => {});
        }
      }
      delete pendentes.raiz[id];
      pendentes.salvar();
      const fim = respostaDM(p.guildId, '💜 Obrigado pelo comentário!');
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
      if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) return responder(i, 'Só quem tem **Gerenciar servidor** pode configurar.', 'erro');
      const c = cfg(i.guildId);
      const canal = i.options.getChannel('canal');
      const ativo = i.options.getBoolean('ativo');
      if (canal) c.canal = canal.id;
      if (ativo !== null) c.ativo = ativo;
      salvarAjustes();
      return responder(i, `Avaliações ${c.ativo ? 'ligadas' : 'desligadas'}${c.canal ? ` · aparecem em <#${c.canal}>` : ''}.`, 'sucesso');
    }
    if (!lista.length) return responder(i, 'Ainda não há avaliações.', 'aviso');
    if (sub === 'ranking') {
      const por = {};
      for (const x of lista) if (x.atendente) (por[x.atendente] ??= []).push(x.nota);
      const linhas = Object.entries(por)
        .map(([id, ns]) => ({ id, media: ns.reduce((a, b) => a + b, 0) / ns.length, n: ns.length }))
        .sort((a, b) => b.media - a.media || b.n - a.n)
        .slice(0, 15)
        .map((x, k) => `**${k + 1}.** <@${x.id}> · ${x.media.toFixed(1).replace('.', ',')} ⭐ (${x.n} avaliação(ões))`);
      const geral = lista.reduce((a, b) => a + b.nota, 0) / lista.length;
      return i.reply({
        embeds: [embed(i.guildId).setTitle('🏆 Ranking de atendimento').setDescription(linhas.join('\n') || 'Sem atendentes avaliados.').setFooter({ text: `Média geral: ${geral.toFixed(1)} ⭐ em ${lista.length} avaliação(ões)` })],
        allowedMentions: { parse: [] },
      });
    }
    const u = i.options.getUser('usuario');
    const deles = lista.filter((x) => x.atendente === u.id);
    if (!deles.length) return responder(i, `${u} ainda não tem avaliações.`, 'aviso');
    const media = deles.reduce((a, b) => a + b.nota, 0) / deles.length;
    const ultimas = deles
      .slice(-8)
      .reverse()
      .map((x) => `${estrelas(x.nota)} · #${x.numero}${x.comentario ? ` · "${cortar(x.comentario, 80)}"` : ''}`);
    return i.reply({
      embeds: [embed(i.guildId).setTitle(`⭐ ${u.username}`).setDescription(`Média **${media.toFixed(1).replace('.', ',')}** em ${deles.length} avaliação(ões)\n\n${ultimas.join('\n')}`)],
      flags: 64,
    });
  },
};

export default {
  id: 'avaliacoes',
  nome: 'Avaliação de atendimento',
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
      return [`${c.ativo ? 'Ligadas' : 'Desligadas'} · canal: ${c.canal ? `<#${c.canal}>` : 'nenhum'} · ${n} avaliação(ões)`];
    },
  },
};
