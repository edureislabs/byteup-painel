import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { embed, responder, lerDuracao, duracaoTexto, ts, fmt, cortar } from '../core/util.js';

/** Utilidades: informações de membros e do servidor, avatar e lembretes. */

const lembretes = colecao('lembretes');
const VERIFICACAO = ['Nenhuma', 'Baixa', 'Média', 'Alta', 'Muito alta'];

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
        { name: 'ID', value: user.id, inline: true },
        { name: 'Conta criada', value: `${ts(user.createdTimestamp, 'd')} (${ts(user.createdTimestamp)})`, inline: true },
      );
    if (membro) {
      const cargos = membro.roles.cache.filter((r) => r.id !== i.guildId).sort((a, b) => b.position - a.position);
      e.addFields(
        { name: 'Entrou no servidor', value: `${ts(membro.joinedTimestamp, 'd')} (${ts(membro.joinedTimestamp)})`, inline: true },
        { name: 'Apelido', value: membro.nickname || '—', inline: true },
        { name: `Cargos (${cargos.size})`, value: cortar(cargos.map((r) => `${r}`).join(' ') || 'nenhum', 1024) },
      );
      if (membro.premiumSince) e.addFields({ name: 'Impulsiona desde', value: ts(membro.premiumSinceTimestamp, 'd'), inline: true });
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
        { name: 'Dono', value: dono ? `${dono.user}` : '—', inline: true },
        { name: 'Criado em', value: `${ts(g.createdTimestamp, 'd')} (${ts(g.createdTimestamp)})`, inline: true },
        { name: 'ID', value: g.id, inline: true },
        { name: 'Membros', value: `${fmt(g.memberCount)}${g.approximatePresenceCount ? ` · ${fmt(g.approximatePresenceCount)} online` : ''}`, inline: true },
        {
          name: 'Canais',
          value: `${conta(ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildForum)} texto · ${conta(ChannelType.GuildVoice, ChannelType.GuildStageVoice)} voz · ${conta(ChannelType.GuildCategory)} categorias`,
          inline: true,
        },
        { name: 'Cargos', value: fmt(g.roles.cache.size - 1), inline: true },
        { name: 'Emojis', value: fmt(g.emojis.cache.size), inline: true },
        { name: 'Impulsos', value: `${g.premiumSubscriptionCount ?? 0} (nível ${g.premiumTier})`, inline: true },
        { name: 'Verificação', value: VERIFICACAO[g.verificationLevel] ?? '—', inline: true },
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
    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Abrir no navegador').setURL(url),
      ...(membro?.avatar ? [new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel('Avatar global').setURL(user.displayAvatarURL({ size: 1024 }))] : [])
    );
    await i.reply({ embeds: [embed(i.guildId).setTitle(`Avatar de ${user.username}`).setImage(url)], components: [row] });
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
    if (!ms || ms < 30_000 || ms > 365 * 86_400_000) return responder(i, 'Tempo inválido (ex.: 10m, 2h, 1d; entre 30s e 1 ano).', 'erro');
    const meus = Object.values(lembretes.raiz).filter((l) => l.usuario === i.user.id).length;
    if (meus >= 20) return responder(i, 'Você já tem 20 lembretes pendentes.', 'erro');
    const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
    lembretes.raiz[id] = { usuario: i.user.id, canal: i.channelId, texto: i.options.getString('texto'), quando: Date.now() + ms, criado: Date.now() };
    lembretes.salvar();
    return responder(i, `Combinado! Te lembro ${ts(Date.now() + ms)} (em ${duracaoTexto(ms)}).`, 'sucesso');
  },
};

export default {
  id: 'utilidades',
  nome: 'Utilidades',
  comandos: [userinfo, serverinfo, avatar, lembrete],
  aoIniciar(client) {
    const checar = async () => {
      const agora = Date.now();
      for (const [id, l] of Object.entries(lembretes.raiz)) {
        if (l.quando > agora) continue;
        delete lembretes.raiz[id];
        lembretes.salvar();
        const texto = `⏰ <@${l.usuario}>, você pediu para eu te lembrar (${ts(l.criado)}):\n> ${cortar(l.texto, 500)}`;
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
