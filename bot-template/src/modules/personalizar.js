import {
  ActionRowBuilder,
  AttachmentBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  MessageFlags,
  ModalBuilder,
  PermissionFlagsBits,
  SlashCommandBuilder,
  StringSelectMenuBuilder,
  TextInputBuilder,
  TextInputStyle,
} from 'discord.js';
import { colecao } from '../core/db.js';
import { CONFIG, responder, aplicarPresenca, cortar, embed, imagens } from '../core/util.js';
import { textos, botoes, preencher, ativarPersonalizacao, exportar, importar, resetar, valoresAtuais, criados } from '../core/textos.js';

/**
 * Personalização: o dono do bot troca todos os textos, botões (texto, emoji, cor, esconder),
 * modais, cores, emojis das respostas, a aparência dos embeds e o status do bot.
 * Também cria painéis próprios (botões ou menu que dão cargo, respondem, abrem formulário,
 * abrem ticket ou levam a um link) e formulários próprios.
 *
 *   1. /personalizar baixar  → recebe o arquivo personalizacao.json
 *   2. abre o "Personalizar bot.html" (vem na pasta do bot), carrega o arquivo, edita e salva
 *   3. /personalizar aplicar arquivo:<o arquivo salvo>  → vale na hora, sem reiniciar
 *   4. /painel enviar painel:<nome>  → publica um painel criado
 *
 * Funciona igual com o bot no PC ou numa hospedagem: o arquivo vai e volta pelo Discord.
 */

ativarPersonalizacao();

const tx = textos('personalizar', {
  so_dono: ['Só o dono do bot (quem criou a aplicação no Developer Portal) pode personalizar.', 'resposta'],
  baixar_ok: ['Aqui está o arquivo com todos os textos do bot ({total} personalizado(s) até agora).\n\n**Como editar:** abra o **Personalizar bot.html** (está na pasta do bot), clique em **Abrir arquivo** e escolha este arquivo. Depois de salvar, use `/personalizar aplicar`.', 'resposta'],
  arquivo_json: ['Envie o arquivo **.json** salvo pelo Personalizar bot.html.', 'resposta'],
  arquivo_grande: ['Esse arquivo é grande demais (máximo 2 MB).', 'resposta'],
  arquivo_ler: ['Não consegui baixar o arquivo do Discord. Tente de novo.', 'resposta'],
  arquivo_invalido: ['Esse arquivo não é um JSON válido. Salve de novo pelo Personalizar bot.html.', 'resposta'],
  aplicado: ['Personalização aplicada: **{total}** item(ns) diferente(s) do padrão. Já está valendo.', 'resposta'],
  aplicado_paineis: ['\nOs painéis já enviados estão sendo atualizados.', 'resposta'],
  avisos: ['\n\n⚠️ Ignorei:\n{lista}', 'resposta'],
  resetar_pergunta: ['Isto apaga **toda** a personalização (textos, botões, cores, status, painéis e formulários criados) e volta ao padrão. Tem certeza?', 'resposta'],
  resetar_botao: ['Sim, voltar ao padrão', 'botao'],
  resetado: ['Pronto: tudo voltou ao padrão.', 'resposta'],
  ver: ['Personalização atual: **{textos}** texto(s), **{botoes}** botão(ões), **{visuais}** aparência(s) de embed, **{emojis}** emoji(s), **{cores}** cor(es), **{paineis}** painel(éis) e **{formularios}** formulário(s) criados{status}.', 'resposta'],
  ver_status: [' e o status do bot', 'texto'],
  // /painel
  painel_nao_existe: ['Esse painel não existe mais. Crie ou ajuste no Personalizar bot.html.', 'resposta'],
  item_nao_existe: ['Essa opção não existe mais neste painel.', 'resposta'],
  painel_enviado: ['Painel **{nome}** enviado em {canal}.', 'resposta'],
  painel_sem_permissao: ['Não consigo enviar mensagens em {canal}.', 'resposta'],
  nenhum_painel: ['Nenhum painel criado para este servidor. Crie no **Personalizar bot.html** (aba Painéis) e aplique com `/personalizar aplicar`.', 'resposta'],
  lista_titulo: ['🧩 Painéis criados', 'titulo'],
  lista_linha: '**{nome}** · {tipo} · {itens} opção(ões){enviado}',
  lista_enviado: ' · enviado {vezes}x',
  tipo_botoes: 'botões',
  tipo_menu: 'menu',
  lista_formularios: ['Formulários criados: {total}', 'rodape'],
  atualizados: ['{total} painel(éis) atualizado(s).', 'resposta'],
  // ações
  cargo_nao_existe: ['O cargo deste botão não existe mais. Avise a equipe.', 'resposta'],
  cargo_acima: ['Não consigo mexer nesse cargo: ele está acima do meu. Avise a equipe.', 'resposta'],
  cargo_ganhou: ['Você ganhou o cargo {cargo}.', 'resposta'],
  cargo_perdeu: ['Você saiu do cargo {cargo}.', 'resposta'],
  cargo_ja_tem: ['Você já tem o cargo {cargo}.', 'resposta'],
  cargo_nao_tem: ['Você não tem o cargo {cargo}.', 'resposta'],
  sem_mensagem: ['👍', 'resposta'],
  formulario_nao_existe: ['Esse formulário não existe mais.', 'resposta'],
  formulario_enviado: ['Formulário enviado! Obrigado.', 'resposta'],
  formulario_sem_canal: ['Recebi, mas o canal de respostas não está configurado. Avise a equipe.', 'resposta'],
  formulario_resposta_titulo: ['📝 {titulo}', 'titulo'],
  formulario_resposta_rodape: ['ID: {usuario_id}', 'rodape'],
  ticket_sem_modulo: ['Este bot não tem o módulo de Tickets.', 'resposta'],
});

