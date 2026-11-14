/**
 * "Monte o seu bot": módulos à venda e preços.
 * Pode ser importado no navegador (sem nada de servidor aqui).
 *
 * Para mudar um preço, altere `priceCents` (em centavos: 1490 = R$ 14,90).
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
];

export const PRIVILEGED_LABEL: Record<PrivilegedIntent, string> = {
  members: "Server Members Intent",
  content: "Message Content Intent",
};

const byId = new Map(BUILDER_MODULES.map((m) => [m.id, m]));
export const builderModule = (id: string) => byId.get(id);

/** Lista de módulos válida, sem repetição e na ordem do catálogo. null se vazia ou com módulo desconhecido. */
export function parseModules(input: unknown): string[] | null {
  if (!Array.isArray(input) || input.length === 0 || input.length > BUILDER_MODULES.length) return null;
  const ids = new Set(input.map((x) => String(x)));
  for (const id of ids) if (!byId.has(id)) return null;
  return BUILDER_MODULES.filter((m) => ids.has(m.id)).map((m) => m.id);
}

export const builderTotal = (ids: string[]) =>
  BUILDER_BASE.priceCents + ids.reduce((t, id) => t + (byId.get(id)?.priceCents ?? 0), 0);

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
export type BuilderOptions = { tipo: "monte-o-seu"; modulos: string[]; nome: string; cor: string };

export function readBuilderOptions(json: unknown): BuilderOptions | null {
  if (!json || typeof json !== "object") return null;
  const o = json as Record<string, unknown>;
  if (o.tipo !== "monte-o-seu") return null;
  const modulos = parseModules(o.modulos);
  const nome = cleanBotName(o.nome);
  if (!modulos || !nome) return null;
  return { tipo: "monte-o-seu", modulos, nome, cor: cleanColor(o.cor) };
}

export const builderItemName = (nome: string) => `Bot personalizado: ${nome}`;
