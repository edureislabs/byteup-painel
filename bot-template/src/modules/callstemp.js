import { ChannelType, GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, responder, preencher } from '../core/util.js';
import { textos, modeloOu } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('callstemp', {
  nome_sala_padrao: 'Sala de {nome}',
  aguarde_criar_outra_sala: 'Aguarde para criar outra sala',
  sala_temporaria: 'Sala temporária',
  entre_sua_sala_temporaria: ['Entre na sua sala temporária para usar este comando.', 'resposta'],
  voce_ja_dono_desta: ['Você já é o dono desta sala.', 'resposta'],
  dono_ainda_esta_sala: ['O dono (<@{dono}>) ainda está na sala.', 'resposta'],
  agora_sala_sua_use: ['Agora a sala é sua. Use /sala para controlar.', 'resposta'],
  so_dono_sala_pode: ['Só o dono da sala (<@{dono}>) pode fazer isso.', 'resposta'],
  consegui_confira_minhas_permissoes: 'Não consegui. Confira as minhas permissões (Gerenciar canais e Gerenciar cargos).',
  sala_renomeada: '✅ Sala renomeada para **{nome}**.',
  consegui_renomear_agora_discord: '❌ Não consegui renomear agora (o Discord limita a 2 vezes a cada 10 minutos).',
  limite_pessoa: 'Limite: **{limite}** pessoa(s).',
  sala_sem_limite: 'Sala sem limite.',
  sala_trancada: '🔒 Sala trancada.',
  sala_liberada: '🔓 Sala liberada.',
  escolha_outra_pessoa: ['Escolha outra pessoa.', 'resposta'],
  pode_entrar_sala: '{usuario} pode entrar na sala.',
  expulso_sala_temporaria: 'Expulso da sala temporária',
  foi_tirado_sala_pode: '{usuario} foi tirado(a) da sala e não pode voltar.',
  calls_temporarias_desligadas: ['Calls temporárias desligadas.', 'resposta'],
  criar_sala: ['➕ Criar sala', 'campo'],
  consegui_criar_call_preciso: ['Não consegui criar a call. Preciso da permissão **Gerenciar canais**.', 'resposta'],
  pronto_quem_entrar_ganha: ['Pronto! Quem entrar em {canal} ganha uma sala própria (nome: "{nome}"). O dono controla com `/sala`.', 'resposta'],
  calls_temporarias: 'Calls temporárias',
  criar_sala_nome_sala: 'Criar sala: <#{criador}> · nome "{nome}" · {total} sala(s) aberta(s)',
  desligado_salas_configurar: 'Desligado (`/salas configurar`)',
});

/**
 * Calls temporárias: quem entra na call "➕ Criar sala" ganha uma call só dele,
 * que é apagada quando fica vazia. O dono controla a sala com /sala.
 */

const salas = colecao('salas_temporarias'); // guild -> canalId -> { dono, criada }
const PADRAO = { criador: null, categoria: null, nome: null, limite: 0 };
const cfg = (guildId) => ajustes(guildId, 'callstemp', PADRAO);
const nomeSala = (c) => modeloOu(c.nome, 'Sala de {nome}', tx('nome_sala_padrao'));
const espera = new Map(); // anti-spam: userId -> quando criou a última

const salaDe = (guildId, canalId) => salas.ler(guildId, canalId);

