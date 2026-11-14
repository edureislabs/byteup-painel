import { AuditLogEvent, ChannelType, GatewayIntentBits, Partials, PermissionFlagsBits } from 'discord.js';
import { ajustes, salvarAjustes, embed, responder, cortar, foiRemovida, CORES } from '../core/util.js';

/**
 * Logs: registra num canal o que acontece no servidor.
 * Tipos: mensagens (apagadas/editadas), membros (entrou, saiu, apelido, cargos),
 * moderacao (banimentos), canais (criados/apagados) e voz (entrou, saiu, trocou).
 */

const TIPOS = {
  mensagens: 'Mensagens apagadas e editadas',
  membros: 'Entradas, saídas, apelidos e cargos',
  moderacao: 'Banimentos',
  canais: 'Canais criados e apagados',
  voz: 'Entradas e saídas de canais de voz',
};
const PADRAO = { canal: null, tipos: Object.keys(TIPOS) };
const cfg = (guildId) => ajustes(guildId, 'logs', PADRAO);

async function enviar(guild, tipo, montar) {
  if (!guild) return;
  const c = cfg(guild.id);
  if (!c.canal || !c.tipos.includes(tipo)) return;
  const canal = guild.channels.cache.get(c.canal);
  if (!canal?.isTextBased()) return;
  const e = embed(guild.id).setTimestamp();
  montar(e);
  await canal.send({ embeds: [e], allowedMentions: { parse: [] } }).catch(() => {});
}

const quem = (u) => (u ? `${u} (${u.tag ?? u.username ?? u.id})` : 'desconhecido');

const eventos = {
  async messageDelete(msg) {
    if (!msg.guild || msg.author?.bot) return;
    if (foiRemovida(msg.id)) return; // o AutoMod já registra o que ele apaga
    if (msg.channelId === cfg(msg.guild.id).canal) return;
    await enviar(msg.guild, 'mensagens', (e) => {
      e.setColor(CORES.erro)
        .setTitle('🗑️ Mensagem apagada')
        .addFields(
          { name: 'Autor', value: quem(msg.author), inline: true },
          { name: 'Canal', value: `${msg.channel}`, inline: true },
          { name: 'Conteúdo', value: cortar(msg.content || (msg.partial ? '(mensagem antiga, fora da memória do bot)' : '(sem texto)'), 1000) },
        );
      if (msg.attachments?.size) e.addFields({ name: 'Anexos', value: cortar([...msg.attachments.values()].map((a) => a.name).join(', '), 1000) });
    });
  },
  async messageDeleteBulk(msgs, canal) {
    if (!canal.guild || canal.id === cfg(canal.guild.id).canal) return;
    const linhas = [...msgs.values()]
      .filter((m) => !m.partial && m.author && !m.author.bot)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .map((m) => `${m.author.tag}: ${cortar(m.content || '(sem texto)', 120)}`);
    await enviar(canal.guild, 'mensagens', (e) => {
      e.setColor(CORES.erro)
        .setTitle('🧹 Mensagens apagadas em massa')
        .addFields({ name: 'Canal', value: `${canal}`, inline: true }, { name: 'Quantidade', value: String(msgs.size), inline: true });
      if (linhas.length) e.addFields({ name: 'Algumas delas', value: cortar(linhas.join('\n'), 1000) });
    });
  },
  async messageUpdate(antes, depois) {
    if (!depois.guild || depois.author?.bot) return;
    if (antes.content === depois.content || antes.partial) return; // só mudanças de texto que o bot viu
    await enviar(depois.guild, 'mensagens', (e) =>
      e
        .setColor(CORES.aviso)
        .setTitle('✏️ Mensagem editada')
        .setURL(depois.url)
        .addFields(
          { name: 'Autor', value: quem(depois.author), inline: true },
          { name: 'Canal', value: `${depois.channel}`, inline: true },
          { name: 'Antes', value: cortar(antes.content || '(vazio)', 1000) },
          { name: 'Depois', value: cortar(depois.content || '(vazio)', 1000) },
        )
    );
  },
  async guildMemberAdd(m) {
    const idade = Math.floor((Date.now() - m.user.createdTimestamp) / 86_400_000);
    await enviar(m.guild, 'membros', (e) =>
      e
        .setColor(CORES.sucesso)
        .setTitle('📥 Membro entrou')
        .setThumbnail(m.user.displayAvatarURL())
        .addFields(
          { name: 'Membro', value: quem(m.user) },
          { name: 'Conta criada', value: `<t:${Math.floor(m.user.createdTimestamp / 1000)}:R>${idade < 7 ? ' ⚠️ conta nova' : ''}`, inline: true },
          { name: 'Membros agora', value: String(m.guild.memberCount), inline: true },
        )
    );
  },
  async guildMemberRemove(m) {
    const cargos = m.roles?.cache?.filter((r) => r.id !== m.guild.id).map((r) => `${r}`) ?? [];
    await enviar(m.guild, 'membros', (e) =>
      e
        .setColor(CORES.erro)
        .setTitle('📤 Membro saiu')
        .setThumbnail(m.user?.displayAvatarURL?.() ?? null)
        .addFields(
          { name: 'Membro', value: quem(m.user) },
          { name: 'Cargos', value: cortar(cargos.join(' ') || 'nenhum', 1000) },
        )
    );
  },
  async guildMemberUpdate(antes, depois) {
    if (antes.partial) return;
    if (antes.nickname !== depois.nickname) {
      await enviar(depois.guild, 'membros', (e) =>
        e
          .setTitle('🏷️ Apelido alterado')
          .addFields(
            { name: 'Membro', value: quem(depois.user) },
            { name: 'Antes', value: antes.nickname || '(nenhum)', inline: true },
            { name: 'Depois', value: depois.nickname || '(nenhum)', inline: true },
          )
      );
    }
    const ganhou = depois.roles.cache.filter((r) => !antes.roles.cache.has(r.id));
    const perdeu = antes.roles.cache.filter((r) => !depois.roles.cache.has(r.id));
    if (ganhou.size || perdeu.size) {
      await enviar(depois.guild, 'membros', (e) => {
        e.setTitle('🎭 Cargos alterados').addFields({ name: 'Membro', value: quem(depois.user) });
        if (ganhou.size) e.addFields({ name: '➕ Recebeu', value: cortar(ganhou.map((r) => `${r}`).join(' '), 1000) });
        if (perdeu.size) e.addFields({ name: '➖ Perdeu', value: cortar(perdeu.map((r) => `${r}`).join(' '), 1000) });
      });
    }
  },
  async guildBanAdd(ban) {
    let motivo = ban.reason;
    let autor = null;
    const auditoria = await ban.guild.fetchAuditLogs({ type: AuditLogEvent.MemberBanAdd, limit: 3 }).catch(() => null);
    const entrada = auditoria?.entries.find((x) => x.target?.id === ban.user.id);
    if (entrada) {
      autor = entrada.executor;
      motivo ??= entrada.reason;
    }
    await enviar(ban.guild, 'moderacao', (e) =>
      e
        .setColor(CORES.erro)
        .setTitle('🔨 Membro banido')
        .setThumbnail(ban.user.displayAvatarURL())
        .addFields(
          { name: 'Membro', value: quem(ban.user), inline: true },
          { name: 'Por', value: autor ? quem(autor) : 'desconhecido', inline: true },
          { name: 'Motivo', value: cortar(motivo || 'Sem motivo', 1000) },
        )
    );
  },
  async guildBanRemove(ban) {
    await enviar(ban.guild, 'moderacao', (e) => e.setColor(CORES.sucesso).setTitle('🔓 Banimento removido').addFields({ name: 'Membro', value: quem(ban.user) }));
  },
  async channelCreate(ch) {
    if (!ch.guild) return;
    await enviar(ch.guild, 'canais', (e) => e.setColor(CORES.sucesso).setTitle('📁 Canal criado').addFields({ name: 'Canal', value: `${ch} (${ch.name})` }));
  },
  async channelDelete(ch) {
    if (!ch.guild) return;
    await enviar(ch.guild, 'canais', (e) => e.setColor(CORES.erro).setTitle('📁 Canal apagado').addFields({ name: 'Canal', value: `#${ch.name}` }));
  },
  async voiceStateUpdate(antes, depois) {
    const membro = depois.member ?? antes.member;
    if (!membro || membro.user.bot || antes.channelId === depois.channelId) return;
    let titulo, texto;
    if (!antes.channelId) [titulo, texto] = ['🎤 Entrou na call', `${depois.channel}`];
    else if (!depois.channelId) [titulo, texto] = ['🔇 Saiu da call', `${antes.channel}`];
    else [titulo, texto] = ['🔄 Trocou de call', `${antes.channel} → ${depois.channel}`];
    await enviar(depois.guild, 'voz', (e) => e.setTitle(titulo).addFields({ name: 'Membro', value: quem(membro.user), inline: true }, { name: 'Canal', value: texto, inline: true }));
  },
};

