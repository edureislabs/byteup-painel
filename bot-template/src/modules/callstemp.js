import { ChannelType, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, responder, preencher } from '../core/util.js';

/**
 * Calls temporárias: quem entra na call "➕ Criar sala" ganha uma call só dele,
 * que é apagada quando fica vazia. O dono controla a sala com /sala.
 */

const salas = colecao('salas_temporarias'); // guild -> canalId -> { dono, criada }
const PADRAO = { criador: null, categoria: null, nome: 'Sala de {nome}', limite: 0 };
const cfg = (guildId) => ajustes(guildId, 'callstemp', PADRAO);
const espera = new Map(); // anti-spam: userId -> quando criou a última

const salaDe = (guildId, canalId) => salas.ler(guildId, canalId);

async function criarSala(state) {
  const c = cfg(state.guild.id);
  const membro = state.member;
  if (Date.now() - (espera.get(membro.id) ?? 0) < 10_000) {
    await membro.voice.disconnect('Aguarde para criar outra sala').catch(() => {});
    return;
  }
  espera.set(membro.id, Date.now());
  const parent = (c.categoria && state.guild.channels.cache.get(c.categoria)?.id) || state.channel.parentId || undefined;
  const nome = preencher(c.nome, { nome: membro.displayName, usuario: membro.user.username }).slice(0, 100);
  let canal;
  try {
    // sem permissões próprias: a sala herda as da categoria (se a categoria é privada, a sala também é)
    canal = await state.guild.channels.create({
      name: nome,
      type: ChannelType.GuildVoice,
      parent,
      userLimit: c.limite || undefined,
      reason: `Sala temporária de ${membro.user.tag}`,
    });
  } catch (e) {
    console.error('[calls temporárias] não consegui criar a sala:', e.message);
    return;
  }
  // o dono sempre entra, mesmo se trancar a sala
  await canal.permissionOverwrites.edit(membro.id, { ViewChannel: true, Connect: true, Speak: true }).catch(() => {});
  salas.de(state.guild.id)[canal.id] = { dono: membro.id, criada: Date.now() };
  salas.salvar();
  const ok = await membro.voice.setChannel(canal, 'Sala temporária').then(() => true, () => false);
  if (!ok) await apagarSeVazia(state.guild, canal.id); // a pessoa saiu antes de ser movida
}

async function apagarSeVazia(guild, canalId) {
  if (!salaDe(guild.id, canalId)) return;
  const canal = guild.channels.cache.get(canalId);
  if (canal && canal.members.size > 0) return;
  salas.apagar(guild.id, canalId);
  if (canal) await canal.delete('Sala temporária vazia').catch(() => {});
}

async function aoMudarVoz(antes, depois) {
  const guild = depois.guild ?? antes.guild;
  const c = cfg(guild.id);
  if (depois.channelId && depois.channelId === c.criador && depois.member && !depois.member.user.bot) await criarSala(depois);
  if (antes.channelId && antes.channelId !== depois.channelId) await apagarSeVazia(guild, antes.channelId);
}

// ---------------- /sala (para o dono) ----------------
const sala = {
  data: new SlashCommandBuilder()
    .setName('sala')
    .setDescription('Controla a sua sala temporária (entre nela antes)')
    .addSubcommand((s) => s.setName('nome').setDescription('Muda o nome da sala').addStringOption((o) => o.setName('nome').setDescription('Novo nome').setRequired(true).setMaxLength(90)))
    .addSubcommand((s) => s.setName('limite').setDescription('Máximo de pessoas (0 = sem limite)').addIntegerOption((o) => o.setName('pessoas').setDescription('0 a 99').setRequired(true).setMinValue(0).setMaxValue(99)))
    .addSubcommand((s) => s.setName('trancar').setDescription('Ninguém novo entra (só quem você permitir)'))
    .addSubcommand((s) => s.setName('destrancar').setDescription('Libera a entrada de novo'))
    .addSubcommand((s) => s.setName('permitir').setDescription('Deixa alguém entrar mesmo trancada').addUserOption((o) => o.setName('usuario').setDescription('Quem').setRequired(true)))
    .addSubcommand((s) => s.setName('expulsar').setDescription('Tira alguém e impede de voltar').addUserOption((o) => o.setName('usuario').setDescription('Quem').setRequired(true)))
    .addSubcommand((s) => s.setName('reivindicar').setDescription('Vira dono da sala se o dono saiu')),
  async executar(i) {
    const canal = i.member.voice?.channel;
    const s = canal && salaDe(i.guildId, canal.id);
    if (!s) return responder(i, 'Entre na sua sala temporária para usar este comando.', 'erro');
    const sub = i.options.getSubcommand();

    if (sub === 'reivindicar') {
      if (s.dono === i.user.id) return responder(i, 'Você já é o dono desta sala.', 'aviso');
      if (canal.members.has(s.dono)) return responder(i, `O dono (<@${s.dono}>) ainda está na sala.`, 'erro');
      s.dono = i.user.id;
      salas.salvar();
      await canal.permissionOverwrites.edit(i.user.id, { ViewChannel: true, Connect: true, Speak: true }).catch(() => {});
      return responder(i, 'Agora a sala é sua. Use /sala para controlar.', 'sucesso');
    }
    if (s.dono !== i.user.id) return responder(i, `Só o dono da sala (<@${s.dono}>) pode fazer isso.`, 'erro');

    const tentar = async (fn, ok) => {
      const deu = await fn().then(() => true, () => false);
      return responder(i, deu ? ok : 'Não consegui. Confira as minhas permissões (Gerenciar canais e Gerenciar cargos).', deu ? 'sucesso' : 'erro');
    };
    if (sub === 'nome') {
      const nome = i.options.getString('nome');
      // o Discord só deixa renomear 2 vezes a cada 10 minutos: responde antes de esperar
      await i.deferReply({ flags: 64 });
      const ok = await canal.setName(nome).then(() => true, () => false);
      return i.editReply(ok ? `✅ Sala renomeada para **${nome}**.` : '❌ Não consegui renomear agora (o Discord limita a 2 vezes a cada 10 minutos).');
    }
    if (sub === 'limite') {
      const n = i.options.getInteger('pessoas');
      return tentar(() => canal.setUserLimit(n), n ? `Limite: **${n}** pessoa(s).` : 'Sala sem limite.');
    }
    if (sub === 'trancar') return tentar(() => canal.permissionOverwrites.edit(i.guild.roles.everyone, { Connect: false }), '🔒 Sala trancada.');
    if (sub === 'destrancar') return tentar(() => canal.permissionOverwrites.edit(i.guild.roles.everyone, { Connect: null }), '🔓 Sala liberada.');
    const u = i.options.getUser('usuario');
    if (u.id === i.user.id) return responder(i, 'Escolha outra pessoa.', 'erro');
    if (sub === 'permitir') return tentar(() => canal.permissionOverwrites.edit(u.id, { ViewChannel: true, Connect: true }), `${u} pode entrar na sala.`);
    // expulsar
    return tentar(async () => {
      await canal.permissionOverwrites.edit(u.id, { Connect: false });
      const m = canal.members.get(u.id);
      if (m) await m.voice.disconnect('Expulso da sala temporária');
    }, `${u} foi tirado(a) da sala e não pode voltar.`);
  },
};

