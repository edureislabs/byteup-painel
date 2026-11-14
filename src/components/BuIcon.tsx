import type { CSSProperties, ReactNode } from "react";

/**
 * Ícones animados da ByteUP (roxo e preto), no lugar dos emojis padrão.
 * Sem hooks: funciona em páginas do servidor e em componentes "use client".
 * O degradê fica em <BuIconDefs /> (uma vez só, no layout).
 */

type Desenho = { anim: string; origem?: string; svg: ReactNode };

// classes de animação (globals.css): bu-swing, bu-pulse, bu-shake, bu-wave, bu-float, bu-coin,
// bu-roll, bu-flip, bu-blink, bu-dot, bu-flicker, bu-twinkle, bu-needle, bu-wave-a, bu-slide-l,
// bu-slide-r, bu-slide-down, bu-grow, bu-rocket
const P = (d: string, extra?: Partial<Record<"className" | "strokeDasharray", string>>) => <path d={d} {...extra} />;
const PONTO = (cx: number, cy: number, r = 1.15, className?: string) => (
  <circle cx={cx} cy={cy} r={r} fill="url(#bu-g) #c77dff" stroke="none" className={className} />
);

const ICONES: Record<string, Desenho> = {
  base: {
    anim: "",
    svg: (
      <>
        {P("M12 7.5V4.6")}
        <circle cx="12" cy="3.5" r="1.1" />
        <rect x="4.5" y="7.5" width="15" height="11.5" rx="3.2" />
        {P("M4.5 12H3M21 12h-1.5")}
        <g className="bu-blink" style={{ transformOrigin: "12px 12.5px" }}>
          {PONTO(9.3, 12.5, 1.3)}
          {PONTO(14.7, 12.5, 1.3)}
        </g>
        {P("M10 16h4")}
      </>
    ),
  },
  moderacao: {
    anim: "bu-swing",
    origem: "4.5px 19.5px",
    svg: (
      <>
        {P("M14.8 3.2l6 6-2.6 2.6-6-6z")}
        {P("M13.5 7.9L4.2 17.2a1.65 1.65 0 0 0 2.4 2.4l9.3-9.3")}
      </>
    ),
  },
  automod: {
    anim: "bu-pulse",
    svg: (
      <>
        {P("M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z")}
        {P("M12.8 7.8l-2.7 4.4h3.6l-2.6 4.2", { className: "bu-flicker" })}
      </>
    ),
  },
  verificacao: {
    anim: "bu-pulse",
    svg: (
      <>
        {P("M8 10.5V8a4 4 0 0 1 8 0v2.5")}
        <rect x="5" y="10.5" width="14" height="10" rx="2.6" />
        {P("M9.4 15.6l1.8 1.8 3.4-3.4")}
      </>
    ),
  },
  antiraid: {
    anim: "bu-shake",
    origem: "12px 20px",
    svg: (
      <>
        {P("M6.5 18v-5a5.5 5.5 0 0 1 11 0v5")}
        {P("M4.5 18h15v3h-15z")}
        {P("M12 10.5V14")}
        <g className="bu-flicker">{P("M12 2v2M4.6 5.1L6 6.5M19.4 5.1L18 6.5M2.5 11.5h1.8M19.7 11.5h1.8")}</g>
      </>
    ),
  },
  boasvindas: {
    anim: "bu-wave",
    origem: "10px 21px",
    svg: (
      <>
        {P("M8 13V6.5a1.5 1.5 0 0 1 3 0V11M11 10.5V4.5a1.5 1.5 0 0 1 3 0V11M14 10.5V6a1.5 1.5 0 0 1 3 0v7.5c0 4-2.8 7-6.5 7-2.5 0-4.2-1.2-5.5-3.3L3.4 14a1.5 1.5 0 0 1 2.6-1.5L8 15")}
        {P("M19.6 3.6c1 .8 1.6 1.9 1.8 3.2M3 6.6c.3-1.3 1-2.4 2-3.1", { className: "bu-flicker" })}
      </>
    ),
  },
  logs: {
    anim: "bu-float",
    svg: (
      <>
        {P("M7 3h9l4 4v13a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1zM16 3v4h4")}
        {P("M9.5 10.5h7", { className: "bu-dot" })}
        {P("M9.5 14h7", { className: "bu-dot bu-d2" })}
        {P("M9.5 17.5h4.5", { className: "bu-dot bu-d3" })}
      </>
    ),
  },
  convites: {
    anim: "bu-float",
    svg: (
      <>
        <rect x="3" y="5.5" width="18" height="13" rx="2.5" />
        {P("M3.6 7.2L12 13l8.4-5.8")}
      </>
    ),
  },
  niveis: {
    anim: "bu-float",
    svg: (
      <>
        {P("M6.5 13l5.5-5.5 5.5 5.5")}
        {P("M6.5 19l5.5-5.5 5.5 5.5", { className: "bu-dot bu-d2" })}
        {PONTO(12, 3.6, 1.3, "bu-twinkle")}
      </>
    ),
  },
  economia: {
    anim: "bu-coin",
    origem: "12px 12px",
    svg: (
      <>
        <circle cx="12" cy="12" r="8.6" />
        {P("M14.4 9.7c-.4-.9-1.3-1.5-2.4-1.5-1.3 0-2.3.7-2.3 1.7 0 2.4 4.8 1.3 4.8 3.9 0 1.1-1 1.9-2.5 1.9-1.1 0-2.1-.6-2.6-1.5M12 6.6v1.6M12 15.7v1.6")}
      </>
    ),
  },
  reputacao: {
    anim: "bu-pulse",
    svg: (
      <>
        {P("M7 10.5v10H4.5a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1z")}
        {P("M7 10.5L11 3c1.4 0 2.5 1.1 2.5 2.5V9h5a2 2 0 0 1 2 2.3l-1.2 7.5a2 2 0 0 1-2 1.7H7")}
      </>
    ),
  },
  tickets: {
    anim: "bu-float",
    svg: (
      <>
        {P("M3 8.5v-2a1 1 0 0 1 1-1h16a1 1 0 0 1 1 1v2a3.5 3.5 0 0 0 0 7v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2a3.5 3.5 0 0 0 0-7z")}
        {P("M14.5 6v12", { strokeDasharray: "2 2.4" })}
      </>
    ),
  },
  avaliacoes: {
    anim: "bu-pulse",
    svg: <>{P("M12 3.2l2.7 5.5 6 .9-4.4 4.2 1 6L12 17l-5.3 2.8 1-6-4.4-4.2 6-.9z")}</>,
  },
  formularios: {
    anim: "bu-float",
    svg: (
      <>
        <rect x="5" y="4.5" width="14" height="16.5" rx="2" />
        {P("M9 3h6v3H9z")}
        {P("M8.5 11l1.2 1.2 2.2-2.2", { className: "bu-dot" })}
        {P("M8.5 16l1.2 1.2 2.2-2.2", { className: "bu-dot bu-d2" })}
        {P("M13.8 11h2.4M13.8 16h2.4")}
      </>
    ),
  },
  sugestoes: {
    anim: "bu-pulse",
    origem: "12px 10px",
    svg: (
      <>
        {P("M9 18h6M10 21h4")}
        {P("M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.2 1 2v.1h5v-.1c0-.8.4-1.5 1-2A6 6 0 0 0 12 3z")}
        {P("M12 6.5a2.5 2.5 0 0 1 2.5 2.5", { className: "bu-flicker" })}
      </>
    ),
  },
  enquetes: {
    anim: "",
    svg: (
      <>
        {P("M3.5 20.5h17")}
        <rect className="bu-grow" x="5" y="13" width="3.2" height="7.5" rx="1" />
        <rect className="bu-grow bu-d2" x="10.4" y="6.5" width="3.2" height="14" rx="1" />
        <rect className="bu-grow bu-d3" x="15.8" y="10" width="3.2" height="10.5" rx="1" />
      </>
    ),
  },
  sorteios: {
    anim: "bu-float",
    svg: (
      <>
        <rect x="3.5" y="9" width="17" height="4" rx="1" />
        {P("M5 13v7a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-7M12 9v12")}
        {P("M12 9C10.5 6 7 5.5 7 7.5S10 9 12 9c2 0 5 0 5-1.5S13.5 6 12 9z", { className: "bu-flicker" })}
      </>
    ),
  },
  cargos: {
    anim: "bu-swing",
    origem: "18px 12px",
    svg: (
      <>
        {P("M3.5 12.2V4.5a1 1 0 0 1 1-1h7.7l8.3 8.3a1.5 1.5 0 0 1 0 2.1l-6.1 6.1a1.5 1.5 0 0 1-2.1 0z")}
        {PONTO(8, 8, 1.4)}
      </>
    ),
  },
  cargostemp: {
    anim: "bu-flip",
    origem: "12px 12px",
    svg: (
      <>
        {P("M7 3h10M7 21h10")}
        {P("M8 3v3.5a4 4 0 0 0 1.6 3.2L12 12l2.4-2.3A4 4 0 0 0 16 6.5V3M8 21v-3.5a4 4 0 0 1 1.6-3.2L12 12l2.4 2.3a4 4 0 0 1 1.6 3.2V21")}
      </>
    ),
  },
  callstemp: {
    anim: "",
    svg: (
      <>
        {P("M4 9.5h3.5L12 5.5v13l-4.5-4H4z")}
        {P("M15.5 9a4 4 0 0 1 0 6", { className: "bu-wave-a" })}
        {P("M18.3 6.5a7.5 7.5 0 0 1 0 11", { className: "bu-wave-a bu-d2" })}
      </>
    ),
  },
  contadores: {
    anim: "",
    svg: (
      <>
        {P("M4.2 17.5a8.5 8.5 0 1 1 15.6 0")}
        {P("M12 6v1.5M6.3 8.3l1 1M17.7 8.3l-1 1M4 13h1.5M18.5 13H20")}
        <g className="bu-needle" style={{ transformOrigin: "12px 14.5px" }}>
          {P("M12 14.5l3.4-4.2")}
        </g>
        {PONTO(12, 14.5, 1.4)}
      </>
    ),
  },
  destaques: {
    anim: "",
    svg: (
      <>
        <g className="bu-pulse" style={{ transformOrigin: "11px 9.5px" }}>
          {P("M11 3l1.6 4.9 4.9 1.6-4.9 1.6L11 16l-1.6-4.9-4.9-1.6 4.9-1.6z")}
        </g>
        <g className="bu-twinkle">
          {P("M18 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8z")}
        </g>
      </>
    ),
  },
  contagem: {
    anim: "bu-pulse",
    svg: <>{P("M9.5 4l-2 16M16.5 4l-2 16M4.5 9h15.5M4 15h15.5")}</>,
  },
  afk: {
    anim: "bu-float",
    svg: (
      <>
        {P("M19.5 14.5A8 8 0 1 1 9.5 4.5a6.3 6.3 0 0 0 10 10z")}
        {P("M14.5 3.5h3l-3 3.5h3", { className: "bu-twinkle" })}
      </>
    ),
  },
  autorespostas: {
    anim: "",
    svg: (
      <>
        {P("M20 12a8 8 0 0 1-11.6 7.1L4 20.5l1.4-4.2A8 8 0 1 1 20 12z")}
        {PONTO(8.5, 12, 1.1, "bu-dot")}
        {PONTO(12, 12, 1.1, "bu-dot bu-d2")}
        {PONTO(15.5, 12, 1.1, "bu-dot bu-d3")}
      </>
    ),
  },
  anuncios: {
    anim: "bu-shake",
    origem: "8px 12px",
    svg: (
      <>
        {P("M3.5 10v4a1 1 0 0 0 1 1H7l7 4.5v-15L7 9H4.5a1 1 0 0 0-1 1zM7 15l1.3 4.5a1 1 0 0 0 1 .7h1.2")}
        {P("M17.5 9.5a3.5 3.5 0 0 1 0 5", { className: "bu-wave-a" })}
        {P("M19.8 7a7 7 0 0 1 0 10", { className: "bu-wave-a bu-d2" })}
      </>
    ),
  },
  embeds: {
    anim: "bu-float",
    svg: (
      <>
        <rect x="3.5" y="4" width="17" height="16" rx="2.5" />
        {P("M6.5 7v10")}
        {P("M9.5 8.5h5.5", { className: "bu-dot" })}
        {P("M9.5 12h8", { className: "bu-dot bu-d2" })}
        {P("M9.5 15.5h4", { className: "bu-dot bu-d3" })}
      </>
    ),
  },
  aniversarios: {
    anim: "",
    svg: (
      <>
        {P("M4 21h16M5 21v-7a1.5 1.5 0 0 1 1.5-1.5h11A1.5 1.5 0 0 1 19 14v7")}
        {P("M5 16.5c1.2 0 1.7-1 3.5-1s2.3 1 3.5 1 1.7-1 3.5-1 2.3 1 3.5 1")}
        {P("M8.5 12.5v-3M12 12.5v-3M15.5 12.5v-3")}
        <g className="bu-flicker">
          {P("M8.5 7.4c-.7-.7-.7-1.6 0-2.5.7.9.7 1.8 0 2.5zM12 7.4c-.7-.7-.7-1.6 0-2.5.7.9.7 1.8 0 2.5zM15.5 7.4c-.7-.7-.7-1.6 0-2.5.7.9.7 1.8 0 2.5z")}
        </g>
      </>
    ),
  },
  minecraft: {
    anim: "bu-swing",
    origem: "4px 20px",
    svg: (
      <>
        {P("M15.5 8.5L4 20")}
        {P("M9.8 3.6c3.5-.5 6.6.7 8.6 2.7s3.1 5.1 2.6 8.6")}
      </>
    ),
  },
  utilidades: {
    anim: "bu-swing",
    origem: "5px 19px",
    svg: <>{P("M15 4.5a4.5 4.5 0 0 0-4.3 5.8l-6.5 6.5a1.9 1.9 0 0 0 2.7 2.7l6.5-6.5A4.5 4.5 0 0 0 19.5 9l-2.7 2.7-2.6-.9-.9-2.6L16 5.5a4.5 4.5 0 0 0-1-1z")}</>,
  },
  diversao: {
    anim: "bu-roll",
    origem: "12px 12px",
    svg: (
      <>
        <rect x="4" y="4" width="16" height="16" rx="3.5" />
        {PONTO(8.6, 8.6)}
        {PONTO(15.4, 8.6)}
        {PONTO(12, 12)}
        {PONTO(8.6, 15.4)}
        {PONTO(15.4, 15.4)}
      </>
    ),
  },
  transferidor: {
    anim: "",
    svg: (
      <>
        <g className="bu-slide-r">{P("M4 8h14M14.5 4.5L18 8l-3.5 3.5")}</g>
        <g className="bu-slide-l">{P("M20 16H6M9.5 12.5L6 16l3.5 3.5")}</g>
      </>
    ),
  },
  inicializador: {
    anim: "bu-rocket",
    svg: (
      <>
        {P("M14.5 4.5c2-1 4-1.2 5-1 .2 1 0 3-1 5L12 15l-3.9-3.9z")}
        <circle cx="15.3" cy="8.7" r="1.4" />
        {P("M8.4 11.4L5 11.8 3.2 14l3.9.4M12.6 15.6L12.2 19 10 20.8l-.4-3.9")}
        {P("M6.6 17.4c-1.4.3-2.4 1.4-2.9 3.3 1.9-.5 3-1.5 3.3-2.9", { className: "bu-flicker" })}
      </>
    ),
  },
  // combos
  comunidade: {
    anim: "bu-float",
    svg: (
      <>
        <circle cx="9" cy="8" r="3.2" />
        {P("M3.5 20c0-3.3 2.5-5.5 5.5-5.5s5.5 2.2 5.5 5.5")}
        <circle cx="16.6" cy="9" r="2.6" />
        {P("M15.8 14.6c2.9.1 4.9 2.2 4.9 5.4")}
      </>
    ),
  },
  seguranca: {
    anim: "bu-pulse",
    svg: (
      <>
        {P("M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z")}
        {P("M9 12l2.1 2.1L15.3 10")}
      </>
    ),
  },
  atendimento: {
    anim: "bu-float",
    svg: (
      <>
        {P("M4.5 14v-2a7.5 7.5 0 0 1 15 0v2")}
        <rect x="3.5" y="13" width="3.6" height="5.6" rx="1.5" />
        <rect x="16.9" y="13" width="3.6" height="5.6" rx="1.5" />
        {P("M18.7 18.6c0 1.5-1.5 2.4-4 2.4h-1.5")}
      </>
    ),
  },
  completo: {
    anim: "bu-float",
    svg: (
      <>
        {P("M4.5 15.5L3.5 7l5 4L12 5l3.5 6 5-4-1 8.5zM4.5 19h15")}
        {PONTO(12, 2.6, 1, "bu-twinkle")}
      </>
    ),
  },
  // extras do site
  globo: {
    anim: "bu-roll",
    origem: "12px 12px",
    svg: (
      <>
        <circle cx="12" cy="12" r="8.6" />
        {P("M3.6 12h16.8M12 3.4c2.4 2.4 3.6 5.3 3.6 8.6s-1.2 6.2-3.6 8.6c-2.4-2.4-3.6-5.3-3.6-8.6s1.2-6.2 3.6-8.6z")}
      </>
    ),
  },
  livro: {
    anim: "bu-float",
    svg: (
      <>
        {P("M12 6.5C10.3 5 8 4.5 4 4.5v13c4 0 6.3.5 8 2 1.7-1.5 4-2 8-2v-13c-4 0-6.3.5-8 2zM12 6.5v13")}
      </>
    ),
  },
  baixar: {
    anim: "",
    svg: (
      <>
        <g className="bu-slide-down">{P("M12 3.5v11M7.5 10l4.5 4.5 4.5-4.5")}</g>
        {P("M4.5 16.5v2a2 2 0 0 0 2 2h11a2 2 0 0 0 2-2v-2")}
      </>
    ),
  },
  // categorias da loja
  bot: { anim: "", svg: null },
  plugin: {
    anim: "bu-pulse",
    svg: <>{P("M10 4.5a2 2 0 0 1 4 0V6h3.5a1 1 0 0 1 1 1v3.5H20a2 2 0 0 1 0 4h-1.5V18a1 1 0 0 1-1 1H14v-1.5a2 2 0 0 0-4 0V19H6.5a1 1 0 0 1-1-1v-3.5H7a2 2 0 0 0 0-4H5.5V7a1 1 0 0 1 1-1H10z")}</>,
  },
  app: {
    anim: "bu-float",
    svg: (
      <>
        <rect x="4.5" y="4.5" width="15" height="10.5" rx="1.6" />
        {P("M2.5 19.5h19M8 19.5l.8-2h6.4l.8 2")}
        {P("M8 8.5h5", { className: "bu-dot" })}
        {P("M8 11.5h8", { className: "bu-dot bu-d2" })}
      </>
    ),
  },
  servico: { anim: "", svg: null },
  pacote: {
    anim: "bu-float",
    svg: <>{P("M4 7.8l8-4 8 4v8.4l-8 4-8-4zM4 7.8l8 4 8-4M12 11.8v8.4")}</>,
  },
};
ICONES.bot = ICONES.base;
ICONES.servico = ICONES.utilidades;

