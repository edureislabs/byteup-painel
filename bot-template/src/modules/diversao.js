import { SlashCommandBuilder } from 'discord.js';
import { embed, responder, sorteio, barra } from '../core/util.js';
import { textos } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('diversao', {
  cara: 'Cara',
  coroa: 'Coroa',
  moeda_girou_girou_deu: ['🪙 A moeda girou, girou… e deu **{lado}**!', 'descricao'],
  saiu: 'Saiu **{total}**!',
  certeza: 'Com certeza!',
  sem_duvida: 'Sem dúvida.',
  pode_apostar: 'Pode apostar.',
  sim: 'Sim.',
  tudo_indica_sim: 'Tudo indica que sim.',
  parece_sim: 'Parece que sim.',
  pergunta_novo_mais_tarde: 'Pergunta de novo mais tarde.',
  melhor_te_contar_agora: 'Melhor não te contar agora.',
  consigo_prever_agora: 'Não consigo prever agora.',
  concentra_pergunta_novo: 'Concentra e pergunta de novo.',
  nem_pensar: 'Nem pensar.',
  minha_resposta: 'Minha resposta é não.',
  minhas_fontes_dizem: 'Minhas fontes dizem que não.',
  acho_dificil: 'Acho difícil.',
  muito_duvidoso: 'Muito duvidoso.',
  bola: ['🎱 Bola 8', 'titulo'],
  pergunta: ['Pergunta', 'campo'],
  resposta: ['Resposta', 'campo'],
  coloque_pelo_menos_opcoes: ['Coloque pelo menos 2 opções separadas por **|**.', 'resposta'],
  entre_eu_escolho: ['🤔 Entre {opcoes}…\nEu escolho: **{escolha}**!', 'descricao'],
  casal_perfeito: 'Casal perfeito! 💞',
  tem_muito_futuro: 'Tem muito futuro! 💖',
  pode_dar_certo: 'Pode dar certo… 💗',
  melhor_como_amigos: 'Melhor como amigos. 🤝',
  nem_tenta: 'Nem tenta. 💔',
  diversao: 'Diversão',
});

/** Diversão: cara ou coroa, dados, bola 8, escolher e ship. Nada depende de sites de fora. */

const caracoroa = {
  data: new SlashCommandBuilder().setName('caracoroa').setDescription('Joga uma moeda'),
  async executar(i) {
    const lado = Math.random() < 0.5 ? tx('cara') : tx('coroa');
    await i.reply({ embeds: [embed(i.guildId).setDescription(tx('moeda_girou_girou_deu', { lado }))] });
  },
};

const dado = {
  data: new SlashCommandBuilder()
    .setName('dado')
    .setDescription('Rola dados')
    .addIntegerOption((o) => o.setName('lados').setDescription('Lados de cada dado (padrão 6)').setMinValue(2).setMaxValue(1000))
    .addIntegerOption((o) => o.setName('quantidade').setDescription('Quantos dados (padrão 1)').setMinValue(1).setMaxValue(20)),
  async executar(i) {
    const lados = i.options.getInteger('lados') ?? 6;
    const qtd = i.options.getInteger('quantidade') ?? 1;
    const r = Array.from({ length: qtd }, () => sorteio(1, lados));
    const total = r.reduce((a, b) => a + b, 0);
    await i.reply({
      embeds: [embed(i.guildId).setTitle(`🎲 ${qtd}d${lados}`).setDescription(qtd > 1 ? `${r.map((n) => `\`${n}\``).join(' + ')} = **${total}**` : tx('saiu', { total }))],
    });
  },
};

const RESPOSTAS = [
  tx('certeza'), tx('sem_duvida'), tx('pode_apostar'), tx('sim'), tx('tudo_indica_sim'), tx('parece_sim'),
  tx('pergunta_novo_mais_tarde'), tx('melhor_te_contar_agora'), tx('consigo_prever_agora'), tx('concentra_pergunta_novo'),
  tx('nem_pensar'), tx('minha_resposta'), tx('minhas_fontes_dizem'), tx('acho_dificil'), tx('muito_duvidoso'),
];
const bola8 = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Faça uma pergunta de sim ou não para a bola 8')
    .addStringOption((o) => o.setName('pergunta').setDescription('A pergunta').setRequired(true).setMaxLength(200)),
  async executar(i) {
    await i.reply({
      embeds: [embed(i.guildId).setTitle(tx('bola')).addFields({ name: tx('pergunta'), value: i.options.getString('pergunta') }, { name: tx('resposta'), value: RESPOSTAS[sorteio(0, RESPOSTAS.length - 1)] })],
    });
  },
};

const escolher = {
  data: new SlashCommandBuilder()
    .setName('escolher')
    .setDescription('O bot escolhe por você')
    .addStringOption((o) => o.setName('opcoes').setDescription('Opções separadas por | (ex.: pizza | hambúrguer | sushi)').setRequired(true).setMaxLength(500)),
  async executar(i) {
    const ops = i.options.getString('opcoes').split('|').map((s) => s.trim()).filter(Boolean);
    if (ops.length < 2) return responder(i, tx('coloque_pelo_menos_opcoes'), 'erro');
    await i.reply({ embeds: [embed(i.guildId).setDescription(tx('entre_eu_escolho', { opcoes: ops.map((o) => `**${o}**`).join(', '), escolha: ops[sorteio(0, ops.length - 1)] }))] });
  },
};

// o resultado é sempre o mesmo para o mesmo par (não muda a cada vez)
function porcentagem(a, b) {
  const [x, y] = [a, b].sort();
  let h = 0;
  for (const ch of `${x}:${y}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return h % 101;
}
const ship = {
  data: new SlashCommandBuilder()
    .setName('ship')
    .setDescription('Calcula a compatibilidade entre duas pessoas')
    .addUserOption((o) => o.setName('pessoa1').setDescription('Primeira pessoa').setRequired(true))
    .addUserOption((o) => o.setName('pessoa2').setDescription('Segunda pessoa (padrão: você)')),
  async executar(i) {
    const a = i.options.getUser('pessoa1');
    const b = i.options.getUser('pessoa2') ?? i.user;
    const p = porcentagem(a.id, b.id);
    const nome = a.username.slice(0, Math.ceil(a.username.length / 2)) + b.username.slice(Math.floor(b.username.length / 2));
    const frase = p >= 90 ? tx('casal_perfeito') : p >= 70 ? tx('tem_muito_futuro') : p >= 45 ? tx('pode_dar_certo') : p >= 20 ? tx('melhor_como_amigos') : tx('nem_tenta');
    await i.reply({
      embeds: [embed(i.guildId).setTitle(`💘 ${a.username} + ${b.username}`).setDescription(`**${nome}**\n${barra(p / 100, 14)} **${p}%**\n${frase}`)],
    });
  },
};

export default {
  id: 'diversao',
  nome: tx('diversao'),
  comandos: [caracoroa, dado, bola8, escolher, ship],
};
