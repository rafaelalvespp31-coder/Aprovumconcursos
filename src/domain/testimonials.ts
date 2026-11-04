/** Depoimentos: converte o link do vídeo em algo que o navegador consegue tocar. Puro. */
export type TestimonialCategory = "aprovados" | "superacao" | "transformacao" | "comunidade";
export const TESTIMONIAL_CATEGORIES: Array<{ id: TestimonialCategory; label: string }> = [
  { id: "aprovados", label: "Aprovados" },
  { id: "superacao", label: "Superação" },
  { id: "transformacao", label: "Transformação" },
  { id: "comunidade", label: "Nossa Comunidade" },
];

export interface Testimonial {
  id: string;
  name: string;
  headline: string | null;
  videoUrl: string | null;
  photoUrl?: string | null;
  thumbUrl?: string | null;
  captionsUrl?: string | null;
  category?: TestimonialCategory;
  concurso?: string | null;
  cargo?: string | null;
  estado?: string | null;
  description?: string | null;
  durationSeconds?: number | null;
  publishedAt?: string | null;
  approved?: boolean;
  featured?: boolean;
}

/** 205 → "3:25". */
export function formatDuration(sec: number | null | undefined): string | null {
  if (!sec || sec <= 0) return null;
  return `${Math.floor(sec / 60)}:${String(sec % 60).padStart(2, "0")}`;
}

/** 100000 → "+100 Mil"; 1500 → "+1,5 Mil"; 850 → "850". */
export function formatCount(n: number): string {
  if (n < 1000) return String(n);
  const k = Math.floor(n / 100) / 10;
  return `+${String(k).replace(".", ",")} Mil`;
}

export interface Founder { slug: "rafael" | "william"; name: string; role: string; age: number | null; city: string | null; bio: string | null; story: string | null; trajectory: string | null; quote: string | null; /** Foto enviada pelo admin (nulo = foto original). */ photo?: string | null }
export interface StoryStats { students: number | null; approved: number | null; satisfaction: string | null }
export interface StoryQuote { text: string; authors: string }
export const DEFAULT_FOUNDERS: Founder[] = [
  { slug: "rafael", name: "Rafael Alves", role: "Idealizador do APROVUM", age: null, city: null, bio: null, story: null, trajectory: null, quote: null },
  { slug: "william", name: "William Abreu", role: "Idealizador do APROVUM", age: null, city: null, bio: null, story: null, trajectory: null, quote: null },
];
export const DEFAULT_QUOTE: StoryQuote = { text: "O APROVUM é mais que uma plataforma. É um parceiro na sua jornada pela aprovação.", authors: "Rafael Alves e William Abreu" };

export type VideoSource = { kind: "iframe"; src: string } | { kind: "file"; src: string };

export function videoSource(url: string): VideoSource | null {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    return null;
  }
  if (u.protocol !== "https:") return null;
  const host = u.hostname.replace(/^www\./, "");
  if (host === "youtu.be") return { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${u.pathname.slice(1)}` };
  if (host === "youtube.com" || host === "m.youtube.com") {
    const id = u.searchParams.get("v") ?? (/^\/(embed|shorts)\/([\w-]+)/.exec(u.pathname)?.[2] ?? null);
    return id ? { kind: "iframe", src: `https://www.youtube-nocookie.com/embed/${id}` } : null;
  }
  if (host === "vimeo.com") {
    const id = /^\/(\d+)/.exec(u.pathname)?.[1];
    return id ? { kind: "iframe", src: `https://player.vimeo.com/video/${id}` } : null;
  }
  if (/\.(mp4|webm|mov)$/i.test(u.pathname)) return { kind: "file", src: u.toString() };
  return null;
}
