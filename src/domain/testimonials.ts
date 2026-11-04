/** Depoimentos: converte o link do vídeo em algo que o navegador consegue tocar. Puro. */
export interface Testimonial {
  id: string;
  name: string;
  headline: string | null;
  videoUrl: string;
}

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
