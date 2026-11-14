import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, embed, responder, fmt, ts, sorteio, lerDuracao, duracaoTexto, cortar } from '../core/util.js';

/**
 * Economia: moeda do servidor com carteira e banco, recompensa diária, trabalho,
 * transferências, apostas, ranking e uma loja de cargos.
 */

const eco = colecao('economia');
const PADRAO = {
  moeda: 'moedas',
  emoji: '🪙',
  diario: 500,
  trabalhoMin: 100,
  trabalhoMax: 300,
  trabalhoIntervalo: 3_600_000,
  apostaMax: 0, // 0 = sem limite
  loja: [], // { id, nome, preco, cargo, descricao }
};
const cfg = (guildId) => ajustes(guildId, 'economia', PADRAO);
const conta = (guildId, userId) => {
  const d = eco.de(guildId, userId);
  d.carteira ??= 0;
  d.banco ??= 0;
  return d;
};
const dinheiro = (c, v) => `${c.emoji} **${fmt(v)}** ${c.moeda}`;
const DIA = 86_400_000;

const TRABALHOS = [
  'ajudou a organizar um evento do servidor',
  'consertou o computador de um vizinho',
  'entregou pizzas a noite toda',
  'programou um site para uma loja',
  'deu aulas particulares',
  'editou vídeos para um criador de conteúdo',
  'cuidou de um jardim',
  'trabalhou de garçom num casamento',
  'vendeu artesanato na feira',
  'fez uma faxina caprichada',
];

