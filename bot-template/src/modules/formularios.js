import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, EmbedBuilder, ModalBuilder, PermissionFlagsBits, SlashCommandBuilder, TextInputBuilder, TextInputStyle } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, embed, responder, ehStaff, cortar, CORES, imagens } from '../core/util.js';
import { textos, visuais, botoes, comDica, modais } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('formularios', {
  dica_motivo: ['', 'placeholder'],
  pergunta: '{titulo} ({perguntas_total} pergunta(s))',
  aprovar: ['Aprovar', 'botao'],
  recusar: ['Recusar', 'botao'],
  esta_resposta_esta_mais: ['Esta resposta não está mais no sistema.', 'resposta'],
  ja_foi: ['Já foi {status}.', 'resposta'],
  recebeu: ' · recebeu {cargo}',
  consegui_dar_cargo: ' · (não consegui dar o cargo)',
  pessoa_saiu_servidor: ' · (a pessoa saiu do servidor)',
  aprovada: '✅ Aprovada',
  recusada: '❌ Recusada',
  motivo: '\n**Motivo:** {motivo}',
  por: 'por {usuario}{extra}{motivo}',
  aprovado: 'aprovado',
  recusado: 'recusado',
  seu_formulario_foi: ['Seu formulário **{titulo}** em **{servidor}** foi **{resultado}**.{motivo}', 'descricao'],
  resposta: ['Resposta {status}{extra}.', 'resposta'],
  este_formulario_esta_mais: ['Este formulário não está mais disponível.', 'resposta'],
  este_formulario_ainda_tem: ['Este formulário ainda não tem canal de respostas. Avise a equipe.', 'resposta'],
  voce_ja_enviou_este: ['Você já enviou este formulário e ele ainda está sendo analisado.', 'resposta'],
  achei_canal_respostas_avise: ['Não achei o canal de respostas. Avise a equipe.', 'resposta'],
  conta_criada: ['Conta criada', 'campo'],
  consegui_enviar_avise_equipe: ['Não consegui enviar. Avise a equipe para conferir as minhas permissões.', 'resposta'],
  formulario_enviado_voce_recebe: ['Formulário enviado! Você recebe a resposta na DM.', 'resposta'],
  so_equipe_pode_decidir: ['Só a equipe pode decidir.', 'resposta'],
  motivo_vai_dm_pessoa: ['Motivo (vai na DM da pessoa)', 'rotulo'],
  achei_mensagem: ['Não achei a mensagem.', 'resposta'],
  nenhum_formulario_use_formulario: ['Nenhum formulário. Use `/formulario criar`.', 'resposta'],
  formularios: ['📝 Formulários', 'titulo'],
  aprovado_ganha: ' · aprovado ganha <@&{cargo}>',
  respostas: 'Respostas em <#{canal}>{cargo}',
  longa: ' (longa)',
  opcional: ' (opcional)',
  sem_perguntas: 'Sem perguntas',
  maximo_formularios: ['No máximo {limite} formulários.', 'resposta'],
  cargo_aprovacao_pode_ser: ['O cargo de aprovação não pode ser de administrador nem de bot.', 'resposta'],
  meu_cargo_precisa_ficar: ['Meu cargo precisa ficar acima de {cargo}.', 'resposta'],
  formulario_criado_agora_adicione: ['Formulário **{titulo}** criado. Agora adicione as perguntas com `/formulario pergunta` (até 5) e envie o painel com `/formulario painel`.', 'resposta'],
  formulario_encontrado_escolha_lista: ['Formulário não encontrado. Escolha na lista enquanto digita.', 'resposta'],
  discord_aceita_maximo_perguntas: ['O Discord aceita no máximo 5 perguntas por formulário.', 'resposta'],
  pergunta_adicionada: ['Pergunta {perguntas_total}/5 adicionada em **{titulo}**.', 'resposta'],
  este_formulario_tem_pergunta: ['Este formulário tem {perguntas_total} pergunta(s).', 'resposta'],
  pergunta_removida: ['Pergunta {numero} removida.', 'resposta'],
  formulario_apagado_paineis_ja: ['Formulário **{titulo}** apagado. (Painéis já enviados param de funcionar.)', 'resposta'],
  adicione_pelo_menos_pergunta: ['Adicione pelo menos uma pergunta antes (`/formulario pergunta`).', 'resposta'],
  clique_botao_abaixo_preencher: 'Clique no botão abaixo para preencher.',
  preencher: ['Preencher', 'botao'],
  consegui_enviar_confira_minhas: ['Não consegui enviar em {canal}. Confira as minhas permissões.', 'resposta'],
  painel_enviado: ['Painel enviado em {canal}.', 'resposta'],
  formularios_2: 'Formulários',
  formulario_resposta_esperando_equipe: '{total} formulário(s) · {pendentes} resposta(s) esperando a equipe',
  nenhum_formulario_criar: 'Nenhum (`/formulario criar`)',
});

