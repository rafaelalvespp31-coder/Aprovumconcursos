import { describe, expect, it } from "vitest";
import { plainJustification, plainToHtml, richToText, sanitizeRichHtml } from "./rich-text";

describe("caderno de erros: texto formatado seguro", () => {
  it("mantém negrito, itálico, sublinhado, riscado, listas e cores", () => {
    const html = '<p><b>Furto</b> <i>simples</i> <u>art. 155</u> <s>velho</s></p><ul><li>um</li></ul><span style="color: rgb(229, 9, 20); background-color: #fff3a0">cor</span>';
    expect(sanitizeRichHtml(html)).toBe(html);
  });

  it("remove scripts, eventos, links, imagens e estilos perigosos", () => {
    const out = sanitizeRichHtml('<p onclick="x()">oi<script>alert(1)</script><img src=x onerror=alert(1)><a href="javascript:alert(1)">link</a><span style="color: red; background: url(javascript:1); position: fixed">t</span></p><style>p{}</style>');
    expect(out).toBe('<p>oilink<span style="color: red">t</span></p>');
    expect(out).not.toMatch(/script|onerror|onclick|href|url|position/i);
  });

  it("fecha tags abertas, ignora fechamentos soltos e escapa o texto", () => {
    expect(sanitizeRichHtml("<b>a <i>b</b> c</i> 1 < 2 & 3 &amp; 4")).toBe("<b>a <i>b</i></b> c 1 &lt; 2 &amp; 3 &amp; 4");
    expect(sanitizeRichHtml("<p>x<!-- <script>alert(1)</script> -->y")).toBe("<p>xy</p>");
  });

  it("converte <font color> antigo em estilo; recusa cor inválida", () => {
    expect(sanitizeRichHtml('<font color="#e50914">x</font>')).toBe('<span style="color: #e50914">x</span>');
    expect(sanitizeRichHtml('<font color="expression(alert(1))">x</font>')).toBe("x");
  });

  it("atributos com '>' dentro de aspas não quebram a limpeza", () => {
    expect(sanitizeRichHtml('<span style="color: red" title="a>b">t</span>')).toBe('<span style="color: red">t</span>');
  });

  it("texto puro vira parágrafos (com **negrito**) e volta a texto", () => {
    const html = plainToHtml("Furto é **subtrair** coisa alheia.\n\nFundamentação: art. 155 <CP>");
    expect(html).toBe("<p>Furto é <b>subtrair</b> coisa alheia.</p><p>Fundamentação: art. 155 &lt;CP&gt;</p>");
    expect(sanitizeRichHtml(html)).toBe(html);
    expect(richToText(html)).toBe("Furto é subtrair coisa alheia.\nFundamentação: art. 155 <CP>");
  });

  it("justificativa sem gabarito nem certo/errado no começo", () => {
    expect(plainJustification("Errado. Furto exige subtração.\nGabarito: E")).toBe("Furto exige subtração.");
  });
});
