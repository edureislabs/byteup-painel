import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, embed, responder, ehStaff, cortar, CORES } from '../core/util.js';

/**
 * Formulários: candidatura para a equipe, parceria, denúncia...
 * Cada formulário tem até 5 perguntas (limite do Discord), um painel com botão,
 * um canal onde as respostas chegam e botões para a equipe aprovar ou recusar.
 */

const respostas = colecao('formularios_respostas'); // guild -> msgId -> { form, user, status }
const cfg = (guildId) => ajustes(guildId, 'formularios', { lista: {} });
const LIMITE_FORMS = 10;
const slug = (t) =>
  t
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 20);

const formDe = (guildId, id) => cfg(guildId).lista[id];

async function autocompletarForm(i) {
  const foco = slug(i.options.getFocused() || '');
  const forms = Object.entries(cfg(i.guildId).lista);
  await i.respond(forms.filter(([id, f]) => id.includes(foco) || slug(f.titulo).includes(foco)).slice(0, 25).map(([id, f]) => ({ name: `${f.titulo} (${f.perguntas.length} pergunta(s))`.slice(0, 100), value: id })));
}

function botoesEquipe(desligar = false) {
  return [
    new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId('fm:aprovar').setLabel('Aprovar').setEmoji('✅').setStyle(ButtonStyle.Success).setDisabled(desligar),
      new ButtonBuilder().setCustomId('fm:recusar').setLabel('Recusar').setEmoji('❌').setStyle(ButtonStyle.Danger).setDisabled(desligar)
    ),
  ];
}

async function decidir(i, msg, aprovado, motivo) {
  const r = respostas.ler(i.guildId, msg.id);
  if (!r) return responder(i, 'Esta resposta não está mais no sistema.', 'erro');
  if (r.status !== 'pendente') return responder(i, `Já foi ${r.status}.`, 'aviso');
  r.status = aprovado ? 'aprovada' : 'recusada';
  r.por = i.user.id;
  respostas.salvar();
  const f = formDe(i.guildId, r.form);
  let extra = '';
  if (aprovado && f?.cargo) {
    const membro = await i.guild.members.fetch(r.user).catch(() => null);
    const cargo = i.guild.roles.cache.get(f.cargo);
    if (membro && cargo?.editable) {
      const ok = await membro.roles.add(cargo, `Formulário ${f.titulo} aprovado`).then(() => true, () => false);
      extra = ok ? ` · recebeu ${cargo}` : ' · (não consegui dar o cargo)';
    } else extra = membro ? ' · (não consegui dar o cargo)' : ' · (a pessoa saiu do servidor)';
  }
  const e = EmbedBuilder.from(msg.embeds[0])
    .setColor(aprovado ? CORES.sucesso : CORES.erro)
    .addFields({ name: aprovado ? '✅ Aprovada' : '❌ Recusada', value: `por ${i.user}${extra}${motivo ? `\n**Motivo:** ${cortar(motivo, 900)}` : ''}` });
  await msg.edit({ embeds: [e], components: botoesEquipe(true) }).catch(() => {});
  const user = await i.client.users.fetch(r.user).catch(() => null);
  await user
    ?.send({
      embeds: [
        embed(i.guildId)
          .setColor(aprovado ? CORES.sucesso : CORES.erro)
          .setDescription(`Seu formulário **${f?.titulo ?? r.form}** em **${i.guild.name}** foi **${aprovado ? 'aprovado' : 'recusado'}**.${motivo ? `\n**Motivo:** ${motivo}` : ''}`),
      ],
    })
    .catch(() => {});
  return responder(i, `Resposta ${r.status}${extra}.`, 'sucesso');
}

