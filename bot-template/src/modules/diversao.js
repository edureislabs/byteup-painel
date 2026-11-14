import { SlashCommandBuilder } from 'discord.js';
import { embed, responder, sorteio, barra } from '../core/util.js';

/** Diversão: cara ou coroa, dados, bola 8, escolher e ship. Nada depende de sites de fora. */

const caracoroa = {
  data: new SlashCommandBuilder().setName('caracoroa').setDescription('Joga uma moeda'),
  async executar(i) {
    const lado = Math.random() < 0.5 ? 'Cara' : 'Coroa';
    await i.reply({ embeds: [embed(i.guildId).setDescription(`🪙 A moeda girou, girou… e deu **${lado}**!`)] });
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
      embeds: [embed(i.guildId).setTitle(`🎲 ${qtd}d${lados}`).setDescription(qtd > 1 ? `${r.map((n) => `\`${n}\``).join(' + ')} = **${total}**` : `Saiu **${total}**!`)],
    });
  },
};

const RESPOSTAS = [
  'Com certeza!', 'Sem dúvida.', 'Pode apostar.', 'Sim.', 'Tudo indica que sim.', 'Parece que sim.',
  'Pergunta de novo mais tarde.', 'Melhor não te contar agora.', 'Não consigo prever agora.', 'Concentra e pergunta de novo.',
  'Nem pensar.', 'Minha resposta é não.', 'Minhas fontes dizem que não.', 'Acho difícil.', 'Muito duvidoso.',
];
const bola8 = {
  data: new SlashCommandBuilder()
    .setName('8ball')
    .setDescription('Faça uma pergunta de sim ou não para a bola 8')
    .addStringOption((o) => o.setName('pergunta').setDescription('A pergunta').setRequired(true).setMaxLength(200)),
  async executar(i) {
    await i.reply({
      embeds: [embed(i.guildId).setTitle('🎱 Bola 8').addFields({ name: 'Pergunta', value: i.options.getString('pergunta') }, { name: 'Resposta', value: RESPOSTAS[sorteio(0, RESPOSTAS.length - 1)] })],
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
    if (ops.length < 2) return responder(i, 'Coloque pelo menos 2 opções separadas por **|**.', 'erro');
    await i.reply({ embeds: [embed(i.guildId).setDescription(`🤔 Entre ${ops.map((o) => `**${o}**`).join(', ')}…\nEu escolho: **${ops[sorteio(0, ops.length - 1)]}**!`)] });
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
    const frase = p >= 90 ? 'Casal perfeito! 💞' : p >= 70 ? 'Tem muito futuro! 💖' : p >= 45 ? 'Pode dar certo… 💗' : p >= 20 ? 'Melhor como amigos. 🤝' : 'Nem tenta. 💔';
    await i.reply({
      embeds: [embed(i.guildId).setTitle(`💘 ${a.username} + ${b.username}`).setDescription(`**${nome}**\n${barra(p / 100, 14)} **${p}%**\n${frase}`)],
    });
  },
};

export default {
  id: 'diversao',
  nome: 'Diversão',
  comandos: [caracoroa, dado, bola8, escolher, ship],
};
