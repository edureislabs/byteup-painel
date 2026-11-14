import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { embed, responder, lerDuracao, duracaoTexto, ts, fmt, cortar } from '../core/util.js';
import { textos, botoes, fileira, fileiras } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('utilidades', {
  nenhuma: 'Nenhuma',
  baixa: 'Baixa',
  media: 'Média',
  alta: 'Alta',
  muito_alta: 'Muito alta',
  id: ['ID', 'campo'],
  conta_criada: ['Conta criada', 'campo'],
  entrou_servidor: ['Entrou no servidor', 'campo'],
  apelido: ['Apelido', 'campo'],
  cargos: ['Cargos ({cargos_total})', 'campo'],
  impulsiona_desde: ['Impulsiona desde', 'campo'],
  dono: ['Dono', 'campo'],
  criado: ['Criado em', 'campo'],
  membros: ['Membros', 'campo'],
  online: ' · {online} online',
  canais: ['Canais', 'campo'],
  texto_voz_categorias: '{canais_texto} texto · {canais_voz} voz · {categorias} categorias',
  cargos_2: ['Cargos', 'campo'],
  emojis: ['Emojis', 'campo'],
  impulsos: ['Impulsos', 'campo'],
  nivel: '{impulsos} (nível {nivel})',
  verificacao: ['Verificação', 'campo'],
  abrir_navegador: ['Abrir no navegador', 'botao'],
  avatar_global: ['Avatar global', 'botao'],
  avatar: ['Avatar de {nome}', 'titulo'],
  tempo_invalido_ex_10m: ['Tempo inválido (ex.: 10m, 2h, 1d; entre 30s e 1 ano).', 'resposta'],
  voce_ja_tem_20: ['Você já tem 20 lembretes pendentes.', 'resposta'],
  combinado_te_lembro: ['Combinado! Te lembro {quando} (em {duracao}).', 'resposta'],
  utilidades: 'Utilidades',
  voce_pediu_eu_te: '⏰ <@{usuario}>, você pediu para eu te lembrar ({quando}):\n> {lembrete}',
});

// Botões (texto, emoji e cor personalizáveis; alguns podem ser escondidos)
const bt = botoes('utilidades', {
  navegador: { nome: 'Abrir no navegador (/avatar)', rotulo: 'abrir_navegador', emoji: '-', estilo: 'Link', ocultavel: true },
  global: { nome: 'Avatar global (/avatar)', rotulo: 'avatar_global', emoji: '-', estilo: 'Link', ocultavel: true },
});

/** Utilidades: informações de membros e do servidor, avatar e lembretes. */

const lembretes = colecao('lembretes');
const VERIFICACAO = [tx('nenhuma'), tx('baixa'), tx('media'), tx('alta'), tx('muito_alta')];

const userinfo = {
  data: new SlashCommandBuilder()
    .setName('userinfo')
    .setDescription('Informações de um membro')
    .addUserOption((o) => o.setName('usuario').setDescription('Padrão: você')),
  async executar(i) {
    const user = await (i.options.getUser('usuario') ?? i.user).fetch().catch(() => i.options.getUser('usuario') ?? i.user);
    const membro = i.options.getMember('usuario') ?? (user.id === i.user.id ? i.member : null);
    const e = embed(i.guildId)
      .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
      .setThumbnail(user.displayAvatarURL({ size: 256 }))
      .addFields(
        { name: tx('id'), value: user.id, inline: true },
        { name: tx('conta_criada'), value: `${ts(user.createdTimestamp, 'd')} (${ts(user.createdTimestamp)})`, inline: true },
      );
    if (membro) {
      const cargos = membro.roles.cache.filter((r) => r.id !== i.guildId).sort((a, b) => b.position - a.position);
      e.addFields(
        { name: tx('entrou_servidor'), value: `${ts(membro.joinedTimestamp, 'd')} (${ts(membro.joinedTimestamp)})`, inline: true },
        { name: tx('apelido'), value: membro.nickname || '—', inline: true },
        { name: tx('cargos', { cargos_total: cargos.size }), value: cortar(cargos.map((r) => `${r}`).join(' ') || 'nenhum', 1024) },
      );
      if (membro.premiumSince) e.addFields({ name: tx('impulsiona_desde'), value: ts(membro.premiumSinceTimestamp, 'd'), inline: true });
      if (membro.displayHexColor !== '#000000') e.setColor(membro.displayColor);
    }
    if (user.bannerURL()) e.setImage(user.bannerURL({ size: 1024 }));
    await i.reply({ embeds: [e], allowedMentions: { parse: [] } });
  },
};

