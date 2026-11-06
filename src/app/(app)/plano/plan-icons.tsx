import type { ReactNode } from "react";

/**
 * Ícones dos cartões de "Meu Plano": vetores (sem fundo), no mesmo traço da arte — vermelho/preto e dourado —,
 * para ficarem integrados ao cartão em qualquer tamanho, sem o retângulo de uma imagem recortada.
 */
type Id = "gratuito" | "mensal" | "semestral" | "anual" | "vitalicio";

const RED = ["#ff5a4d", "#e10600", "#8c0300"] as const;
const GOLD = ["#fff3a8", "#f6c21a", "#b9780a"] as const;

function Grad({ id, c, v = true }: { id: string; c: readonly [string, string, string]; v?: boolean }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2={v ? 0 : 1} y2={v ? 1 : 0}>
      <stop offset="0" stopColor={c[0]} />
      <stop offset="0.5" stopColor={c[1]} />
      <stop offset="1" stopColor={c[2]} />
    </linearGradient>
  );
}

function Calendar({ p, clock }: { p: string; clock?: boolean }) {
  const rows = clock ? 3 : 3;
  const cols = clock ? 4 : 5;
  const cells: ReactNode[] = [];
  const x0 = clock ? 30 : 24;
  const gx = clock ? 15 : 14;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      if (clock && r === 1 && c === 3) continue;
      if (clock && r === 2 && c === 3) continue;
      cells.push(<rect key={`${r}-${c}`} x={x0 + c * gx} y={44 + r * 14} width="11" height="10" rx="2.4" fill={`url(#${p}w)`} />);
    }
  return (
    <>
      <defs>
        <Grad id={`${p}r`} c={RED} />
        <linearGradient id={`${p}d`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#3b3d42" /><stop offset="1" stopColor="#141416" /></linearGradient>
        <linearGradient id={`${p}w`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#c9ccd1" /></linearGradient>
      </defs>
      {/* aros */}
      <rect x="34" y="8" width="5" height="15" rx="2.5" fill="#d9dce1" /><rect x="34" y="8" width="2" height="15" rx="1" fill="#fff" opacity=".7" />
      <rect x="81" y="8" width="5" height="15" rx="2.5" fill="#d9dce1" /><rect x="81" y="8" width="2" height="15" rx="1" fill="#fff" opacity=".7" />
      {/* corpo */}
      <rect x="14" y="16" width="92" height="66" rx="9" fill={`url(#${p}d)`} stroke={`url(#${p}r)`} strokeWidth="3.2" />
      <path d="M14 25a9 9 0 0 1 9-9h74a9 9 0 0 1 9 9v10H14z" fill={`url(#${p}r)`} />
      <path d="M20 19.5h80" stroke="#fff" strokeOpacity=".35" strokeWidth="1.6" strokeLinecap="round" />
      {cells}
      {clock && (
        <g>
          <circle cx="88" cy="63" r="14" fill="#8c0300" stroke="#ff5a4d" strokeWidth="2.4" />
          <circle cx="88" cy="63" r="10.4" fill="#fff" />
          <path d="M88 56.5V63l4.6 2.8" stroke="#8c0300" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        </g>
      )}
    </>
  );
}

function Gift({ p }: { p: string }) {
  return (
    <>
      <defs>
        <Grad id={`${p}r`} c={RED} />
        <Grad id={`${p}rh`} c={RED} v={false} />
        <linearGradient id={`${p}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#6c6f76" /><stop offset="0.5" stopColor="#34363a" /><stop offset="1" stopColor="#17181a" /></linearGradient>
      </defs>
      {/* caixa */}
      <rect x="20" y="46" width="80" height="38" rx="4" fill={`url(#${p}g)`} />
      <rect x="14" y="34" width="92" height="17" rx="4" fill={`url(#${p}g)`} stroke="#8a8d93" strokeOpacity=".35" strokeWidth="1" />
      <rect x="22" y="36" width="76" height="3" rx="1.5" fill="#fff" opacity=".18" />
      {/* fita */}
      <rect x="52" y="34" width="16" height="50" fill={`url(#${p}rh)`} />
      <rect x="52" y="34" width="4" height="50" fill="#fff" opacity=".18" />
      <rect x="14" y="40" width="92" height="5" fill={`url(#${p}r)`} opacity=".9" />
      {/* laço */}
      <path d="M60 34C46 34 34 26 38 16c3-8 16-5 22 18z" fill={`url(#${p}r)`} stroke="#8c0300" strokeWidth="1.2" />
      <path d="M60 34C74 34 86 26 82 16c-3-8-16-5-22 18z" fill={`url(#${p}r)`} stroke="#8c0300" strokeWidth="1.2" />
      <path d="M42 18c3-4 9-2 13 8" stroke="#fff" strokeOpacity=".35" strokeWidth="1.6" fill="none" strokeLinecap="round" />
      <rect x="53" y="29" width="14" height="11" rx="3.5" fill={`url(#${p}r)`} stroke="#8c0300" strokeWidth="1.2" />
    </>
  );
}

function Crown({ p }: { p: string }) {
  return (
    <>
      <defs>
        <Grad id={`${p}g`} c={GOLD} />
        <linearGradient id={`${p}gh`} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#b9780a" /><stop offset=".35" stopColor="#fff3a8" /><stop offset=".65" stopColor="#f6c21a" /><stop offset="1" stopColor="#b9780a" /></linearGradient>
      </defs>
      <path d="M14 70 8 28l24 20 14-34 14 36 14-36 14 34 24-20-6 42z" fill={`url(#${p}gh)`} stroke="#8a5a06" strokeWidth="1.6" strokeLinejoin="round" />
      <rect x="14" y="68" width="92" height="14" rx="4" fill={`url(#${p}g)`} stroke="#8a5a06" strokeWidth="1.6" />
      <rect x="20" y="71" width="80" height="2.6" rx="1.3" fill="#fff" opacity=".5" />
      {[[8, 26], [32, 46], [46, 12], [60, 33], [74, 12], [88, 46], [112, 26]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={i % 2 === 0 ? 4.4 : 3.4} fill={`url(#${p}g)`} stroke="#8a5a06" strokeWidth="1.2" />
      ))}
      <circle cx="60" cy="58" r="5" fill="#e10600" stroke="#8c0300" strokeWidth="1.4" />
      <circle cx="58.4" cy="56.4" r="1.5" fill="#fff" opacity=".8" />
    </>
  );
}

function Infinity({ p }: { p: string }) {
  const d = "M60 45C48 28 26 22 20 36c-6 14 10 26 26 18 8-4 12-9 14-9m0 0c2 0 6 5 14 9 16 8 32-4 26-18-6-14-28-8-40 9";
  return (
    <>
      <defs>
        <linearGradient id={`${p}g`} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#fff3a8" /><stop offset=".4" stopColor="#f6c21a" /><stop offset=".8" stopColor="#b9780a" /><stop offset="1" stopColor="#f6c21a" /></linearGradient>
      </defs>
      <g transform="translate(60 45) scale(1.22) translate(-60 -40)">
      <path d={d} fill="none" stroke="#6b4304" strokeWidth="17" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke={`url(#${p}g)`} strokeWidth="13" strokeLinecap="round" strokeLinejoin="round" />
      <path d={d} fill="none" stroke="#fff" strokeOpacity=".55" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" transform="translate(-1.5 -3.2)" />
      </g>
    </>
  );
}

export function PlanIcon({ id }: { id: Id }) {
  const p = `pi-${id}-`;
  return (
    <svg className={`pm-ico pm-ico-${id}`} viewBox="0 0 120 90" aria-hidden focusable="false">
      {id === "gratuito" && <Gift p={p} />}
      {id === "mensal" && <Calendar p={p} />}
      {id === "semestral" && <Crown p={p} />}
      {id === "anual" && <Calendar p={p} clock />}
      {id === "vitalicio" && <Infinity p={p} />}
    </svg>
  );
}
