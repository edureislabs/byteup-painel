import { GatewayIntentBits, PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { embed, responder, preencher, cortar, foiRemovida } from '../core/util.js';

/**
 * Respostas automáticas: quando alguém escreve um gatilho, o bot responde.
 * Também viram atalhos: /tag nome:regras mostra a resposta salva.
 * Variáveis na resposta: {usuario} {nome} {servidor} {canal}
 */

const respostas = colecao('autorespostas');
const LIMITE = 50;
const MODOS = { contem: 'contém a palavra', igual: 'é exatamente', comeca: 'começa com' };
const recentes = new Map(); // anti-spam: "canal:gatilho" -> quando respondeu

const normalizar = (t) =>
  String(t ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim();
const escapar = (t) => t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const lista = (guildId) => respostas.de(guildId, 'itens').lista ?? (respostas.de(guildId, 'itens').lista = []);

function bate(item, texto) {
  const g = normalizar(item.gatilho);
  if (item.modo === 'igual') return texto === g;
  if (item.modo === 'comeca') return texto.startsWith(g);
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escapar(g)}($|[^\\p{L}\\p{N}])`, 'u').test(texto);
}

const vars = (guild, user, canal) => ({ usuario: `${user}`, nome: user.displayName ?? user.username, servidor: guild.name, canal: `${canal}` });

async function aoMensagem(msg) {
  if (!msg.inGuild() || msg.author.bot || !msg.content) return;
  if (foiRemovida(msg.id)) return; // apagada pelo AutoMod
  const itens = respostas.ler(msg.guildId, 'itens')?.lista;
  if (!itens?.length) return;
  const texto = normalizar(msg.content);
  const item = itens.find((it) => bate(it, texto));
  if (!item) return;
  const k = `${msg.channelId}:${item.gatilho}`;
  if (Date.now() - (recentes.get(k) ?? 0) < 10_000) return; // no máximo uma vez a cada 10 s por canal
  recentes.set(k, Date.now());
  await msg.reply({ content: preencher(item.resposta, vars(msg.guild, msg.author, msg.channel)), allowedMentions: { users: [msg.author.id], repliedUser: false } }).catch(() => {});
}

const autoresposta = {
  data: new SlashCommandBuilder()
    .setName('autoresposta')
    .setDescription('Gerencia as respostas automáticas')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('adicionar')
        .setDescription('Cria (ou troca) uma resposta automática')
        .addStringOption((o) => o.setName('gatilho').setDescription('Palavra ou frase que dispara a resposta').setRequired(true).setMaxLength(60))
        .addStringOption((o) => o.setName('resposta').setDescription('O que o bot responde. Variáveis: {usuario} {nome} {servidor} {canal}').setRequired(true).setMaxLength(1800))
        .addStringOption((o) =>
          o
            .setName('modo')
            .setDescription('Quando responder (padrão: quando a mensagem contém a palavra)')
            .addChoices({ name: 'contém a palavra', value: 'contem' }, { name: 'é exatamente', value: 'igual' }, { name: 'começa com', value: 'comeca' })
        )
    )
    .addSubcommand((s) =>
      s
        .setName('remover')
        .setDescription('Apaga uma resposta automática')
        .addStringOption((o) => o.setName('gatilho').setDescription('Qual apagar').setRequired(true).setAutocomplete(true))
    )
    .addSubcommand((s) => s.setName('lista').setDescription('Mostra todas as respostas automáticas')),
  async executar(i) {
    const sub = i.options.getSubcommand();
    const itens = lista(i.guildId);
    if (sub === 'adicionar') {
      const gatilho = i.options.getString('gatilho').trim();
      if (normalizar(gatilho).length < 2) return responder(i, 'O gatilho precisa ter pelo menos 2 letras.', 'erro');
      const existente = itens.find((x) => normalizar(x.gatilho) === normalizar(gatilho));
      if (!existente && itens.length >= LIMITE) return responder(i, `Limite de ${LIMITE} respostas automáticas. Apague alguma antes.`, 'erro');
      const item = { gatilho, resposta: i.options.getString('resposta'), modo: i.options.getString('modo') ?? 'contem' };
      if (existente) Object.assign(existente, item);
      else itens.push(item);
      respostas.salvar();
      return responder(i, `${existente ? 'Atualizada' : 'Criada'}: quando a mensagem **${MODOS[item.modo]}** \`${gatilho}\`, eu respondo. Também dá para usar \`/tag ${gatilho}\`.`, 'sucesso');
    }
    if (sub === 'remover') {
      const g = normalizar(i.options.getString('gatilho'));
      const antes = itens.length;
      const restantes = itens.filter((x) => normalizar(x.gatilho) !== g);
      if (restantes.length === antes) return responder(i, 'Não achei essa resposta automática.', 'erro');
      respostas.de(i.guildId, 'itens').lista = restantes;
      respostas.salvar();
      return responder(i, 'Resposta automática apagada.', 'sucesso');
    }
    if (!itens.length) return responder(i, 'Nenhuma resposta automática ainda. Use `/autoresposta adicionar`.', 'aviso');
    const linhas = itens.map((x) => `• \`${x.gatilho}\` (${MODOS[x.modo] ?? MODOS.contem}) → ${cortar(x.resposta.replace(/\n/g, ' '), 60)}`);
    return i.reply({ embeds: [embed(i.guildId).setTitle(`💬 Respostas automáticas (${itens.length})`).setDescription(cortar(linhas.join('\n'), 4000))], flags: 64 });
  },
  async autocompletar(i) {
    const foco = normalizar(i.options.getFocused());
    const itens = respostas.ler(i.guildId, 'itens')?.lista ?? [];
    await i.respond(itens.filter((x) => normalizar(x.gatilho).includes(foco)).slice(0, 25).map((x) => ({ name: x.gatilho, value: x.gatilho })));
  },
};

const tag = {
  data: new SlashCommandBuilder()
    .setName('tag')
    .setDescription('Mostra uma resposta salva (atalho)')
    .addStringOption((o) => o.setName('nome').setDescription('Qual resposta').setRequired(true).setAutocomplete(true))
    .addUserOption((o) => o.setName('para').setDescription('Marcar alguém junto')),
  async executar(i) {
    const nome = normalizar(i.options.getString('nome'));
    const item = (respostas.ler(i.guildId, 'itens')?.lista ?? []).find((x) => normalizar(x.gatilho) === nome);
    if (!item) return responder(i, 'Não achei essa resposta. Veja as opções enquanto digita.', 'erro');
    const para = i.options.getUser('para');
    const texto = preencher(item.resposta, vars(i.guild, para ?? i.user, i.channel));
    return i.reply({ content: para ? `${para} ${texto}` : texto, allowedMentions: { users: para ? [para.id] : [] } });
  },
  autocompletar: autoresposta.autocompletar,
};

export default {
  id: 'autorespostas',
  nome: 'Respostas automáticas',
  intents: [GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent],
  comandos: [autoresposta, tag],
  eventos: { messageCreate: aoMensagem },
  config: {
    resumo(guild) {
      const n = respostas.ler(guild.id, 'itens')?.lista?.length ?? 0;
      return [n ? `${n} resposta(s) automática(s) (\`/autoresposta lista\`)` : 'Nenhuma ainda (`/autoresposta adicionar`)'];
    },
  },
};