const bt = botoes('personalizar', {
  resetar: { nome: 'Confirmar reset', rotulo: 'resetar_botao', estilo: 'Danger' },
});

const enviados = colecao('paineis_enviados'); // guild → { mensagemId: { painel, canal } }

/** Dono da aplicação (ou membro do time dela) e quem estiver em "donos" no config.json. */
async function ehDono(i) {
  if ((CONFIG.donos ?? []).includes(i.user.id)) return true;
  const app = await i.client.application.fetch().catch(() => null);
  const dono = app?.owner;
  if (!dono) return false;
  if (dono.members) return dono.members.has(i.user.id); // time
  return dono.id === i.user.id;
}

/** Cargos e canais dos servidores, para o painel HTML mostrar listas em vez de pedir IDs. */
function servidores(client) {
  return [...client.guilds.cache.values()].slice(0, 10).map((g) => ({
    id: g.id,
    nome: g.name,
    cargos: [...g.roles.cache.values()]
      .filter((r) => r.id !== g.id && !r.managed)
      .sort((a, b) => b.position - a.position)
      .slice(0, 250)
      .map((r) => ({ id: r.id, nome: r.name, cor: r.hexColor })),
    canais: [...g.channels.cache.values()]
      .filter((c) => [ChannelType.GuildText, ChannelType.GuildAnnouncement, ChannelType.GuildCategory].includes(c.type))
      .sort((a, b) => a.rawPosition - b.rawPosition)
      .slice(0, 500)
      .map((c) => ({ id: c.id, nome: c.name, tipo: c.type === ChannelType.GuildCategory ? 'categoria' : 'texto' })),
  }));
}

// ---------------- painéis criados ----------------
const paineisDo = (guildId) => criados().paineis.filter((p) => !p.servidor || p.servidor === guildId);

