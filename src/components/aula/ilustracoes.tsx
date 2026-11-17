/** Ilustrações próprias (traço de caderno) para os cartões de estudo; cada ícone do assunto tem a sua. */
const S = "#2b2f63";
const base = { fill: "none", stroke: S, strokeWidth: 3, strokeLinecap: "round", strokeLinejoin: "round" } as const;
type P = { size?: number };
const Svg = ({ size = 92, children }: P & { children: React.ReactNode }) => <svg viewBox="0 0 96 96" width={size} height={size} aria-hidden="true" focusable="false">{children}</svg>;
const T = "var(--cx, #6d4aff)";

export const Ampulheta = (p: P) => (
  <Svg {...p}>
    <path {...base} fill="#fff" d="M26 10h44M26 86h44" />
    <path {...base} fill="#fff" d="M30 10c0 22 12 28 18 38-6 10-18 16-18 38M66 10c0 22-12 28-18 38 6 10 18 16 18 38" />
    <path d="M36 14h24c-2 12-8 18-12 24-4-6-10-12-12-24z" fill={T} opacity=".55" />
    <path d="M32 84c2-12 8-18 16-24 8 6 14 12 16 24z" fill={T} opacity=".7" />
    <path {...base} strokeWidth={2.5} d="M48 40v22" strokeDasharray="2 5" />
  </Svg>
);
export const Martelo = (p: P) => (
  <Svg {...p}>
    <rect {...base} fill={T} fillOpacity=".5" x="30" y="14" width="40" height="22" rx="5" transform="rotate(-35 50 25)" />
    <path {...base} d="M54 38 82 78" strokeWidth="6" />
    <rect {...base} fill="#fff" x="12" y="78" width="46" height="10" rx="3" />
    <path {...base} d="M20 58l8 6M14 48l6 4" strokeWidth="2.5" />
  </Svg>
);
export const Balanca = (p: P) => (
  <Svg {...p}>
    <path {...base} d="M48 12v66M28 82h40M20 26h56" />
    <path {...base} fill={T} fillOpacity=".5" d="M20 26 8 54c4 8 20 8 24 0zM76 26 64 54c4 8 20 8 24 0z" />
    <circle {...base} fill="#fff" cx="48" cy="14" r="5" />
  </Svg>
);
export const Predio = (p: P) => (
  <Svg {...p}>
    <path {...base} fill={T} fillOpacity=".45" d="M10 34 48 12l38 22z" />
    <path {...base} d="M18 40v34M36 40v34M60 40v34M78 40v34" strokeWidth="6" />
    <path {...base} fill="#fff" d="M8 78h80v8H8z" />
  </Svg>
);
export const Calculadora = (p: P) => (
  <Svg {...p}>
    <rect {...base} fill="#fff" x="20" y="8" width="56" height="80" rx="8" />
    <rect {...base} fill={T} fillOpacity=".5" x="27" y="15" width="42" height="16" rx="3" />
    {[0, 1, 2].flatMap((r) => [0, 1, 2].map((c) => <circle key={`${r}${c}`} cx={34 + c * 14} cy={44 + r * 14} r="4" fill={S} />))}
    <rect fill={T} x="52" y="70" width="14" height="12" rx="3" stroke={S} strokeWidth="2.5" />
    <path {...base} strokeWidth="2.5" d="M32 76h12" />
  </Svg>
);
export const Pena = (p: P) => (
  <Svg {...p}>
    <path {...base} fill={T} fillOpacity=".5" d="M70 10c10 6 16 12 16 12L40 64 26 70l4-14z" />
    <path {...base} d="M62 18l16 14M30 58l8 8" />
    <path {...base} strokeWidth="2.5" d="M12 86c10-6 18 2 26-2s14-6 22 0" />
  </Svg>
);
export const Livro = (p: P) => (
  <Svg {...p}>
    <path {...base} fill="#fff" d="M48 22c-10-8-26-8-38-4v54c12-4 28-4 38 4 10-8 26-8 38-4V18c-12-4-28-4-38 4z" />
    <path {...base} d="M48 22v54" />
    <path {...base} strokeWidth="2.5" stroke={T} d="M18 32c8-2 16-2 22 1M18 44c8-2 16-2 22 1M56 33c6-3 14-3 22-1M56 45c6-3 14-3 22-1" />
  </Svg>
);
export const Monitor = (p: P) => (
  <Svg {...p}>
    <rect {...base} fill="#fff" x="10" y="14" width="76" height="52" rx="6" />
    <rect fill={T} fillOpacity=".45" x="16" y="20" width="64" height="40" rx="3" />
    <path {...base} d="M36 86h24M48 66v20" />
    <path {...base} strokeWidth="2.5" d="M26 34l10 8-10 8M44 52h20" />
  </Svg>
);
export const Escudo = (p: P) => (
  <Svg {...p}>
    <path {...base} fill={T} fillOpacity=".5" d="M48 8 16 20v26c0 20 14 34 32 42 18-8 32-22 32-42V20z" />
    <path {...base} strokeWidth="5" d="M34 48l10 10 20-22" />
  </Svg>
);
export const Documento = (p: P) => (
  <Svg {...p}>
    <path {...base} fill="#fff" d="M22 8h40l16 16v64H22z" />
    <path {...base} fill={T} fillOpacity=".45" d="M62 8v16h16" />
    <path {...base} strokeWidth="2.5" d="M32 40h36M32 52h36M32 64h24" />
  </Svg>
);
export const Lampada = ({ size = 70 }: P) => (
  <svg viewBox="0 0 80 96" width={size} height={size * 1.2} aria-hidden="true" focusable="false">
    <path {...base} stroke="#d9a400" strokeWidth="3.5" d="M40 4v9M10 20l7 5M70 20l-7 5M2 46h9M78 46h-9" />
    <path {...base} stroke="#b07a00" fill="#ffe27a" d="M40 18c-14 0-22 10-22 22 0 9 5 14 9 19 2 3 3 5 3 9h20c0-4 1-6 3-9 4-5 9-10 9-19 0-12-8-22-22-22z" />
    <path {...base} stroke="#b07a00" fill="#fff" d="M32 72h16M34 80h12" />
    <path {...base} stroke="#b07a00" strokeWidth="2.5" d="M34 34c2-4 6-6 10-6M36 58l4-14 4 14" />
  </svg>
);

export const ILUSTRACAO: Record<string, (p: P) => React.JSX.Element> = { Hourglass: Ampulheta, Gavel: Martelo, Scale: Balanca, Landmark: Predio, Calculator: Calculadora, PenLine: Pena, BookOpen: Livro, Monitor, ShieldCheck: Escudo, FileText: Documento };
