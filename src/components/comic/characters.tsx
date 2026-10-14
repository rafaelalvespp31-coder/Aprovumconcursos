import type { StripCharacter } from "@/domain/content/visual";

/**
 * Personagens da tirinha: traço grosso de quadrinho, cores chapadas.
 * Coordenadas: (0,0) = pés do personagem; altura ~112.
 */

export const INK = "#1A1A1A";

type Look = {
  skin: string;
  hair: string;
  hairStyle: "curto" | "longo" | "careca" | "coque" | "raspado";
  torso: string;
  pants: string;
  cap?: string;
  tie?: string;
  coat?: boolean; // jaleco
  toga?: boolean;
  badge?: boolean;
  patch?: string;
  glasses?: boolean;
  beard?: boolean;
  lanyard?: string; // cordão de crachá
};

const LOOKS: Record<StripCharacter["p"], Look> = {
  delegado: { skin: "#C68B59", hair: "#2B1D14", hairStyle: "curto", torso: "#2F3A4A", pants: "#232B36", tie: "#C81E1E", badge: true, beard: true },
  pm: { skin: "#E0AC7E", hair: "#3B2A1E", hairStyle: "raspado", torso: "#5B6B7F", pants: "#3E4A59", cap: "#3E4A59", badge: true },
  policial_penal: { skin: "#8D5524", hair: "#1A1A1A", hairStyle: "raspado", torso: "#202020", pants: "#202020", cap: "#202020", patch: "#D4A017" },
  perito: { skin: "#F2C9A0", hair: "#6B4226", hairStyle: "coque", torso: "#FFFFFF", pants: "#3A3F47", coat: true, glasses: true },
  promotor: { skin: "#F2C9A0", hair: "#8A8A8A", hairStyle: "curto", torso: "#24324A", pants: "#1D283B", tie: "#7A1F2B", glasses: true },
  juiz: { skin: "#C68B59", hair: "#E6E6E6", hairStyle: "careca", torso: "#141414", pants: "#141414", toga: true },
  advogado: { skin: "#E0AC7E", hair: "#1A1A1A", hairStyle: "longo", torso: "#5A4632", pants: "#3D3022", tie: "#D4A017" },
  vitima: { skin: "#F2C9A0", hair: "#B5651D", hairStyle: "longo", torso: "#6FA8DC", pants: "#3B5B85" },
  investigado: { skin: "#E0AC7E", hair: "#2B1D14", hairStyle: "curto", torso: "#7A7A7A", pants: "#2E2E2E", beard: true },
  preso: { skin: "#C68B59", hair: "#1A1A1A", hairStyle: "raspado", torso: "#D9C7A3", pants: "#C4B08A" },
  cidadao: { skin: "#8D5524", hair: "#1A1A1A", hairStyle: "curto", torso: "#4CAF7A", pants: "#34495E" },
  // Servidor público: camisa clara com crachá.
  servidor: { skin: "#E0AC7E", hair: "#4A3020", hairStyle: "coque", torso: "#DCE6F0", pants: "#3A4656", lanyard: "#2563EB" },
  // Gestor (prefeito, secretário, chefe do órgão): terno escuro e gravata azul.
  gestor: { skin: "#F2C9A0", hair: "#5B5B5B", hairStyle: "curto", torso: "#1F2937", pants: "#111827", tie: "#1D4ED8", glasses: true },
  professor: { skin: "#C68B59", hair: "#2B1D14", hairStyle: "longo", torso: "#B45309", pants: "#3F3F46", glasses: true },
};

const S = { stroke: INK, strokeWidth: 2.4, strokeLinejoin: "round" as const, strokeLinecap: "round" as const };

function Prop({ kind }: { kind: NonNullable<StripCharacter["objeto"]> }) {
  switch (kind) {
    case "arma":
      return (
        <g {...S} strokeWidth={1.8}>
          <path d="M0 -3 h16 v6 h-9 l-2 7 h-5 z" fill="#3A3A3A" />
        </g>
      );
    case "faca":
      return (
        <g {...S} strokeWidth={1.6}>
          <rect x={-2} y={-2.5} width={7} height={5} rx={1} fill="#5A3A22" />
          <path d="M5 -2.5 L20 0 L5 2.5 z" fill="#D9D9D9" />
        </g>
      );
    case "documento":
      return (
        <g {...S} strokeWidth={1.6}>
          <rect x={-2} y={-12} width={16} height={20} rx={1.5} fill="#FFFFFF" />
          <path d="M1 -7 h10 M1 -3 h10 M1 1 h7" strokeWidth={1.2} />
        </g>
      );
    case "celular":
      return (
        <g {...S} strokeWidth={1.6}>
          <rect x={-1} y={-10} width={9} height={15} rx={2} fill="#2A2A2A" />
          <rect x={1} y={-8} width={5} height={9} fill="#7EC8E3" stroke="none" />
        </g>
      );
    case "maleta":
      return (
        <g {...S} strokeWidth={1.8}>
          <path d="M3 -2 v-4 h8 v4" fill="none" />
          <rect x={-2} y={-2} width={18} height={13} rx={2} fill="#B0B7C0" />
          <path d="M5 4 h4 M7 2 v4" stroke="#C81E1E" strokeWidth={1.8} />
        </g>
      );
    case "carimbo":
      return (
        <g {...S} strokeWidth={1.6}>
          <rect x={1} y={-14} width={6} height={9} rx={2} fill="#7A4A2A" />
          <rect x={-3} y={-5} width={14} height={6} rx={1.5} fill="#C81E1E" />
        </g>
      );
    case "copo":
      return (
        <g {...S} strokeWidth={1.6}>
          <path d="M0 -10 h10 l-1.5 13 h-7 z" fill="#F4C542" />
          <path d="M0 -10 h10 v3 h-10 z" fill="#FFFFFF" />
        </g>
      );
  }
}

