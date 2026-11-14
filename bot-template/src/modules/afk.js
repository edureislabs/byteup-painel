import { GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { embed, responder, cortar, duracaoTexto, foiRemovida } from '../core/util.js';
import { textos } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('afk', {
  afk: '[AFK] ',
  em: '• <@{por}> em {link}',
  te_chamaram_vez_es: '\nTe chamaram {vezes} vez(es):\n{lista}',
  bem_vindo_volta_voce: '👋 Bem-vindo(a) de volta, {autor}! Você ficou AFK por **{duracao}**.{chamados}',
  esta_afk: ['💤 <@{usuario}> está AFK{motivo} · <t:{desde}:R>', 'conteudo'],
  voce_esta_afk_quando: ['Você está AFK{motivo}. Quando mandar uma mensagem, o AFK sai sozinho.', 'resposta'],
  afk_2: 'AFK',
});

/**
 * AFK: /afk motivo. Quem marcar você recebe o aviso.
 * Quando você volta a falar, o AFK sai sozinho e o bot mostra quem te chamou.
 */

const afks = colecao('afk'); // guild -> user -> { motivo, desde, apelido, chamados: [] }
const avisados = new Map(); // anti-spam: "canal:user" -> quando avisou
const PREFIXO = tx('afk');

async function aoMensagem(msg) {
  if (!msg.inGuild() || msg.author.bot || foiRemovida(msg.id)) return;

  // 1) quem estava AFK voltou
  const meu = afks.ler(msg.guildId, msg.author.id);
  if (meu && Date.now() - meu.desde > 5000) {
    afks.apagar(msg.guildId, msg.author.id);
    if (msg.member?.manageable && msg.member.nickname?.startsWith(PREFIXO)) {
      await msg.member.setNickname(meu.apelido ?? null, 'Voltou do AFK').catch(() => {});
    }
    const chamados = (meu.chamados ?? []).slice(-5);
    const texto = tx('bem_vindo_volta_voce', { autor: msg.author, duracao: duracaoTexto(Date.now() - meu.desde), chamados: chamados.length ? tx('te_chamaram_vez_es', { vezes: meu.chamados.length, lista: chamados.map((c) => tx('em', { por: c.por, link: c.link })).join('\n') }) : '' });
    const aviso = await msg.reply({ embeds: [embed(msg.guildId).setDescription(texto)], allowedMentions: { users: [] } }).catch(() => null);
    if (aviso) setTimeout(() => aviso.delete().catch(() => {}), 15_000);
  }

  // 2) alguém marcou (ou respondeu) quem está AFK
  const alvos = new Set(msg.mentions.users.keys());
  if (msg.mentions.repliedUser) alvos.add(msg.mentions.repliedUser.id);
  alvos.delete(msg.author.id);
  for (const id of alvos) {
    const a = afks.ler(msg.guildId, id);
    if (!a) continue;
    (a.chamados ??= []).push({ por: msg.author.id, link: msg.url, em: Date.now() });
    if (a.chamados.length > 20) a.chamados.shift();
    afks.salvar();
    const k = `${msg.channelId}:${id}`;
    if (Date.now() - (avisados.get(k) ?? 0) < 30_000) continue; // um aviso a cada 30 s por canal
    avisados.set(k, Date.now());
    await msg
      .reply({ content: tx('esta_afk', { usuario: id, motivo: a.motivo ? `: ${a.motivo}` : '', desde: Math.floor(a.desde / 1000) }), allowedMentions: { parse: [] } })
      .catch(() => {});
  }
}

const afk = {
  data: new SlashCommandBuilder()
    .setName('afk')
    .setDescription('Avisa que você está ausente')
    .addStringOption((o) => o.setName('motivo').setDescription('Ex.: almoçando, dormindo...').setMaxLength(100)),
  async executar(i) {
    const motivo = (i.options.getString('motivo') ?? '').replace(/@/g, '@​');
    const membro = i.member;
    const apelidoAtual = membro.nickname;
    afks.de(i.guildId)[i.user.id] = { motivo: cortar(motivo, 100), desde: Date.now(), apelido: apelidoAtual ?? null, chamados: [] };
    afks.salvar();
    if (membro.manageable && !(apelidoAtual ?? '').startsWith(PREFIXO)) {
      await membro.setNickname(`${PREFIXO}${membro.displayName}`.slice(0, 32), 'AFK').catch(() => {});
    }
    return responder(i, tx('voce_esta_afk_quando', { motivo: motivo ? `: ${motivo}` : '' }), 'sucesso');
  },
};

export default {
  id: 'afk',
  nome: tx('afk_2'),
  intents: [GatewayIntentBits.GuildMessages],
  permissoes: [PermissionFlagsBits.ManageNicknames],
  comandos: [afk],
  eventos: { messageCreate: aoMensagem },
};
