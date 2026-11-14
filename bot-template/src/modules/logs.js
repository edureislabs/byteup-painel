import { AuditLogEvent, ChannelType, GatewayIntentBits, Partials, PermissionFlagsBits } from 'discord.js';
import { ajustes, salvarAjustes, embed, responder, cortar, foiRemovida, CORES } from '../core/util.js';
import { textos } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('logs', {
  mensagens_apagadas_editadas: 'Mensagens apagadas e editadas',
  entradas_saidas_apelidos_cargos: 'Entradas, saídas, apelidos e cargos',
  banimentos: 'Banimentos',
  canais_criados_apagados: 'Canais criados e apagados',
  entradas_saidas_canais_voz: 'Entradas e saídas de canais de voz',
  mensagem_apagada: ['🗑️ Mensagem apagada', 'titulo'],
  autor: ['Autor', 'campo'],
  canal: ['Canal', 'campo'],
  conteudo: ['Conteúdo', 'campo'],
  mensagem_antiga_fora_memoria: '(mensagem antiga, fora da memória do bot)',
  sem_texto: '(sem texto)',
  anexos: ['Anexos', 'campo'],
  mensagens_apagadas_massa: ['🧹 Mensagens apagadas em massa', 'titulo'],
  quantidade: ['Quantidade', 'campo'],
  algumas_delas: ['Algumas delas', 'campo'],
  mensagem_editada: ['✏️ Mensagem editada', 'titulo'],
  antes: ['Antes', 'campo'],
  vazio: '(vazio)',
  depois: ['Depois', 'campo'],
  membro_entrou: ['📥 Membro entrou', 'titulo'],
  membro: ['Membro', 'campo'],
  conta_criada: ['Conta criada', 'campo'],
  conta_nova: ' ⚠️ conta nova',
  membros_agora: ['Membros agora', 'campo'],
  membro_saiu: ['📤 Membro saiu', 'titulo'],
  cargos: ['Cargos', 'campo'],
  apelido_alterado: ['🏷️ Apelido alterado', 'titulo'],
  nenhum: '(nenhum)',
  cargos_alterados: ['🎭 Cargos alterados', 'titulo'],
  recebeu: ['➕ Recebeu', 'campo'],
  perdeu: ['➖ Perdeu', 'campo'],
  membro_banido: ['🔨 Membro banido', 'titulo'],
  por: ['Por', 'campo'],
  desconhecido: 'desconhecido',
  motivo: ['Motivo', 'campo'],
  sem_motivo: 'Sem motivo',
  banimento_removido: ['🔓 Banimento removido', 'titulo'],
  canal_criado: ['📁 Canal criado', 'titulo'],
  canal_apagado: ['📁 Canal apagado', 'titulo'],
  entrou_call: '🎤 Entrou na call',
  saiu_call: '🔇 Saiu da call',
  trocou_call: '🔄 Trocou de call',
  registros_vao: 'Os registros vão para {canal}.',
  registros_desligados: 'Registros desligados.',
  registrando: 'registrando',
  registrando_2: 'não registrando',
  desligado_use_config_logs: 'Desligado (use /config logs canal)',
  canal_2: 'Canal: <#{canal}>',
  nada: 'nada',
  registrando_3: 'Registrando: {tipos}',
  logs: 'Logs',
});

/**
 * Logs: registra num canal o que acontece no servidor.
 * Tipos: mensagens (apagadas/editadas), membros (entrou, saiu, apelido, cargos),
 * moderacao (banimentos), canais (criados/apagados) e voz (entrou, saiu, trocou).
 */

