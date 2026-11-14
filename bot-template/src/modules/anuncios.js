import { ChannelType, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { CONFIG, embed, responder, cortar, lerDuracao, duracaoTexto, ts } from '../core/util.js';

/**
 * Anúncios agendados: mensagens que saem numa data marcada ou que repetem
 * de tempos em tempos (ex.: lembrar as regras toda segunda às 9h).
 */

const anuncios = colecao('anuncios'); // guild -> { lista: [...] }
const LIMITE = 20;
const MIN_INTERVALO = 10 * 60_000;
const FUSO = CONFIG.fuso || 'America/Sao_Paulo';
const lista = (guildId) => (anuncios.de(guildId).lista ??= []);

/** Diferença (ms) entre o fuso escolhido e o UTC num instante. */
function offsetFuso(data) {
  const p = Object.fromEntries(
    new Intl.DateTimeFormat('en-US', { timeZone: FUSO, hourCycle: 'h23', year: 'numeric', month: 'numeric', day: 'numeric', hour: 'numeric', minute: 'numeric', second: 'numeric' })
      .formatToParts(data)
      .map((x) => [x.type, x.value])
  );
  return Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - data.getTime();
}

/**
 * "25/12 09:00", "25/12/2026 9h", "09:30" ou "9h" (hoje, ou amanhã se já passou)
 * e "em 2h" / "em 30min" / "em 1d" (daqui a). null se não entender.
 */
export function lerQuando(texto) {
  if (!texto) return Date.now();
  const t = texto.trim().toLowerCase();
  if (t.startsWith('em ')) {
    const rel = lerDuracao(t.slice(3).trim());
    return rel ? Date.now() + rel : null;
  }
  const m = /^(?:(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?\s*)?(?:às\s*|as\s*)?(\d{1,2})(?:[:h](\d{2})?)?h?$/.exec(t);
  if (!m) return null;
  const agora = new Date();
  const local = new Date(agora.getTime() + offsetFuso(agora)); // "relógio" do fuso, em UTC
  let [dia, mes, ano] = [m[1] ? Number(m[1]) : local.getUTCDate(), m[2] ? Number(m[2]) : local.getUTCMonth() + 1, m[3] ? Number(m[3]) : local.getUTCFullYear()];
  if (ano < 100) ano += 2000;
  const hora = Number(m[4]);
  const minuto = Number(m[5] ?? 0);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31 || hora > 23 || minuto > 59) return null;
  let quando = Date.UTC(ano, mes - 1, dia, hora, minuto);
  if (new Date(quando).getUTCDate() !== dia) return null; // ex.: 31/02
  quando -= offsetFuso(new Date(quando));
  if (!m[1] && quando < Date.now()) quando += 86400e3; // só a hora e já passou: amanhã
  if (m[1] && quando < Date.now() - 60_000) {
    // data sem ano que passou faz tempo (ex.: 1/1): é a do ano que vem
    if (!m[3] && quando < Date.now() - 86400e3) {
      quando = Date.UTC(ano + 1, mes - 1, dia, hora, minuto);
      return quando - offsetFuso(new Date(quando));
    }
    return -1; // passou há pouco (provável engano)
  }
  return quando;
}

function mensagem(guildId, a) {
  const e = embed(guildId).setDescription(a.texto);
  if (a.titulo) e.setTitle(a.titulo);
  if (a.imagem) e.setImage(a.imagem);
  return { content: a.cargo ? (a.cargo === guildId ? '@everyone' : `<@&${a.cargo}>`) : undefined, embeds: [e], allowedMentions: { parse: a.cargo === guildId ? ['everyone'] : [], roles: a.cargo && a.cargo !== guildId ? [a.cargo] : [] } };
}

async function enviar(client, guildId, a) {
  const canal = await client.channels.fetch(a.canal).catch(() => null);
  if (!canal?.isTextBased()) return false;
  return canal.send(mensagem(guildId, a)).then(() => true, () => false);
}

async function verificar(client) {
  const agora = Date.now();
  for (const [guildId, g] of Object.entries(anuncios.raiz)) {
    if (!client.guilds.cache.has(guildId) || !g.lista?.length) continue;
    let mudou = false;
    for (const a of [...g.lista]) {
      if (a.proximo > agora) continue;
      await enviar(client, guildId, a);
      mudou = true;
      if (a.intervalo) {
        // pula os horários perdidos enquanto o bot estava desligado
        while (a.proximo <= agora) a.proximo += a.intervalo;
      } else g.lista = g.lista.filter((x) => x.id !== a.id);
    }
    if (mudou) anuncios.salvar();
  }
}

const anuncio = {
  data: new SlashCommandBuilder()
    .setName('anuncio')
    .setDescription('Anúncios agendados e repetidos')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('criar')
        .setDescription('Agenda um anúncio')
        .addChannelOption((o) => o.setName('canal').setDescription('Onde enviar').setRequired(true).addChannelTypes(ChannelType.GuildText, ChannelType.GuildAnnouncement))
        .addStringOption((o) => o.setName('mensagem').setDescription('Texto do anúncio (use \\n para pular linha)').setRequired(true).setMaxLength(1900))
        .addStringOption((o) => o.setName('quando').setDescription('Ex.: "25/12 09:00", "18:30", "9h" ou "em 2h". Vazio = agora'))
        .addStringOption((o) => o.setName('repetir').setDescription('Repetir a cada... ex.: "1d", "12h", "7d" (vazio = uma vez só)'))
        .addStringOption((o) => o.setName('titulo').setDescription('Título (opcional)').setMaxLength(200))
        .addRoleOption((o) => o.setName('mencionar').setDescription('Cargo para marcar (opcional)'))
        .addStringOption((o) => o.setName('imagem').setDescription('Link de uma imagem (opcional)'))
    )
    .addSubcommand((s) => s.setName('lista').setDescription('Mostra os anúncios agendados'))
    .addSubcommand((s) =>
      s
        .setName('apagar')
        .setDescription('Cancela um anúncio')
        .addStringOption((o) => o.setName('anuncio').setDescription('Qual').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand((s) =>
      s
        .setName('testar')
        .setDescription('Envia um anúncio agora (sem mudar o agendamento)')
        .addStringOption((o) => o.setName('anuncio').setDescription('Qual').setRequired(true).setAutocomplete(true))
    ),
  async executar(i) {
    const sub = i.options.getSubcommand();
    const l = lista(i.guildId);
    if (sub === 'lista') {
      if (!l.length) return responder(i, 'Nenhum anúncio agendado. Use `/anuncio criar`.', 'aviso');
      const linhas = l.map((a) => `\`${a.id}\` · <#${a.canal}> · ${ts(a.proximo, 'f')}${a.intervalo ? ` · a cada ${duracaoTexto(a.intervalo)}` : ''}\n> ${cortar(a.titulo || a.texto.replace(/\n/g, ' '), 80)}`);
      return i.reply({ embeds: [embed(i.guildId).setTitle('📣 Anúncios agendados').setDescription(cortar(linhas.join('\n'), 4000))], flags: 64 });
    }
    if (sub === 'apagar' || sub === 'testar') {
      const a = l.find((x) => x.id === i.options.getString('anuncio'));
      if (!a) return responder(i, 'Anúncio não encontrado. Escolha na lista enquanto digita.', 'erro');
      if (sub === 'testar') return responder(i, (await enviar(i.client, i.guildId, a)) ? `Enviado em <#${a.canal}>.` : 'Não consegui enviar. Confira as minhas permissões no canal.', 'sucesso');
      anuncios.de(i.guildId).lista = l.filter((x) => x.id !== a.id);
      anuncios.salvar();
      return responder(i, 'Anúncio cancelado.', 'sucesso');
    }
    // criar
    if (l.length >= LIMITE) return responder(i, `No máximo ${LIMITE} anúncios agendados.`, 'erro');
    const quando = lerQuando(i.options.getString('quando'));
    if (quando === -1) return responder(i, 'Essa data já passou. Confira o dia e o horário.', 'erro');
    if (!quando) return responder(i, 'Não entendi a data. Use algo como **25/12 09:00**, **18:30**, **9h** ou **em 2h**.', 'erro');
    const repetir = i.options.getString('repetir');
    const intervalo = repetir ? lerDuracao(repetir) : null;
    if (repetir && !intervalo) return responder(i, 'Não entendi o "repetir". Use algo como **12h**, **1d** ou **7d**.', 'erro');
    if (intervalo && intervalo < MIN_INTERVALO) return responder(i, 'Para não virar spam, o intervalo mínimo é de 10 minutos.', 'erro');
    const imagem = i.options.getString('imagem');
    if (imagem && !/^https?:\/\/\S+$/i.test(imagem)) return responder(i, 'O link da imagem precisa começar com https://', 'erro');
    const a = {
      id: Date.now().toString(36).slice(-6),
      canal: i.options.getChannel('canal').id,
      texto: i.options.getString('mensagem').replace(/\\n/g, '\n'),
      titulo: i.options.getString('titulo') ?? null,
      cargo: i.options.getRole('mencionar')?.id ?? null,
      imagem: imagem ?? null,
      proximo: Math.max(quando, Date.now() + 5000),
      intervalo,
    };
    l.push(a);
    anuncios.salvar();
    return responder(i, `Anúncio agendado para ${ts(a.proximo, 'f')} (${ts(a.proximo)})${intervalo ? ` e depois a cada **${duracaoTexto(intervalo)}**` : ''} em <#${a.canal}>.`, 'sucesso');
  },
  async autocompletar(i) {
    const foco = (i.options.getFocused() || '').toLowerCase();
    await i.respond(
      (anuncios.ler(i.guildId, 'lista') ?? [])
        .filter((a) => `${a.id} ${a.titulo ?? ''} ${a.texto}`.toLowerCase().includes(foco))
        .slice(0, 25)
        .map((a) => ({ name: cortar(`${a.id} · ${a.titulo || a.texto.replace(/\n/g, ' ')}`, 100), value: a.id }))
    );
  },
};

export default {
  id: 'anuncios',
  nome: 'Anúncios agendados',
  permissoes: [PermissionFlagsBits.MentionEveryone],
  comandos: [anuncio],
  aoIniciar(client) {
    verificar(client).catch((e) => console.error('[anúncios]', e.message));
    setInterval(() => verificar(client).catch((e) => console.error('[anúncios]', e.message)), 30_000);
  },
  config: {
    resumo(guild) {
      const n = anuncios.ler(guild.id, 'lista')?.length ?? 0;
      return [n ? `${n} anúncio(s) agendado(s) (\`/anuncio lista\`)` : 'Nenhum (`/anuncio criar`)'];
    },
  },
};
