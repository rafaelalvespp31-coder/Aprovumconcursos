import { describe, expect, it } from "vitest";
import { ANEXO_PATH, detectImage } from "./equipe-anexo";

describe("anexo do chat", () => {
  it("reconhece JPEG, PNG e WebP pelo conteúdo", () => {
    expect(detectImage(Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0]))?.ext).toBe("jpg");
    expect(detectImage(Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))?.ext).toBe("png");
    expect(detectImage(Uint8Array.from([0x52, 0x49, 0x46, 0x46, 0, 0, 0, 0, 0x57, 0x45, 0x42, 0x50]))?.ext).toBe("webp");
  });
  it("recusa SVG, HTML, executáveis e vazio", () => {
    expect(detectImage(new TextEncoder().encode("<svg xmlns='http://www.w3.org/2000/svg'></svg>"))).toBeNull();
    expect(detectImage(new TextEncoder().encode("<html><script>"))).toBeNull();
    expect(detectImage(Uint8Array.from([0x4d, 0x5a, 0x90, 0]))).toBeNull();
    expect(detectImage(new Uint8Array())).toBeNull();
  });
  it("o caminho precisa ser pasta-do-aluno/arquivo.ext", () => {
    const u = "11111111-2222-3333-4444-555555555555";
    expect(ANEXO_PATH.test(`${u}/${u}.png`)).toBe(true);
    expect(ANEXO_PATH.test(`${u}/../x.png`)).toBe(false);
    expect(ANEXO_PATH.test(`${u}/${u}.svg`)).toBe(false);
  });
});
