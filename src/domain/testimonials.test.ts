import { describe, expect, it } from "vitest";
import { videoSource } from "./testimonials";

describe("videoSource", () => {
  it("converte YouTube e Vimeo para incorporação", () => {
    expect(videoSource("https://youtu.be/abc123")).toEqual({ kind: "iframe", src: "https://www.youtube-nocookie.com/embed/abc123" });
    expect(videoSource("https://www.youtube.com/watch?v=xyz9")).toEqual({ kind: "iframe", src: "https://www.youtube-nocookie.com/embed/xyz9" });
    expect(videoSource("https://vimeo.com/12345")).toEqual({ kind: "iframe", src: "https://player.vimeo.com/video/12345" });
  });
  it("aceita arquivo de vídeo https e recusa o resto", () => {
    expect(videoSource("https://x.com/a.mp4")?.kind).toBe("file");
    expect(videoSource("http://x.com/a.mp4")).toBeNull();
    expect(videoSource("https://x.com/pagina")).toBeNull();
    expect(videoSource("lixo")).toBeNull();
  });
});