/** Lê "500", "1.000", "tudo" ou "metade". */
function lerQuantia(texto, maximo) {
  const t = String(texto).trim().toLowerCase();
  if (['tudo', 'all', 'max'].includes(t)) return maximo;
  if (t === 'metade') return Math.floor(maximo / 2);
  const n = Number(t.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}

const opQuantia = (o, desc = 'Valor (ou "tudo")') => o.setName('quantia').setDescription(desc).setRequired(true).setMaxLength(15);

// ---------------- comandos ----------------
const saldo = {
  data: new SlashCommandBuilder()
    .setName('saldo')
    .setDescription('Mostra o seu dinheiro')
    .addUserOption((o) => o.setName('usuario').setDescription('Ver de outra pessoa')),
  async executar(i) {
    const user = i.options.getUser('usuario') ?? i.user;
    const c = cfg(i.guildId);
    const d = conta(i.guildId, user.id);
    await i.reply({
      embeds: [
        embed(i.guildId)
          .setAuthor({ name: user.tag, iconURL: user.displayAvatarURL() })
          .addFields(
            { name: 'Carteira', value: dinheiro(c, d.carteira), inline: true },
            { name: 'Banco', value: dinheiro(c, d.banco), inline: true },
            { name: 'Total', value: dinheiro(c, d.carteira + d.banco), inline: true },
          ),
      ],
    });
  },
};

const diario = {
  data: new SlashCommandBuilder().setName('diario').setDescription('Pega a sua recompensa diária'),
  async executar(i) {
    const c = cfg(i.guildId);
    const d = conta(i.guildId, i.user.id);
    const prox = (d.diario ?? 0) + DIA;
    if (Date.now() < prox) return responder(i, `Você já pegou hoje. Volte ${ts(prox)}.`, 'aviso');
    d.diario = Date.now();
    d.carteira += c.diario;
    eco.salvar();
    return i.reply({ embeds: [embed(i.guildId).setDescription(`🎁 Você recebeu ${dinheiro(c, c.diario)}!\nVolte ${ts(Date.now() + DIA)} para pegar de novo.`)] });
  },
};

const trabalhar = {
  data: new SlashCommandBuilder().setName('trabalhar').setDescription('Trabalha para ganhar dinheiro'),
  async executar(i) {
    const c = cfg(i.guildId);
    const d = conta(i.guildId, i.user.id);
    const prox = (d.trabalho ?? 0) + c.trabalhoIntervalo;
    if (Date.now() < prox) return responder(i, `Você está cansado(a). Pode trabalhar de novo ${ts(prox)}.`, 'aviso');
    const ganho = sorteio(c.trabalhoMin, c.trabalhoMax);
    d.trabalho = Date.now();
    d.carteira += ganho;
    eco.salvar();
    const oque = TRABALHOS[sorteio(0, TRABALHOS.length - 1)];
    return i.reply({ embeds: [embed(i.guildId).setDescription(`💼 Você ${oque} e ganhou ${dinheiro(c, ganho)}.`)] });
  },
};

const pagar = {
  data: new SlashCommandBuilder()
    .setName('pagar')
    .setDescription('Transfere dinheiro da sua carteira para alguém')
    .addUserOption((o) => o.setName('usuario').setDescription('Para quem').setRequired(true))
    .addStringOption((o) => opQuantia(o, 'Valor')),
  async executar(i) {
    const alvo = i.options.getUser('usuario');
    if (alvo.bot || alvo.id === i.user.id) return responder(i, 'Escolha outra pessoa (que não seja bot).', 'erro');
    const c = cfg(i.guildId);
    const d = conta(i.guildId, i.user.id);
    const q = lerQuantia(i.options.getString('quantia'), d.carteira);
    if (q === null) return responder(i, 'Valor inválido.', 'erro');
    if (!q || q > d.carteira) return responder(i, `Você só tem ${dinheiro(c, d.carteira)} na carteira.`, 'erro');
    d.carteira -= q;
    conta(i.guildId, alvo.id).carteira += q;
    eco.salvar();
    return i.reply({ embeds: [embed(i.guildId).setDescription(`💸 ${i.user} enviou ${dinheiro(c, q)} para ${alvo}.`)] });
  },
};

function movimentar(de, para, titulo) {
  return {
    data: new SlashCommandBuilder()
      .setName(titulo === 'depositar' ? 'depositar' : 'sacar')
      .setDescription(titulo === 'depositar' ? 'Guarda dinheiro da carteira no banco' : 'Tira dinheiro do banco para a carteira')
      .addStringOption((o) => opQuantia(o)),
    async executar(i) {
      const c = cfg(i.guildId);
      const d = conta(i.guildId, i.user.id);
      const q = lerQuantia(i.options.getString('quantia'), d[de]);
      if (q === null) return responder(i, 'Valor inválido.', 'erro');
      if (!q || q > d[de]) return responder(i, `Você só tem ${dinheiro(c, d[de])} ${de === 'carteira' ? 'na carteira' : 'no banco'}.`, 'erro');
      d[de] -= q;
      d[para] += q;
      eco.salvar();
      return responder(i, `${titulo === 'depositar' ? '🏦 Depositou' : '👛 Sacou'} ${dinheiro(c, q)}.`, 'sucesso');
    },
  };
}

const apostar = {
  data: new SlashCommandBuilder()
    .setName('apostar')
    .setDescription('Aposta no cara ou coroa: dobra ou perde')
    .addStringOption((o) => opQuantia(o, 'Quanto apostar (ou "tudo")'))
    .addStringOption((o) =>
      o.setName('lado').setDescription('Cara ou coroa').setRequired(true).addChoices({ name: 'Cara', value: 'cara' }, { name: 'Coroa', value: 'coroa' })
    ),
  async executar(i) {
    const c = cfg(i.guildId);
    const d = conta(i.guildId, i.user.id);
    const q = lerQuantia(i.options.getString('quantia'), d.carteira);
    if (q === null) return responder(i, 'Valor inválido.', 'erro');
    if (!q || q > d.carteira) return responder(i, `Você só tem ${dinheiro(c, d.carteira)} na carteira.`, 'erro');
    if (c.apostaMax > 0 && q > c.apostaMax) return responder(i, `A aposta máxima é ${dinheiro(c, c.apostaMax)}.`, 'erro');
    const lado = i.options.getString('lado');
    const caiu = Math.random() < 0.5 ? 'cara' : 'coroa';
    const ganhou = caiu === lado;
    d.carteira += ganhou ? q : -q;
    eco.salvar();
    return i.reply({
      embeds: [
        embed(i.guildId)
          .setColor(ganhou ? 0x22c55e : 0xef4444)
          .setTitle(`🪙 Deu ${caiu}!`)
          .setDescription(ganhou ? `Você ganhou ${dinheiro(c, q)}!` : `Você perdeu ${dinheiro(c, q)}.`)
          .setFooter({ text: `Carteira: ${fmt(d.carteira)} ${c.moeda}` }),
      ],
    });
  },
};

const ricos = {
  data: new SlashCommandBuilder().setName('ricos').setDescription('Ranking dos mais ricos do servidor'),
  async executar(i) {
    const c = cfg(i.guildId);
    const lista = Object.entries(eco.ler(i.guildId) ?? {})
      .map(([id, d]) => [id, (d.carteira ?? 0) + (d.banco ?? 0)])
      .filter(([, t]) => t > 0)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);
    if (!lista.length) return responder(i, 'Ninguém tem dinheiro ainda. Use /diario!', 'info');
    const medalhas = ['🥇', '🥈', '🥉'];
    await i.reply({
      embeds: [embed(i.guildId).setTitle(`💰 Mais ricos de ${i.guild.name}`).setDescription(lista.map(([id, t], n) => `${medalhas[n] ?? `**${n + 1}.**`} <@${id}> · ${dinheiro(c, t)}`).join('\n'))],
      allowedMentions: { parse: [] },
    });
  },
};

