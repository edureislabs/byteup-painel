import { ChannelType, GatewayIntentBits, PermissionFlagsBits } from 'discord.js';
import { ajustes, salvarAjustes, embed, responder, lerDuracao, duracaoTexto, cortar, marcarRemovida, CORES } from '../core/util.js';
import { textos } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('automod', {
  convite_outro_servidor: 'Convite de outro servidor',
  link_permitido: 'Link não permitido',
  palavra_proibida: 'Palavra proibida',
  mencoes_massa: 'Menções em massa ({limite})',
  excesso_letras_maiusculas: 'Excesso de letras maiúsculas',
  flood_mensagens_rapidas_demais: 'Flood (mensagens rápidas demais)',
  automod: ['🛡️ AutoMod', 'titulo'],
  membro: ['Membro', 'campo'],
  canal: ['Canal', 'campo'],
  motivo: ['Motivo', 'campo'],
  mensagem: ['Mensagem', 'campo'],
  sem_texto: '(sem texto)',
  consegui_apagar_me_permissao: '{motivo} (não consegui apagar: me dê a permissão Gerenciar mensagens)',
  sua_mensagem_foi_apagada: '{autor}, sua mensagem foi apagada: **{motivo}**.',
  castigo: ' Castigo de {duracao}.',
  automod_ligado_ajuste_filtros: 'AutoMod **ligado**. Ajuste os filtros com os outros /config automod.',
  automod_desligado: 'AutoMod **desligado**.',
  links_bloqueados_exceto_sites: 'Links bloqueados (exceto os sites liberados).',
  links_liberados: 'Links liberados.',
  links_liberados_2: 'Links de **{site}** liberados.',
  links_bloqueados_novo: 'Links de **{site}** bloqueados de novo.',
  convites_outros_servidores_bloqueado: 'Convites de outros servidores bloqueados.',
  convites_liberados: 'Convites liberados.',
  palavra_adicionada_total: 'Palavra adicionada ({palavras_total} no total).',
  palavra_removida_total: 'Palavra removida ({palavras_total} no total).',
  flood_maximo_mensagens_cada: 'Flood: no máximo **{spam}** mensagens a cada 5 segundos.',
  filtro_flood_desligado: 'Filtro de flood desligado.',
  mensagens_caps_serao_apagadas: 'Mensagens em CAPS serão apagadas.',
  filtro_caps_desligado: 'Filtro de CAPS desligado.',
  mensagens_ou_mais_mencoes: 'Mensagens com **{mencoes}** ou mais menções serão apagadas.',
  filtro_mencoes_desligado: 'Filtro de menções desligado.',
  duracao_invalida_ex_5m: ['Duração inválida (ex.: 5m, 1h).', 'resposta'],
  alem_apagar_castigo: 'Além de apagar, castigo de **{duracao}**.',
  automod_so_vai_apagar: 'O AutoMod só vai apagar as mensagens.',
  agora_imune_automod: '{cargo} agora é imune ao AutoMod.',
  mais_imune: '{cargo} não é mais imune.',
  automod_vai_ignorar: 'O AutoMod vai ignorar {canal}.',
  automod_volta_vigiar: 'O AutoMod volta a vigiar {canal}.',
  automod_vai_registrar: 'O AutoMod vai registrar em {canal}.',
  registro_automod_desligado: 'Registro do AutoMod desligado.',
  desligado_use_config_automod: 'Desligado (use /config automod ativar)',
  liberados: ' (liberados: {dominiosPermitidos})',
  links: 'links{dominiosPermitidos}',
  palavra: '{palavras_total} palavra(s)',
  flood_5s: 'flood > {spam}/5s',
  caps: 'CAPS',
  mencoes: '{mencoes}+ menções',
  nenhum: 'nenhum',
  filtros: 'Filtros: {filtros}',
  apagar_castigo: 'apagar + castigo de {duracao}',
  apagar: 'apagar',
  punicao: 'Punição: {duracao}',
  desligado: 'desligado',
  registro: 'Registro: {registro}',
});

/**
 * AutoMod: apaga sozinho links, convites, palavras proibidas, flood, CAPS e menções em massa.
 * Quem tem "Gerenciar mensagens", os cargos imunes e os canais ignorados ficam de fora.
 */

