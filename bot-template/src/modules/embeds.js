import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { cor, responder } from '../core/util.js';

/**
 * Criador de embeds: mensagens bonitas (título, texto, cor, imagem, rodapé e botões de link)
 * sem saber programar. /embed criar abre um formulário; /embed editar muda uma já enviada.
 */

// o formulário não tem lugar para o canal e os botões: guardamos aqui entre o comando e o envio
const rascunhos = new Map(); // userId -> { canal, botoes, mensagem?, expira }
const URL_OK = /^https?:\/\/\S+$/i;

function formulario(id, atual = {}) {
  const campo = (customId, label, estilo, max, valor, obrigatorio = false) => {
    const t = new TextInputBuilder().setCustomId(customId).setLabel(label).setStyle(estilo).setMaxLength(max).setRequired(obrigatorio);
    if (valor) t.setValue(String(valor).slice(0, max));
    return new ActionRowBuilder().addComponents(t);
  };
  return new ModalBuilder()
    .setCustomId(id)
    .setTitle('Criador de embed')
    .addComponents(
      campo('titulo', 'Título', TextInputStyle.Short, 256, atual.title),
      campo('texto', 'Texto (aceita **negrito**, listas, links...)', TextInputStyle.Paragraph, 4000, atual.description, true),
      campo('cor', 'Cor (ex.: #5865F2)', TextInputStyle.Short, 7, atual.color != null ? `#${atual.color.toString(16).padStart(6, '0')}` : ''),
      campo('imagem', 'Link da imagem grande (opcional)', TextInputStyle.Short, 500, atual.image?.url),
      campo('rodape', 'Rodapé (opcional)', TextInputStyle.Short, 2048, atual.footer?.text)
    );
}

function montar(i, guildId) {
  const f = (k) => i.fields.getTextInputValue(k).trim();
  const erros = [];
  const e = new EmbedBuilder().setDescription(f('texto'));
  if (f('titulo')) e.setTitle(f('titulo'));
  const c = f('cor');
  if (c) {
    const m = /^#?([0-9a-f]{6})$/i.exec(c);
    if (m) e.setColor(parseInt(m[1], 16));
    else erros.push('cor inválida (use #RRGGBB)');
  }
  if (!c || erros.length) e.setColor(cor(guildId));
  const img = f('imagem');
  if (img) {
    if (URL_OK.test(img)) e.setImage(img);
    else erros.push('o link da imagem precisa começar com https://');
  }
  if (f('rodape')) e.setFooter({ text: f('rodape') });
  return { e, erros };
}

const linhaBotoes = (botoes) =>
  botoes.length ? [new ActionRowBuilder().addComponents(botoes.map((b) => new ButtonBuilder().setStyle(ButtonStyle.Link).setLabel(b.texto).setURL(b.link)))] : [];

const componentes = {
  async eb(i, [acao]) {
    if (!i.isModalSubmit()) return;
    const r = rascunhos.get(i.user.id);
    rascunhos.delete(i.user.id);
    if (!r || r.expira < Date.now()) return responder(i, 'O formulário expirou. Use o comando de novo.', 'erro');
    const { e, erros } = montar(i, i.guildId);
    const aviso = erros.length ? `\n⚠️ Ignorei: ${erros.join('; ')}.` : '';
    if (acao === 'criar') {
      const canal = i.guild.channels.cache.get(r.canal);
      const ok = canal ? await canal.send({ embeds: [e], components: linhaBotoes(r.botoes) }).then(() => true, () => false) : false;
      return responder(i, ok ? `Embed enviado em ${canal}.${aviso}` : 'Não consegui enviar. Confira as minhas permissões no canal.', ok ? 'sucesso' : 'erro');
    }
    if (acao === 'editar') {
      const canal = i.guild.channels.cache.get(r.canal);
      const msg = await canal?.messages.fetch(r.mensagem).catch(() => null);
      if (!msg) return responder(i, 'Não achei mais a mensagem.', 'erro');
      const ok = await msg.edit({ embeds: [e] }).then(() => true, () => false);
      return responder(i, ok ? `Embed atualizado.${aviso}` : 'Não consegui editar.', ok ? 'sucesso' : 'erro');
    }
  },
};

const embedCmd = {
  data: new SlashCommandBuilder()
    .setName('embed')
    .setDescription('Cria mensagens bonitas (embeds)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageMessages)
    .addSubcommand((s) => {
      s.setName('criar')
        .setDescription('Abre o formulário para criar um embed')
        .addChannelOption((o) => o.setName('canal').setDescription('Onde enviar (padrão: aqui)').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement));
      for (const n of [1, 2, 3]) {
        s.addStringOption((o) => o.setName(`botao${n}`).setDescription(`Botão de link ${n}: "Texto | https://link" (opcional)`).setMaxLength(300));
      }
      return s;
    })
    .addSubcommand((s) =>
      s
        .setName('editar')
        .setDescription('Edita um embed que eu enviei')
        .addStringOption((o) => o.setName('mensagem').setDescription('Link da mensagem (botão direito → Copiar link)').setRequired(true))
    ),
  async executar(i) {
    const sub = i.options.getSubcommand();
    if (sub === 'criar') {
      const canal = i.options.getChannel('canal') ?? i.channel;
      const botoes = [];
      for (const n of [1, 2, 3]) {
        const v = i.options.getString(`botao${n}`);
        if (!v) continue;
        const [texto, link] = v.split('|').map((x) => x.trim());
        if (!texto || !URL_OK.test(link ?? '')) return responder(i, `O botão ${n} precisa ser assim: **Texto | https://link**`, 'erro');
        botoes.push({ texto: texto.slice(0, 80), link });
      }
      rascunhos.set(i.user.id, { canal: canal.id, botoes, expira: Date.now() + 15 * 60_000 });
      return i.showModal(formulario('eb:criar'));
    }
    // editar
    const m = /(\d{17,20})\/(\d{17,20})\/?$/.exec(i.options.getString('mensagem').trim());
    if (!m) return responder(i, 'Cole o **link** da mensagem (botão direito na mensagem → Copiar link da mensagem).', 'erro');
    const canal = i.guild.channels.cache.get(m[1]);
    const msg = await canal?.messages.fetch(m[2]).catch(() => null);
    if (!msg) return responder(i, 'Não achei essa mensagem neste servidor.', 'erro');
    if (msg.author.id !== i.client.user.id || !msg.embeds.length) return responder(i, 'Só dá para editar embeds enviados por mim.', 'erro');
    rascunhos.set(i.user.id, { canal: canal.id, mensagem: msg.id, botoes: [], expira: Date.now() + 15 * 60_000 });
    return i.showModal(formulario('eb:editar', msg.embeds[0].toJSON?.() ?? msg.embeds[0].data ?? msg.embeds[0]));
  },
};

export default {
  id: 'embeds',
  nome: 'Criador de embeds',
  comandos: [embedCmd],
  componentes,
};
