import { ChannelType, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, embed, responder, preencher, barra, fmt, sorteio, foiRemovida } from '../core/util.js';

/**
 * Níveis: membros ganham XP conversando (com intervalo para não valer flood),
 * sobem de nível, recebem cargos de recompensa e aparecem no ranking.
 */

const xpDb = colecao('niveis');
const PADRAO = {
  ativo: true,
  xpMin: 15,
  xpMax: 25,
  intervalo: 60, // segundos entre mensagens que valem XP
  canal: null, // null = avisa no mesmo canal
  mensagem: '🎉 {usuario} subiu para o **nível {nivel}**!',
  recompensas: {}, // nivel -> cargoId
  ignorados: [],
};
const cfg = (guildId) => ajustes(guildId, 'niveis', PADRAO);

/** XP para passar do nível n para o n+1. */
export const xpDoNivel = (n) => 5 * n * n + 50 * n + 100;

function nivelDe(xpTotal) {
  let nivel = 0;
  let resto = xpTotal;
  while (resto >= xpDoNivel(nivel)) {
    resto -= xpDoNivel(nivel);
    nivel++;
  }
  return { nivel, atual: resto, precisa: xpDoNivel(nivel) };
}

function ranking(guildId) {
  const g = xpDb.ler(guildId) ?? {};
  return Object.entries(g)
    .filter(([, d]) => d.xp > 0)
    .sort((a, b) => b[1].xp - a[1].xp);
}

async function darRecompensas(member, nivel) {
  const c = cfg(member.guild.id);
  const cargos = Object.entries(c.recompensas)
    .filter(([n]) => Number(n) <= nivel)
    .map(([, id]) => id)
    .filter((id) => !member.roles.cache.has(id) && member.guild.roles.cache.get(id)?.editable);
  if (cargos.length) await member.roles.add(cargos, `Recompensa de nível ${nivel}`).catch(() => {});
}

async function aoMensagem(msg) {
  if (!msg.inGuild() || msg.author.bot || !msg.member) return;
  if (foiRemovida(msg.id)) return; // apagada pelo AutoMod: não vale XP
  const c = cfg(msg.guildId);
  if (!c.ativo || c.ignorados.includes(msg.channelId)) return;

  const d = xpDb.de(msg.guildId, msg.author.id);
  const agora = Date.now();
  if (d.ultima && agora - d.ultima < c.intervalo * 1000) return;
  d.ultima = agora;
  const antes = nivelDe(d.xp ?? 0).nivel;
  d.xp = (d.xp ?? 0) + sorteio(c.xpMin, c.xpMax);
  xpDb.salvar();

  const depois = nivelDe(d.xp).nivel;
  if (depois <= antes) return;
  await darRecompensas(msg.member, depois);
  const canal = (c.canal && msg.guild.channels.cache.get(c.canal)) || msg.channel;
  const texto = preencher(c.mensagem, { usuario: `${msg.author}`, nome: msg.member.displayName, nivel: depois, servidor: msg.guild.name });
  await canal.send({ content: texto, allowedMentions: { users: [msg.author.id] } }).catch(() => {});
}

// ---------------- comandos ----------------
const rank = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription('Mostra o seu nível e XP')
    .addUserOption((o) => o.setName('usuario').setDescription('Ver de outra pessoa')),
  async executar(i) {
    const user = i.options.getUser('usuario') ?? i.user;
    const xp = xpDb.ler(i.guildId, user.id)?.xp ?? 0;
    const { nivel, atual, precisa } = nivelDe(xp);
    const pos = ranking(i.guildId).findIndex(([id]) => id === user.id) + 1;
    await i.reply({
      embeds: [
        embed(i.guildId)
          .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
          .setThumbnail(user.displayAvatarURL({ size: 256 }))
          .addFields(
            { name: 'Nível', value: `**${nivel}**`, inline: true },
            { name: 'Posição', value: pos ? `#${pos}` : '—', inline: true },
            { name: 'XP total', value: fmt(xp), inline: true },
            { name: `Progresso para o nível ${nivel + 1}`, value: `${barra(atual / precisa, 14)}  ${fmt(atual)}/${fmt(precisa)} XP` },
          ),
      ],
    });
  },
};

