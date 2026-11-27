/**
 * Perfil da lousa de acordo com a aula aberta: o que o aluno costuma escrever naquele assunto.
 * Serve para o reconhecimento escolher o caractere que "faz sentido" na conta da aula (ex.: em MMC, o "x" é
 * sinal de vezes; em regra de três, é a incógnita) e para dar preferência aos algarismos que aparecem na aula.
 */
export interface PerfilQuadro {
  /** Nome curto mostrado no topo da lousa. */
  nome: string;
  modo: "calculo" | "texto";
  /** Caracteres esperados nesse assunto (recebem preferência). */
  vocab: string;
  /** Algarismos que aparecem no texto da aula (recebem uma preferência extra). */
  digitosDaAula: string;
  /** Em contas de multiplicar, o "x" é o sinal de vezes (×); em equações, é a letra. */
  xVezes: boolean;
}

export interface ContextoAula { materia?: string | null; aula?: string | null; secao?: string | null; texto?: string | null }

const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const OPS = "÷×=+-/:().,%";
const DIG = "0123456789";

const REGRAS: { re: RegExp; nome: string; vocab: string; xVezes: boolean }[] = [
  { re: /\b(mmc|mdc|minimo multiplo|maximo divisor|multiplos?|divisores|fatorac|fatoraca|numeros primos|primos|divisibilidade)\b/, nome: "MMC e MDC", vocab: DIG + "÷×=:./(),mdc", xVezes: true },
  { re: /(regra de (tres|3)|proporcional|proporcao|razao|grandezas)/, nome: "Regra de três e proporção", vocab: DIG + "=/:×x.,%", xVezes: false },
  { re: /(equacao|equacoes|incognita|algebra|inequacao|sistema de equac|funcao|polinomi)/, nome: "Equações", vocab: DIG + "=+-×÷/()xyabn.,", xVezes: false },
  { re: /(porcentagem|percentual|juros|desconto|acrescimo|lucro|prejuizo)/, nome: "Porcentagem e juros", vocab: DIG + "%=+-×÷/().,", xVezes: true },
  { re: /(fracao|fracoes|numeros decimais|decimal|numeros racionais)/, nome: "Frações", vocab: DIG + "/=+-×÷().,", xVezes: true },
  { re: /(potenciac|radiciac|raiz|expressoes? numericas?|operacoes|soma|subtracao|multiplicacao|divisao|tabuada|conjuntos? numericos)/, nome: "Operações com números", vocab: DIG + "+-×÷=/()√.,", xVezes: true },
  { re: /(geometria|area|perimetro|volume|triangulo|circulo|angulo)/, nome: "Geometria", vocab: DIG + "=+-×÷/()πxabcrhl.,²", xVezes: true },
  { re: /(estatistica|media|mediana|moda|probabilidade|combinatoria|analise combinatoria|arranjo|permutac)/, nome: "Estatística e contagem", vocab: DIG + "=+-×÷/()!.,%", xVezes: true },
  { re: /(matematica|raciocinio logico|calculo)/, nome: "Matemática", vocab: DIG + OPS + "√", xVezes: true },
];

/** Escolhe o perfil da lousa pela aula aberta (título, matéria e seção). */
export function perfilDaAula(ctx: ContextoAula | null | undefined): PerfilQuadro {
  const alvo = sem([ctx?.aula, ctx?.secao, ctx?.materia].filter(Boolean).join(" | "));
  const texto = ctx?.texto ?? "";
  const digitosDaAula = [...new Set(texto.match(/\d/g) ?? [])].join("");
  for (const r of REGRAS) {
    if (r.re.test(alvo)) return { nome: r.nome, modo: "calculo", vocab: r.vocab, digitosDaAula, xVezes: r.xVezes };
  }
  return { nome: "Anotações", modo: "texto", vocab: "", digitosDaAula, xVezes: false };
}

/** Ajuste somado à distância de cada caractere (negativo = mais provável nessa aula). */
export function viesDoPerfil(p: PerfilQuadro | undefined): (ch: string) => number {
  if (!p) return (ch) => (/[0-9]/.test(ch) ? -0.25 : 0);
  if (p.modo === "texto") return (ch) => (/[0-9]/.test(ch) ? -0.05 : /[a-zA-Z]/.test(ch) ? -0.1 : 0);
  return (ch) => {
    const naAula = p.digitosDaAula.includes(ch) ? 0.06 : 0;
    if (/[0-9]/.test(ch)) return -0.3 - naAula;
    if (p.vocab.includes(ch) || (ch === "x" && p.xVezes)) return -0.12;
    return /[a-zA-Z]/.test(ch) ? 0.3 : 0.1; // letras fora do assunto (ex.: "q", "d" numa aula de MMC) perdem para os números
  };
}
