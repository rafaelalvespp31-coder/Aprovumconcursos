import { describe, expect, it } from "vitest";
import { decodeHtml, extractArticles, htmlToText, LAW_SOURCES } from "./law-text";

const PAGE = `<html><head><meta http-equiv="Content-Type" content="text/html; charset=windows-1252"><style>p{}</style></head><body>
<p>Art. 120 - A sentença que conceder perdão judicial não será considerada para efeitos de reincidência.</p>
<p><a name="art121"></a>Art. 121. Matar alguém:</p>
<p>Pena - reclusão, de seis a vinte anos.</p>
<p><strike>§ 1º Texto antigo revogado que não deve aparecer.</strike></p>
<p>§ 1º Se o agente comete o crime impelido por motivo de relevante valor social ou moral&nbsp;o juiz pode reduzir a pena de um sexto a um terço.</p>
<p>Art. 121-A. Matar a mulher por razões da condição do sexo feminino:</p>
<p>Pena - reclusão, de 20 (vinte) a 40 (quarenta) anos.</p>
<p>Art. 122. Induzir ou instigar alguém a suicidar-se:</p>
</body></html>`;

describe("texto oficial (Planalto)", () => {
  it("decodifica windows-1252 sem estragar acentos", () => {
    const bytes = new Uint8Array([...new TextEncoder().encode("<meta charset=windows-1252>"), 0x53, 0xe9, 0x72, 0x69, 0x65]); // "Série"
    expect(decodeHtml(bytes, "text/html")).toContain("Série");
    expect(decodeHtml(new TextEncoder().encode("Ação"), "text/html; charset=utf-8")).toBe("Ação");
  });

  it("remove o texto riscado (redação revogada), estilos e entidades", () => {
    const t = htmlToText(PAGE);
    expect(t).not.toContain("Texto antigo revogado");
    expect(t).not.toContain("p{}");
    expect(t).toContain("moral o juiz pode reduzir");
  });

  it("recorta só o artigo pedido, até o próximo (121 não inclui 121-A)", () => {
    const t = htmlToText(PAGE);
    const r = extractArticles(t, ["121"], 8000);
    expect(r.found).toEqual(["121"]);
    expect(r.text).toMatch(/^Art\. 121\. Matar alguém:/);
    expect(r.text).toContain("Pena - reclusão, de seis a vinte anos.");
    expect(r.text).not.toContain("121-A");
    const b = extractArticles(t, ["121-A", "999"], 8000);
    expect(b.found).toEqual(["121-A"]);
    expect(b.missing).toEqual(["999"]);
  });

  it("respeita o limite de tamanho", () => {
    const t = htmlToText(PAGE);
    const r = extractArticles(t, ["120", "121", "122"], 150);
    expect(r.text.length).toBeLessThanOrEqual(150);
    expect(r.missing.length).toBeGreaterThan(0);
  });

  it("endereços oficiais em https do Planalto", () => {
    for (const s of Object.values(LAW_SOURCES)) expect(s.url).toMatch(/^https:\/\/www\.planalto\.gov\.br\/ccivil_03\//);
  });
});