const serverinfo = {
  data: new SlashCommandBuilder().setName('serverinfo').setDescription('Informações do servidor'),
  async executar(i) {
    const g = await i.guild.fetch();
    const canais = g.channels.cache;
    const conta = (...t) => canais.filter((c) => t.includes(c.type)).size;
    const dono = await g.fetchOwner().catch(() => null);
    const e = embed(i.guildId)
      .setTitle(g.name)
      .setThumbnail(g.iconURL({ size: 256 }))
      .addFields(
        { name: tx('dono'), value: dono ? `${dono.user}` : '—', inline: true },
        { name: tx('criado'), value: `${ts(g.createdTimestamp, 'd')} (${ts(g.createdTimestamp)})`, inline: true },
        { name: tx('id'), value: g.id, inline: true },
        { name: tx('membros'), value: `${fmt(g.memberCount)}${g.approximatePresenceCount ? tx('online', { online: fmt(g.approximatePresenceCount) }) : ''}`, inline: true },
        {
          name: tx('canais'),
          value: tx('texto_voz_categorias', { canais_texto: conta(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum), canais_voz: conta(ChannelType.GuildVoice, ChannelType.GuildStageVoice), categorias: conta(ChannelType.GuildCategory) }),
          inline: true,
        },
        { name: tx('cargos_2'), value: fmt(g.roles.cache.size - 1), inline: true },
        { name: tx('emojis'), value: fmt(g.emojis.cache.size), inline: true },
        { name: tx('impulsos'), value: tx('nivel', { impulsos: g.premiumSubscriptionCount ?? 0, nivel: g.premiumTier }), inline: true },
        { name: tx('verificacao'), value: VERIFICACAO[g.verificationLevel] ?? '—', inline: true },
      );
    if (g.description) e.setDescription(g.description);
    if (g.bannerURL()) e.setImage(g.bannerURL({ size: 1024 }));
    await i.reply({ embeds: [e], allowedMentions: { parse: [] } });
  },
};

const avatar = {
  data: new SlashCommandBuilder()
    .setName('avatar')
    .setDescription('Mostra o avatar de alguém')
    .addUserOption((o) => o.setName('usuario').setDescription('Padrão: você')),
  async executar(i) {
    const user = i.options.getUser('usuario') ?? i.user;
    const membro = i.options.getMember('usuario') ?? (user.id === i.user.id ? i.member : null);
    const url = (membro?.avatar ? membro.displayAvatarURL({ size: 1024 }) : null) ?? user.displayAvatarURL({ size: 1024 });
    const row = fileira(bt('navegador')?.setURL(url), membro?.avatar ? bt('global')?.setURL(user.displayAvatarURL({ size: 1024 })) : null);
    await i.reply({ embeds: [embed(i.guildId).setTitle(tx('avatar', { nome: user.username })).setImage(url)], components: fileiras(row) });
  },
};

const lembrete = {
  data: new SlashCommandBuilder()
    .setName('lembrete')
    .setDescription('O bot te lembra de algo depois')
    .addStringOption((o) => o.setName('tempo').setDescription('Daqui a quanto tempo: 10m, 2h, 1d').setRequired(true).setMaxLength(20))
    .addStringOption((o) => o.setName('texto').setDescription('Do que lembrar').setRequired(true).setMaxLength(500)),
  async executar(i) {
    const ms = lerDuracao(i.options.getString('tempo'));
    if (!ms || ms < 30_000 || ms > 365 * 86_400_000) return responder(i, tx('tempo_invalido_ex_10m'), 'erro');
    const meus = Object.values(lembretes.raiz).filter((l) => l.usuario === i.user.id).length;
    if (meus >= 20) return responder(i, tx('voce_ja_tem_20'), 'erro');
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    lembretes.raiz[id] = { usuario: i.user.id, canal: i.channelId, texto: i.options.getString('texto'), quando: Date.now() + ms, criado: Date.now() };
    lembretes.salvar();
    return responder(i, tx('combinado_te_lembro', { quando: ts(Date.now() + ms), duracao: duracaoTexto(ms) }), 'sucesso');
  },
};

export default {
  id: 'utilidades',
  nome: tx('utilidades'),
  comandos: [userinfo, serverinfo, avatar, lembrete],
  aoIniciar(client) {
    const checar = async () => {
      const agora = Date.now();
      for (const [id, l] of Object.entries(lembretes.raiz)) {
        if (l.quando > agora) continue;
        delete lembretes.raiz[id];
        lembretes.salvar();
        const texto = tx('voce_pediu_eu_te', { usuario: l.usuario, quando: ts(l.criado), lembrete: cortar(l.texto, 500) });
        const user = await client.users.fetch(l.usuario).catch(() => null);
        const foiDm = await user?.send(texto).then(() => true).catch(() => false);
        if (!foiDm) {
          const canal = await client.channels.fetch(l.canal).catch(() => null);
          await canal?.send({ content: texto, allowedMentions: { users: [l.usuario] } }).catch(() => {});
        }
      }
    };
    checar();
    setInterval(checar, 15_000);
  },
};