/** Monta a mensagem de um painel criado. */
export function montarPainel(guild, pn) {
  const vars = { servidor: guild.name, membros: guild.memberCount, ...imagens({ guild }) };
  const t = (s, n) => cortar(preencher(s, vars), n);
  const e = embed(guild.id);
  if (pn.embed.titulo) e.setTitle(t(pn.embed.titulo, 256));
  if (pn.embed.descricao) e.setDescription(t(pn.embed.descricao, 4000));
  if (pn.embed.cor) e.setColor(parseInt(pn.embed.cor.slice(1), 16));
  const url = (u) => {
    const x = preencher(u, vars).trim();
    return /^https?:\/\/\S+$/i.test(x) ? x : null;
  };
  if (pn.embed.imagem && url(pn.embed.imagem)) e.setImage(url(pn.embed.imagem));
  if (pn.embed.miniatura && url(pn.embed.miniatura)) e.setThumbnail(url(pn.embed.miniatura));
  if (pn.embed.rodape) e.setFooter({ text: t(pn.embed.rodape, 2048) });
  const temEmbed = Boolean(pn.embed.titulo || pn.embed.descricao);

  let components;
  if (pn.tipo === 'menu') {
    const menu = new StringSelectMenuBuilder()
      .setCustomId(`pc:${pn.id}`)
      .addOptions(
        pn.itens.map((it) => {
          const op = { label: cortar(it.rotulo, 100), value: it.id };
          if (it.descricao) op.description = cortar(it.descricao, 100);
          if (it.emoji) op.emoji = it.emoji;
          return op;
        })
      );
    if (pn.placeholder) menu.setPlaceholder(cortar(pn.placeholder, 150));
    components = [new ActionRowBuilder().addComponents(menu)];
  } else {
    const bs = pn.itens.map((it) => {
      const b = new ButtonBuilder();
      if (it.rotulo) b.setLabel(cortar(it.rotulo, 80));
      if (it.emoji) b.setEmoji(it.emoji);
      if (it.acao.tipo === 'link') return b.setStyle(ButtonStyle.Link).setURL(it.acao.url);
      return b.setStyle(ButtonStyle[it.estilo] ?? ButtonStyle.Secondary).setCustomId(`pc:${pn.id}:${it.id}`);
    });
    components = [];
    for (let n = 0; n < bs.length && components.length < 5; n += 5) components.push(new ActionRowBuilder().addComponents(bs.slice(n, n + 5)));
  }
  return {
    content: pn.conteudo ? t(pn.conteudo, 2000) : undefined,
    embeds: temEmbed ? [e] : [],
    components,
    allowedMentions: { parse: [] },
  };
}

/** Atualiza os painéis já enviados (depois de aplicar uma personalização nova). */
export async function atualizarPaineis(client, soGuild = null) {
  let total = 0;
  for (const guild of client.guilds.cache.values()) {
    if (soGuild && guild.id !== soGuild) continue;
    const lista = enviados.de(guild.id);
    for (const [msgId, reg] of Object.entries(lista)) {
      const pn = criados().paineis.find((p) => p.id === reg.painel);
      const canal = guild.channels.cache.get(reg.canal);
      if (!pn || !canal?.isTextBased()) continue;
      const msg = await canal.messages.fetch(msgId).catch(() => null);
      if (!msg) {
        delete lista[msgId];
        continue;
      }
      const ok = await msg.edit(montarPainel(guild, pn)).then(() => true, () => false);
      if (ok) total++;
    }
  }
  enviados.salvar();
  return total;
}

function modalDoFormulario(f) {
  return new ModalBuilder()
    .setCustomId(`cf:${f.id}`)
    .setTitle(cortar(f.titulo, 45))
    .addComponents(
      f.perguntas.map((q, n) => {
        const campo = new TextInputBuilder()
          .setCustomId(`p${n}`)
          .setLabel(cortar(q.rotulo, 45))
          .setStyle(q.longa ? TextInputStyle.Paragraph : TextInputStyle.Short)
          .setRequired(q.obrigatoria)
          .setMaxLength(q.max);
        if (q.min) campo.setMinLength(q.min);
        if (q.placeholder) campo.setPlaceholder(cortar(q.placeholder, 100));
        return new ActionRowBuilder().addComponents(campo);
      })
    );
}