function Face({ mood, look }: { mood: StripCharacter["humor"]; look: Look }) {
  // Olhos + sobrancelhas + boca, olhando para a direita (o grupo inteiro é espelhado quando olha para a esquerda).
  const brows: Record<string, string> = {
    neutro: "M-3 -101 l5 0 M5 -101 l5 0",
    serio: "M-3 -101 l5 1 M5 -100 l5 -1",
    bravo: "M-3 -103 l5 3 M5 -100 l5 -3",
    surpreso: "M-3 -104 l5 -1 M5 -105 l5 1",
    feliz: "M-3 -102 l5 -1 M5 -103 l5 1",
    triste: "M-3 -100 l5 -2 M5 -102 l5 2",
  };
  const mouth: Record<string, React.ReactNode> = {
    neutro: <path d="M2 -88 h6" {...S} strokeWidth={1.8} fill="none" />,
    serio: <path d="M1 -88 h7" {...S} strokeWidth={2} fill="none" />,
    bravo: <path d="M1 -87 q4 -3 8 0" {...S} strokeWidth={2} fill="none" />,
    surpreso: <ellipse cx={5} cy={-88} rx={2.6} ry={3.2} fill={INK} />,
    feliz: <path d="M0 -90 q5 5 9 0" {...S} strokeWidth={1.8} fill="none" />,
    triste: <path d="M1 -87 q4 -3 8 0" {...S} strokeWidth={1.8} fill="none" />,
  };
  return (
    <g>
      <path d={brows[mood]} {...S} strokeWidth={2} fill="none" />
      <circle cx={0} cy={-96} r={1.8} fill={INK} />
      <circle cx={8} cy={-96} r={1.8} fill={INK} />
      {look.glasses && (
        <g {...S} strokeWidth={1.4} fill="none">
          <circle cx={0} cy={-96} r={3.6} />
          <circle cx={8} cy={-96} r={3.6} />
          <path d="M3.6 -96 h0.8" />
        </g>
      )}
      {look.beard && <path d="M-13.2 -91 a14 14 0 0 0 26.4 0 l-2.6 0.6 q-10.6 10.5 -21.2 0z" fill={look.hair} stroke="none" opacity={0.9} />}
      {mouth[mood]}
    </g>
  );
}

function Hair({ look }: { look: Look }) {
  const f = look.hair;
  switch (look.hairStyle) {
    case "careca":
      return <path d="M-13 -97 q-1 -8 4 -10 M13 -97 q1 -8 -4 -10" {...S} stroke={f} strokeWidth={4} fill="none" />;
    case "raspado":
      return <path d="M-14 -98 a14 14 0 0 1 28 0 q-6 -6 -14 -6 q-8 0 -14 6z" fill={f} {...S} strokeWidth={1.6} />;
    case "longo":
      return <path d="M-15 -96 a15 15 0 0 1 30 0 v16 q-4 3 -6 -2 v-12 q-9 -6 -20 0 v12 q-2 5 -6 2z" fill={f} {...S} strokeWidth={1.8} />;
    case "coque":
      return (
        <g fill={f} {...S} strokeWidth={1.8}>
          <circle cx={-9} cy={-113} r={6} />
          <path d="M-14.5 -97 a14.5 14.5 0 0 1 29 0 q-7 -7 -15 -6 q-8 1 -14 6z" />
        </g>
      );
    default:
      return <path d="M-14.3 -101 a14.3 14.3 0 0 1 28.6 0 q-4 -3 -9 -3 q-3 2.5 -8 2.5 q-6 0 -11.6 0.5z" fill={f} {...S} strokeWidth={1.8} />;
  }
}

