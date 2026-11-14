/**
 * "Monte o seu bot": módulos à venda e preços.
 * Pode ser importado no navegador (sem nada de servidor aqui).
 *
 * Os preços daqui são os PADRÃO. Para mudar, use /admin/loja/montador (fica salvo no banco).
 * O `id` é o nome do arquivo em bot-template/src/modules/<id>.js.
 * O `bit` identifica o módulo nos botões do Discord: nunca reaproveite um número.
 */

export type PrivilegedIntent = "members" | "content";

export type BuilderModule = {
  id: string;
  bit: number;
  name: string;
  emoji: string;
  description: string;
  priceCents: number;
  /** comandos que o módulo cria (para mostrar na loja e no README) */
  commands: string[];
  /** subcomandos de /config <grupo> (vazio = não tem configuração) */
  configGroup?: string;
  configSubs?: string[];
  /** intents privilegiadas que precisam ser ligadas no Developer Portal */
  privileged?: PrivilegedIntent[];
  /**
   * "extra" = ferramenta que vai junto no .zip mas não é um módulo do bot
   * (os arquivos ficam em bot-template/extras/<id>/ e vão para a raiz do bot).
   */
  extra?: boolean;
  /** extra que vai FORA da pasta do bot, na raiz do .zip (ex.: o Inicializador) */
  fora?: boolean;
  /** módulos que precisam ir junto (ex.: Avaliação de atendimento precisa de Tickets) */
  requires?: string[];
};

export const BUILDER_BASE = {
  name: "Base do bot",
  description: "Funciona em qualquer servidor e é configurado por comandos. Vem com /ajuda, /ping, /sobre e /config (cor, cargo da equipe e ver tudo o que está configurado).",
  priceCents: 1990,
  commands: ["/ajuda", "/ping", "/sobre", "/config ver", "/config cor", "/config staff"],
};