/** Gira o início da animação de cada ícone para eles não se mexerem todos juntos. */
function atraso(nome: string) {
  let h = 0;
  for (const c of nome) h = (h * 31 + c.charCodeAt(0)) % 997;
  return `-${((h % 13) * 0.37).toFixed(2)}s`;
}

type Props = {
  /** id do módulo, "base", id do combo ou categoria da loja (bot, plugin, app, servico) */
  name: string;
  /** tamanho em px (o quadrado inteiro) */
  size?: number;
  /** sem o quadrado escuro: só o desenho, para usar no meio do texto */
  plain?: boolean;
  /** brilho mais forte (ex.: módulo marcado) */
  active?: boolean;
  className?: string;
};

export function BuIcon({ name, size = 40, plain = false, active = false, className = "" }: Props) {
  const d = ICONES[name] ?? ICONES.pacote;
  const estilo = { "--bu-d": atraso(name) } as CSSProperties;
  const desenho = (
    <svg
      viewBox="0 0 24 24"
      width={plain ? size : Math.round(size * 0.58)}
      height={plain ? size : Math.round(size * 0.58)}
      fill="none"
      stroke="url(#bu-g) #c77dff"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      className={`bu-ico ${plain ? className : ""}`}
      style={plain ? estilo : undefined}
    >
      <g className={d.anim} style={d.origem ? { transformOrigin: d.origem } : undefined}>
        {d.svg}
      </g>
    </svg>
  );
  if (plain) return <span className="inline-flex shrink-0 align-[-0.2em]">{desenho}</span>;
  return (
    <span
      className={`bu-tile ${active ? "bu-tile-on" : ""} ${className}`}
      style={{ ...estilo, width: size, height: size, borderRadius: Math.round(size * 0.3) }}
      aria-hidden
    >
      {desenho}
    </span>
  );
}

/** Degradê roxo usado por todos os ícones. Vai uma vez no layout. */
export function BuIconDefs() {
  return (
    <svg width="0" height="0" aria-hidden style={{ position: "absolute", width: 0, height: 0, overflow: "hidden" }}>
      <defs>
        <linearGradient id="bu-g" gradientUnits="userSpaceOnUse" x1="3" y1="2" x2="21" y2="22">
          <stop offset="0" stopColor="#f3e3ff" />
          <stop offset="0.45" stopColor="#c77dff" />
          <stop offset="1" stopColor="#8b3fd1" />
        </linearGradient>
      </defs>
    </svg>
  );
}