const top = {
  data: new SlashCommandBuilder().setName('top').setDescription('Ranking de XP do servidor'),
  async executar(i) {
    const lista = ranking(i.guildId).slice(0, 10);
    if (!lista.length) return responder(i, 'Ninguém ganhou XP ainda. Converse no chat!', 'info');
    const medalhas = ['🥇', '🥈', '🥉'];
    const linhas = lista.map(([id, d], n) => `${medalhas[n] ?? `**${n + 1}.**`} <@${id}> · nível **${nivelDe(d.xp).nivel}** · ${fmt(d.xp)} XP`);
    const minha = ranking(i.guildId).findIndex(([id]) => id === i.user.id) + 1;
    await i.reply({
      embeds: [
        embed(i.guildId)
          .setTitle(`🏆 Ranking de ${i.guild.name}`)
          .setDescription(linhas.join('\n'))
          .setFooter({ text: minha ? `Sua posição: #${minha}` : 'Você ainda não tem XP' }),
      ],
      allowedMentions: { parse: [] },
    });
  },
};

const xpAdmin = {
  data: new SlashCommandBuilder()
    .setName('xp')
    .setDescription('Gerencia o XP dos membros')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('dar')
        .setDescription('Dá XP a um membro')
        .addUserOption((o) => o.setName('usuario').setDescription('Quem').setRequired(true))
        .addIntegerOption((o) => o.setName('quantidade').setDescription('Quanto XP').setRequired(true).setMinValue(1).setMaxValue(1_000_000))
    )
    .addSubcommand((s) =>
      s
        .setName('tirar')
        .setDescription('Tira XP de um membro')
        .addUserOption((o) => o.setName('usuario').setDescription('Quem').setRequired(true))
        .addIntegerOption((o) => o.setName('quantidade').setDescription('Quanto XP').setRequired(true).setMinValue(1).setMaxValue(1_000_000))
    )
    .addSubcommand((s) => s.setName('zerar').setDescription('Zera o XP de um membro').addUserOption((o) => o.setName('usuario').setDescription('Quem').setRequired(true))),
  async executar(i) {
    const sub = i.options.getSubcommand();
    const user = i.options.getUser('usuario');
    if (user.bot) return responder(i, 'Bots não têm XP.', 'erro');
    const d = xpDb.de(i.guildId, user.id);
    const q = i.options.getInteger('quantidade') ?? 0;
    if (sub === 'dar') d.xp = (d.xp ?? 0) + q;
    if (sub === 'tirar') d.xp = Math.max(0, (d.xp ?? 0) - q);
    if (sub === 'zerar') d.xp = 0;
    xpDb.salvar();
    const { nivel } = nivelDe(d.xp);
    const membro = i.options.getMember('usuario');
    if (membro) await darRecompensas(membro, nivel);
    return responder(i, `**${user.tag}** agora tem **${fmt(d.xp)} XP** (nível ${nivel}).`, 'sucesso');
  },
};