export const BUILDER_MODULES: BuilderModule[] = [
  {
    id: "moderacao",
    bit: 0,
    name: "Moderação",
    emoji: "🔨",
    description: "Banir, expulsar, castigo, advertências com punição automática, limpar mensagens e trancar canais. Tudo registrado num canal.",
    priceCents: 1490,
    commands: ["/banir", "/desbanir", "/expulsar", "/castigo", "/removercastigo", "/advertir", "/advertencias", "/removeradvertencia", "/limpar", "/trancar", "/destrancar", "/lentidao"],
    configGroup: "moderacao",
    configSubs: ["canal", "dm", "limite"],
  },
  {
    id: "automod",
    bit: 1,
    name: "AutoMod",
    emoji: "🛡️",
    description: "Apaga sozinho convites, links, palavras proibidas, flood, CAPS e menções em massa. Pode dar castigo automático.",
    priceCents: 1290,
    commands: [],
    configGroup: "automod",
    configSubs: ["ativar", "links", "permitir-site", "convites", "palavra", "flood", "maiusculas", "mencoes", "punicao", "imune", "ignorar-canal", "registro"],
    privileged: ["content"],
  },
  {
    id: "verificacao",
    bit: 14,
    name: "Verificação",
    emoji: "🔐",
    description: "Painel com botão \"Verificar\": a pessoa resolve um desafio rápido e ganha o cargo de membro. Segura contas falsas e raids, com idade mínima da conta.",
    priceCents: 790,
    commands: ["/verificacao"],
  },
  {
    id: "antiraid",
    bit: 18,
    name: "Anti-raid",
    emoji: "🚨",
    description: "Se entrar gente demais de uma vez, trava o servidor sozinho (verificação máxima e convites pausados), expulsa quem chegar e avisa a equipe. Também barra contas novas demais.",
    priceCents: 990,
    commands: ["/antiraid"],
    privileged: ["members"],
  },
  {
    id: "boasvindas",
    bit: 2,
    name: "Boas-vindas",
    emoji: "👋",
    description: "Mensagem de entrada e saída personalizável, mensagem na DM de quem entra e até 5 cargos automáticos.",
    priceCents: 790,
    commands: [],
    configGroup: "boasvindas",
    configSubs: ["entrada", "saida", "dm", "cargo", "testar"],
    privileged: ["members"],
  },
  {
    id: "logs",
    bit: 3,
    name: "Logs",
    emoji: "📜",
    description: "Registra mensagens apagadas e editadas, entradas e saídas, apelidos, cargos, banimentos, canais e calls.",
    priceCents: 990,
    commands: [],
    configGroup: "logs",
    configSubs: ["canal", "tipo"],
    privileged: ["members", "content"],
  },
  {
    id: "convites",
    bit: 19,
    name: "Rastreio de convites",
    emoji: "📨",
    description: "Mostra quem convidou quem, conta entradas, saídas e contas falsas e tem ranking de convites. Ótimo para sorteios por convite.",
    priceCents: 990,
    commands: ["/convites"],
    privileged: ["members"],
  },
  {
    id: "niveis",
    bit: 4,
    name: "Níveis",
    emoji: "⭐",
    description: "XP por mensagem, aviso quando alguém sobe de nível, ranking e cargos de recompensa por nível.",
    priceCents: 990,
    commands: ["/rank", "/top", "/xp"],
    configGroup: "niveis",
    configSubs: ["ativar", "aviso", "recompensa", "xp", "ignorar-canal"],
  },
  {
    id: "economia",
    bit: 5,
    name: "Economia",
    emoji: "🪙",
    description: "Moeda do servidor com carteira e banco, diário, trabalho, apostas, ranking e loja de cargos.",
    priceCents: 1290,
    commands: ["/saldo", "/diario", "/trabalhar", "/pagar", "/depositar", "/sacar", "/apostar", "/ricos", "/loja", "/comprar", "/eco"],
    configGroup: "economia",
    configSubs: ["moeda", "ganhos", "loja-adicionar", "loja-remover"],
  },
  {
    id: "reputacao",
    bit: 20,
    name: "Reputação",
    emoji: "👍",
    description: "Cada membro dá +1 de reputação para alguém uma vez por dia. Ranking e cargos de recompensa por pontos.",
    priceCents: 490,
    commands: ["/rep", "/reputacao"],
  },
  {
    id: "tickets",
    bit: 6,
    name: "Tickets",
    emoji: "🎫",
    description: "Painel com botão, canal privado para cada atendimento, assumir, fechar e histórico em .txt no canal de registro.",
    priceCents: 1490,
    commands: ["/ticket"],
    configGroup: "tickets",
    configSubs: ["categoria", "equipe", "registro", "mensagem", "limite"],
    privileged: ["content"],
  },
  {
    id: "avaliacoes",
    bit: 21,
    name: "Avaliação de atendimento",
    emoji: "⭐",
    description: "Ao fechar um ticket, quem abriu dá de 1 a 5 estrelas e um comentário na DM. Ranking dos atendentes. Precisa do módulo Tickets.",
    priceCents: 690,
    commands: ["/avaliacoes"],
    requires: ["tickets"],
  },
  {
    id: "formularios",
    bit: 22,
    name: "Formulários",
    emoji: "📝",
    description: "Candidatura para a equipe, parceria, denúncia: até 5 perguntas, botão para responder e a equipe aprova ou recusa (com cargo automático).",
    priceCents: 1290,
    commands: ["/formulario"],
  },
  {
    id: "sugestoes",
    bit: 7,
    name: "Sugestões",
    emoji: "💡",
    description: "Sugestões com votos 👍/👎, tópico para discutir e aprovação ou recusa pela equipe, com motivo.",
    priceCents: 690,
    commands: ["/sugerir"],
    configGroup: "sugestoes",
    configSubs: ["canal"],
  },
  {
    id: "enquetes",
    bit: 8,
    name: "Enquetes",
    emoji: "📊",
    description: "Enquetes com até 5 opções, resultado ao vivo e encerramento automático.",
    priceCents: 490,
    commands: ["/enquete", "/encerrarenquete"],
  },
  {
    id: "sorteios",
    bit: 9,
    name: "Sorteios",
    emoji: "🎉",
    description: "Sorteios com botão de participar, cargo obrigatório, vários vencedores e sortear de novo.",
    priceCents: 790,
    commands: ["/sorteio"],
  },
  {
    id: "cargos",
    bit: 10,
    name: "Cargos por botão",
    emoji: "🎭",
    description: "Painéis onde os membros pegam ou tiram cargos sozinhos, clicando em botões.",
    priceCents: 690,
    commands: ["/cargos"],
  },
  {
    id: "cargostemp",
    bit: 23,
    name: "Cargos temporários",
    emoji: "⏳",
    description: "Dá um cargo por um tempo (ex.: VIP por 30 dias) e ele sai sozinho no fim do prazo, mesmo se o bot reiniciar.",
    priceCents: 590,
    commands: ["/cargotemp"],
  },
  {
    id: "callstemp",
    bit: 24,
    name: "Calls temporárias",
    emoji: "🔊",
    description: "Entrou em \"➕ Criar sala\", ganha uma call própria que some quando esvazia. O dono renomeia, limita, tranca e expulsa.",
    priceCents: 990,
    commands: ["/salas", "/sala"],
  },
  {
    id: "contadores",
    bit: 25,
    name: "Contadores",
    emoji: "📈",
    description: "Canais que mostram \"👥 Membros: 1.234\", online e boosts, atualizando sozinhos.",
    priceCents: 490,
    commands: ["/contadores"],
  },
  {
    id: "destaques",
    bit: 26,
    name: "Destaques",
    emoji: "🌟",
    description: "Mensagens que juntam ⭐ suficientes vão para o canal de destaques, com o contador sempre atualizado.",
    priceCents: 590,
    commands: ["/destaques"],
    privileged: ["content"],
  },
  {
    id: "contagem",
    bit: 27,
    name: "Jogo de contar",
    emoji: "🔢",
    description: "Canal onde todo mundo conta 1, 2, 3... sem a mesma pessoa repetir. Errou, volta para o 1. Com recorde do servidor.",
    priceCents: 390,
    commands: ["/contagem"],
    privileged: ["content"],
  },
  {
    id: "afk",
    bit: 28,
    name: "AFK",
    emoji: "💤",
    description: "/afk motivo: quem te marcar recebe o aviso. Quando você volta, o AFK sai sozinho e o bot mostra quem te chamou.",
    priceCents: 390,
    commands: ["/afk"],
  },
  {
    id: "autorespostas",
    bit: 15,
    name: "Respostas automáticas",
    emoji: "💬",
    description: "O bot responde sozinho quando alguém escreve uma palavra (ex.: \"ip do servidor\"). Cada resposta vira um atalho: /tag regras.",
    priceCents: 690,
    commands: ["/autoresposta", "/tag"],
    privileged: ["content"],
  },
  {
    id: "anuncios",
    bit: 29,
    name: "Anúncios agendados",
    emoji: "📣",
    description: "Mensagens que saem numa data marcada ou repetem sozinhas (ex.: regras toda semana), com cargo marcado e imagem.",
    priceCents: 690,
    commands: ["/anuncio"],
  },
  {
    id: "embeds",
    bit: 30,
    name: "Criador de embeds",
    emoji: "🧱",
    description: "Monta mensagens bonitas (título, texto, cor, imagem, rodapé e botões de link) num formulário, sem saber código. Também edita.",
    priceCents: 590,
    commands: ["/embed"],
  },
  {
    id: "aniversarios",
    bit: 16,
    name: "Aniversários",
    emoji: "🎂",
    description: "Cada membro cadastra o dia. No aniversário, o bot dá parabéns no canal e um cargo especial por 24 horas. Lista dos próximos aniversários.",
    priceCents: 590,
    commands: ["/aniversario"],
  },
  {
    id: "minecraft",
    bit: 31,
    name: "Status Minecraft",
    emoji: "⛏️",
    description: "Mostra se o servidor de Minecraft (Java) está online, quantos jogam e a versão. Painel que se atualiza sozinho a cada 2 minutos.",
    priceCents: 790,
    commands: ["/minecraft"],
  },
  {
    id: "utilidades",
    bit: 11,
    name: "Utilidades",
    emoji: "🧰",
    description: "Informações de membros e do servidor, avatar e lembretes.",
    priceCents: 490,
    commands: ["/userinfo", "/serverinfo", "/avatar", "/lembrete"],
  },
  {
    id: "diversao",
    bit: 12,
    name: "Diversão",
    emoji: "🎲",
    description: "Cara ou coroa, dados, bola 8, escolher entre opções e ship.",
    priceCents: 490,
    commands: ["/caracoroa", "/dado", "/8ball", "/escolher", "/ship"],
  },
  {
    id: "personalizar",
    bit: 32,
    name: "Personalização",
    emoji: "🎨",
    description: "Personalize 100% do bot: todos os textos, botões (texto, emoji, cor, mostrar ou esconder), modais, cores, emojis, aparência dos embeds e status. E crie seus próprios painéis com botões ou menu (dar cargo, responder, abrir formulário, abrir ticket, link) e formulários. Edita num painel no seu PC e aplica com /personalizar, mesmo numa hospedagem.",
    priceCents: 1490,
    commands: ["/personalizar", "/painel"],
  },
  {
    id: "transferidor",
    bit: 13,
    name: "Transferidor de dados",
    emoji: "📦",
    description: "Para trocar ou atualizar o bot sem perder nada: dois cliques, escolhe a pasta do bot antigo e ele leva XP, dinheiro, configurações e token. Para Windows.",
    priceCents: 990,
    commands: [],
    extra: true,
  },
  {
    id: "inicializador",
    bit: 17,
    name: "Inicializador",
    emoji: "🚀",
    description: "Configura e liga o bot por janelas, sem terminal: instala o Node.js se faltar, confere o token e as permissões com o Discord, instala tudo e liga. Também para, mostra o registro, liga junto com o Windows e organiza cópias antigas. Para Windows.",
    priceCents: 990,
    commands: [],
    extra: true,
    fora: true,
  },
];

