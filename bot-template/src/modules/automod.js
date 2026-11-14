import { ChannelType, GatewayIntentBits, PermissionFlagsBits } from 'discord.js';
import { ajustes, salvarAjustes, embed, responder, lerDuracao, duracaoTexto, cortar, marcarRemovida, CORES } from '../core/util.js';

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
  if (c.convites && RE_CONVITE.test(texto)) return 'Convite de outro servidor';
  if (c.links) {
    for (const m of texto.matchAll(RE_LINK)) {
      const dominio = m[1].toLowerCase().replace(/^www\./, '');
      const liberado = c.dominiosPermitidos.some((d) => dominio === d || dominio.endsWith(`.${d}`));
      if (!liberado) return 'Link não permitido';
    }
  }
  if (c.palavras.length) {
    const t = normalizar(texto);
    const achou = c.palavras.find((p) => new RegExp(`(^|[^\\p{L}\\p{N}])${normalizar(p).replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}($|[^\\p{L}\\p{N}])`, 'u').test(t));
    if (achou) return 'Palavra proibida';
  }
  if (c.mencoes > 0) {
    const n = msg.mentions.users.size + msg.mentions.roles.size;
    if (n >= c.mencoes) return `Menções em massa (${n})`;
  }
  if (c.maiusculas) {
    const letras = texto.replace(/[^a-zA-ZÀ-ÿ]/g, '');
    if (letras.length >= 12 && letras.replace(/[^A-ZÀ-Þ]/g, '').length / letras.length > 0.7) return 'Excesso de letras maiúsculas';
  }
  if (c.spam > 0) {
    const k = `${msg.guildId}:${msg.author.id}`;
    const agora = Date.now();
    const lista = (recentes.get(k) ?? []).filter((t) => agora - t < 5000);
    lista.push(agora);
    recentes.set(k, lista);
    if (lista.length > c.spam) return 'Flood (mensagens rápidas demais)';
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
          .setTitle('🛡️ AutoMod')
          .addFields(
            { name: 'Membro', value: `${msg.author} (${msg.author.tag})`, inline: true },
            { name: 'Canal', value: `${msg.channel}`, inline: true },
            { name: 'Motivo', value: motivo },
            { name: 'Mensagem', value: cortar(msg.content || '(sem texto)', 1000) },
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
    return registrar(msg, `${motivo} (não consegui apagar: me dê a permissão Gerenciar mensagens)`, c);
  }
  let texto = `${msg.author}, sua mensagem foi apagada: **${motivo}**.`;
  if (c.acao === 'castigo' && msg.member.moderatable) {
    const ok = await msg.member.timeout(c.duracao, `AutoMod: ${motivo}`).then(() => true, () => false);
    if (ok) texto += ` Castigo de ${duracaoTexto(c.duracao)}.`;
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
        msg = c.ativo ? 'AutoMod **ligado**. Ajuste os filtros com os outros /config automod.' : 'AutoMod **desligado**.';
        break;
      case 'links':
        c.links = i.options.getBoolean('bloquear');
        msg = c.links ? 'Links bloqueados (exceto os sites liberados).' : 'Links liberados.';
        break;
      case 'permitir-site': {
        const site = i.options.getString('site').toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
        msg = alternar(c.dominiosPermitidos, site) ? `Links de **${site}** liberados.` : `Links de **${site}** bloqueados de novo.`;
        break;
      }
      case 'convites':
        c.convites = i.options.getBoolean('bloquear');
        msg = c.convites ? 'Convites de outros servidores bloqueados.' : 'Convites liberados.';
        break;
      case 'palavra': {
        const p = i.options.getString('palavra').trim().toLowerCase();
        msg = alternar(c.palavras, p) ? `Palavra adicionada (${c.palavras.length} no total).` : `Palavra removida (${c.palavras.length} no total).`;
        break;
      }
      case 'flood':
        c.spam = i.options.getInteger('limite');
        msg = c.spam ? `Flood: no máximo **${c.spam}** mensagens a cada 5 segundos.` : 'Filtro de flood desligado.';
        break;
      case 'maiusculas':
        c.maiusculas = i.options.getBoolean('ligado');
        msg = c.maiusculas ? 'Mensagens em CAPS serão apagadas.' : 'Filtro de CAPS desligado.';
        break;
      case 'mencoes':
        c.mencoes = i.options.getInteger('limite');
        msg = c.mencoes ? `Mensagens com **${c.mencoes}** ou mais menções serão apagadas.` : 'Filtro de menções desligado.';
        break;
      case 'punicao': {
        c.acao = i.options.getString('acao');
        const d = i.options.getString('duracao');
        if (d) {
          const ms = lerDuracao(d);
          if (!ms || ms > 28 * 86_400_000) return responder(i, 'Duração inválida (ex.: 5m, 1h).', 'erro');
          c.duracao = ms;
        }
        msg = c.acao === 'castigo' ? `Além de apagar, castigo de **${duracaoTexto(c.duracao)}**.` : 'O AutoMod só vai apagar as mensagens.';
        break;
      }
      case 'imune': {
        const r = i.options.getRole('cargo');
        msg = alternar(c.imunes, r.id) ? `${r} agora é imune ao AutoMod.` : `${r} não é mais imune.`;
        break;
      }
      case 'ignorar-canal': {
        const ch = i.options.getChannel('canal');
        msg = alternar(c.ignorados, ch.id) ? `O AutoMod vai ignorar ${ch}.` : `O AutoMod volta a vigiar ${ch}.`;
        break;
      }
      case 'registro': {
        const ch = i.options.getChannel('canal');
        c.canalLog = ch?.id ?? null;
        msg = ch ? `O AutoMod vai registrar em ${ch}.` : 'Registro do AutoMod desligado.';
        break;
      }
    }
    salvarAjustes();
    return responder(i, msg, 'sucesso');
  },
  resumo(guild) {
    const c = cfg(guild.id);
    if (!c.ativo) return ['Desligado (use /config automod ativar)'];
    const f = [];
    if (c.convites) f.push('convites');
    if (c.links) f.push(`links${c.dominiosPermitidos.length ? ` (liberados: ${c.dominiosPermitidos.join(', ')})` : ''}`);
    if (c.palavras.length) f.push(`${c.palavras.length} palavra(s)`);
    if (c.spam) f.push(`flood > ${c.spam}/5s`);
    if (c.maiusculas) f.push('CAPS');
    if (c.mencoes) f.push(`${c.mencoes}+ menções`);
    return [
      `Filtros: ${f.length ? f.join(', ') : 'nenhum'}`,
      `Punição: ${c.acao === 'castigo' ? `apagar + castigo de ${duracaoTexto(c.duracao)}` : 'apagar'}`,
      `Registro: ${c.canalLog ? `<#${c.canalLog}>` : 'desligado'}`,
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
