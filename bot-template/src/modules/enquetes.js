import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { embed, responder, lerDuracao, barra, ts, cortar, ehStaff } from '../core/util.js';

/**
 * Enquetes: até 5 opções com botões, resultado ao vivo e encerramento automático.
 * Cada pessoa vota uma vez (pode trocar o voto) ou várias, se a enquete permitir.
 */

const enquetes = colecao('enquetes');
const LETRAS = ['🇦', '🇧', '🇨', '🇩', '🇪'];

function resultado(e, total) {
  if (!total) return 'Ninguém votou.';
  const maior = Math.max(...e.votos.map((v) => v.length));
  const lideres = e.opcoes.filter((_, n) => e.votos[n].length === maior).map((op) => `**${op}**`);
  return lideres.length > 1 ? `Empate entre ${lideres.join(' e ')}` : `Vencedora: ${lideres[0]}`;
}

function montar(guildId, e, encerrada = false) {
  const total = e.votos.reduce((t, v) => t + v.length, 0);
  const linhas = e.opcoes.map((op, n) => {
    const q = e.votos[n].length;
    const f = total ? q / total : 0;
    return `${LETRAS[n]} **${op}**\n${barra(f, 14)} ${Math.round(f * 100)}% (${q})`;
  });
  const emb = embed(guildId)
    .setTitle(`📊 ${e.pergunta}`)
    .setDescription(linhas.join('\n\n'))
    .setFooter({ text: `${total} voto(s)${e.multipla ? ' · pode votar em mais de uma' : ''}` });
  if (encerrada) emb.addFields({ name: 'Encerrada', value: resultado(e, total) });
  else if (e.fim) emb.addFields({ name: 'Termina', value: ts(e.fim) });
  const row = new ActionRowBuilder().addComponents(
    e.opcoes.map((op, n) =>
      new ButtonBuilder().setCustomId(`eq:votar:${n}`).setEmoji(LETRAS[n]).setLabel(cortar(op, 70)).setStyle(ButtonStyle.Secondary).setDisabled(encerrada)
    )
  );
  return { embeds: [emb], components: [row] };
}

async function encerrar(client, guildId, msgId) {
  const e = enquetes.ler(guildId, msgId);
  if (!e || e.encerrada) return;
  e.encerrada = true;
  e.encerradaEm = Date.now();
  enquetes.salvar();
  const canal = await client.channels.fetch(e.canal).catch(() => null);
  const msg = await canal?.messages.fetch(msgId).catch(() => null);
  if (msg) await msg.edit(montar(guildId, e, true)).catch(() => {});
}

const enquete = {
  data: new SlashCommandBuilder()
    .setName('enquete')
    .setDescription('Cria uma enquete')
    .addStringOption((o) => o.setName('pergunta').setDescription('A pergunta').setRequired(true).setMaxLength(200))
    .addStringOption((o) => o.setName('opcoes').setDescription('De 2 a 5 opções separadas por | (ex.: Sim | Não | Talvez)').setRequired(true).setMaxLength(500))
    .addStringOption((o) => o.setName('duracao').setDescription('Encerra sozinha depois de: 30m, 1h, 2d (vazio = não encerra)').setMaxLength(20))
    .addBooleanOption((o) => o.setName('varias').setDescription('Permitir votar em mais de uma opção')),
  async executar(i) {
    const opcoes = i.options
      .getString('opcoes')
      .split('|')
      .map((s) => s.trim())
      .filter(Boolean)
      .slice(0, 5);
    if (opcoes.length < 2) return responder(i, 'Coloque pelo menos 2 opções separadas por **|**.', 'erro');
    const d = i.options.getString('duracao');
    const ms = d ? lerDuracao(d) : null;
    if (d && (!ms || ms > 30 * 86_400_000)) return responder(i, 'Duração inválida (ex.: 30m, 1h, 2d; máximo 30d).', 'erro');

    const e = {
      pergunta: i.options.getString('pergunta'),
      opcoes,
      votos: opcoes.map(() => []),
      multipla: i.options.getBoolean('varias') ?? false,
      fim: ms ? Date.now() + ms : null,
      canal: i.channelId,
      autor: i.user.id,
      encerrada: false,
    };
    await i.reply(montar(i.guildId, e));
    const msg = await i.fetchReply();
    enquetes.de(i.guildId)[msg.id] = e;
    enquetes.salvar();
  },
};

const encerrarCmd = {
  data: new SlashCommandBuilder()
    .setName('encerrarenquete')
    .setDescription('Encerra uma enquete agora')
    .addStringOption((o) => o.setName('mensagem').setDescription('ID ou link da mensagem da enquete').setRequired(true).setMaxLength(120)),
  async executar(i) {
    const id = i.options.getString('mensagem').split('/').pop().replace(/\D/g, '');
    const e = enquetes.ler(i.guildId, id);
    if (!e) return responder(i, 'Enquete não encontrada.', 'erro');
    if (e.autor !== i.user.id && !ehStaff(i.member)) return responder(i, 'Só quem criou ou a equipe pode encerrar.', 'erro');
    await encerrar(i.client, i.guildId, id);
    return responder(i, 'Enquete encerrada.', 'sucesso');
  },
};

const componentes = {
  async eq(i, [acao, num]) {
    if (acao !== 'votar') return;
    const e = enquetes.ler(i.guildId, i.message.id);
    if (!e || e.encerrada) return responder(i, 'Esta enquete já foi encerrada.', 'aviso');
    const n = Number(num);
    const id = i.user.id;
    const jaVotou = e.votos[n].includes(id);
    if (!e.multipla) e.votos = e.votos.map((v) => v.filter((x) => x !== id));
    else e.votos[n] = e.votos[n].filter((x) => x !== id);
    if (!jaVotou) e.votos[n].push(id);
    enquetes.salvar();
    await i.update(montar(i.guildId, e));
  },
};

export default {
  id: 'enquetes',
  nome: 'Enquetes',
  comandos: [enquete, encerrarCmd],
  componentes,
  // confere a cada 20 s se alguma enquete passou do horário
  aoIniciar(client) {
    const checar = async () => {
      const agora = Date.now();
      for (const [guildId, lista] of Object.entries(enquetes.raiz)) {
        for (const [msgId, e] of Object.entries(lista)) {
          if (!e.encerrada && e.fim && e.fim <= agora) await encerrar(client, guildId, msgId);
          // limpa enquetes encerradas há mais de 30 dias
          if (e.encerrada && agora - (e.encerradaEm ?? e.fim ?? agora) > 30 * 86_400_000) delete lista[msgId];
        }
      }
    };
    checar();
    setInterval(checar, 20_000);
  },
};

