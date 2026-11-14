import { PermissionFlagsBits, SlashCommandBuilder } from 'discord.js';
import { colecao } from '../core/db.js';
import { ajustes, salvarAjustes, embed, responder, fmt, ts, sorteio, lerDuracao, duracaoTexto, cortar } from '../core/util.js';
import { textos } from '../core/textos.js';

// Textos deste módulo (o dono do bot pode trocar todos no "Personalizar bot.html")
const tx = textos('economia', {
  ajudou_organizar_evento_servidor: 'ajudou a organizar um evento do servidor',
  consertou_computador_vizinho: 'consertou o computador de um vizinho',
  entregou_pizzas_noite_toda: 'entregou pizzas a noite toda',
  programou_site_loja: 'programou um site para uma loja',
  deu_aulas_particulares: 'deu aulas particulares',
  editou_videos_criador_conteudo: 'editou vídeos para um criador de conteúdo',
  cuidou_jardim: 'cuidou de um jardim',
  trabalhou_garcom_num_casamento: 'trabalhou de garçom num casamento',
  vendeu_artesanato_feira: 'vendeu artesanato na feira',
  fez_faxina_caprichada: 'fez uma faxina caprichada',
  valor_ou_tudo: 'Valor (ou "tudo")',
  carteira: ['Carteira', 'campo'],
  banco: ['Banco', 'campo'],
  total: ['Total', 'campo'],
  voce_ja_pegou_hoje: ['Você já pegou hoje. Volte {quando}.', 'resposta'],
  voce_recebeu_volte_pegar: ['🎁 Você recebeu {dinheiro}!\nVolte {quando} para pegar de novo.', 'descricao'],
  voce_esta_cansado_pode: ['Você está cansado(a). Pode trabalhar de novo {quando}.', 'resposta'],
  voce_ganhou: ['💼 Você {oque} e ganhou {dinheiro}.', 'descricao'],
  escolha_outra_pessoa_seja: ['Escolha outra pessoa (que não seja bot).', 'resposta'],
  valor_invalido: ['Valor inválido.', 'resposta'],
  voce_so_tem_carteira: ['Você só tem {dinheiro} na carteira.', 'resposta'],
  enviou: ['💸 {usuario} enviou {dinheiro} para {alvo}.', 'descricao'],
  carteira_2: 'na carteira',
  banco_2: 'no banco',
  voce_so_tem: ['Você só tem {dinheiro} {onde}.', 'resposta'],
  depositou: '🏦 Depositou',
  sacou: '👛 Sacou',
  aposta_maxima: ['A aposta máxima é {dinheiro}.', 'resposta'],
  deu: ['🪙 Deu {caiu}!', 'titulo'],
  voce_ganhou_2: 'Você ganhou {dinheiro}!',
  voce_perdeu: 'Você perdeu {dinheiro}.',
  carteira_3: ['Carteira: {carteira} {moeda}', 'rodape'],
  ninguem_tem_dinheiro_ainda: ['Ninguém tem dinheiro ainda. Use /diario!', 'resposta'],
  mais_ricos: ['💰 Mais ricos de {servidor}', 'titulo'],
  loja_esta_vazia_equipe: ['A loja está vazia. A equipe pode adicionar itens com /config economia loja-adicionar.', 'resposta'],
  loja: ['🛒 Loja de {servidor}', 'titulo'],
  comprar_comprar: ['Para comprar: /comprar', 'rodape'],
  cargo: '{descricao}Cargo: <@&{cargo}>',
  item_encontrado_veja_loja: ['Item não encontrado. Veja a /loja.', 'resposta'],
  cargo_deste_item_existe: ['O cargo deste item não existe mais. Avise a equipe.', 'resposta'],
  voce_ja_tem_esse: ['Você já tem esse cargo.', 'resposta'],
  consigo_dar_esse_cargo: ['Não consigo dar esse cargo (o meu cargo está abaixo dele). Avise a equipe.', 'resposta'],
  faltam_carteira: ['Faltam {dinheiro} na carteira.', 'resposta'],
  consegui_te_dar_cargo: ['Não consegui te dar o cargo, então nada foi cobrado. Avise a equipe.', 'resposta'],
  comprou_ganhou: ['🛍️ {usuario} comprou **{nome}** por {dinheiro} e ganhou {cargo}!', 'descricao'],
  bots_tem_conta: ['Bots não têm conta.', 'resposta'],
  carteira_banco: ['**{tag}**: carteira {dinheiro} · banco {banco}.', 'resposta'],
  moeda: 'Moeda: {emoji} **{moeda}**.',
  intervalo_invalido_ex_1h: ['Intervalo inválido (ex.: 1h, 30m).', 'resposta'],
  sem_limite: 'sem limite',
  diario_trabalhar_cada_aposta: '/diario: **{diario}** · /trabalhar: **{trabalhoMin}–{trabalhoMax}** a cada {duracao} · aposta máxima: {apostaMax}.',
  esse_cargo_pode_ser: ['Esse cargo não pode ser vendido.', 'resposta'],
  loja_aceita_maximo_25: ['A loja aceita no máximo 25 itens.', 'resposta'],
  ja_existe_item_esse: ['Já existe um item com esse nome.', 'resposta'],
  suba_meu_cargo_acima: ' ⚠️ Suba o meu cargo acima dele, senão não consigo entregar.',
  esta_venda: '**{nome}** está à venda.{aviso}',
  achei_item_esse_nome: ['Não achei um item com esse nome.', 'resposta'],
  item_removido_loja: 'Item removido da loja.',
  moeda_2: 'Moeda: {emoji} {moeda}',
  diario_trabalhar_cada: '/diario: {diario} · /trabalhar: {trabalhoMin}–{trabalhoMax} (a cada {duracao})',
  loja_item_ns: 'Loja: {loja_total} item(ns)',
  economia: 'Economia',
});

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
  tx('ajudou_organizar_evento_servidor'),
  tx('consertou_computador_vizinho'),
  tx('entregou_pizzas_noite_toda'),
  tx('programou_site_loja'),
  tx('deu_aulas_particulares'),
  tx('editou_videos_criador_conteudo'),
  tx('cuidou_jardim'),
  tx('trabalhou_garcom_num_casamento'),
  tx('vendeu_artesanato_feira'),
  tx('fez_faxina_caprichada'),
];