const loja = {
  data: new SlashCommandBuilder().setName('loja').setDescription('Mostra os cargos à venda'),
  async executar(i) {
    const c = cfg(i.guildId);
    if (!c.loja.length) return responder(i, 'A loja está vazia. A equipe pode adicionar itens com /config economia loja-adicionar.', 'info');
    const e = embed(i.guildId).setTitle(`🛒 Loja de ${i.guild.name}`).setFooter({ text: 'Para comprar: /comprar' });
    for (const it of c.loja.slice(0, 25)) {
      e.addFields({ name: `${it.nome} · ${c.emoji} ${fmt(it.preco)}`, value: `${it.descricao ? `${cortar(it.descricao, 200)}\n` : ''}Cargo: <@&${it.cargo}>` });
    }
    await i.reply({ embeds: [e], allowedMentions: { parse: [] } });
  },
};

const comprar = {
  data: new SlashCommandBuilder()
    .setName('comprar')
    .setDescription('Compra um cargo da loja')
    .addStringOption((o) => o.setName('item').setDescription('Item da loja').setRequired(true).setAutocomplete(true)),
  async autocompletar(i) {
    const c = cfg(i.guildId);
    const busca = i.options.getFocused().toLowerCase();
    await i.respond(
      c.loja
        .filter((it) => it.nome.toLowerCase().includes(busca))
        .slice(0, 25)
        .map((it) => ({ name: cortar(`${it.nome} · ${fmt(it.preco)} ${c.moeda}`, 100), value: it.id }))
    );
  },
  async executar(i) {
    const c = cfg(i.guildId);
    const v = i.options.getString('item');
    const it = c.loja.find((x) => x.id === v || x.nome.toLowerCase() === v.toLowerCase());
    if (!it) return responder(i, 'Item não encontrado. Veja a /loja.', 'erro');
    const cargo = i.guild.roles.cache.get(it.cargo);
    if (!cargo) return responder(i, 'O cargo deste item não existe mais. Avise a equipe.', 'erro');
    if (i.member.roles.cache.has(cargo.id)) return responder(i, 'Você já tem esse cargo.', 'aviso');
    if (!cargo.editable) return responder(i, 'Não consigo dar esse cargo (o meu cargo está abaixo dele). Avise a equipe.', 'erro');
    const d = conta(i.guildId, i.user.id);
    if (d.carteira < it.preco) return responder(i, `Faltam ${dinheiro(c, it.preco - d.carteira)} na carteira.`, 'erro');
    d.carteira -= it.preco;
    const ok = await i.member.roles.add(cargo, 'Comprado na loja').then(() => true, () => false);
    if (!ok) {
      d.carteira += it.preco; // devolve
      return responder(i, 'Não consegui te dar o cargo, então nada foi cobrado. Avise a equipe.', 'erro');
    }
    eco.salvar();
    return i.reply({ embeds: [embed(i.guildId).setDescription(`🛍️ ${i.user} comprou **${it.nome}** por ${dinheiro(c, it.preco)} e ganhou ${cargo}!`)], allowedMentions: { users: [i.user.id] } });
  },
};