// ---------------- combos ----------------
export type BuilderCombo = {
  id: string;
  name: string;
  emoji: string;
  /** módulos do combo; "todos" = todos os módulos do bot que estão à venda (sem as ferramentas) */
  modules: string[] | "todos";
  /** desconto padrão, em % sobre os módulos do combo (editável no admin) */
  discountPct: number;
};

export const BUILDER_COMBOS: BuilderCombo[] = [
  {
    id: "comunidade",
    name: "Comunidade",
    emoji: "🎉",
    modules: ["boasvindas", "niveis", "cargos", "enquetes", "sorteios", "aniversarios", "reputacao", "destaques", "contadores", "contagem", "afk"],
    discountPct: 20,
  },
  { id: "seguranca", name: "Segurança", emoji: "🛡️", modules: ["moderacao", "automod", "antiraid", "verificacao", "logs"], discountPct: 15 },
  { id: "atendimento", name: "Atendimento", emoji: "🎫", modules: ["tickets", "avaliacoes", "formularios", "sugestoes", "autorespostas", "logs"], discountPct: 15 },
  { id: "completo", name: "Completo", emoji: "👑", modules: "todos", discountPct: 25 },
];

/** Combo pronto para usar: com os módulos já resolvidos e o desconto valendo agora. */
export type ComboAtivo = { id: string; name: string; emoji: string; modules: string[]; discountPct: number };

