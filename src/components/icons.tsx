/**
 * Conjunto de ícones próprio: grade 24px, traço 1.8, pontas arredondadas.
 * Mantém consistência e evita dependência de bibliotecas de ícones.
 */
const PATHS = {
  painel: "M4 11.5 12 5l8 6.5V20a1 1 0 0 1-1 1h-5v-6h-4v6H5a1 1 0 0 1-1-1z",
  trilhas: "M4 18h5v-4h5v-4h6M4 21h16",
  questoes: "M9 9a3 3 0 1 1 4.2 2.75c-.75.34-1.2 1.07-1.2 1.9V14M12 17.5v.01M4 5a1 1 0 0 1 1-1h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1z",
  revisoes: "M20 12a8 8 0 1 1-2.34-5.66M20 4v4h-4",
  perfil: "M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8m-7 9a7 7 0 0 1 14 0",
  mais: "M12 5v14M5 12h14",
  check: "m5 12.5 4.5 4.5L19 7.5",
  x: "M6 6l12 12M18 6 6 18",
  chevronDown: "m6 9 6 6 6-6",
  chevronRight: "m9 6 6 6-6 6",
  chevronLeft: "m15 6-6 6 6 6",
  bookmark: "M7 4h10a1 1 0 0 1 1 1v15l-6-4-6 4V5a1 1 0 0 1 1-1",
  nota: "M5 4h10l4 4v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1M8 12h8M8 16h5",
  duvida: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M9.5 9.5a2.5 2.5 0 1 1 3.5 2.3c-.6.27-1 .87-1 1.53v.17M12 16.5v.01",
  lampada: "M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.44 1 1.13 1 1.88V16h5v-.22c0-.75.4-1.44 1-1.88A6 6 0 0 0 12 3",
  relogio: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18M12 7v5l3 2",
  bandeira: "M5 21V4m0 0h11l-2 4 2 4H5",
  filtro: "M4 5h16l-6 7v6l-4 2v-8z",
  indice: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01",
  setaDireita: "M5 12h14m-5-5 5 5-5 5",
  setaEsquerda: "M19 12H5m5-5-5 5 5 5",
  cadeado: "M7 11V8a5 5 0 0 1 10 0v3M6 11h12a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1v-8a1 1 0 0 1 1-1",
  alerta: "M12 4 3 20h18zM12 10v4M12 17v.01",
  livro: "M4 5a2 2 0 0 1 2-2h14v15H6a2 2 0 0 0-2 2zm0 15a2 2 0 0 0 2 2h14",
  alvo: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18m0-4a5 5 0 1 0 0-10 5 5 0 0 0 0 10m0-4a1 1 0 1 0 0-2 1 1 0 0 0 0 2",
  historico: "M3 12a9 9 0 1 0 3-6.7M3 4v4h4M12 8v4l3 2",
  balanca: "M12 4v16M7 20h10M5 8h14M5 8l-3 6a3 3 0 0 0 6 0zM19 8l-3 6a3 3 0 0 0 6 0z",
  lei: "M6 3h9l4 4v14H6zM9 9h6M9 13h6M9 17h4",
  play: "M8 5v14l11-7z",
  pausa: "M8 5v14M16 5v14",
  lixeira: "M5 7h14M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  salvo: "M5 4h11l3 3v13H5zM8 4v5h7V4M8 20v-6h8v6",
  raio: "M13 3 5 14h6l-1 7 8-11h-6z",
  grafico: "M4 20V10M10 20V4M16 20v-7M22 20H2",
  teclado: "M3 7h18v10H3zM7 11h.01M11 11h.01M15 11h.01M8 14h8",
} as const;

export type IconName = keyof typeof PATHS;

export function Icon({ name, className = "size-5", label }: { name: IconName; className?: string; label?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={`shrink-0 ${/(^|\s)size-/.test(className) ? "" : "size-5 "}${className}`}
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      <path d={PATHS[name]} />
    </svg>
  );
}
