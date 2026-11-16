import { fold } from "./text";

/** Limite de editais exibido na Central de Missões ("CONCURSOS ATIVOS n/10"). */
export const MISSOES_LIMITE = 10;

/** Foto de fundo do card (arquivos próprios em /public/missoes, sem brasões nem marcas). */
const FOTOS: Array<{ re: RegExp; foto: string; sigla: string }> = [
  { re: /\bprf\b|policia rodoviaria federal/, foto: "prf", sigla: "PRF" },
  { re: /\bpmerj\b|\bpmrj\b|policia militar (do estado )?(do )?rio de janeiro/, foto: "pmrj", sigla: "PMRJ" },
  { re: /\bpcmg\b|policia civil (do estado )?(de )?minas gerais/, foto: "pcmg", sigla: "PCMG" },
  { re: /policia penal|\bpp(mg)?\b|\bdepen\b|\bseap\b|agente penitenciario/, foto: "pp", sigla: "POLÍCIA PENAL" },
  { re: /\bgcm\b|guarda civil|guarda municipal/, foto: "gcm", sigla: "GCM" },
];

const IGNORA = new Set(["DE", "DO", "DA", "DOS", "DAS", "E", "ESTADO", "CONCURSO", "EDITAL"]);

/** Sigla curta e foto do card, a partir do nome do concurso/cargo/arquivo. */
export function missaoVisual(...textos: Array<string | null | undefined>): { sigla: string; foto: string | null } {
  const bruto = textos.filter(Boolean).join(" ");
  const t = fold(bruto);
  const hit = FOTOS.find((f) => f.re.test(t));
  if (hit) return { sigla: hit.sigla, foto: `/missoes/${hit.foto}.webp` };
  const first = (textos.find((x) => x && x.trim()) ?? "EDITAL").replace(/\.[a-z0-9]{2,4}$/i, "");
  const sigla = first.match(/\b[A-ZÀ-Ú]{3,8}\b/)?.[0];
  if (sigla && !IGNORA.has(sigla)) return { sigla, foto: null };
  const ini = first.split(/\s+/).filter((w) => w.length > 2 && !IGNORA.has(w.toUpperCase())).slice(0, 4).map((w) => w[0]!.toUpperCase()).join("");
  return { sigla: ini || "EDITAL", foto: null };
}