/**
 * Melhor combo para os módulos escolhidos (o que dá o maior desconto).
 * Usado no site, no servidor e no Discord, para a conta sempre bater.
 */
export function bestCombo(combos: ComboAtivo[], prices: Record<string, number>, ids: string[]) {
  let melhor: { combo: ComboAtivo; discountCents: number } | null = null;
  for (const c of combos) {
    if (!c.modules.length || !c.modules.every((id) => ids.includes(id))) continue;
    const soma = c.modules.reduce((t, id) => t + (prices[id] ?? 0), 0);
    const discountCents = Math.round((soma * c.discountPct) / 100);
    if (discountCents > 0 && (!melhor || discountCents > melhor.discountCents)) melhor = { combo: c, discountCents };
  }
  return melhor;
}

export const PRIVILEGED_LABEL: Record<PrivilegedIntent, string> = {
  members: "Server Members Intent",
  content: "Message Content Intent",
};

const byId = new Map(BUILDER_MODULES.map((m) => [m.id, m]));
export const builderModule = (id: string) => byId.get(id);

/** Módulo escolhido sem o que ele precisa (ex.: Avaliação sem Tickets). `jaTem` = módulos que a pessoa já tem. */
export function missingRequirement(ids: string[], jaTem: string[] = []): { module: BuilderModule; needs: BuilderModule } | null {
  const todos = new Set([...ids, ...jaTem]);
  for (const id of ids) {
    const m = byId.get(id);
    for (const r of m?.requires ?? []) if (!todos.has(r)) return { module: m!, needs: byId.get(r)! };
  }
  return null;
}

