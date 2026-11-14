import { ActionRowBuilder, ButtonBuilder, ButtonStyle, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { embed, responder, lerDuracao, barra, ts, cortar, ehStaff } from '../core/util.js';
import { textos, visuais, botoes } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('enquetes', {
  ninguem_votou: 'Ninguém votou.',
  empate_entre: 'Empate entre {lideres}',
  vencedora: 'Vencedora: {lideres}',
  coloque_pelo_menos_opcoes: ['Coloque pelo menos 2 opções separadas por **|**.', 'resposta'],
  duracao_invalida_ex_30m: ['Duração inválida (ex.: 30m, 1h, 2d; máximo 30d).', 'resposta'],
  enquete_encontrada: ['Enquete não encontrada.', 'resposta'],
  so_quem_criou_ou: ['Só quem criou ou a equipe pode encerrar.', 'resposta'],
  enquete_encerrada: ['Enquete encerrada.', 'resposta'],
  esta_enquete_ja_foi: ['Esta enquete já foi encerrada.', 'resposta'],
  enquetes: 'Enquetes',
  pode_votar_mais: ' · pode votar em mais de uma',
  voto: ['{total} voto(s){multipla}', 'rodape'],
  encerrada: ['Encerrada', 'campo'],
  termina: ['Termina', 'campo'],
});

// Botões (texto, emoji e cor personalizáveis; alguns podem ser escondidos)
const bt = botoes('enquetes', {
  votar: { nome: 'Botões das opções', estilo: 'Secondary', rotuloInfo: 'O texto é a opção da enquete e o emoji é a letra (🇦, 🇧…). Aqui você muda a cor.', emojiFixo: true },
});

// Aparência dos embeds principais (cor, imagem, miniatura e rodapé personalizáveis)
const vis = visuais('enquetes', {
  enquete: { nome: "Mensagem da enquete", vars: [] },
});

/**
 * Enquetes: até 5 opções com botões, resultado ao vivo e encerramento automático.
 * Cada pessoa vota uma vez (pode trocar o voto) ou várias, se a enquete permitir.
 */

const enquetes = colecao('enquetes');
const LETRAS = ['🇦', '🇧', '🇨', '🇩', '🇪'];

function resultado(e, total) {
  if (!total) return tx('ninguem_votou');
  const maior = Math.max(...e.votos.map((v) => v.length));
  const lideres = e.opcoes.filter((_, n) => e.votos[n].length === maior).map((op) => `**${op}**`);
  return lideres.length > 1 ? tx('empate_entre', { lideres: lideres.join(' e ') }) : tx('vencedora', { lideres: lideres[0] });
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
    .setFooter({ text: tx('voto', { total, multipla: e.multipla ? tx('pode_votar_mais') : '' }) });
  vis(emb, 'enquete', {});
  if (encerrada) emb.addFields({ name: tx('encerrada'), value: resultado(e, total) });
  else if (e.fim) emb.addFields({ name: tx('termina'), value: ts(e.fim) });
  const row = new ActionRowBuilder().addComponents(
    e.opcoes.map((op, n) =>
      bt('votar', { rotulo: cortar(op, 70), emoji: LETRAS[n] }).setCustomId(`eq:votar:${n}`).setDisabled(encerrada)
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
    if (opcoes.length < 2) return responder(i, tx('coloque_pelo_menos_opcoes'), 'erro');
    const d = i.options.getString('duracao');
    const ms = d ? lerDuracao(d) : null;
    if (d && (!ms || ms > 30 * 86_400_000)) return responder(i, tx('duracao_invalida_ex_30m'), 'erro');

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
    if (!e) return responder(i, tx('enquete_encontrada'), 'erro');
    if (e.autor !== i.user.id && !ehStaff(i.member)) return responder(i, tx('so_quem_criou_ou'), 'erro');
    await encerrar(i.client, i.guildId, id);
    return responder(i, tx('enquete_encerrada'), 'sucesso');
  },
};

const componentes = {
  async eq(i, [acao, num]) {
    if (acao !== 'votar') return;
    const e = enquetes.ler(i.guildId, i.message.id);
    if (!e || e.encerrada) return responder(i, tx('esta_enquete_ja_foi'), 'aviso');
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
  nome: tx('enquetes'),
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