/** Lê "500", "1.000", "tudo" ou "metade". */
function lerQuantia(texto, maximo) {
  const t = String(texto).trim().toLowerCase();
  if (['tudo', 'all', 'max'].includes(t)) return maximo;
  if (t === 'metade') return Math.floor(maximo / 2);
  const n = Number(t.replace(/\./g, '').replace(',', '.'));
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}

const opQuantia = (o, desc = tx('valor_ou_tudo')) => o.setName('quantia').setDescription(desc).setRequired(true).setMaxLength(15);

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
            { name: tx('carteira'), value: dinheiro(c, d.carteira), inline: true },
            { name: tx('banco'), value: dinheiro(c, d.banco), inline: true },
            { name: tx('total'), value: dinheiro(c, d.carteira + d.banco), inline: true },
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
    if (Date.now() < prox) return responder(i, tx('voce_ja_pegou_hoje', { quando: ts(prox) }), 'aviso');
    d.diario = Date.now();
    d.carteira += c.diario;
    eco.salvar();
    return i.reply({ embeds: [embed(i.guildId).setDescription(tx('voce_recebeu_volte_pegar', { dinheiro: dinheiro(c, c.diario), quando: ts(Date.now() + DIA) }))] });
  },
};

const trabalhar = {
  data: new SlashCommandBuilder().setName('trabalhar').setDescription('Trabalha para ganhar dinheiro'),
  async executar(i) {
    const c = cfg(i.guildId);
    const d = conta(i.guildId, i.user.id);
    const prox = (d.trabalho ?? 0) + c.trabalhoIntervalo;
    if (Date.now() < prox) return responder(i, tx('voce_esta_cansado_pode', { quando: ts(prox) }), 'aviso');
    const ganho = sorteio(c.trabalhoMin, c.trabalhoMax);
    d.trabalho = Date.now();
    d.carteira += ganho;
    eco.salvar();
    const oque = TRABALHOS[sorteio(0, TRABALHOS.length - 1)];
    return i.reply({ embeds: [embed(i.guildId).setDescription(tx('voce_ganhou', { oque, dinheiro: dinheiro(c, ganho) }))] });
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
    if (alvo.bot || alvo.id === i.user.id) return responder(i, tx('escolha_outra_pessoa_seja'), 'erro');
    const c = cfg(i.guildId);
    const d = conta(i.guildId, i.user.id);
    const q = lerQuantia(i.options.getString('quantia'), d.carteira);
    if (q === null) return responder(i, tx('valor_invalido'), 'erro');
    if (!q || q > d.carteira) return responder(i, tx('voce_so_tem_carteira', { dinheiro: dinheiro(c, d.carteira) }), 'erro');
    d.carteira -= q;
    conta(i.guildId, alvo.id).carteira += q;
    eco.salvar();
    return i.reply({ embeds: [embed(i.guildId).setDescription(tx('enviou', { usuario: i.user, dinheiro: dinheiro(c, q), alvo }))] });
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
      if (q === null) return responder(i, tx('valor_invalido'), 'erro');
      if (!q || q > d[de]) return responder(i, tx('voce_so_tem', { dinheiro: dinheiro(c, d[de]), onde: de === 'carteira' ? tx('carteira_2') : tx('banco_2') }), 'erro');
      d[de] -= q;
      d[para] += q;
      eco.salvar();
      return responder(i, `${titulo === 'depositar' ? tx('depositou') : tx('sacou')} ${dinheiro(c, q)}.`, 'sucesso');
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
    if (q === null) return responder(i, tx('valor_invalido'), 'erro');
    if (!q || q > d.carteira) return responder(i, tx('voce_so_tem_carteira', { dinheiro: dinheiro(c, d.carteira) }), 'erro');
    if (c.apostaMax > 0 && q > c.apostaMax) return responder(i, tx('aposta_maxima', { dinheiro: dinheiro(c, c.apostaMax) }), 'erro');
    const lado = i.options.getString('lado');
    const caiu = Math.random() < 0.5 ? 'cara' : 'coroa';
    const ganhou = caiu === lado;
    d.carteira += ganhou ? q : -q;
    eco.salvar();
    return i.reply({
      embeds: [
        embed(i.guildId)
          .setColor(ganhou ? 0x22c55e : 0xef4444)
          .setTitle(tx('deu', { caiu }))
          .setDescription(ganhou ? tx('voce_ganhou_2', { dinheiro: dinheiro(c, q) }) : tx('voce_perdeu', { dinheiro: dinheiro(c, q) }))
          .setFooter({ text: tx('carteira_3', { carteira: fmt(d.carteira), moeda: c.moeda }) }),
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
    if (!lista.length) return responder(i, tx('ninguem_tem_dinheiro_ainda'), 'info');
    const medalhas = ['🥇', '🥈', '🥉'];
    await i.reply({
      embeds: [embed(i.guildId).setTitle(tx('mais_ricos', { servidor: i.guild.name })).setDescription(lista.map(([id, t], n) => `${medalhas[n] ?? `**${n + 1}.**`} <@${id}> · ${dinheiro(c, t)}`).join('\n'))],
      allowedMentions: { parse: [] },
    });
  },
};

const loja = {
  data: new SlashCommandBuilder().setName('loja').setDescription('Mostra os cargos à venda'),
  async executar(i) {
    const c = cfg(i.guildId);
    if (!c.loja.length) return responder(i, tx('loja_esta_vazia_equipe'), 'info');
    const e = embed(i.guildId).setTitle(tx('loja', { servidor: i.guild.name })).setFooter({ text: tx('comprar_comprar') });
    for (const it of c.loja.slice(0, 25)) {
      e.addFields({ name: `${it.nome} · ${c.emoji} ${fmt(it.preco)}`, value: tx('cargo', { descricao: it.descricao ? `${cortar(it.descricao, 200)}\n` : '', cargo: it.cargo }) });
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
    if (!it) return responder(i, tx('item_encontrado_veja_loja'), 'erro');
    const cargo = i.guild.roles.cache.get(it.cargo);
    if (!cargo) return responder(i, tx('cargo_deste_item_existe'), 'erro');
    if (i.member.roles.cache.has(cargo.id)) return responder(i, tx('voce_ja_tem_esse'), 'aviso');
    if (!cargo.editable) return responder(i, tx('consigo_dar_esse_cargo'), 'erro');
    const d = conta(i.guildId, i.user.id);
    if (d.carteira < it.preco) return responder(i, tx('faltam_carteira', { dinheiro: dinheiro(c, it.preco - d.carteira) }), 'erro');
    d.carteira -= it.preco;
    const ok = await i.member.roles.add(cargo, 'Comprado na loja').then(() => true, () => false);
    if (!ok) {
      d.carteira += it.preco; // devolve
      return responder(i, tx('consegui_te_dar_cargo'), 'erro');
    }
    eco.salvar();
    return i.reply({ embeds: [embed(i.guildId).setDescription(tx('comprou_ganhou', { usuario: i.user, nome: it.nome, dinheiro: dinheiro(c, it.preco), cargo }))], allowedMentions: { users: [i.user.id] } });
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
    if (user.bot) return responder(i, tx('bots_tem_conta'), 'erro');
    const d = conta(i.guildId, user.id);
    const q = i.options.getInteger('quantia') ?? 0;
    if (sub === 'dar') d.carteira += q;
    if (sub === 'tirar') d.carteira = Math.max(0, d.carteira - q);
    if (sub === 'zerar') d.carteira = d.banco = 0;
    eco.salvar();
    return responder(i, tx('carteira_banco', { tag: user.tag, dinheiro: dinheiro(c, d.carteira), banco: dinheiro(c, d.banco) }), 'sucesso');
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
      msg = tx('moeda', { emoji: c.emoji, moeda: c.moeda });
    } else if (sub === 'ganhos') {
      const v = (n) => i.options.getInteger(n);
      if (v('diario') !== null) c.diario = v('diario');
      if (v('trabalho_min') !== null) c.trabalhoMin = v('trabalho_min');
      if (v('trabalho_max') !== null) c.trabalhoMax = v('trabalho_max');
      if (c.trabalhoMin > c.trabalhoMax) [c.trabalhoMin, c.trabalhoMax] = [c.trabalhoMax, c.trabalhoMin];
      const iv = i.options.getString('intervalo');
      if (iv) {
        const ms = lerDuracao(iv);
        if (!ms) return responder(i, tx('intervalo_invalido_ex_1h'), 'erro');
        c.trabalhoIntervalo = ms;
      }
      if (v('aposta_max') !== null) c.apostaMax = v('aposta_max');
      msg = tx('diario_trabalhar_cada_aposta', { diario: fmt(c.diario), trabalhoMin: fmt(c.trabalhoMin), trabalhoMax: fmt(c.trabalhoMax), duracao: duracaoTexto(c.trabalhoIntervalo), apostaMax: c.apostaMax ? fmt(c.apostaMax) : tx('sem_limite') });
    } else if (sub === 'loja-adicionar') {
      const r = i.options.getRole('cargo');
      if (r.managed || r.id === i.guildId) return responder(i, tx('esse_cargo_pode_ser'), 'erro');
      if (c.loja.length >= 25) return responder(i, tx('loja_aceita_maximo_25'), 'erro');
      const nome = i.options.getString('nome');
      if (c.loja.some((x) => x.nome.toLowerCase() === nome.toLowerCase())) return responder(i, tx('ja_existe_item_esse'), 'erro');
      c.loja.push({ id: Date.now().toString(36), nome, preco: i.options.getInteger('preco'), cargo: r.id, descricao: i.options.getString('descricao') || '' });
      msg = tx('esta_venda', { nome, aviso: r.editable ? '' : tx('suba_meu_cargo_acima') });
    } else if (sub === 'loja-remover') {
      const nome = i.options.getString('nome').toLowerCase();
      const antes = c.loja.length;
      c.loja = c.loja.filter((x) => x.nome.toLowerCase() !== nome);
      if (c.loja.length === antes) return responder(i, tx('achei_item_esse_nome'), 'erro');
      msg = tx('item_removido_loja');
    }
    salvarAjustes();
    return responder(i, msg, 'sucesso');
  },
  resumo(guild) {
    const c = cfg(guild.id);
    return [
      tx('moeda_2', { emoji: c.emoji, moeda: c.moeda }),
      tx('diario_trabalhar_cada', { diario: fmt(c.diario), trabalhoMin: fmt(c.trabalhoMin), trabalhoMax: fmt(c.trabalhoMax), duracao: duracaoTexto(c.trabalhoIntervalo) }),
      tx('loja_item_ns', { loja_total: c.loja.length }),
    ];
  },
};

export default {
  id: 'economia',
  nome: tx('economia'),
  permissoes: [PermissionFlagsBits.ManageRoles],
  comandos: [saldo, diario, trabalhar, pagar, movimentar('carteira', 'banco', 'depositar'), movimentar('banco', 'carteira', 'sacar'), apostar, ricos, loja, comprar, ecoAdmin],
  config,
};