const PADRAO = {
  ativo: false,
  links: false,
  dominiosPermitidos: [],
  convites: true,
  palavras: [],
  spam: 0, // mensagens em 5 s (0 = desligado)
  maiusculas: false,
  mencoes: 0, // menções numa mensagem (0 = desligado)
  acao: 'apagar', // apagar | castigo
  duracao: 300_000,
  imunes: [],
  ignorados: [],
  canalLog: null,
};
const cfg = (guildId) => ajustes(guildId, 'automod', PADRAO);

const RE_LINK = /\bhttps?:\/\/([^\s/$.?#]+\.[^\s/?#]+)[^\s]*/gi;
const RE_CONVITE = /(discord\.gg|discord(?:app)?\.com\/invite|dsc\.gg)\/[\w-]+/i;

// controle de flood: guildId:userId -> horários das últimas mensagens
const recentes = new Map();
setInterval(() => {
  const limite = Date.now() - 10_000;
  for (const [k, lista] of recentes) if (!lista.length || lista.at(-1) < limite) recentes.delete(k);
}, 60_000).unref();

const normalizar = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');

function verificar(msg, c) {
  const texto = msg.content || '';
  if (c.convites && RE_CONVITE.test(texto)) return tx('convite_outro_servidor');
  if (c.links) {
    for (const m of texto.matchAll(RE_LINK)) {
      const dominio = m[1].toLowerCase().replace(/^www\./, '');
      const liberado = c.dominiosPermitidos.some((d) => dominio === d || dominio.endsWith(`.${d}`));
      if (!liberado) return tx('link_permitido');
    }
  }
  if (c.palavras.length) {
    const t = normalizar(texto);
    const achou = c.palavras.find((p) => new RegExp(`(^|[^\\p{L}\\p{N}])${normalizar(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'u').test(t));
    if (achou) return tx('palavra_proibida');
  }
  if (c.mencoes > 0) {
    const n = msg.mentions.users.size + msg.mentions.roles.size;
    if (n >= c.mencoes) return tx('mencoes_massa', { limite: n });
  }
  if (c.maiusculas) {
    const letras = texto.replace(/[^a-zA-ZÀ-ÿ]/g, '');
    if (letras.length >= 12 && letras.replace(/[^A-ZÀ-Þ]/g, '').length / letras.length > 0.7) return tx('excesso_letras_maiusculas');
  }
  if (c.spam > 0) {
    const k = `${msg.guildId}:${msg.author.id}`;
    const agora = Date.now();
    const lista = (recentes.get(k) ?? []).filter((t) => agora - t < 5000);
    lista.push(agora);
    recentes.set(k, lista);
    if (lista.length > c.spam) return tx('flood_mensagens_rapidas_demais');
  }
  return null;
}

async function registrar(msg, motivo, c) {
  if (!c.canalLog) return;
  const canal = msg.guild.channels.cache.get(c.canalLog);
  if (!canal?.isTextBased()) return;
  await canal
    .send({
      embeds: [
        embed(msg.guildId)
          .setColor(CORES.aviso)
          .setTitle(tx('automod'))
          .addFields(
            { name: tx('membro'), value: `${msg.author} (${msg.author.tag})`, inline: true },
            { name: tx('canal'), value: `${msg.channel}`, inline: true },
            { name: tx('motivo'), value: motivo },
            { name: tx('mensagem'), value: cortar(msg.content || tx('sem_texto'), 1000) },
          )
          .setTimestamp(),
      ],
    })
    .catch(() => {});
}

async function aoMensagem(msg) {
  if (!msg.inGuild() || msg.author.bot || !msg.member) return;
  const c = cfg(msg.guildId);
  if (!c.ativo) return;
  if (msg.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
  if (c.ignorados.includes(msg.channelId) || c.ignorados.includes(msg.channel.parentId)) return;
  if (c.imunes.some((r) => msg.member.roles.cache.has(r))) return;

  const motivo = verificar(msg, c);
  if (!motivo) return;

  marcarRemovida(msg.id); // os outros módulos ignoram esta mensagem
  const apagou = await msg.delete().then(() => true, () => false);
  if (!apagou) {
    // sem a permissão "Gerenciar mensagens" neste canal: só registra
    return registrar(msg, tx('consegui_apagar_me_permissao', { motivo }), c);
  }
  let texto = tx('sua_mensagem_foi_apagada', { autor: msg.author, motivo });
  if (c.acao === 'castigo' && msg.member.moderatable) {
    const ok = await msg.member.timeout(c.duracao, `AutoMod: ${motivo}`).then(() => true, () => false);
    if (ok) texto += tx('castigo', { duracao: duracaoTexto(c.duracao) });
  }
  const aviso = await msg.channel.send({ content: texto, allowedMentions: { users: [msg.author.id] } }).catch(() => null);
  if (aviso) setTimeout(() => aviso.delete().catch(() => {}), 8000);
  await registrar(msg, motivo, c);
}

// ---------------- /config automod ----------------
const config = {
  grupo: 'automod',
  montar: (g) =>
    g
      .setDescription('AutoMod: filtros automáticos de mensagens')
      .addSubcommand((s) => s.setName('ativar').setDescription('Liga ou desliga o AutoMod').addBooleanOption((o) => o.setName('ligado').setDescription('Ligado?').setRequired(true)))
      .addSubcommand((s) => s.setName('links').setDescription('Bloquear links').addBooleanOption((o) => o.setName('bloquear').setDescription('Bloquear?').setRequired(true)))
      .addSubcommand((s) =>
        s.setName('permitir-site').setDescription('Libera (ou bloqueia de novo) links de um site').addStringOption((o) => o.setName('site').setDescription('Ex.: youtube.com').setRequired(true).setMaxLength(100))
      )
      .addSubcommand((s) => s.setName('convites').setDescription('Bloquear convites de outros servidores').addBooleanOption((o) => o.setName('bloquear').setDescription('Bloquear?').setRequired(true)))
      .addSubcommand((s) =>
        s.setName('palavra').setDescription('Adiciona ou remove uma palavra proibida').addStringOption((o) => o.setName('palavra').setDescription('A palavra').setRequired(true).setMaxLength(60))
      )
      .addSubcommand((s) =>
        s.setName('flood').setDescription('Mensagens permitidas em 5 segundos').addIntegerOption((o) => o.setName('limite').setDescription('0 desliga').setRequired(true).setMinValue(0).setMaxValue(20))
      )
      .addSubcommand((s) => s.setName('maiusculas').setDescription('Apagar mensagens quase todas em CAPS').addBooleanOption((o) => o.setName('ligado').setDescription('Ligado?').setRequired(true)))
      .addSubcommand((s) =>
        s.setName('mencoes').setDescription('Máximo de menções numa mensagem').addIntegerOption((o) => o.setName('limite').setDescription('0 desliga').setRequired(true).setMinValue(0).setMaxValue(50))
      )
      .addSubcommand((s) =>
        s
          .setName('punicao')
          .setDescription('O que fazer além de apagar')
          .addStringOption((o) =>
            o.setName('acao').setDescription('Ação').setRequired(true).addChoices({ name: 'Só apagar', value: 'apagar' }, { name: 'Apagar e dar castigo', value: 'castigo' })
          )
          .addStringOption((o) => o.setName('duracao').setDescription('Duração do castigo, ex.: 5m').setMaxLength(20))
      )
      .addSubcommand((s) => s.setName('imune').setDescription('Cargo que o AutoMod ignora (usar de novo remove)').addRoleOption((o) => o.setName('cargo').setDescription('Cargo').setRequired(true)))
      .addSubcommand((s) =>
        s
          .setName('ignorar-canal')
          .setDescription('Canal ou categoria que o AutoMod ignora (usar de novo remove)')
          .addChannelOption((o) => o.setName('canal').setDescription('Canal').setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildCategory, ChannelType.GuildAnnouncement))
      )
      .addSubcommand((s) =>
        s.setName('registro').setDescription('Canal onde o AutoMod registra o que apagou').addChannelOption((o) => o.setName('canal').setDescription('Vazio desliga').addChannelTypes(ChannelType.GuildText))
      ),
  async executar(i, sub) {
    const c = cfg(i.guildId);
    const alternar = (lista, valor) => {
      const idx = lista.indexOf(valor);
      if (idx >= 0) lista.splice(idx, 1);
      else lista.push(valor);
      return idx < 0;
    };
    let msg;
    switch (sub) {
      case 'ativar':
        c.ativo = i.options.getBoolean('ligado');
        msg = c.ativo ? tx('automod_ligado_ajuste_filtros') : tx('automod_desligado');
        break;
      case 'links':
        c.links = i.options.getBoolean('bloquear');
        msg = c.links ? tx('links_bloqueados_exceto_sites') : tx('links_liberados');
        break;
      case 'permitir-site': {
        const site = i.options.getString('site').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        msg = alternar(c.dominiosPermitidos, site) ? tx('links_liberados_2', { site }) : tx('links_bloqueados_novo', { site });
        break;
      }
      case 'convites':
        c.convites = i.options.getBoolean('bloquear');
        msg = c.convites ? tx('convites_outros_servidores_bloqueado') : tx('convites_liberados');
        break;
      case 'palavra': {
        const p = i.options.getString('palavra').trim().toLowerCase();
        msg = alternar(c.palavras, p) ? tx('palavra_adicionada_total', { palavras_total: c.palavras.length }) : tx('palavra_removida_total', { palavras_total: c.palavras.length });
        break;
      }
      case 'flood':
        c.spam = i.options.getInteger('limite');
        msg = c.spam ? tx('flood_maximo_mensagens_cada', { spam: c.spam }) : tx('filtro_flood_desligado');
        break;
      case 'maiusculas':
        c.maiusculas = i.options.getBoolean('ligado');
        msg = c.maiusculas ? tx('mensagens_caps_serao_apagadas') : tx('filtro_caps_desligado');
        break;
      case 'mencoes':
        c.mencoes = i.options.getInteger('limite');
        msg = c.mencoes ? tx('mensagens_ou_mais_mencoes', { mencoes: c.mencoes }) : tx('filtro_mencoes_desligado');
        break;
      case 'punicao': {
        c.acao = i.options.getString('acao');
        const d = i.options.getString('duracao');
        if (d) {
          const ms = lerDuracao(d);
          if (!ms || ms > 28 * 86_400_000) return responder(i, tx('duracao_invalida_ex_5m'), 'erro');
          c.duracao = ms;
        }
        msg = c.acao === 'castigo' ? tx('alem_apagar_castigo', { duracao: duracaoTexto(c.duracao) }) : tx('automod_so_vai_apagar');
        break;
      }
      case 'imune': {
        const r = i.options.getRole('cargo');
        msg = alternar(c.imunes, r.id) ? tx('agora_imune_automod', { cargo: r }) : tx('mais_imune', { cargo: r });
        break;
      }
      case 'ignorar-canal': {
        const ch = i.options.getChannel('canal');
        msg = alternar(c.ignorados, ch.id) ? tx('automod_vai_ignorar', { canal: ch }) : tx('automod_volta_vigiar', { canal: ch });
        break;
      }
      case 'registro': {
        const ch = i.options.getChannel('canal');
        c.canalLog = ch?.id ?? null;
        msg = ch ? tx('automod_vai_registrar', { canal: ch }) : tx('registro_automod_desligado');
        break;
      }
    }
    salvarAjustes();
    return responder(i, msg, 'sucesso');
  },
  resumo(guild) {
    const c = cfg(guild.id);
    if (!c.ativo) return [tx('desligado_use_config_automod')];
    const f = [];
    if (c.convites) f.push('convites');
    if (c.links) f.push(tx('links', { dominiosPermitidos: c.dominiosPermitidos.length ? tx('liberados', { dominiosPermitidos: c.dominiosPermitidos.join(', ') }) : '' }));
    if (c.palavras.length) f.push(tx('palavra', { palavras_total: c.palavras.length }));
    if (c.spam) f.push(tx('flood_5s', { spam: c.spam }));
    if (c.maiusculas) f.push(tx('caps'));
    if (c.mencoes) f.push(tx('mencoes', { mencoes: c.mencoes }));
    return [
      tx('filtros', { filtros: f.length ? f.join(', ') : tx('nenhum') }),
      tx('punicao', { duracao: c.acao === 'castigo' ? tx('apagar_castigo', { duracao: duracaoTexto(c.duracao) }) : tx('apagar') }),
      tx('registro', { registro: c.canalLog ? `<#${c.canalLog}>` : tx('desligado') }),
    ];
  },
};

export default {
  id: 'automod',
  nome: 'AutoMod',
  prioridade: 0, // roda antes dos outros módulos nas mensagens novas
  intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  permissoes: [PermissionFlagsBits.ManageMessages, PermissionFlagsBits.ModerateMembers],
  eventos: { messageCreate: aoMensagem },
  config,
};
