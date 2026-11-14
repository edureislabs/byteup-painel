import { ChannelType, GatewayIntentBits, Partials, PermissionFlagsBits } from 'discord.js';
import { ajustes, salvarAjustes, embed, responder, preencher, cortar, foiRemovida, imagens } from '../core/util.js';
import { textos, modeloOu, visuais } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('boasvindas', {
  msg_entrada_padrao: 'Seja bem-vindo(a) ao **{servidor}**, {usuario}! Agora somos **{membros}** membros. 🎉',
  msg_saida_padrao: '**{tag}** saiu do servidor. Agora somos **{membros}** membros.',
  alguem: 'alguém',
  mensagem: 'Mensagem de {nome} em {canal}.',
  mensagem_desligada: 'Mensagem de {nome} desligada.',
  mensagem_dm_definida: 'Mensagem na DM definida.',
  mensagem_dm_desligada: 'Mensagem na DM desligada.',
  esse_cargo_pode_ser: ['Esse cargo não pode ser dado manualmente.', 'resposta'],
  sera_mais_dado_automaticamente: ['{cargo} não será mais dado automaticamente.', 'resposta'],
  maximo_cargos_automaticos: ['No máximo 5 cargos automáticos.', 'resposta'],
  meu_cargo_esta_abaixo: ' ⚠️ O meu cargo está abaixo dele: suba o meu cargo na lista para funcionar.',
  sera_dado_quem_entrar: ['{cargo} será dado a quem entrar.{aviso}', 'resposta'],
  defina_antes_canal_config: ['Defina antes o canal com /config boasvindas entrada.', 'resposta'],
  mensagem_teste_enviada: 'Mensagem de teste enviada em <#{canal}>.',
  consegui_enviar_canal_configurado: 'Não consegui enviar no canal configurado: confira as minhas permissões.',
  desligada: 'desligada',
  entrada: 'Entrada: {entrada}',
  saida: 'Saída: {saida}',
  ligada: 'ligada',
  dm: 'DM: {dm}',
  nenhum: 'nenhum',
  cargos_automaticos: 'Cargos automáticos: {cargos}',
  boas_vindas: 'Boas-vindas',
});

// Aparência dos embeds principais (cor, imagem, miniatura e rodapé personalizáveis)
const vis = visuais('boasvindas', {
  entrada: { nome: "Mensagem de entrada", vars: ['avatar', 'servidor_icone'], miniatura: "{avatar}" },
  saida: { nome: "Mensagem de saída", vars: ['avatar', 'servidor_icone'], miniatura: "{avatar}" },
  dm: { nome: "Mensagem na DM de quem entra", vars: ['avatar', 'servidor_icone'] },
});

/**
 * Boas-vindas: mensagem quando alguém entra e sai, mensagem na DM e cargos automáticos.
 * Variáveis nas mensagens: {usuario} (menção), {nome}, {tag}, {servidor}, {membros}
 */

const PADRAO = {
  entradaCanal: null,
  entradaMensagem: null, // vazio = texto do bot (personalizável)
  saidaCanal: null,
  saidaMensagem: null,
  dmMensagem: null,
  cargos: [],
};
const cfg = (guildId) => ajustes(guildId, 'boasvindas', PADRAO);
// mensagens padrão de versões anteriores (gravadas nos dados): contam como "sem mensagem própria"
const ANTIGA_ENTRADA = 'Seja bem-vindo(a) ao **{servidor}**, {usuario}! Agora somos **{membros}** membros. 🎉';
const ANTIGA_SAIDA = '**{tag}** saiu do servidor. Agora somos **{membros}** membros.';
const msgEntrada = (c) => modeloOu(c.entradaMensagem, ANTIGA_ENTRADA, tx('msg_entrada_padrao'));
const msgSaida = (c) => modeloOu(c.saidaMensagem, ANTIGA_SAIDA, tx('msg_saida_padrao'));