// Botões (texto, emoji e cor personalizáveis; alguns podem ser escondidos)
const bt = botoes('formularios', {
  aprovar: { nome: 'Aprovar resposta', rotulo: 'aprovar', emoji: '✅', estilo: 'Success' },
  recusar: { nome: 'Recusar resposta', rotulo: 'recusar', emoji: '❌', estilo: 'Danger' },
  preencher: { nome: 'Preencher formulário (painel)', rotulo: 'preencher', emoji: '📝', estilo: 'Primary' },
});
modais('formularios', {
  recusa: { nome: 'Motivo da recusa', textos: ['recusar', 'motivo_vai_dm_pessoa', 'dica_motivo'] },
});

// Aparência dos embeds principais (cor, imagem, miniatura e rodapé personalizáveis)
const vis = visuais('formularios', {
  painel: { nome: "Painel com o botão de preencher", vars: ['servidor_icone'] },
});

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
  await i.respond(forms.filter(([id, f]) => id.includes(foco) || slug(f.titulo).includes(foco)).slice(0, 25).map(([id, f]) => ({ name: tx('pergunta', { titulo: f.titulo, perguntas_total: f.perguntas.length }).slice(0, 100), value: id })));
}

function botoesEquipe(desligar = false) {
  return [
    new ActionRowBuilder().addComponents(
      bt('aprovar').setCustomId('fm:aprovar').setDisabled(desligar),
      bt('recusar').setCustomId('fm:recusar').setDisabled(desligar)
    ),
  ];
}

async function decidir(i, msg, aprovado, motivo) {
  const r = respostas.ler(i.guildId, msg.id);
  if (!r) return responder(i, tx('esta_resposta_esta_mais'), 'erro');
  if (r.status !== 'pendente') return responder(i, tx('ja_foi', { status: r.status }), 'aviso');
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
      extra = ok ? tx('recebeu', { cargo }) : tx('consegui_dar_cargo');
    } else extra = membro ? tx('consegui_dar_cargo') : tx('pessoa_saiu_servidor');
  }
  const e = EmbedBuilder.from(msg.embeds[0])
    .setColor(aprovado ? CORES.sucesso : CORES.erro)
    .addFields({ name: aprovado ? tx('aprovada') : tx('recusada'), value: tx('por', { usuario: i.user, extra, motivo: motivo ? tx('motivo', { motivo: cortar(motivo, 900) }) : '' }) });
  await msg.edit({ embeds: [e], components: botoesEquipe(true) }).catch(() => {});
  const user = await i.client.users.fetch(r.user).catch(() => null);
  await user
    ?.send({
      embeds: [
        embed(i.guildId)
          .setColor(aprovado ? CORES.sucesso : CORES.erro)
          .setDescription(tx('seu_formulario_foi', { titulo: f?.titulo ?? r.form, servidor: i.guild.name, resultado: aprovado ? tx('aprovado') : tx('recusado'), motivo: motivo ? tx('motivo', { motivo }) : '' })),
      ],
    })
    .catch(() => {});
  return responder(i, tx('resposta', { status: r.status, extra }), 'sucesso');
}

