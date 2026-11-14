import { GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { embed, responder, cortar, duracaoTexto, foiRemovida } from '../core/util.js';

/**
 * AFK: /afk motivo. Quem marcar você recebe o aviso.
 * Quando você volta a falar, o AFK sai sozinho e o bot mostra quem te chamou.
 */

const afks = colecao('afk'); // guild -> user -> { motivo, desde, apelido, chamados: [] }
const avisados = new Map(); // anti-spam: "canal:user" -> quando avisou
const PREFIXO = '[AFK] ';

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
    const texto = `👋 Bem-vindo(a) de volta, ${msg.author}! Você ficou AFK por **${duracaoTexto(Date.now() - meu.desde)}**.${
      chamados.length ? `\nTe chamaram ${meu.chamados.length} vez(es):\n${chamados.map((c) => `• <@${c.por}> em ${c.link}`).join('\n')}` : ''
    }`;
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
      .reply({ content: `💤 <@${id}> está AFK${a.motivo ? `: ${a.motivo}` : ''} · <t:${Math.floor(a.desde / 1000)}:R>`, allowedMentions: { parse: [] } })
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
    return responder(i, `Você está AFK${motivo ? `: ${motivo}` : ''}. Quando mandar uma mensagem, o AFK sai sozinho.`, 'sucesso');
  },
};

export default {
  id: 'afk',
  nome: 'AFK',
  intents: [GatewayIntentBits.GuildMessages],
  permissoes: [PermissionFlagsBits.ManageNicknames],
  comandos: [afk],
  eventos: { messageCreate: aoMensagem },
};
