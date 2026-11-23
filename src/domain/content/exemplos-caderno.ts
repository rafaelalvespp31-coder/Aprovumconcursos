import { parseCalculo } from "./calc-visual";

/**
 * "Vamos fazer no caderno": exemplos de conta por assunto, do mais fácil ao mais difícil. Cada bloco traz só os números;
 * quem calcula e monta o passo a passo é o app (calc-visual), então nada aqui é resultado escrito à mão.
 * Não mexe no banco: é anexado na tela às aulas de Matemática / Raciocínio Lógico cujo título bate com o assunto.
 */
export type ExemploCaderno = { linguagem: string; corpo: string };
type Grupo = { id: string; titulo: RegExp; exemplos: ExemploCaderno[] };

const c = (linguagem: string, corpo: string): ExemploCaderno => ({ linguagem, corpo });

export const GRUPOS_CADERNO: Grupo[] = [
  { id: "mmc-mdc", titulo: /\bmmc\b|\bmdc\b|m[úu]ltiplos|divisores|m[íi]nimo m[úu]ltiplo|m[áa]ximo divisor/i,
    exemplos: [c("conta", "mmc 4 6"), c("conta", "mdc 12 18"), c("conta", "mmc 12 18"), c("conta", "mdc 48 36"), c("conta", "mmc 8 12 20"), c("conta", "mdc 72 120")] },
  { id: "fracoes", titulo: /fra[çc][õo]es|fra[çc][ãa]o|n[úu]meros racionais/i,
    exemplos: [c("fracao", "3/4"), c("fracao", "1/4 + 2/4"), c("fracao", "1/2 + 1/3"), c("fracao", "3/4 - 1/6"), c("fracao", "2/3 x 3/4"), c("fracao", "3/5 : 3/10"), c("simplificar", "18 24")] },
  { id: "porcentagem", titulo: /porcentagem|percentual|percentagem|desconto|acr[ée]scimo/i,
    exemplos: [c("porcentagem", "10 200"), c("porcentagem", "20 150 R$"), c("porcentagem", "quanto 30 150"), c("porcentagem", "desconto 20 150 R$"), c("porcentagem", "aumento 15 400 R$")] },
  { id: "regra3", titulo: /regra de tr[eê]s|grandezas|proporcionais/i,
    exemplos: [c("regra3", "direta 3 12 5\nCadernos | Reais"), c("regra3", "direta 6 24 9\nHoras | Páginas"), c("regra3", "inversa 4 6 8\nOperários | Dias"), c("regra3c", "Operários | Horas | Peças\n10 8 200\n15 6 x\ndireta | direta")] },
  { id: "razao", titulo: /raz[ãa]o|propor[çc][ãa]o/i,
    exemplos: [c("razao", "12 18"), c("simplificar", "18 24"), c("proporcao", "3 12 5"), c("proporcao", "4 10 6")] },
  { id: "juros", titulo: /juros|matem[áa]tica financeira|capitaliza[çc][ãa]o|montante/i,
    exemplos: [c("porcentagem", "10 200 R$"), c("financeira", "simples 1000 2 6"), c("financeira", "composto 1000 10 2"), c("financeira", "composto 1000 2 3")] },
  { id: "potencia-raiz", titulo: /potencia[çc][ãa]o|radicia[çc][ãa]o|pot[êe]ncia|ra[íi]z|ra[íi]zes|radiciais/i,
    exemplos: [c("potencia", "2 3"), c("potencia", "3 4"), c("potencia", "2 5"), c("raiz", "49"), c("raiz", "144"), c("raiz", "3 27")] },
  { id: "equacoes", titulo: /equa[çc][ãa]o|equa[çc][õo]es|[áa]lgebra|inc[óo]gnita/i,
    exemplos: [c("equacao", "x + 5 = 12"), c("equacao", "2x + 3 = 11"), c("equacao", "3x - 4 = 2x + 5"), c("equacao2", "1 -5 6"), c("equacao2", "1 -2 -3")] },
  { id: "expressoes", titulo: /express[ãa]o num[ée]rica|express[õo]es num[ée]ricas|ordem das opera[çc][õo]es|prioridade das opera[çc][õo]es/i,
    exemplos: [c("expressao", "2 + 3 x 4"), c("expressao", "2 + 3 x (10 - 4) : 2"), c("expressao", "(8 + 4) : 3 - 2 x 1"), c("expressao", "20 - (3 + 2) x 2 : 5")] },
  { id: "medidas", titulo: /unidades? de medida|sistema m[ée]trico|medidas de (comprimento|massa|capacidade|tempo)|convers[ãa]o de unidades/i,
    exemplos: [c("unidade", "3,5 km m"), c("unidade", "250 cm m"), c("unidade", "1,5 h min"), c("unidade", "2 m2 cm2"), c("unidade", "2 m3 l")] },
  { id: "geometria", titulo: /geometria|[áa]rea|per[íi]metro|volume|figuras planas|teorema de pit[áa]goras|s[óo]lidos/i,
    exemplos: [c("geometria", "quadrado 6 cm"), c("geometria", "retangulo 8 5 cm"), c("geometria", "triangulo 6 4 cm"), c("geometria", "circulo 3 cm"), c("geometria", "trapezio 10 6 4"), c("geometria", "pitagoras 3 4"), c("geometria", "cubo 3 cm"), c("geometria", "cilindro 2 5")] },
  { id: "decimais", titulo: /decimais|n[úu]meros decimais|v[íi]rgula/i,
    exemplos: [c("conta", "soma 2,5 1,25"), c("conta", "soma 12,5 3,25"), c("conta", "subtracao 10 2,75"), c("conta", "subtracao 8,4 3,15")] },
  { id: "operacoes", titulo: /opera[çc][õo]es (fundamentais|b[áa]sicas)|quatro opera[çc][õo]es|adi[çc][ãa]o|subtra[çc][ãa]o|multiplica[çc][ãa]o|divis[ãa]o|aritm[ée]tica|n[úu]meros (naturais|inteiros)|conjuntos num[ée]ricos|c[áa]lculo b[áa]sico/i,
    exemplos: [c("conta", "soma 25 13"), c("conta", "subtracao 45 12"), c("conta", "multiplicacao 12 3"), c("conta", "divisao 12 3"),
      c("conta", "soma 478 295"), c("conta", "subtracao 503 267"), c("conta", "multiplicacao 248 36"), c("conta", "divisao 432 12"), c("conta", "divisao 1575 15")] },
];

