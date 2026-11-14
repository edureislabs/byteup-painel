import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { cor, responder } from '../core/util.js';
import { textos, modais } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('embeds', {
  criador_embed: ['Criador de embed', 'rotulo'],
  titulo: 'Título',
  texto_aceita_negrito_listas: 'Texto (aceita **negrito**, listas, links...)',
  cor_ex_5865f2: 'Cor (ex.: #5865F2)',
  link_imagem_grande_opcional: 'Link da imagem grande (opcional)',
  rodape_opcional: 'Rodapé (opcional)',
  formulario_expirou_use_comando: ['O formulário expirou. Use o comando de novo.', 'resposta'],
  ignorei: '\n⚠️ Ignorei: {erros}.',
  embed_enviado: 'Embed enviado em {canal}.{aviso}',
  consegui_enviar_confira_minhas: 'Não consegui enviar. Confira as minhas permissões no canal.',
  achei_mais_mensagem: ['Não achei mais a mensagem.', 'resposta'],
  embed_atualizado: 'Embed atualizado.{aviso}',
  consegui_editar: 'Não consegui editar.',
  botao_precisa_ser_assim: ['O botão {numero} precisa ser assim: **Texto | https://link**', 'resposta'],
  cole_link_mensagem_botao: ['Cole o **link** da mensagem (botão direito na mensagem → Copiar link da mensagem).', 'resposta'],
  achei_essa_mensagem_neste: ['Não achei essa mensagem neste servidor.', 'resposta'],
  so_editar_embeds_enviados: ['Só dá para editar embeds enviados por mim.', 'resposta'],
  criador_embeds: 'Criador de embeds',
  cor_invalida_use_rrggbb: 'cor inválida (use #RRGGBB)',
  link_imagem_precisa_comecar: 'o link da imagem precisa começar com https://',
});

modais('embeds', { criador: { nome: 'Criador de embed (/embed)', textos: ['criador_embed', 'titulo', 'texto_aceita_negrito_listas', 'cor_ex_5865f2', 'link_imagem_grande_opcional', 'rodape_opcional'] } });

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
    .setTitle(tx('criador_embed'))
    .addComponents(
      campo('titulo', tx('titulo'), TextInputStyle.Short, 256, atual.title),
      campo('texto', tx('texto_aceita_negrito_listas'), TextInputStyle.Paragraph, 4000, atual.description, true),
      campo('cor', tx('cor_ex_5865f2'), TextInputStyle.Short, 7, atual.color != null ? `#${atual.color.toString(16).padStart(6, '0')}` : ''),
      campo('imagem', tx('link_imagem_grande_opcional'), TextInputStyle.Short, 500, atual.image?.url),
      campo('rodape', tx('rodape_opcional'), TextInputStyle.Short, 2048, atual.footer?.text)
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
    else erros.push(tx('cor_invalida_use_rrggbb'));
  }
  if (!c || erros.length) e.setColor(cor(guildId));
  const img = f('imagem');
  if (img) {
    if (URL_OK.test(img)) e.setImage(img);
    else erros.push(tx('link_imagem_precisa_comecar'));
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
    if (!r || r.expira < Date.now()) return responder(i, tx('formulario_expirou_use_comando'), 'erro');
    const { e, erros } = montar(i, i.guildId);
    const aviso = erros.length ? tx('ignorei', { erros: erros.join('; ') }) : '';
    if (acao === 'criar') {
      const canal = i.guild.channels.cache.get(r.canal);
      const ok = canal ? await canal.send({ embeds: [e], components: linhaBotoes(r.botoes) }).then(() => true, () => false) : false;
      return responder(i, ok ? tx('embed_enviado', { canal, aviso }) : tx('consegui_enviar_confira_minhas'), ok ? 'sucesso' : 'erro');
    }
    if (acao === 'editar') {
      const canal = i.guild.channels.cache.get(r.canal);
      const msg = await canal?.messages.fetch(r.mensagem).catch(() => null);
      if (!msg) return responder(i, tx('achei_mais_mensagem'), 'erro');
      const ok = await msg.edit({ embeds: [e] }).then(() => true, () => false);
      return responder(i, ok ? tx('embed_atualizado', { aviso }) : tx('consegui_editar'), ok ? 'sucesso' : 'erro');
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
        if (!texto || !URL_OK.test(link ?? '')) return responder(i, tx('botao_precisa_ser_assim', { numero: n }), 'erro');
        botoes.push({ texto: texto.slice(0, 80), link });
      }
      rascunhos.set(i.user.id, { canal: canal.id, botoes, expira: Date.now() + 15 * 60_000 });
      return i.showModal(formulario('eb:criar'));
    }
    // editar
    const m = /(\d{17,20})\/(\d{17,20})\/?$/.exec(i.options.getString('mensagem').trim());
    if (!m) return responder(i, tx('cole_link_mensagem_botao'), 'erro');
    const canal = i.guild.channels.cache.get(m[1]);
    const msg = await canal?.messages.fetch(m[2]).catch(() => null);
    if (!msg) return responder(i, tx('achei_essa_mensagem_neste'), 'erro');
    if (msg.author.id !== i.client.user.id || !msg.embeds.length) return responder(i, tx('so_editar_embeds_enviados'), 'erro');
    rascunhos.set(i.user.id, { canal: canal.id, mensagem: msg.id, botoes: [], expira: Date.now() + 15 * 60_000 });
    return i.showModal(formulario('eb:editar', msg.embeds[0].toJSON?.() ?? msg.embeds[0].data ?? msg.embeds[0]));
  },
};

export default {
  id: 'embeds',
  nome: tx('criador_embeds'),
  comandos: [embedCmd],
  componentes,
};
