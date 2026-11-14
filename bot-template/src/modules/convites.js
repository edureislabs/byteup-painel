import { ChannelType, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, embed, responder, fmt, preencher } from '../core/util.js';

/**
 * Rastreio de convites: descobre por qual convite cada pessoa entrou e quem convidou.
 * Conta entradas, saídas e contas falsas (muito novas), com ranking.
 * Precisa da "Server Members Intent" e da permissão Gerenciar servidor (para ler os convites).
 */

const dados = colecao('convites'); // guild -> { membros: {userId: {por, codigo, em, saiu}}, contas: {inviterId: {total, saiu, falsos}} }
const PADRAO = { canal: null, mensagem: '📥 {usuario} entrou · convidado(a) por {convidou} ({convites} convite(s))', diasFalso: 7 };
const cfg = (guildId) => ajustes(guildId, 'convites', PADRAO);
const usos = new Map(); // guildId -> Map(codigo -> { usos, dono })
const mapa = (lista) => new Map(lista.map((inv) => [inv.code, { usos: inv.uses ?? 0, dono: inv.inviterId ?? inv.inviter?.id ?? null }]));

async function carregarConvites(guild) {
  if (!guild.members.me?.permissions.has(PermissionFlagsBits.ManageGuild)) return false;
  const lista = await guild.invites.fetch().catch(() => null);
  if (!lista) return false;
  usos.set(guild.id, mapa(lista));
  return true;
}

const conta = (guildId, id) => {
  const c = dados.de(guildId, 'contas', id);
  c.total ??= 0;
  c.saiu ??= 0;
  c.falsos ??= 0;
  return c;
};
const validos = (c) => Math.max(0, (c?.total ?? 0) - (c?.saiu ?? 0) - (c?.falsos ?? 0));

async function aoEntrar(member) {
  if (member.user.bot) return;
  const guild = member.guild;
  const antes = usos.get(guild.id) ?? new Map();
  const agora = await guild.invites.fetch().catch(() => null);
  let codigo = null;
  let por = null;
  if (agora) {
    for (const inv of agora.values()) {
      if ((inv.uses ?? 0) > (antes.get(inv.code)?.usos ?? 0)) {
        codigo = inv.code;
        por = inv.inviterId ?? inv.inviter?.id ?? null;
        break;
      }
    }
    // convite de uso único some depois de usado: o que sumiu da lista foi o usado
    if (!codigo) {
      const sumiu = [...antes.keys()].find((k) => !agora.has(k));
      if (sumiu) {
        codigo = sumiu;
        por = antes.get(sumiu).dono;
      }
    }
    usos.set(guild.id, mapa(agora));
  }
  if (!codigo && guild.vanityURLCode) codigo = 'personalizado';

  const membros = dados.de(guild.id, 'membros');
  const anterior = membros[member.id];
  if (anterior?.saiu && anterior.por) conta(guild.id, anterior.por).saiu = Math.max(0, conta(guild.id, anterior.por).saiu - 1); // voltou
  const falso = Date.now() - member.user.createdTimestamp < cfg(guild.id).diasFalso * 86400e3;
  membros[member.id] = { por, codigo, em: Date.now(), saiu: false, falso };
  if (por && por !== member.id && !(anterior && anterior.por === por)) {
    const c = conta(guild.id, por);
    c.total += 1;
    if (falso) c.falsos += 1;
  }
  dados.salvar();

  const canalId = cfg(guild.id).canal;
  const canal = canalId && guild.channels.cache.get(canalId);
  if (canal?.isTextBased()) {
    const convidou = por ? `<@${por}>` : codigo === 'personalizado' ? 'link personalizado do servidor' : 'convite desconhecido';
    const texto = preencher(cfg(guild.id).mensagem, { usuario: `${member}`, nome: member.displayName, convidou, convites: fmt(validos(dados.ler(guild.id, 'contas', por))), codigo: codigo ?? '?' });
    await canal.send({ content: texto + (falso ? ' ⚠️ conta nova' : ''), allowedMentions: { parse: [] } }).catch(() => {});
  }
}

async function aoSair(member) {
  const m = dados.ler(member.guild.id, 'membros', member.id);
  if (!m || m.saiu) return;
  m.saiu = true;
  if (m.por) conta(member.guild.id, m.por).saiu += 1;
  dados.salvar();
}