const ecoAdmin = {
  data: new SlashCommandBuilder()
    .setName('eco')
    .setDescription('Gerencia o dinheiro dos membros')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .addSubcommand((s) =>
      s
        .setName('dar')
        .setDescription('Dá dinheiro a um membro')
        .addUserOption((o) => o.setName('usuario').setDescription('Quem').setRequired(true))
        .addIntegerOption((o) => o.setName('quantia').setDescription('Valor').setRequired(true).setMinValue(1).setMaxValue(1_000_000_000))
    )
    .addSubcommand((s) =>
      s
        .setName('tirar')
        .setDescription('Tira dinheiro da carteira de um membro')
        .addUserOption((o) => o.setName('usuario').setDescription('Quem').setRequired(true))
        .addIntegerOption((o) => o.setName('quantia').setDescription('Valor').setRequired(true).setMinValue(1).setMaxValue(1_000_000_000))
    )
    .addSubcommand((s) => s.setName('zerar').setDescription('Zera carteira e banco de um membro').addUserOption((o) => o.setName('usuario').setDescription('Quem').setRequired(true))),
  async executar(i) {
    const c = cfg(i.guildId);
    const sub = i.options.getSubcommand();
    const user = i.options.getUser('usuario');
    if (user.bot) return responder(i, 'Bots não têm conta.', 'erro');
    const d = conta(i.guildId, user.id);
    const q = i.options.getInteger('quantia') ?? 0;
    if (sub === 'dar') d.carteira += q;
    if (sub === 'tirar') d.carteira = Math.max(0, d.carteira - q);
    if (sub === 'zerar') d.carteira = d.banco = 0;
    eco.salvar();
    return responder(i, `**${user.tag}**: carteira ${dinheiro(c, d.carteira)} · banco ${dinheiro(c, d.banco)}.`, 'sucesso');
  },
};