export function Person({ c, x, faceLeft }: { c: StripCharacter; x: number; faceLeft: boolean }) {
  const look = LOOKS[c.p];
  const lean = c.pose === "ataca" ? 8 : 0;
  const armColor = look.coat ? "#FFFFFF" : look.toga ? "#141414" : look.torso;
  // Braço da frente (direito do desenho) conforme a pose; mão em (hx, hy).
  const front: Record<string, { d: string; hx: number; hy: number }> = {
    neutro: { d: "M8 -78 q6 14 4 30", hx: 12, hy: -48 },
    fala: { d: "M8 -78 q14 4 14 -14", hx: 22, hy: -92 },
    aponta: { d: "M8 -76 l26 -8", hx: 34, hy: -84 },
    pega: { d: "M8 -76 q12 10 22 4", hx: 30, hy: -72 },
    ataca: { d: "M8 -78 l28 -4", hx: 36, hy: -82 },
    bracos_cruzados: { d: "M8 -76 q-6 12 -16 6", hx: -8, hy: -70 },
  };
  const arm = front[c.pose] ?? front.neutro!;
  const back = c.pose === "bracos_cruzados" ? "M-8 -76 q6 12 16 6" : c.pose === "ataca" ? "M-8 -78 l24 6" : "M-8 -78 q-6 14 -4 30";

  return (
    <g transform={`translate(${x} 0) scale(${faceLeft ? -1 : 1} 1)`}>
      <g transform={`rotate(${lean} 0 -40)`}>
        {/* pernas */}
        <path d={c.pose === "ataca" ? "M-5 -40 l-10 40 M5 -40 l12 40" : "M-5 -40 v40 M5 -40 v40"} stroke={INK} strokeWidth={9} strokeLinecap="round" fill="none" />
        <path d={c.pose === "ataca" ? "M-5 -40 l-10 40 M5 -40 l12 40" : "M-5 -40 v40 M5 -40 v40"} stroke={look.pants} strokeWidth={5} strokeLinecap="round" fill="none" />
        {/* braço de trás */}
        <path d={back} stroke={INK} strokeWidth={8} strokeLinecap="round" fill="none" />
        <path d={back} stroke={armColor} strokeWidth={4} strokeLinecap="round" fill="none" />
        {/* tronco */}
        {look.toga ? (
          <path d="M-12 -82 h24 l8 46 h-40 z" fill={look.torso} {...S} />
        ) : (
          <rect x={-12} y={-82} width={24} height={44} rx={7} fill={look.torso} {...S} />
        )}
        {look.toga && <path d="M-6 -82 l6 8 l6 -8" fill="#FFFFFF" {...S} strokeWidth={1.6} />}
        {look.tie && (
          <g>
            <path d="M-5 -82 l5 9 l5 -9" fill="#FFFFFF" {...S} strokeWidth={1.4} />
            <path d="M0 -73 l-3 4 l3 16 l3 -16 z" fill={look.tie} {...S} strokeWidth={1.4} />
          </g>
        )}
        {look.coat && <path d="M0 -82 v44 M-12 -60 h24" stroke={INK} strokeWidth={1.4} fill="none" opacity={0.6} />}
        {look.badge && <path d="M-8 -68 l3 -3 l3 3 l-3 4 z" fill="#E8B923" {...S} strokeWidth={1.2} />}
        {look.patch && <rect x={-9} y={-74} width={7} height={5} rx={1} fill={look.patch} stroke="none" />}
        {look.lanyard && (
          <g>
            <path d="M-6 -82 l6 18 l6 -18" stroke={look.lanyard} strokeWidth={2} fill="none" />
            <rect x={-4.5} y={-65} width={9} height={11} rx={1.5} fill="#FFFFFF" {...S} strokeWidth={1.3} />
            <rect x={-2.5} y={-63} width={5} height={3.5} fill={look.lanyard} stroke="none" />
          </g>
        )}
        {/* cabeça */}
        <rect x={-4} y={-86} width={8} height={6} fill={look.skin} {...S} strokeWidth={1.6} />
        <circle cx={0} cy={-96} r={14} fill={look.skin} {...S} />
        <Hair look={look} />
        {look.cap && (
          <g {...S} strokeWidth={1.8}>
            <path d="M-14 -101 a14 13 0 0 1 28 0 z" fill={look.cap} />
            <path d="M8 -101 h14 q0 3 -3 3 h-11z" fill={look.cap} />
            {look.patch && <circle cx={0} cy={-105} r={2.4} fill={look.patch} stroke="none" />}
          </g>
        )}
        <Face mood={c.humor} look={look} />
        {/* braço da frente + objeto */}
        <path d={arm.d} stroke={INK} strokeWidth={8} strokeLinecap="round" fill="none" />
        <path d={arm.d} stroke={armColor} strokeWidth={4} strokeLinecap="round" fill="none" />
        <circle cx={arm.hx} cy={arm.hy} r={3.6} fill={look.coat ? "#5AA9E6" : look.skin} {...S} strokeWidth={1.6} />
        {c.objeto && (
          <g transform={`translate(${arm.hx} ${arm.hy})`}>
            <Prop kind={c.objeto} />
          </g>
        )}
      </g>
    </g>
  );
}