/** Lista de módulos válida, sem repetição e na ordem do catálogo. null se vazia ou com módulo desconhecido. */
export function parseModules(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > BUILDER_MODULES.length) return null;
  const ids = new Set(input.map((x) => String(x)));
  for (const id of ids) if (!byId.has(id)) return null;
  return BUILDER_MODULES.filter((m) => ids.has(m.id)).map((m) => m.id);
}

/** Nome do bot: 2 a 32 caracteres, sem quebras de linha nem símbolos que atrapalham. */
export function cleanBotName(input: unknown): string | null {
  const s = String(input ?? "")
    .replace(/[\u0000-\u001f\u007f<>`@#:]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return s.length >= 2 && s.length <= 32 ? s : null;
}

export function cleanColor(input: unknown): string {
  const s = String(input ?? "").trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(s);
  return m ? `#${m[1].toUpperCase()}` : "#5865F2";
}

/** O que fica salvo no item do pedido (StoreOrderItem.options). */
export type BuilderOptions = {
  tipo: "monte-o-seu";
  modulos: string[];
  nome: string;
  cor: string;
  /** preço de cada parte no momento da compra ("base" + id de cada módulo), em centavos */
  precos?: Record<string, number>;
};

export function readBuilderOptions(json: unknown): BuilderOptions | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (o.tipo !== "monte-o-seu") return null;
  const modulos = parseModules(o.modulos);
  const nome = cleanBotName(o.nome);
  if (!modulos || !nome) return null;
  const precos =
    o.precos && typeof o.precos === "object"
      ? Object.fromEntries(Object.entries(o.precos as Record<string, unknown>).filter(([, v]) => Number.isInteger(v)))
      : undefined;
  return { tipo: "monte-o-seu", modulos, nome, cor: cleanColor(o.cor), ...(precos ? { precos: precos as Record<string, number> } : {}) };
}

export const builderItemName = (nome: string) => `Bot personalizado: ${nome}`;
export const upgradeItemName = (nome: string) => `Módulos extras: ${nome}`;

/** Só os módulos do bot (sem as ferramentas extras): é o que vai no config.json. */
export const botModulesOnly = (ids: string[]) => ids.filter((id) => !byId.get(id)?.extra);

/** Pedido de "Adicionar módulos" a um bot que a pessoa já comprou. */
export type UpgradeOptions = {
  tipo: "adicionar";
  /** id do item (StoreOrderItem) do bot original */
  botItemId: string;
  modulos: string[];
  precos?: Record<string, number>;
};

export function readUpgradeOptions(json: unknown): UpgradeOptions | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (o.tipo !== "adicionar" || typeof o.botItemId !== "string") return null;
  const modulos = parseModules(o.modulos);
  if (!modulos) return null;
  const precos =
    o.precos && typeof o.precos === "object"
      ? (Object.fromEntries(Object.entries(o.precos as Record<string, unknown>).filter(([, v]) => Number.isInteger(v))) as Record<string, number>)
      : undefined;
  return { tipo: "adicionar", botItemId: o.botItemId, modulos, ...(precos ? { precos } : {}) };
}