async function acaoDoPainel(i, [painelId, itemId]) {
  const pn = criados().paineis.find((p) => p.id === painelId);
  if (!pn) return responder(i, tx('painel_nao_existe'), 'erro');
  const id = i.isStringSelectMenu() ? i.values[0] : itemId;
  const it = pn.itens.find((x) => x.id === id);
  if (!it) return responder(i, tx('item_nao_existe'), 'erro');
  const a = it.acao;
  const vars = { usuario: `${i.user}`, nome: i.member?.displayName ?? i.user.username, servidor: i.guild.name };
  const responderTexto = (texto, tipo = 'sucesso') => responder(i, preencher(texto, vars), tipo);

  if (a.tipo === 'mensagem') {
    return i.reply({ content: cortar(preencher(a.mensagem || tx('sem_mensagem'), vars), 2000), flags: MessageFlags.Ephemeral, allowedMentions: { parse: [] } });
  }
  if (a.tipo === 'cargo') {
    const cargo = i.guild.roles.cache.get(a.cargo);
    if (!cargo) return responder(i, tx('cargo_nao_existe'), 'erro');
    if (!cargo.editable) return responder(i, tx('cargo_acima'), 'erro');
    const tem = i.member.roles.cache.has(cargo.id);
    const quer = a.modo === 'dar' ? true : a.modo === 'tirar' ? false : !tem;
    vars.cargo = `${cargo}`;
    if (quer && tem) return responderTexto(tx('cargo_ja_tem', vars), 'info');
    if (!quer && !tem) return responderTexto(tx('cargo_nao_tem', vars), 'info');
    const ok = await (quer ? i.member.roles.add(cargo, `Painel ${pn.nome}`) : i.member.roles.remove(cargo, `Painel ${pn.nome}`)).then(() => true, () => false);
    if (!ok) return responder(i, tx('cargo_acima'), 'erro');
    return responderTexto(a.mensagem || tx(quer ? 'cargo_ganhou' : 'cargo_perdeu', vars));
  }
  if (a.tipo === 'formulario') {
    const f = criados().formularios.find((x) => x.id === a.formulario);
    if (!f) return responder(i, tx('formulario_nao_existe'), 'erro');
    return i.showModal(modalDoFormulario(f));
  }
  if (a.tipo === 'ticket') {
    const mod = await import('./tickets.js').catch(() => null);
    if (!mod?.abrirTicket) return responder(i, tx('ticket_sem_modulo'), 'erro');
    return mod.abrirTicket(i, { nome: a.assunto || it.rotulo, emoji: it.emoji, categoria: a.categoria, equipe: a.equipe, mensagem: a.mensagem });
  }
}

async function enviarFormulario(i, [formId]) {
  const f = criados().formularios.find((x) => x.id === formId);
  if (!f) return responder(i, tx('formulario_nao_existe'), 'erro');
  const vars = { usuario: `${i.user}`, nome: i.member?.displayName ?? i.user.username, servidor: i.guild.name, titulo: f.titulo };
  const canal = f.canal && i.guild.channels.cache.get(f.canal);
  if (canal?.isTextBased()) {
    const e = embed(i.guildId)
      .setTitle(tx('formulario_resposta_titulo', { titulo: f.titulo }))
      .setAuthor({ name: i.user.tag, iconURL: i.user.displayAvatarURL() })
      .addFields(
        f.perguntas.map((q, n) => ({ name: cortar(q.rotulo, 256), value: cortar(i.fields.getTextInputValue(`p${n}`) || '—', 1024) }))
      )
      .setFooter({ text: tx('formulario_resposta_rodape', { usuario_id: i.user.id }) })
      .setTimestamp();
    await canal.send({ content: `${i.user}`, embeds: [e], allowedMentions: { parse: [] } }).catch(() => {});
  }
  if (f.cargo) {
    const cargo = i.guild.roles.cache.get(f.cargo);
    if (cargo?.editable) await i.member.roles.add(cargo, `Formulário ${f.titulo}`).catch(() => {});
  }
  if (!canal?.isTextBased()) return responder(i, tx('formulario_sem_canal'), 'aviso');
  return responder(i, preencher(f.mensagem || tx('formulario_enviado'), vars), 'sucesso');
}