const componentes = {
  async fm(i, [acao, alvo]) {
    // membro clicou no botão do painel
    if (acao === 'abrir') {
      const f = formDe(i.guildId, alvo);
      if (!f || !f.perguntas.length) return responder(i, tx('este_formulario_esta_mais'), 'erro');
      if (!f.canal) return responder(i, tx('este_formulario_ainda_tem'), 'erro');
      const pendente = Object.values(respostas.ler(i.guildId) ?? {}).some((r) => r.form === alvo && r.user === i.user.id && r.status === 'pendente');
      if (pendente) return responder(i, tx('voce_ja_enviou_este'), 'aviso');
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
      if (!canal?.isTextBased()) return responder(i, tx('achei_canal_respostas_avise'), 'erro');
      const e = embed(i.guildId)
        .setAuthor({ name: `${i.user.tag} (${i.user.id})`, iconURL: i.user.displayAvatarURL() })
        .setTitle(`📝 ${f.titulo}`)
        .addFields(f.perguntas.map((p, n) => ({ name: cortar(p.texto, 256), value: cortar(i.fields.getTextInputValue(`p${n}`) || '—', 1024) })))
        .addFields({ name: tx('conta_criada'), value: `<t:${Math.floor(i.user.createdTimestamp / 1000)}:R>`, inline: true })
        .setTimestamp();
      const msg = await canal.send({ content: f.mencionar ? `<@&${f.mencionar}>` : undefined, embeds: [e], components: botoesEquipe(), allowedMentions: { roles: f.mencionar ? [f.mencionar] : [] } }).catch(() => null);
      if (!msg) return responder(i, tx('consegui_enviar_avise_equipe'), 'erro');
      respostas.de(i.guildId)[msg.id] = { form: alvo, user: i.user.id, status: 'pendente', em: Date.now() };
      respostas.salvar();
      return responder(i, tx('formulario_enviado_voce_recebe'), 'sucesso');
    }
    // equipe
    if (acao === 'aprovar' || acao === 'recusar') {
      if (!ehStaff(i.member)) return responder(i, tx('so_equipe_pode_decidir'), 'erro');
      if (acao === 'aprovar') return decidir(i, i.message, true, null);
      return i.showModal(
        new ModalBuilder()
          .setCustomId(`fm:motivo:${i.message.id}`)
          .setTitle(tx('recusar'))
          .addComponents(new ActionRowBuilder().addComponents(comDica(new TextInputBuilder().setCustomId('motivo').setLabel(tx('motivo_vai_dm_pessoa')).setStyle(TextInputStyle.Paragraph).setRequired(false).setMaxLength(500), tx('dica_motivo'))))
      );
    }
    if (acao === 'motivo' && i.isModalSubmit()) {
      if (!ehStaff(i.member)) return responder(i, tx('so_equipe_pode_decidir'), 'erro');
      const msg = await i.channel.messages.fetch(alvo).catch(() => null);
      if (!msg) return responder(i, tx('achei_mensagem'), 'erro');
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
      if (!forms.length) return responder(i, tx('nenhum_formulario_use_formulario'), 'aviso');
      const e = embed(i.guildId).setTitle(tx('formularios'));
      for (const [id, f] of forms) {
        e.addFields({
          name: `${f.titulo} · \`${id}\``,
          value: cortar(
            [tx('respostas', { canal: f.canal, cargo: f.cargo ? tx('aprovado_ganha', { cargo: f.cargo }) : '' }), ...f.perguntas.map((p, n) => `${n + 1}. ${p.texto}${p.longa ? tx('longa') : ''}${p.obrigatoria ? '' : tx('opcional')}`)].join('\n') ||
              tx('sem_perguntas'),
            1024
          ),
        });
      }
      return i.reply({ embeds: [e], flags: 64 });
    }
    if (sub === 'criar') {
      if (Object.keys(c.lista).length >= LIMITE_FORMS) return responder(i, tx('maximo_formularios', { limite: LIMITE_FORMS }), 'erro');
      const titulo = i.options.getString('titulo').trim();
      let id = slug(titulo) || 'form';
      while (c.lista[id]) id = `${id.slice(0, 17)}-${Math.floor(Math.random() * 90 + 10)}`;
      const cargo = i.options.getRole('cargo');
      if (cargo && (cargo.permissions.has(PermissionFlagsBits.Administrator) || cargo.managed)) return responder(i, tx('cargo_aprovacao_pode_ser'), 'erro');
      if (cargo && !cargo.editable) return responder(i, tx('meu_cargo_precisa_ficar', { cargo }), 'erro');
      c.lista[id] = { titulo, canal: i.options.getChannel('canal').id, cargo: cargo?.id ?? null, mencionar: i.options.getRole('mencionar')?.id ?? null, perguntas: [] };
      salvarAjustes();
      return responder(i, tx('formulario_criado_agora_adicione', { titulo }), 'sucesso');
    }
    const id = i.options.getString('formulario');
    const f = c.lista[id];
    if (!f) return responder(i, tx('formulario_encontrado_escolha_lista'), 'erro');
    if (sub === 'pergunta') {
      if (f.perguntas.length >= 5) return responder(i, tx('discord_aceita_maximo_perguntas'), 'erro');
      f.perguntas.push({ texto: i.options.getString('texto').trim(), longa: i.options.getBoolean('longa') ?? false, obrigatoria: i.options.getBoolean('obrigatoria') ?? true });
      salvarAjustes();
      return responder(i, tx('pergunta_adicionada', { perguntas_total: f.perguntas.length, titulo: f.titulo }), 'sucesso');
    }
    if (sub === 'tirar-pergunta') {
      const n = i.options.getInteger('numero');
      if (n > f.perguntas.length) return responder(i, tx('este_formulario_tem_pergunta', { perguntas_total: f.perguntas.length }), 'erro');
      f.perguntas.splice(n - 1, 1);
      salvarAjustes();
      return responder(i, tx('pergunta_removida', { numero: n }), 'sucesso');
    }
    if (sub === 'apagar') {
      delete c.lista[id];
      salvarAjustes();
      return responder(i, tx('formulario_apagado_paineis_ja', { titulo: f.titulo }), 'sucesso');
    }
    // painel
    if (!f.perguntas.length) return responder(i, tx('adicione_pelo_menos_pergunta'), 'erro');
    const canal = i.options.getChannel('canal') ?? i.channel;
    const msg = await canal
      .send({
        embeds: [vis(embed(i.guildId).setTitle(`📝 ${f.titulo}`).setDescription(i.options.getString('mensagem') || tx('clique_botao_abaixo_preencher')), 'painel', imagens({ guild: i.guild }))],
        components: [new ActionRowBuilder().addComponents(bt('preencher').setCustomId(`fm:abrir:${id}`))],
      })
      .catch(() => null);
    if (!msg) return responder(i, tx('consegui_enviar_confira_minhas', { canal }), 'erro');
    return responder(i, tx('painel_enviado', { canal }), 'sucesso');
  },
  autocompletar: autocompletarForm,
};

export default {
  id: 'formularios',
  nome: tx('formularios_2'),
  comandos: [formulario],
  componentes,
  permissoes: [PermissionFlagsBits.ManageRoles],
  config: {
    resumo(guild) {
      const n = Object.keys(cfg(guild.id).lista).length;
      const pend = Object.values(respostas.ler(guild.id) ?? {}).filter((r) => r.status === 'pendente').length;
      return [n ? tx('formulario_resposta_esperando_equipe', { total: n, pendentes: pend }) : tx('nenhum_formulario_criar')];
    },
  },
};