const componentes = {
  async fm(i, [acao, alvo]) {
    // membro clicou no botão do painel
    if (acao === 'abrir') {
      const f = formDe(i.guildId, alvo);
      if (!f || !f.perguntas.length) return responder(i, 'Este formulário não está mais disponível.', 'erro');
      if (!f.canal) return responder(i, 'Este formulário ainda não tem canal de respostas. Avise a equipe.', 'erro');
      const pendente = Object.values(respostas.ler(i.guildId) ?? {}).some((r) => r.form === alvo && r.user === i.user.id && r.status === 'pendente');
      if (pendente) return responder(i, 'Você já enviou este formulário e ele ainda está sendo analisado.', 'aviso');
      return i.showModal(
        new ModalBuilder()
          .setCustomId(`fm:enviar:${alvo}`)
          .setTitle(cortar(f.titulo, 45))
          .addComponents(
            f.perguntas.map((p, n) =>
              new ActionRowBuilder().addComponents(
                new TextInputBuilder()
                  .setCustomId(`p${n}`)
                  .setLabel(p.texto)
                  .setStyle(p.longa ? TextInputStyle.Paragraph : TextInputStyle.Short)
                  .setRequired(p.obrigatoria)
                  .setMaxLength(p.longa ? 1000 : 200)
              )
            )
          )
      );
    }
    // respostas enviadas
    if (acao === 'enviar' && i.isModalSubmit()) {
      const f = formDe(i.guildId, alvo);
      const canal = f?.canal && i.guild.channels.cache.get(f.canal);
      if (!canal?.isTextBased()) return responder(i, 'Não achei o canal de respostas. Avise a equipe.', 'erro');
      const e = embed(i.guildId)
        .setAuthor({ name: `${i.user.tag} (${i.user.id})`, iconURL: i.user.displayAvatarURL() })
        .setTitle(`📝 ${f.titulo}`)
        .addFields(f.perguntas.map((p, n) => ({ name: cortar(p.texto, 256), value: cortar(i.fields.getTextInputValue(`p${n}`) || '—', 1024) })))
        .addFields({ name: 'Conta criada', value: `<t:${Math.floor(i.user.createdTimestamp / 1000)}:R>`, inline: true })
        .setTimestamp();
      const msg = await canal.send({ content: f.mencionar ? `<@&${f.mencionar}>` : undefined, embeds: [e], components: botoesEquipe(), allowedMentions: { roles: f.mencionar ? [f.mencionar] : [] } }).catch(() => null);
      if (!msg) return responder(i, 'Não consegui enviar. Avise a equipe para conferir as minhas permissões.', 'erro');
      respostas.de(i.guildId)[msg.id] = { form: alvo, user: i.user.id, status: 'pendente', em: Date.now() };
      respostas.salvar();
      return responder(i, 'Formulário enviado! Você recebe a resposta na DM.', 'sucesso');
    }
    // equipe
    if (acao === 'aprovar' || acao === 'recusar') {
      if (!ehStaff(i.member)) return responder(i, 'Só a equipe pode decidir.', 'erro');
      if (acao === 'aprovar') return decidir(i, i.message, true, null);
      return i.showModal(
        new ModalBuilder()
          .setCustomId(`fm:motivo:${i.message.id}`)
          .setTitle('Recusar')
          .addComponents(new ActionRowBuilder().addComponents(new TextInputBuilder().setCustomId('motivo').setLabel('Motivo (vai na DM da pessoa)').setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500)))
      );
    }
    if (acao === 'motivo' && i.isModalSubmit()) {
      if (!ehStaff(i.member)) return responder(i, 'Só a equipe pode decidir.', 'erro');
      const msg = await i.channel.messages.fetch(alvo).catch(() => null);
      if (!msg) return responder(i, 'Não achei a mensagem.', 'erro');
      return decidir(i, msg, false, i.fields.getTextInputValue('motivo').trim());
    }
  },
};