async function criarSala(state) {
  const c = cfg(state.guild.id);
  const membro = state.member;
  if (Date.now() - (espera.get(membro.id) ?? 0) < 10_000) {
    await membro.voice.disconnect(tx('aguarde_criar_outra_sala')).catch(() => {});
    return;
  }
  espera.set(membro.id, Date.now());
  const parent = (c.categoria && state.guild.channels.cache.get(c.categoria)?.id) || state.channel.parentId || undefined;
  const nome = preencher(nomeSala(c), { nome: membro.displayName, usuario: membro.user.username }).slice(0, 100);
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
  const ok = await membro.voice.setChannel(canal, tx('sala_temporaria')).then(() => true, () => false);
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
    if (!s) return responder(i, tx('entre_sua_sala_temporaria'), 'erro');
    const sub = i.options.getSubcommand();

    if (sub === 'reivindicar') {
      if (s.dono === i.user.id) return responder(i, tx('voce_ja_dono_desta'), 'aviso');
      if (canal.members.has(s.dono)) return responder(i, tx('dono_ainda_esta_sala', { dono: s.dono }), 'erro');
      s.dono = i.user.id;
      salas.salvar();
      await canal.permissionOverwrites.edit(i.user.id, { ViewChannel: true, Connect: true, Speak: true }).catch(() => {});
      return responder(i, tx('agora_sala_sua_use'), 'sucesso');
    }
    if (s.dono !== i.user.id) return responder(i, tx('so_dono_sala_pode', { dono: s.dono }), 'erro');

    const tentar = async (fn, ok) => {
      const deu = await fn().then(() => true, () => false);
      return responder(i, deu ? ok : tx('consegui_confira_minhas_permissoes'), deu ? 'sucesso' : 'erro');
    };
    if (sub === 'nome') {
      const nome = i.options.getString('nome');
      // o Discord só deixa renomear 2 vezes a cada 10 minutos: responde antes de esperar
      await i.deferReply({ flags: 64 });
      const ok = await canal.setName(nome).then(() => true, () => false);
      return i.editReply(ok ? tx('sala_renomeada', { nome }) : tx('consegui_renomear_agora_discord'));
    }
    if (sub === 'limite') {
      const n = i.options.getInteger('pessoas');
      return tentar(() => canal.setUserLimit(n), n ? tx('limite_pessoa', { limite: n }) : tx('sala_sem_limite'));
    }
    if (sub === 'trancar') return tentar(() => canal.permissionOverwrites.edit(i.guild.roles.everyone, { Connect: false }), tx('sala_trancada'));
    if (sub === 'destrancar') return tentar(() => canal.permissionOverwrites.edit(i.guild.roles.everyone, { Connect: null }), tx('sala_liberada'));
    const u = i.options.getUser('usuario');
    if (u.id === i.user.id) return responder(i, tx('escolha_outra_pessoa'), 'erro');
    if (sub === 'permitir') return tentar(() => canal.permissionOverwrites.edit(u.id, { ViewChannel: true, Connect: true }), tx('pode_entrar_sala', { usuario: u }));
    // expulsar
    return tentar(async () => {
      await canal.permissionOverwrites.edit(u.id, { Connect: false });
      const m = canal.members.get(u.id);
      if (m) await m.voice.disconnect(tx('expulso_sala_temporaria'));
    }, tx('foi_tirado_sala_pode', { usuario: u }));
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
      return responder(i, tx('calls_temporarias_desligadas'), 'sucesso');
    }
    let canal = i.options.getChannel('canal');
    const categoria = i.options.getChannel('categoria');
    if (!canal) {
      canal = await i.guild.channels
        .create({ name: tx('criar_sala'), type: ChannelType.GuildVoice, parent: categoria?.id, reason: 'Calls temporárias' })
        .catch(() => null);
      if (!canal) return responder(i, tx('consegui_criar_call_preciso'), 'erro');
    }
    c.criador = canal.id;
    if (categoria) c.categoria = categoria.id;
    const nome = i.options.getString('nome');
    if (nome) c.nome = nome;
    const limite = i.options.getInteger('limite');
    if (limite !== null) c.limite = limite;
    salvarAjustes();
    return responder(i, tx('pronto_quem_entrar_ganha', { canal, nome: nomeSala(c) }), 'sucesso');
  },
};

export default {
  id: 'callstemp',
  nome: tx('calls_temporarias'),
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
      return [c.criador ? tx('criar_sala_nome_sala', { criador: c.criador, nome: nomeSala(c), total: n }) : tx('desligado_salas_configurar')];
    },
  },
};