const MATEMATICA = /matem[áa]tica|racioc[íi]nio l[óo]gico|racioc[íi]nio quantitativo|estat[íi]stica/i;

/** Blocos válidos (os que o app consegue calcular) do assunto que bate com o título da aula. */
export function exemplosDoCaderno(materia: string | null | undefined, tituloAula: string | null | undefined): ExemploCaderno[] {
  if (!materia || !tituloAula || !MATEMATICA.test(materia)) return [];
  const g = GRUPOS_CADERNO.find((x) => x.titulo.test(tituloAula));
  if (!g) return [];
  return g.exemplos.filter((e) => parseCalculo(e.linguagem, e.corpo) !== null);
}

/** Markdown da seção "Vamos fazer no caderno" (vazio quando a aula não é de cálculo). */
export function secaoCaderno(materia: string | null | undefined, tituloAula: string | null | undefined): string {
  const ex = exemplosDoCaderno(materia, tituloAula);
  if (!ex.length) return "";
  const blocos = ex.map((e) => "```" + e.linguagem + "\n" + e.corpo + "\n```").join("\n\n");
  return `#### Vamos fazer no caderno\n\nComece pelo primeiro e vá avançando: cada conta vem mais difícil que a anterior. Toque em "Próxima etapa" para ver um passo de cada vez.\n\n${blocos}`;
}
