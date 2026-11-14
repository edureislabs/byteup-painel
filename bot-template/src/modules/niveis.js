import { ChannelType, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, embed, responder, preencher, barra, fmt, sorteio, foiRemovida, imagens } from '../core/util.js';
import { textos, modeloOu, visuais } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('niveis', {
  msg_nivel_padrao: '🎉 {usuario} subiu para o **nível {nivel}**!',
  nivel: ['Nível', 'campo'],
  posicao: ['Posição', 'campo'],
  xp_total: ['XP total', 'campo'],
  progresso_nivel: ['Progresso para o nível {nivel}', 'campo'],
  xp: '{barra}  {atual}/{precisa} XP',
  ninguem_ganhou_xp_ainda: ['Ninguém ganhou XP ainda. Converse no chat!', 'resposta'],
  nivel_xp: '{medalhas} <@{usuario}> · nível **{nivel}** · {xp} XP',
  ranking: ['🏆 Ranking de {servidor}', 'titulo'],
  sua_posicao: 'Sua posição: #{posicao}',
  voce_ainda_tem_xp: 'Você ainda não tem XP',
  bots_tem_xp: ['Bots não têm XP.', 'resposta'],
  agora_tem_xp_nivel: ['**{tag}** agora tem **{xp} XP** (nível {nivel}).', 'resposta'],
  ganho_xp_ligado: 'Ganho de XP ligado.',
  ganho_xp_desligado: 'Ganho de XP desligado.',
  em: 'em {canal}',
  mesmo_canal_mensagem: 'no mesmo canal da mensagem',
  aviso_nivel: 'Aviso de nível {canal}.',
  esse_cargo_pode_ser: ['Esse cargo não pode ser dado.', 'resposta'],
  suba_meu_cargo_acima: ' ⚠️ Suba o meu cargo acima dele para funcionar.',
  chegar_nivel_membro_ganha: 'Ao chegar no nível **{nivel}**, o membro ganha {cargo}.{aviso}',
  recompensa_nivel_removida: 'Recompensa do nível {nivel} removida.',
  minimo_pode_ser_maior: ['O mínimo não pode ser maior que o máximo.', 'resposta'],
  cada_mensagem_vale_xp: 'Cada mensagem vale de **{min} a {max} XP**, uma vez a cada **{intervalo}s**.',
  volta_dar_xp: '{canal} volta a dar XP.',
  mais_xp: '{canal} não dá mais XP.',
  ligado_xp_cada: 'ligado ({xpMin}–{xpMax} XP a cada {intervalo}s)',
  desligado: 'desligado',
  ganho_xp: 'Ganho de XP: {xpMin}',
  mesmo_canal: 'no mesmo canal',
  aviso: 'Aviso: {canal}',
  nenhuma: 'nenhuma',
  recompensas: 'Recompensas: {recompensas}',
  niveis: 'Níveis',
});

// Aparência dos embeds principais (cor, imagem, miniatura e rodapé personalizáveis)
const vis = visuais('niveis', {
  rank: { nome: "/rank (nível do membro)", vars: ['avatar', 'servidor_icone'], miniatura: "{avatar}" },
});

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
  mensagem: null,
  recompensas: {}, // nivel -> cargoId
  ignorados: [],
};
const cfg = (guildId) => ajustes(guildId, 'niveis', PADRAO);
const msgNivel = (c) => modeloOu(c.mensagem, '🎉 {usuario} subiu para o **nível {nivel}**!', tx('msg_nivel_padrao'));

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
  const texto = preencher(msgNivel(c), { usuario: `${msg.author}`, nome: msg.member.displayName, nivel: depois, servidor: msg.guild.name });
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
        vis(
          embed(i.guildId)
            .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
            .setThumbnail(user.displayAvatarURL({ size: 256 }))
            .addFields(
              { name: tx('nivel'), value: `**${nivel}**`, inline: true },
              { name: tx('posicao'), value: pos ? `#${pos}` : '—', inline: true },
              { name: tx('xp_total'), value: fmt(xp), inline: true },
              { name: tx('progresso_nivel', { nivel: nivel + 1 }), value: tx('xp', { barra: barra(atual / precisa, 14), atual: fmt(atual), precisa: fmt(precisa) }) },
            ),
          'rank',
          imagens({ user, guild: i.guild }),
        ),
      ],
    });
  },
};