const formulario = {
  data: new SlashCommandBuilder()
    .setName('formulario')
    .setDescription('Formulários (candidatura, parceria, denúncia...)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('criar')
        .setDescription('Cria um formulário')
        .addStringOption((o) => o.setName('titulo').setDescription('Ex.: Candidatura para a equipe').setRequired(true).setMaxLength(45))
        .addChannelOption((o) => o.setName('canal').setDescription('Onde as respostas chegam (só a equipe deve ver)').setRequired(true).addChannelTypes(ChannelType.GuildText))
        .addRoleOption((o) => o.setName('cargo').setDescription('Cargo dado quando aprovado (opcional)'))
        .addRoleOption((o) => o.setName('mencionar').setDescription('Cargo avisado a cada resposta nova (opcional)'))
    )
    .addSubcommand((s) =>
      s
        .setName('pergunta')
        .setDescription('Adiciona uma pergunta (máximo 5)')
        .addStringOption((o) => o.setName('formulario').setDescription('Qual formulário').setRequired(true).setAutocomplete(true))
        .addStringOption((o) => o.setName('texto').setDescription('A pergunta (até 45 letras)').setRequired(true).setMaxLength(45))
        .addBooleanOption((o) => o.setName('longa').setDescription('Resposta longa (vários parágrafos)?'))
        .addBooleanOption((o) => o.setName('obrigatoria').setDescription('Obrigatória? (padrão: sim)'))
    )
    .addSubcommand((s) =>
      s
        .setName('tirar-pergunta')
        .setDescription('Remove uma pergunta')
        .addStringOption((o) => o.setName('formulario').setDescription('Qual formulário').setRequired(true).setAutocomplete(true))
        .addIntegerOption((o) => o.setName('numero').setDescription('Número da pergunta (veja em /formulario lista)').setRequired(true).setMinValue(1).setMaxValue(5))
    )
    .addSubcommand((s) =>
      s
        .setName('painel')
        .setDescription('Envia o painel com o botão para responder')
        .addStringOption((o) => o.setName('formulario').setDescription('Qual formulário').setRequired(true).setAutocomplete(true))
        .addChannelOption((o) => o.setName('canal').setDescription('Onde enviar (padrão: aqui)').addChannelTypes(ChannelType.GuildText))
        .addStringOption((o) => o.setName('mensagem').setDescription('Texto do painel').setMaxLength(1500))
    )
    .addSubcommand((s) => s.setName('lista').setDescription('Mostra os formulários e as perguntas'))
    .addSubcommand((s) =>
      s
        .setName('apagar')
        .setDescription('Apaga um formulário')
        .addStringOption((o) => o.setName('formulario').setDescription('Qual formulário').setRequired(true).setAutocomplete(true))
    ),
  async executar(i) {
    const c = cfg(i.guildId);
    const sub = i.options.getSubcommand();
    if (sub === 'lista') {
      const forms = Object.entries(c.lista);
      if (!forms.length) return responder(i, 'Nenhum formulário. Use `/formulario criar`.', 'aviso');
      const e = embed(i.guildId).setTitle('📝 Formulários');
      for (const [id, f] of forms) {
        e.addFields({
          name: `${f.titulo} · \`${id}\``,
          value: cortar(
            [`Respostas em <#${f.canal}>${f.cargo ? ` · aprovado ganha <@&${f.cargo}>` : ''}`, ...f.perguntas.map((p, n) => `${n + 1}. ${p.texto}${p.longa ? ' (longa)' : ''}${p.obrigatoria ? '' : ' (opcional)'}`)].join('\n') ||
              'Sem perguntas',
            1024
          ),
        });
      }
      return i.reply({ embeds: [e], flags: 64 });
    }
    if (sub === 'criar') {
      if (Object.keys(c.lista).length >= LIMITE_FORMS) return responder(i, `No máximo ${LIMITE_FORMS} formulários.`, 'erro');
      const titulo = i.options.getString('titulo').trim();
      let id = slug(titulo) || 'form';
      while (c.lista[id]) id = `${id.slice(0, 17)}-${Math.floor(Math.random() * 90 + 10)}`;
      const cargo = i.options.getRole('cargo');
      if (cargo && (cargo.permissions.has(PermissionFlagsBits.Administrator) || cargo.managed)) return responder(i, 'O cargo de aprovação não pode ser de administrador nem de bot.', 'erro');
      if (cargo && !cargo.editable) return responder(i, `Meu cargo precisa ficar acima de ${cargo}.`, 'erro');
      c.lista[id] = { titulo, canal: i.options.getChannel('canal').id, cargo: cargo?.id ?? null, mencionar: i.options.getRole('mencionar')?.id ?? null, perguntas: [] };
      salvarAjustes();
      return responder(i, `Formulário **${titulo}** criado. Agora adicione as perguntas com \`/formulario pergunta\` (até 5) e envie o painel com \`/formulario painel\`.`, 'sucesso');
    }
    const id = i.options.getString('formulario');
    const f = c.lista[id];
    if (!f) return responder(i, 'Formulário não encontrado. Escolha na lista enquanto digita.', 'erro');
    if (sub === 'pergunta') {
      if (f.perguntas.length >= 5) return responder(i, 'O Discord aceita no máximo 5 perguntas por formulário.', 'erro');
      f.perguntas.push({ texto: i.options.getString('texto').trim(), longa: i.options.getBoolean('longa') ?? false, obrigatoria: i.options.getBoolean('obrigatoria') ?? true });
      salvarAjustes();
      return responder(i, `Pergunta ${f.perguntas.length}/5 adicionada em **${f.titulo}**.`, 'sucesso');
    }
    if (sub === 'tirar-pergunta') {
      const n = i.options.getInteger('numero');
      if (n > f.perguntas.length) return responder(i, `Este formulário tem ${f.perguntas.length} pergunta(s).`, 'erro');
      f.perguntas.splice(n - 1, 1);
      salvarAjustes();
      return responder(i, `Pergunta ${n} removida.`, 'sucesso');
    }
    if (sub === 'apagar') {
      delete c.lista[id];
      salvarAjustes();
      return responder(i, `Formulário **${f.titulo}** apagado. (Painéis já enviados param de funcionar.)`, 'sucesso');
    }
    // painel
    if (!f.perguntas.length) return responder(i, 'Adicione pelo menos uma pergunta antes (`/formulario pergunta`).', 'erro');
    const canal = i.options.getChannel('canal') ?? i.channel;
    const msg = await canal
      .send({
        embeds: [embed(i.guildId).setTitle(`📝 ${f.titulo}`).setDescription(i.options.getString('mensagem') || 'Clique no botão abaixo para preencher.')],
        components: [new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId(`fm:abrir:${id}`).setLabel('Preencher').setEmoji('📝').setStyle(ButtonStyle.Primary))],
      })
      .catch(() => null);
    if (!msg) return responder(i, `Não consegui enviar em ${canal}. Confira as minhas permissões.`, 'erro');
    return responder(i, `Painel enviado em ${canal}.`, 'sucesso');
  },
  autocompletar: autocompletarForm,
};

export default {
  id: 'formularios',
  nome: 'Formulários',
  comandos: [formulario],
  componentes,
  permissoes: [PermissionFlagsBits.ManageRoles],
  config: {
    resumo(guild) {
      const n = Object.keys(cfg(guild.id).lista).length;
      const pend = Object.values(respostas.ler(guild.id) ?? {}).filter((r) => r.status === 'pendente').length;
      return [n ? `${n} formulário(s) · ${pend} resposta(s) esperando a equipe` : 'Nenhum (`/formulario criar`)'];
    },
  },
};