// ---------------- /salas (equipe) ----------------
const salasCmd = {
  data: new SlashCommandBuilder()
    .setName('salas')
    .setDescription('Configura as calls temporárias')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('configurar')
        .setDescription('Escolhe a call "Criar sala" (ou cria uma)')
        .addChannelOption((o) => o.setName('canal').setDescription('Call que cria as salas (vazio = eu crio uma)').addChannelTypes(ChannelType.GuildVoice))
        .addChannelOption((o) => o.setName('categoria').setDescription('Onde as salas aparecem (padrão: a mesma da call)').addChannelTypes(ChannelType.GuildCategory))
        .addStringOption((o) => o.setName('nome').setDescription('Nome das salas. Variáveis: {nome} {usuario}').setMaxLength(80))
        .addIntegerOption((o) => o.setName('limite').setDescription('Limite padrão de pessoas (0 = sem limite)').setMinValue(0).setMaxValue(99))
    )
    .addSubcommand((s) => s.setName('desligar').setDescription('Para de criar salas (as abertas continuam até esvaziar)')),
  async executar(i) {
    const c = cfg(i.guildId);
    if (i.options.getSubcommand() === 'desligar') {
      c.criador = null;
      salvarAjustes();
      return responder(i, 'Calls temporárias desligadas.', 'sucesso');
    }
    let canal = i.options.getChannel('canal');
    const categoria = i.options.getChannel('categoria');
    if (!canal) {
      canal = await i.guild.channels
        .create({ name: '➕ Criar sala', type: ChannelType.GuildVoice, parent: categoria?.id, reason: 'Calls temporárias' })
        .catch(() => null);
      if (!canal) return responder(i, 'Não consegui criar a call. Preciso da permissão **Gerenciar canais**.', 'erro');
    }
    c.criador = canal.id;
    if (categoria) c.categoria = categoria.id;
    const nome = i.options.getString('nome');
    if (nome) c.nome = nome;
    const limite = i.options.getInteger('limite');
    if (limite !== null) c.limite = limite;
    salvarAjustes();
    return responder(i, `Pronto! Quem entrar em ${canal} ganha uma sala própria (nome: "${c.nome}"). O dono controla com \`/sala\`.`, 'sucesso');
  },
};

export default {
  id: 'callstemp',
  nome: 'Calls temporárias',
  intents: [GatewayIntentBits.GuildVoiceStates],
  permissoes: [PermissionFlagsBits.ManageChannels, PermissionFlagsBits.ManageRoles, PermissionFlagsBits.MoveMembers, PermissionFlagsBits.Connect],
  comandos: [salasCmd, sala],
  eventos: { voiceStateUpdate: aoMudarVoz },
  async aoIniciar(client) {
    // salas que ficaram vazias enquanto o bot estava desligado
    for (const [guildId, lista] of Object.entries(salas.raiz)) {
      const guild = client.guilds.cache.get(guildId);
      if (!guild) continue;
      for (const canalId of Object.keys(lista)) await apagarSeVazia(guild, canalId);
    }
  },
  config: {
    resumo(guild) {
      const c = cfg(guild.id);
      const n = Object.keys(salas.ler(guild.id) ?? {}).length;
      return [c.criador ? `Criar sala: <#${c.criador}> · nome "${c.nome}" · ${n} sala(s) aberta(s)` : 'Desligado (`/salas configurar`)'];
    },
  },
};