const variaveis = (member) => ({
  usuario: `<@${member.id}>`,
  nome: member.displayName ?? member.user?.username ?? tx('alguem'),
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
  vis(e, 'entrada', imagens({ user: member.user, guild: member.guild }));
  await canal.send({ content: `<@${member.id}>`, embeds: [e], allowedMentions: { users: [member.id] } });
  return true;
}

async function aoEntrar(member) {
  if (foiRemovida(`membro:${member.guild.id}:${member.id}`)) return; // barrado pelo anti-raid
  const c = cfg(member.guild.id);
  if (c.entradaCanal) await enviarEntrada(member, c.entradaCanal, msgEntrada(c)).catch(() => {});
  if (c.dmMensagem && !member.user.bot) {
    await member.send({ embeds: [vis(embed(member.guild.id).setTitle(member.guild.name).setDescription(preencher(c.dmMensagem, variaveis(member))), 'dm', imagens({ user: member.user, guild: member.guild }))] }).catch(() => {});
  }
  const cargos = c.cargos.filter((id) => member.guild.roles.cache.get(id)?.editable);
  if (cargos.length) await member.roles.add(cargos, 'Cargo automático').catch(() => {});
}

async function aoSair(member) {
  if (foiRemovida(`membro:${member.guild.id}:${member.id}`)) return; // expulso pelo anti-raid: sem "saiu"
  const c = cfg(member.guild.id);
  if (!c.saidaCanal) return;
  const canal = member.guild.channels.cache.get(c.saidaCanal);
  if (!canal?.isTextBased()) return;
  const e = embed(member.guild.id)
    .setDescription(cortar(preencher(msgSaida(c), variaveis(member)), 4000))
    .setThumbnail(member.user?.displayAvatarURL?.() ?? null);
  vis(e, 'saida', imagens({ user: member.user, guild: member.guild }));
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
      return responder(i, canal ? tx('mensagem', { nome, canal }) : tx('mensagem_desligada', { nome }), 'sucesso');
    }
    if (sub === 'dm') {
      c.dmMensagem = i.options.getString('mensagem') || null;
      salvarAjustes();
      return responder(i, c.dmMensagem ? tx('mensagem_dm_definida') : tx('mensagem_dm_desligada'), 'sucesso');
    }
    if (sub === 'cargo') {
      const r = i.options.getRole('cargo');
      if (r.managed || r.id === i.guildId) return responder(i, tx('esse_cargo_pode_ser'), 'erro');
      const idx = c.cargos.indexOf(r.id);
      if (idx >= 0) {
        c.cargos.splice(idx, 1);
        salvarAjustes();
        return responder(i, tx('sera_mais_dado_automaticamente', { cargo: r }), 'sucesso');
      }
      if (c.cargos.length >= 5) return responder(i, tx('maximo_cargos_automaticos'), 'erro');
      c.cargos.push(r.id);
      salvarAjustes();
      const aviso = r.editable ? '' : tx('meu_cargo_esta_abaixo');
      return responder(i, tx('sera_dado_quem_entrar', { cargo: r, aviso }), 'sucesso');
    }
    if (sub === 'testar') {
      if (!c.entradaCanal) return responder(i, tx('defina_antes_canal_config'), 'aviso');
      const ok = await enviarEntrada(i.member, c.entradaCanal, msgEntrada(c)).catch(() => false);
      return responder(i, ok ? tx('mensagem_teste_enviada', { canal: c.entradaCanal }) : tx('consegui_enviar_canal_configurado'), ok ? 'sucesso' : 'erro');
    }
  },
  resumo(guild) {
    const c = cfg(guild.id);
    return [
      tx('entrada', { entrada: c.entradaCanal ? `<#${c.entradaCanal}>` : tx('desligada') }),
      tx('saida', { saida: c.saidaCanal ? `<#${c.saidaCanal}>` : tx('desligada') }),
      tx('dm', { dm: c.dmMensagem ? tx('ligada') : tx('desligada') }),
      tx('cargos_automaticos', { cargos: c.cargos.length ? c.cargos.map((r) => `<@&${r}>`).join(' ') : tx('nenhum') }),
    ];
  },
};

export default {
  id: 'boasvindas',
  nome: tx('boas_vindas'),
  intents: [GatewayIntentBits.GuildMembers],
  partials: [Partials.GuildMember, Partials.User],
  permissoes: [PermissionFlagsBits.ManageRoles],
  eventos: { guildMemberAdd: aoEntrar, guildMemberRemove: aoSair },
  config,
};