// ---------------- /config economia ----------------
const config = {
  grupo: 'economia',
  montar: (g) =>
    g
      .setDescription('Moeda, recompensas e loja de cargos')
      .addSubcommand((s) =>
        s
          .setName('moeda')
          .setDescription('Nome e emoji da moeda')
          .addStringOption((o) => o.setName('nome').setDescription('Ex.: moedas, coins, reais').setRequired(true).setMaxLength(20))
          .addStringOption((o) => o.setName('emoji').setDescription('Ex.: 🪙').setMaxLength(60))
      )
      .addSubcommand((s) =>
        s
          .setName('ganhos')
          .setDescription('Valores do /diario e do /trabalhar')
          .addIntegerOption((o) => o.setName('diario').setDescription('Valor do /diario').setMinValue(0).setMaxValue(1_000_000))
          .addIntegerOption((o) => o.setName('trabalho_min').setDescription('Mínimo do /trabalhar').setMinValue(0).setMaxValue(1_000_000))
          .addIntegerOption((o) => o.setName('trabalho_max').setDescription('Máximo do /trabalhar').setMinValue(0).setMaxValue(1_000_000))
          .addStringOption((o) => o.setName('intervalo').setDescription('Tempo entre /trabalhar, ex.: 1h, 30m').setMaxLength(20))
          .addIntegerOption((o) => o.setName('aposta_max').setDescription('Aposta máxima (0 = sem limite)').setMinValue(0).setMaxValue(1_000_000_000))
      )
      .addSubcommand((s) =>
        s
          .setName('loja-adicionar')
          .setDescription('Coloca um cargo à venda')
          .addStringOption((o) => o.setName('nome').setDescription('Nome do item').setRequired(true).setMaxLength(60))
          .addIntegerOption((o) => o.setName('preco').setDescription('Preço').setRequired(true).setMinValue(1).setMaxValue(1_000_000_000))
          .addRoleOption((o) => o.setName('cargo').setDescription('Cargo que a pessoa ganha').setRequired(true))
          .addStringOption((o) => o.setName('descricao').setDescription('Descrição').setMaxLength(200))
      )
      .addSubcommand((s) =>
        s.setName('loja-remover').setDescription('Tira um item da loja').addStringOption((o) => o.setName('nome').setDescription('Nome do item').setRequired(true).setMaxLength(60))
      ),
  async executar(i, sub) {
    const c = cfg(i.guildId);
    let msg;
    if (sub === 'moeda') {
      c.moeda = i.options.getString('nome');
      c.emoji = i.options.getString('emoji') || c.emoji;
      msg = `Moeda: ${c.emoji} **${c.moeda}**.`;
    } else if (sub === 'ganhos') {
      const v = (n) => i.options.getInteger(n);
      if (v('diario') !== null) c.diario = v('diario');
      if (v('trabalho_min') !== null) c.trabalhoMin = v('trabalho_min');
      if (v('trabalho_max') !== null) c.trabalhoMax = v('trabalho_max');
      if (c.trabalhoMin > c.trabalhoMax) [c.trabalhoMin, c.trabalhoMax] = [c.trabalhoMax, c.trabalhoMin];
      const iv = i.options.getString('intervalo');
      if (iv) {
        const ms = lerDuracao(iv);
        if (!ms) return responder(i, 'Intervalo inválido (ex.: 1h, 30m).', 'erro');
        c.trabalhoIntervalo = ms;
      }
      if (v('aposta_max') !== null) c.apostaMax = v('aposta_max');
      msg = `/diario: **${fmt(c.diario)}** · /trabalhar: **${fmt(c.trabalhoMin)}–${fmt(c.trabalhoMax)}** a cada ${duracaoTexto(c.trabalhoIntervalo)} · aposta máxima: ${c.apostaMax ? fmt(c.apostaMax) : 'sem limite'}.`;
    } else if (sub === 'loja-adicionar') {
      const r = i.options.getRole('cargo');
      if (r.managed || r.id === i.guildId) return responder(i, 'Esse cargo não pode ser vendido.', 'erro');
      if (c.loja.length >= 25) return responder(i, 'A loja aceita no máximo 25 itens.', 'erro');
      const nome = i.options.getString('nome');
      if (c.loja.some((x) => x.nome.toLowerCase() === nome.toLowerCase())) return responder(i, 'Já existe um item com esse nome.', 'erro');
      c.loja.push({ id: Date.now().toString(36), nome, preco: i.options.getInteger('preco'), cargo: r.id, descricao: i.options.getString('descricao') || '' });
      msg = `**${nome}** está à venda.${r.editable ? '' : ' ⚠️ Suba o meu cargo acima dele, senão não consigo entregar.'}`;
    } else if (sub === 'loja-remover') {
      const nome = i.options.getString('nome').toLowerCase();
      const antes = c.loja.length;
      c.loja = c.loja.filter((x) => x.nome.toLowerCase() !== nome);
      if (c.loja.length === antes) return responder(i, 'Não achei um item com esse nome.', 'erro');
      msg = 'Item removido da loja.';
    }
    salvarAjustes();
    return responder(i, msg, 'sucesso');
  },
  resumo(guild) {
    const c = cfg(guild.id);
    return [
      `Moeda: ${c.emoji} ${c.moeda}`,
      `/diario: ${fmt(c.diario)} · /trabalhar: ${fmt(c.trabalhoMin)}–${fmt(c.trabalhoMax)} (a cada ${duracaoTexto(c.trabalhoIntervalo)})`,
      `Loja: ${c.loja.length} item(ns)`,
    ];
  },
};

export default {
  id: 'economia',
  nome: 'Economia',
  permissoes: [PermissionFlagsBits.ManageRoles],
  comandos: [saldo, diario, trabalhar, pagar, movimentar('carteira', 'banco', 'depositar'), movimentar('banco', 'carteira', 'sacar'), apostar, ricos, loja, comprar, ecoAdmin],
  config,
};