const convites = {
  data: new SlashCommandBuilder()
    .setName('convites')
    .setDescription('Quem convidou quem')
    .addSubcommand((s) =>
      s
        .setName('ver')
        .setDescription('Convites de alguém')
        .addUserOption((o) => o.setName('usuario').setDescription('De quem (padrão: você)'))
    )
    .addSubcommand((s) => s.setName('ranking').setDescription('Quem mais convidou'))
    .addSubcommand((s) =>
      s
        .setName('quem')
        .setDescription('Quem convidou uma pessoa')
        .addUserOption((o) => o.setName('usuario').setDescription('A pessoa').setRequired(true))
    )
    .addSubcommand((s) =>
      s
        .setName('configurar')
        .setDescription('(Equipe) Canal que avisa quem entrou e por qual convite')
        .addChannelOption((o) => o.setName('canal').setDescription('Canal dos avisos').addChannelTypes(ChannelType.GuildText))
        .addStringOption((o) => o.setName('mensagem').setDescription('Variáveis: {usuario} {nome} {convidou} {convites} {codigo}').setMaxLength(300))
        .addIntegerOption((o) => o.setName('dias-falso').setDescription('Conta com menos dias que isso conta como falsa (padrão 7)').setMinValue(0).setMaxValue(90))
    ),
  async executar(i) {
    const sub = i.options.getSubcommand();
    if (sub === 'configurar') {
      if (!i.member.permissions.has(PermissionFlagsBits.ManageGuild)) return responder(i, 'Só quem tem **Gerenciar servidor** pode configurar.', 'erro');
      const c = cfg(i.guildId);
      const canal = i.options.getChannel('canal');
      const msg = i.options.getString('mensagem');
      const dias = i.options.getInteger('dias-falso');
      if (canal) c.canal = canal.id;
      if (msg) c.mensagem = msg;
      if (dias !== null) c.diasFalso = dias;
      salvarAjustes();
      const ok = await carregarConvites(i.guild);
      return responder(
        i,
        `Rastreio de convites configurado${c.canal ? `: avisos em <#${c.canal}>` : ''}.${ok ? '' : '\n⚠️ Não consigo ler os convites: me dê a permissão **Gerenciar servidor**.'}`,
        ok ? 'sucesso' : 'aviso'
      );
    }
    if (sub === 'ranking') {
      const contas = Object.entries(dados.ler(i.guildId, 'contas') ?? {})
        .map(([id, c]) => ({ id, v: validos(c), c }))
        .filter((x) => x.c.total > 0)
        .sort((a, b) => b.v - a.v || b.c.total - a.c.total)
        .slice(0, 15);
      if (!contas.length) return responder(i, 'Ninguém convidou ninguém ainda (desde que o bot entrou).', 'aviso');
      const linhas = contas.map((x, k) => `**${k + 1}.** <@${x.id}> · **${fmt(x.v)}** (${x.c.total} entraram, ${x.c.saiu} saíram, ${x.c.falsos} falsos)`);
      return i.reply({ embeds: [embed(i.guildId).setTitle('📨 Ranking de convites').setDescription(linhas.join('\n'))], allowedMentions: { parse: [] } });
    }
    if (sub === 'quem') {
      const u = i.options.getUser('usuario');
      const m = dados.ler(i.guildId, 'membros', u.id);
      if (!m) return responder(i, `Não sei como ${u} entrou (foi antes do bot começar a rastrear).`, 'aviso');
      const por = m.por ? `<@${m.por}>` : m.codigo === 'personalizado' ? 'o link personalizado do servidor' : 'um convite que não consegui identificar';
      return responder(i, `${u} entrou por ${por}${m.codigo && m.codigo !== 'personalizado' ? ` (convite \`${m.codigo}\`)` : ''} · <t:${Math.floor(m.em / 1000)}:R>${m.saiu ? ' · já saiu' : ''}.`, 'info');
    }
    const u = i.options.getUser('usuario') ?? i.user;
    const c = dados.ler(i.guildId, 'contas', u.id);
    return i.reply({
      embeds: [
        embed(i.guildId)
          .setAuthor({ name: u.username, iconURL: u.displayAvatarURL() })
          .setDescription(`**${fmt(validos(c))}** convite(s) válido(s)`)
          .addFields(
            { name: 'Entraram', value: fmt(c?.total ?? 0), inline: true },
            { name: 'Saíram', value: fmt(c?.saiu ?? 0), inline: true },
            { name: 'Contas falsas', value: fmt(c?.falsos ?? 0), inline: true }
          ),
      ],
    });
  },
};

export default {
  id: 'convites',
  nome: 'Rastreio de convites',
  intents: [GatewayIntentBits.GuildMembers, GatewayIntentBits.GuildInvites],
  permissoes: [PermissionFlagsBits.ManageGuild],
  comandos: [convites],
  eventos: {
    guildMemberAdd: aoEntrar,
    guildMemberRemove: aoSair,
    inviteCreate: (inv) => inv.guild && usos.get(inv.guild.id)?.set(inv.code, { usos: inv.uses ?? 0, dono: inv.inviterId ?? inv.inviter?.id ?? null }),
    // convite apagado: espera um pouco (se foi de uso único, a entrada da pessoa ainda precisa dele)
    inviteDelete: (inv) => inv.guild && setTimeout(() => usos.get(inv.guild.id)?.delete(inv.code), 15_000),
    guildCreate: (guild) => carregarConvites(guild),
  },
  async aoIniciar(client) {
    for (const guild of client.guilds.cache.values()) await carregarConvites(guild);
  },
  config: {
    resumo(guild) {
      const c = cfg(guild.id);
      const n = Object.keys(dados.ler(guild.id, 'membros') ?? {}).length;
      return [`Avisos: ${c.canal ? `<#${c.canal}>` : 'nenhum canal'} · ${n} entrada(s) rastreada(s)`];
    },
  },
};