// ---------------- /config niveis ----------------
const config = {
  grupo: 'niveis',
  montar: (g) =>
    g
      .setDescription('Sistema de níveis e XP')
      .addSubcommand((s) => s.setName('ativar').setDescription('Liga ou desliga o ganho de XP').addBooleanOption((o) => o.setName('ligado').setDescription('Ligado?').setRequired(true)))
      .addSubcommand((s) =>
        s
          .setName('aviso')
          .setDescription('Onde e como avisar quando alguém sobe de nível')
          .addChannelOption((o) => o.setName('canal').setDescription('Vazio = no mesmo canal da mensagem').addChannelTypes(ChannelType.GuildText))
          .addStringOption((o) => o.setName('mensagem').setDescription('Variáveis: {usuario} {nome} {nivel} {servidor}').setMaxLength(500))
      )
      .addSubcommand((s) =>
        s
          .setName('recompensa')
          .setDescription('Cargo ganho ao chegar num nível (sem cargo = remove a recompensa)')
          .addIntegerOption((o) => o.setName('nivel').setDescription('Nível').setRequired(true).setMinValue(1).setMaxValue(500))
          .addRoleOption((o) => o.setName('cargo').setDescription('Cargo'))
      )
      .addSubcommand((s) =>
        s
          .setName('xp')
          .setDescription('XP por mensagem e intervalo')
          .addIntegerOption((o) => o.setName('minimo').setDescription('XP mínimo por mensagem').setRequired(true).setMinValue(1).setMaxValue(500))
          .addIntegerOption((o) => o.setName('maximo').setDescription('XP máximo por mensagem').setRequired(true).setMinValue(1).setMaxValue(500))
          .addIntegerOption((o) => o.setName('intervalo').setDescription('Segundos entre mensagens que valem XP (padrão 60)').setMinValue(0).setMaxValue(3600))
      )
      .addSubcommand((s) =>
        s
          .setName('ignorar-canal')
          .setDescription('Canal onde não se ganha XP (usar de novo remove)')
          .addChannelOption((o) => o.setName('canal').setDescription('Canal').setRequired(true).addChannelTypes(ChannelType.GuildText))
      ),
  async executar(i, sub) {
    const c = cfg(i.guildId);
    let msg;
    if (sub === 'ativar') {
      c.ativo = i.options.getBoolean('ligado');
      msg = c.ativo ? 'Ganho de XP ligado.' : 'Ganho de XP desligado.';
    } else if (sub === 'aviso') {
      const canal = i.options.getChannel('canal');
      c.canal = canal?.id ?? null;
      const m = i.options.getString('mensagem');
      if (m) c.mensagem = m;
      msg = `Aviso de nível ${canal ? `em ${canal}` : 'no mesmo canal da mensagem'}.`;
    } else if (sub === 'recompensa') {
      const n = i.options.getInteger('nivel');
      const r = i.options.getRole('cargo');
      if (r) {
        if (r.managed || r.id === i.guildId) return responder(i, 'Esse cargo não pode ser dado.', 'erro');
        c.recompensas[n] = r.id;
        msg = `Ao chegar no nível **${n}**, o membro ganha ${r}.${r.editable ? '' : ' ⚠️ Suba o meu cargo acima dele para funcionar.'}`;
      } else {
        delete c.recompensas[n];
        msg = `Recompensa do nível ${n} removida.`;
      }
    } else if (sub === 'xp') {
      const min = i.options.getInteger('minimo');
      const max = i.options.getInteger('maximo');
      if (min > max) return responder(i, 'O mínimo não pode ser maior que o máximo.', 'erro');
      c.xpMin = min;
      c.xpMax = max;
      const iv = i.options.getInteger('intervalo');
      if (iv !== null) c.intervalo = iv;
      msg = `Cada mensagem vale de **${min} a ${max} XP**, uma vez a cada **${c.intervalo}s**.`;
    } else if (sub === 'ignorar-canal') {
      const ch = i.options.getChannel('canal');
      const idx = c.ignorados.indexOf(ch.id);
      if (idx >= 0) c.ignorados.splice(idx, 1);
      else c.ignorados.push(ch.id);
      msg = idx >= 0 ? `${ch} volta a dar XP.` : `${ch} não dá mais XP.`;
    }
    salvarAjustes();
    return responder(i, msg, 'sucesso');
  },
  resumo(guild) {
    const c = cfg(guild.id);
    const rec = Object.entries(c.recompensas).sort((a, b) => a[0] - b[0]).map(([n, r]) => `${n}: <@&${r}>`);
    return [
      `Ganho de XP: ${c.ativo ? `ligado (${c.xpMin}–${c.xpMax} XP a cada ${c.intervalo}s)` : 'desligado'}`,
      `Aviso: ${c.canal ? `<#${c.canal}>` : 'no mesmo canal'}`,
      `Recompensas: ${rec.length ? rec.join(' · ') : 'nenhuma'}`,
    ];
  },
};

export default {
  id: 'niveis',
  nome: 'Níveis',
  intents: [GatewayIntentBits.GuildMessages],
  permissoes: [PermissionFlagsBits.ManageRoles],
  comandos: [rank, top, xpAdmin],
  eventos: { messageCreate: aoMensagem },
  config,
};
