import { ChannelType, GatewayIntentBits, Partials, PermissionFlagsBits } from 'discord.js';
import { ajustes, salvarAjustes, embed, responder, preencher, cortar } from '../core/util.js';

/**
 * Boas-vindas: mensagem quando alguém entra e sai, mensagem na DM e cargos automáticos.
 * Variáveis nas mensagens: {usuario} (menção), {nome}, {tag}, {servidor}, {membros}
 */

const PADRAO = {
  entradaCanal: null,
  entradaMensagem: 'Seja bem-vindo(a) ao **{servidor}**, {usuario}! Agora somos **{membros}** membros. 🎉',
  saidaCanal: null,
  saidaMensagem: '**{tag}** saiu do servidor. Agora somos **{membros}** membros.',
  dmMensagem: null,
  cargos: [],
};
const cfg = (guildId) => ajustes(guildId, 'boasvindas', PADRAO);

const variaveis = (member) => ({
  usuario: `<@${member.id}>`,
  nome: member.displayName ?? member.user?.username ?? 'alguém',
  tag: member.user?.tag ?? member.user?.username ?? member.id,
  servidor: member.guild.name,
  membros: member.guild.memberCount,
});

async function enviarEntrada(member, canalId, mensagem) {
  const canal = member.guild.channels.cache.get(canalId);
  if (!canal?.isTextBased()) return false;
  const e = embed(member.guild.id)
    .setAuthor({ name: member.user.tag, iconURL: member.user.displayAvatarURL() })
    .setDescription(cortar(preencher(mensagem, variaveis(member)), 4000))
    .setThumbnail(member.user.displayAvatarURL({ size: 256 }))
    .setTimestamp();
  await canal.send({ content: `<@${member.id}>`, embeds: [e], allowedMentions: { users: [member.id] } });
  return true;
}

async function aoEntrar(member) {
  const c = cfg(member.guild.id);
  if (c.entradaCanal) await enviarEntrada(member, c.entradaCanal, c.entradaMensagem).catch(() => {});
  if (c.dmMensagem && !member.user.bot) {
    await member.send({ embeds: [embed(member.guild.id).setTitle(member.guild.name).setDescription(preencher(c.dmMensagem, variaveis(member)))] }).catch(() => {});
  }
  const cargos = c.cargos.filter((id) => member.guild.roles.cache.get(id)?.editable);
  if (cargos.length) await member.roles.add(cargos, 'Cargo automático').catch(() => {});
}

async function aoSair(member) {
  const c = cfg(member.guild.id);
  if (!c.saidaCanal) return;
  const canal = member.guild.channels.cache.get(c.saidaCanal);
  if (!canal?.isTextBased()) return;
  const e = embed(member.guild.id)
    .setDescription(cortar(preencher(c.saidaMensagem, variaveis(member)), 4000))
    .setThumbnail(member.user?.displayAvatarURL?.() ?? null);
  await canal.send({ embeds: [e], allowedMentions: { parse: [] } }).catch(() => {});
}

// ---------------- /config boasvindas ----------------
const opMensagem = (o) =>
  o.setName('mensagem').setDescription('Variáveis: {usuario} {nome} {tag} {servidor} {membros}').setMaxLength(1500);

const config = {
  grupo: 'boasvindas',
  montar: (g) =>
    g
      .setDescription('Boas-vindas, saída e cargos automáticos')
      .addSubcommand((s) =>
        s
          .setName('entrada')
          .setDescription('Canal e mensagem quando alguém entra')
          .addChannelOption((o) => o.setName('canal').setDescription('Vazio desliga').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
          .addStringOption(opMensagem)
      )
      .addSubcommand((s) =>
        s
          .setName('saida')
          .setDescription('Canal e mensagem quando alguém sai')
          .addChannelOption((o) => o.setName('canal').setDescription('Vazio desliga').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
          .addStringOption(opMensagem)
      )
      .addSubcommand((s) =>
        s
          .setName('dm')
          .setDescription('Mensagem enviada na DM de quem entra')
          .addStringOption((o) => o.setName('mensagem').setDescription('Vazio desliga. Variáveis: {usuario} {nome} {servidor}').setMaxLength(1500))
      )
      .addSubcommand((s) =>
        s.setName('cargo').setDescription('Cargo dado automaticamente a quem entra (usar de novo remove)').addRoleOption((o) => o.setName('cargo').setDescription('Cargo').setRequired(true))
      )
      .addSubcommand((s) => s.setName('testar').setDescription('Simula a sua entrada para ver como fica')),
  async executar(i, sub) {
    const c = cfg(i.guildId);
    if (sub === 'entrada' || sub === 'saida') {
      const canal = i.options.getChannel('canal');
      const mensagem = i.options.getString('mensagem');
      c[`${sub}Canal`] = canal?.id ?? null;
      if (mensagem) c[`${sub}Mensagem`] = mensagem;
      salvarAjustes();
      const nome = sub === 'entrada' ? 'entrada' : 'saída';
      return responder(i, canal ? `Mensagem de ${nome} em ${canal}.` : `Mensagem de ${nome} desligada.`, 'sucesso');
    }
    if (sub === 'dm') {
      c.dmMensagem = i.options.getString('mensagem') || null;
      salvarAjustes();
      return responder(i, c.dmMensagem ? 'Mensagem na DM definida.' : 'Mensagem na DM desligada.', 'sucesso');
    }
    if (sub === 'cargo') {
      const r = i.options.getRole('cargo');
      if (r.managed || r.id === i.guildId) return responder(i, 'Esse cargo não pode ser dado manualmente.', 'erro');
      const idx = c.cargos.indexOf(r.id);
      if (idx >= 0) {
        c.cargos.splice(idx, 1);
        salvarAjustes();
        return responder(i, `${r} não será mais dado automaticamente.`, 'sucesso');
      }
      if (c.cargos.length >= 5) return responder(i, 'No máximo 5 cargos automáticos.', 'erro');
      c.cargos.push(r.id);
      salvarAjustes();
      const aviso = r.editable ? '' : ' ⚠️ O meu cargo está abaixo dele: suba o meu cargo na lista para funcionar.';
      return responder(i, `${r} será dado a quem entrar.${aviso}`, 'sucesso');
    }
    if (sub === 'testar') {
      if (!c.entradaCanal) return responder(i, 'Defina antes o canal com /config boasvindas entrada.', 'aviso');
      const ok = await enviarEntrada(i.member, c.entradaCanal, c.entradaMensagem).catch(() => false);
      return responder(i, ok ? `Mensagem de teste enviada em <#${c.entradaCanal}>.` : 'Não consegui enviar no canal configurado: confira as minhas permissões.', ok ? 'sucesso' : 'erro');
    }
  },
  resumo(guild) {
    const c = cfg(guild.id);
    return [
      `Entrada: ${c.entradaCanal ? `<#${c.entradaCanal}>` : 'desligada'}`,
      `Saída: ${c.saidaCanal ? `<#${c.saidaCanal}>` : 'desligada'}`,
      `DM: ${c.dmMensagem ? 'ligada' : 'desligada'}`,
      `Cargos automáticos: ${c.cargos.length ? c.cargos.map((r) => `<@&${r}>`).join(' ') : 'nenhum'}`,
    ];
  },
};

export default {
  id: 'boasvindas',
  nome: 'Boas-vindas',
  intents: [GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember, Partials.User],
  permissoes: [PermissionFlagsBits.ManageRoles],
  eventos: { guildMemberAdd: aoEntrar, guildMemberRemove: aoSair },
  config,
};