// ---------------- /personalizar ----------------
const personalizar = {
  data: new SlashCommandBuilder()
    .setName('personalizar')
    .setDescription('Personaliza os textos, botões, cores e status do bot (só o dono do bot)')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((s) => s.setName('baixar').setDescription('Baixa o arquivo para editar no Personalizar bot.html'))
    .addSubcommand((s) =>
      s
        .setName('aplicar')
        .setDescription('Aplica o arquivo salvo pelo Personalizar bot.html')
        .addAttachmentOption((o) => o.setName('arquivo').setDescription('O arquivo .json salvo').setRequired(true))
    )
    .addSubcommand((s) => s.setName('ver').setDescription('Mostra o que está personalizado'))
    .addSubcommand((s) => s.setName('resetar').setDescription('Volta tudo ao padrão')),
  async executar(i) {
    if (!(await ehDono(i))) return responder(i, tx('so_dono'), 'erro');
    const sub = i.options.getSubcommand();

    if (sub === 'baixar') {
      const dados = exportar({ nomeBot: CONFIG.nome || i.client.user.username, servidores: servidores(i.client) });
      const v = dados.valores;
      const total = Object.keys(v.textos).length + Object.keys(v.visuais).length + Object.keys(v.botoes).length + v.criados.paineis.length + v.criados.formularios.length;
      const arquivo = new AttachmentBuilder(Buffer.from(JSON.stringify(dados, null, 1), 'utf8'), { name: 'personalizacao.json' });
      return i.reply({ content: tx('baixar_ok', { total }), files: [arquivo], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'aplicar') {
      const anexo = i.options.getAttachment('arquivo');
      if (!/\.json$/i.test(anexo.name)) return responder(i, tx('arquivo_json'), 'erro');
      if (anexo.size > 2 * 1024 * 1024) return responder(i, tx('arquivo_grande'), 'erro');
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      let texto;
      try {
        const r = await fetch(anexo.url);
        if (!r.ok) throw new Error(String(r.status));
        texto = await r.text();
      } catch {
        return responder(i, tx('arquivo_ler'), 'erro');
      }
      let json;
      try {
        json = JSON.parse(texto.replace(/^﻿/, ''));
      } catch {
        return responder(i, tx('arquivo_invalido'), 'erro');
      }
      const r = importar(json);
      if (!r.ok) return responder(i, r.erro, 'erro');
      aplicarPresenca(i.client);
      const temEnviados = [...i.client.guilds.cache.keys()].some((g) => Object.keys(enviados.ler(g) ?? {}).length);
      if (temEnviados) atualizarPaineis(i.client).catch((e) => console.error('[personalizar] painéis:', e.message));
      const avisos = r.avisos.length ? tx('avisos', { lista: cortar(r.avisos.slice(0, 15).map((a) => `• ${a}`).join('\n'), 1500) }) : '';
      return responder(i, tx('aplicado', { total: r.total }) + (temEnviados ? tx('aplicado_paineis') : '') + avisos, r.avisos.length ? 'aviso' : 'sucesso');
    }

    if (sub === 'ver') {
      const v = valoresAtuais();
      const n = (o) => Object.keys(o ?? {}).length;
      return responder(
        i,
        tx('ver', {
          textos: n(v.textos),
          botoes: n(v.botoes),
          visuais: n(v.visuais),
          emojis: n(v.emojis),
          cores: n(v.cores),
          paineis: v.criados?.paineis?.length ?? 0,
          formularios: v.criados?.formularios?.length ?? 0,
          status: v.presenca?.texto ? tx('ver_status') : '',
        }),
        'info'
      );
    }

    if (sub === 'resetar') {
      return i.reply({ content: tx('resetar_pergunta'), components: [new ActionRowBuilder().addComponents(bt('resetar').setCustomId('pz:resetar'))], flags: MessageFlags.Ephemeral });
    }
  },
};

// ---------------- /painel ----------------
const painel = {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Painéis criados no Personalizar bot (equipe)')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('enviar')
        .setDescription('Publica um painel criado')
        .addStringOption((o) => o.setName('painel').setDescription('Qual painel').setRequired(true).setAutocomplete(true))
        .addChannelOption((o) => o.setName('canal').setDescription('Padrão: este canal').addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
    )
    .addSubcommand((s) => s.setName('lista').setDescription('Mostra os painéis criados'))
    .addSubcommand((s) => s.setName('atualizar').setDescription('Atualiza os painéis já enviados neste servidor')),
  async autocompletar(i) {
    const busca = i.options.getFocused().toLowerCase();
    return i.respond(
      paineisDo(i.guildId)
        .filter((p) => p.nome.toLowerCase().includes(busca))
        .slice(0, 25)
        .map((p) => ({ name: cortar(p.nome, 100), value: p.id }))
    );
  },
  async executar(i) {
    const sub = i.options.getSubcommand();
    if (sub === 'lista') {
      const lista = paineisDo(i.guildId);
      if (!lista.length) return responder(i, tx('nenhum_painel'), 'info');
      const env = Object.values(enviados.ler(i.guildId) ?? {});
      const linhas = lista.map((p) => {
        const vezes = env.filter((x) => x.painel === p.id).length;
        return tx('lista_linha', { nome: p.nome, tipo: tx(p.tipo === 'menu' ? 'tipo_menu' : 'tipo_botoes'), itens: p.itens.length, enviado: vezes ? tx('lista_enviado', { vezes }) : '' });
      });
      return i.reply({
        embeds: [embed(i.guildId).setTitle(tx('lista_titulo')).setDescription(cortar(linhas.join('\n'), 4000)).setFooter({ text: tx('lista_formularios', { total: criados().formularios.length }) })],
        flags: MessageFlags.Ephemeral,
      });
    }
    if (sub === 'atualizar') {
      await i.deferReply({ flags: MessageFlags.Ephemeral });
      const total = await atualizarPaineis(i.client, i.guildId);
      return responder(i, tx('atualizados', { total }), 'sucesso');
    }
    // enviar
    const pn = paineisDo(i.guildId).find((p) => p.id === i.options.getString('painel') || p.nome === i.options.getString('painel'));
    if (!pn) return responder(i, paineisDo(i.guildId).length ? tx('painel_nao_existe') : tx('nenhum_painel'), 'erro');
    const canal = i.options.getChannel('canal') ?? i.channel;
    const msg = await canal.send(montarPainel(i.guild, pn)).catch((e) => {
      console.error('[personalizar] painel:', e.message);
      return null;
    });
    if (!msg) return responder(i, tx('painel_sem_permissao', { canal }), 'erro');
    enviados.de(i.guildId)[msg.id] = { painel: pn.id, canal: canal.id };
    enviados.salvar();
    return responder(i, tx('painel_enviado', { nome: pn.nome, canal }), 'sucesso');
  },
};

async function botaoReset(i, [acao]) {
  if (acao !== 'resetar') return;
  if (!(await ehDono(i))) return responder(i, tx('so_dono'), 'erro');
  resetar();
  aplicarPresenca(i.client);
  return i.update({ content: `✅ ${tx('resetado')}`, components: [] });
}

export default {
  id: 'personalizar',
  nome: 'Personalização',
  comandos: [personalizar, painel],
  componentes: { pz: botaoReset, pc: acaoDoPainel, cf: enviarFormulario },
};