// ---------------- /config logs ----------------
const config = {
  grupo: 'logs',
  montar: (g) =>
    g
      .setDescription('Registro do que acontece no servidor')
      .addSubcommand((s) =>
        s.setName('canal').setDescription('Canal dos registros').addChannelOption((o) => o.setName('canal').setDescription('Vazio desliga').addChannelTypes(ChannelType.GuildText))
      )
      .addSubcommand((s) =>
        s
          .setName('tipo')
          .setDescription('Liga ou desliga um tipo de registro')
          .addStringOption((o) =>
            o.setName('tipo').setDescription('Tipo').setRequired(true).addChoices(...Object.entries(TIPOS).map(([value, name]) => ({ name, value })))
          )
          .addBooleanOption((o) => o.setName('ligado').setDescription('Registrar?').setRequired(true))
      ),
  async executar(i, sub) {
    const c = cfg(i.guildId);
    if (sub === 'canal') {
      const canal = i.options.getChannel('canal');
      c.canal = canal?.id ?? null;
      salvarAjustes();
      return responder(i, canal ? `Os registros vão para ${canal}.` : 'Registros desligados.', 'sucesso');
    }
    if (sub === 'tipo') {
      const tipo = i.options.getString('tipo');
      const ligado = i.options.getBoolean('ligado');
      c.tipos = c.tipos.filter((t) => t !== tipo);
      if (ligado) c.tipos.push(tipo);
      salvarAjustes();
      return responder(i, `${TIPOS[tipo]}: **${ligado ? 'registrando' : 'não registrando'}**.`, 'sucesso');
    }
  },
  resumo(guild) {
    const c = cfg(guild.id);
    if (!c.canal) return ['Desligado (use /config logs canal)'];
    return [`Canal: <#${c.canal}>`, `Registrando: ${c.tipos.map((t) => t).join(', ') || 'nada'}`];
  },
};

export default {
  id: 'logs',
  nome: 'Logs',
  intents: [
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildModeration,
    GatewayIntentBits.GuildVoiceStates,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.GuildMember, Partials.User],
  permissoes: [PermissionFlagsBits.ViewAuditLog],
  eventos,
  config,
};