const top = {
  data: new SlashCommandBuilder().setName('top').setDescription('Ranking de XP do servidor'),
  async executar(i) {
    const lista = ranking(i.guildId).slice(0, 10);
    if (!lista.length) return responder(i, tx('ninguem_ganhou_xp_ainda'), 'info');
    const medalhas = ['🥇', '🥈', '🥉'];
    const linhas = lista.map(([id, d], n) => tx('nivel_xp', { medalhas: medalhas[n] ?? `**${n + 1}.**`, usuario: id, nivel: nivelDe(d.xp).nivel, xp: fmt(d.xp) }));
    const minha = ranking(i.guildId).findIndex(([id]) => id === i.user.id) + 1;
    await i.reply({
      embeds: [
        embed(i.guildId)
          .setTitle(tx('ranking', { servidor: i.guild.name }))
          .setDescription(linhas.join('\n'))
          .setFooter({ text: minha ? tx('sua_posicao', { posicao: minha }) : tx('voce_ainda_tem_xp') }),
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
    if (user.bot) return responder(i, tx('bots_tem_xp'), 'erro');
    const d = xpDb.de(i.guildId, user.id);
    const q = i.options.getInteger('quantidade') ?? 0;
    if (sub === 'dar') d.xp = (d.xp ?? 0) + q;
    if (sub === 'tirar') d.xp = Math.max(0, (d.xp ?? 0) - q);
    if (sub === 'zerar') d.xp = 0;
    xpDb.salvar();
    const { nivel } = nivelDe(d.xp);
    const membro = i.options.getMember('usuario');
    if (membro) await darRecompensas(membro, nivel);
    return responder(i, tx('agora_tem_xp_nivel', { tag: user.tag, xp: fmt(d.xp), nivel }), 'sucesso');
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
      msg = c.ativo ? tx('ganho_xp_ligado') : tx('ganho_xp_desligado');
    } else if (sub === 'aviso') {
      const canal = i.options.getChannel('canal');
      c.canal = canal?.id ?? null;
      const m = i.options.getString('mensagem');
      if (m) c.mensagem = m;
      msg = tx('aviso_nivel', { canal: canal ? tx('em', { canal }) : tx('mesmo_canal_mensagem') });
    } else if (sub === 'recompensa') {
      const n = i.options.getInteger('nivel');
      const r = i.options.getRole('cargo');
      if (r) {
        if (r.managed || r.id === i.guildId) return responder(i, tx('esse_cargo_pode_ser'), 'erro');
        c.recompensas[n] = r.id;
        msg = tx('chegar_nivel_membro_ganha', { nivel: n, cargo: r, aviso: r.editable ? '' : tx('suba_meu_cargo_acima') });
      } else {
        delete c.recompensas[n];
        msg = tx('recompensa_nivel_removida', { nivel: n });
      }
    } else if (sub === 'xp') {
      const min = i.options.getInteger('minimo');
      const max = i.options.getInteger('maximo');
      if (min > max) return responder(i, tx('minimo_pode_ser_maior'), 'erro');
      c.xpMin = min;
      c.xpMax = max;
      const iv = i.options.getInteger('intervalo');
      if (iv !== null) c.intervalo = iv;
      msg = tx('cada_mensagem_vale_xp', { min, max, intervalo: c.intervalo });
    } else if (sub === 'ignorar-canal') {
      const ch = i.options.getChannel('canal');
      const idx = c.ignorados.indexOf(ch.id);
      if (idx >= 0) c.ignorados.splice(idx, 1);
      else c.ignorados.push(ch.id);
      msg = idx >= 0 ? tx('volta_dar_xp', { canal: ch }) : tx('mais_xp', { canal: ch });
    }
    salvarAjustes();
    return responder(i, msg, 'sucesso');
  },
  resumo(guild) {
    const c = cfg(guild.id);
    const rec = Object.entries(c.recompensas).sort((a, b) => a[0] - b[0]).map(([n, r]) => `${n}: <@&${r}>`);
    return [
      tx('ganho_xp', { xpMin: c.ativo ? tx('ligado_xp_cada', { xpMin: c.xpMin, xpMax: c.xpMax, intervalo: c.intervalo }) : tx('desligado') }),
      tx('aviso', { canal: c.canal ? `<#${c.canal}>` : tx('mesmo_canal') }),
      tx('recompensas', { recompensas: rec.length ? rec.join(' · ') : tx('nenhuma') }),
    ];
  },
};

export default {
  id: 'niveis',
  nome: tx('niveis'),
  intents: [GatewayIntentBits.GuildMessages],
  permissoes: [PermissionFlagsBits.ManageRoles],
  comandos: [rank, top, xpAdmin],
  eventos: { messageCreate: aoMensagem },
  config,
};