const TIPOS = {
  mensagens: tx('mensagens_apagadas_editadas'),
  membros: tx('entradas_saidas_apelidos_cargos'),
  moderacao: tx('banimentos'),
  canais: tx('canais_criados_apagados'),
  voz: tx('entradas_saidas_canais_voz'),
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
        .setTitle(tx('mensagem_apagada'))
        .addFields(
          { name: tx('autor'), value: quem(msg.author), inline: true },
          { name: tx('canal'), value: `${msg.channel}`, inline: true },
          { name: tx('conteudo'), value: cortar(msg.content || (msg.partial ? tx('mensagem_antiga_fora_memoria') : tx('sem_texto')), 1000) },
        );
      if (msg.attachments?.size) e.addFields({ name: tx('anexos'), value: cortar([...msg.attachments.values()].map((a) => a.name).join(', '), 1000) });
    });
  },
  async messageDeleteBulk(msgs, canal) {
    if (!canal.guild || canal.id === cfg(canal.guild.id).canal) return;
    const linhas = [...msgs.values()]
      .filter((m) => !m.partial && m.author && !m.author.bot)
      .sort((a, b) => a.createdTimestamp - b.createdTimestamp)
      .map((m) => `${m.author.tag}: ${cortar(m.content || tx('sem_texto'), 120)}`);
    await enviar(canal.guild, 'mensagens', (e) => {
      e.setColor(CORES.erro)
        .setTitle(tx('mensagens_apagadas_massa'))
        .addFields({ name: tx('canal'), value: `${canal}`, inline: true }, { name: tx('quantidade'), value: String(msgs.size), inline: true });
      if (linhas.length) e.addFields({ name: tx('algumas_delas'), value: cortar(linhas.join('\n'), 1000) });
    });
  },
  async messageUpdate(antes, depois) {
    if (!depois.guild || depois.author?.bot) return;
    if (antes.content === depois.content || antes.partial) return; // só mudanças de texto que o bot viu
    await enviar(depois.guild, 'mensagens', (e) =>
      e
        .setColor(CORES.aviso)
        .setTitle(tx('mensagem_editada'))
        .setURL(depois.url)
        .addFields(
          { name: tx('autor'), value: quem(depois.author), inline: true },
          { name: tx('canal'), value: `${depois.channel}`, inline: true },
          { name: tx('antes'), value: cortar(antes.content || tx('vazio'), 1000) },
          { name: tx('depois'), value: cortar(depois.content || tx('vazio'), 1000) },
        )
    );
  },
  async guildMemberAdd(m) {
    const idade = Math.floor((Date.now() - m.user.createdTimestamp) / 86_400_000);
    await enviar(m.guild, 'membros', (e) =>
      e
        .setColor(CORES.sucesso)
        .setTitle(tx('membro_entrou'))
        .setThumbnail(m.user.displayAvatarURL())
        .addFields(
          { name: tx('membro'), value: quem(m.user) },
          { name: tx('conta_criada'), value: `<t:${Math.floor(m.user.createdTimestamp / 1000)}:R>${idade < 7 ? tx('conta_nova') : ''}`, inline: true },
          { name: tx('membros_agora'), value: String(m.guild.memberCount), inline: true },
        )
    );
  },
  async guildMemberRemove(m) {
    const cargos = m.roles?.cache?.filter((r) => r.id !== m.guild.id).map((r) => `${r}`) ?? [];
    await enviar(m.guild, 'membros', (e) =>
      e
        .setColor(CORES.erro)
        .setTitle(tx('membro_saiu'))
        .setThumbnail(m.user?.displayAvatarURL?.() ?? null)
        .addFields(
          { name: tx('membro'), value: quem(m.user) },
          { name: tx('cargos'), value: cortar(cargos.join(' ') || 'nenhum', 1000) },
        )
    );
  },
  async guildMemberUpdate(antes, depois) {
    if (antes.partial) return;
    if (antes.nickname !== depois.nickname) {
      await enviar(depois.guild, 'membros', (e) =>
        e
          .setTitle(tx('apelido_alterado'))
          .addFields(
            { name: tx('membro'), value: quem(depois.user) },
            { name: tx('antes'), value: antes.nickname || tx('nenhum'), inline: true },
            { name: tx('depois'), value: depois.nickname || tx('nenhum'), inline: true },
          )
      );
    }
    const ganhou = depois.roles.cache.filter((r) => !antes.roles.cache.has(r.id));
    const perdeu = antes.roles.cache.filter((r) => !depois.roles.cache.has(r.id));
    if (ganhou.size || perdeu.size) {
      await enviar(depois.guild, 'membros', (e) => {
        e.setTitle(tx('cargos_alterados')).addFields({ name: tx('membro'), value: quem(depois.user) });
        if (ganhou.size) e.addFields({ name: tx('recebeu'), value: cortar(ganhou.map((r) => `${r}`).join(' '), 1000) });
        if (perdeu.size) e.addFields({ name: tx('perdeu'), value: cortar(perdeu.map((r) => `${r}`).join(' '), 1000) });
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
        .setTitle(tx('membro_banido'))
        .setThumbnail(ban.user.displayAvatarURL())
        .addFields(
          { name: tx('membro'), value: quem(ban.user), inline: true },
          { name: tx('por'), value: autor ? quem(autor) : tx('desconhecido'), inline: true },
          { name: tx('motivo'), value: cortar(motivo || tx('sem_motivo'), 1000) },
        )
    );
  },
  async guildBanRemove(ban) {
    await enviar(ban.guild, 'moderacao', (e) => e.setColor(CORES.sucesso).setTitle(tx('banimento_removido')).addFields({ name: tx('membro'), value: quem(ban.user) }));
  },
  async channelCreate(ch) {
    if (!ch.guild) return;
    await enviar(ch.guild, 'canais', (e) => e.setColor(CORES.sucesso).setTitle(tx('canal_criado')).addFields({ name: tx('canal'), value: `${ch} (${ch.name})` }));
  },
  async channelDelete(ch) {
    if (!ch.guild) return;
    await enviar(ch.guild, 'canais', (e) => e.setColor(CORES.erro).setTitle(tx('canal_apagado')).addFields({ name: tx('canal'), value: `#${ch.name}` }));
  },
  async voiceStateUpdate(antes, depois) {
    const membro = depois.member ?? antes.member;
    if (!membro || membro.user.bot || antes.channelId === depois.channelId) return;
    let titulo, texto;
    if (!antes.channelId) [titulo, texto] = [tx('entrou_call'), `${depois.channel}`];
    else if (!depois.channelId) [titulo, texto] = [tx('saiu_call'), `${antes.channel}`];
    else [titulo, texto] = [tx('trocou_call'), `${antes.channel} → ${depois.channel}`];
    await enviar(depois.guild, 'voz', (e) => e.setTitle(titulo).addFields({ name: tx('membro'), value: quem(membro.user), inline: true }, { name: tx('canal'), value: texto, inline: true }));
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
      return responder(i, canal ? tx('registros_vao', { canal }) : tx('registros_desligados'), 'sucesso');
    }
    if (sub === 'tipo') {
      const tipo = i.options.getString('tipo');
      const ligado = i.options.getBoolean('ligado');
      c.tipos = c.tipos.filter((t) => t !== tipo);
      if (ligado) c.tipos.push(tipo);
      salvarAjustes();
      return responder(i, `${TIPOS[tipo]}: **${ligado ? tx('registrando') : tx('registrando_2')}**.`, 'sucesso');
    }
  },
  resumo(guild) {
    const c = cfg(guild.id);
    if (!c.canal) return [tx('desligado_use_config_logs')];
    return [tx('canal_2', { canal: c.canal }), tx('registrando_3', { tipos: c.tipos.map((t) => t).join(', ') || tx('nada') })];
  },
};

export default {
  id: 'logs',
  nome: tx('logs'),
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
