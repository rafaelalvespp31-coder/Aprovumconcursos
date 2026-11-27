/**
 * Esqueletos de conta da lousa de treino (só Matemática e Raciocínio Lógico). A conta já vem montada, como se fosse
 * feita à mão, e o aluno preenche as casas tocando no teclado, PASSO A PASSO: cada passo diz o que fazer, explica o
 * porquê ao acertar e dá uma dica ao errar. Cada assunto do catálogo tem os seus tipos de conta (ver tiposDaAula).
 */
import { aleatorioBasico, montarBasico, TIPOS_LOG, TIPOS_MAT, TIPOS_TEXTO, validarBasico, type Esqueleto, type TipoEsqueleto } from "./quadro-esqueleto-base";
import { aleatorioLog, montarLog, validarLog } from "./quadro-esqueleto-log";
import { aleatorioMais, montarMais, validarMais } from "./quadro-esqueleto-mais";
import { aleatorioMais2, montarMais2, validarMais2 } from "./quadro-esqueleto-mais2";
import type { Medidor } from "./quadro-motor";

export * from "./quadro-esqueleto-base";
export { lerNumero } from "./quadro-esqueleto-mais2";

/** Enunciado de um exercício: números (a maioria) ou um texto (lógica, decimais…). */
export interface Exercicio { nums: number[]; entrada?: string }

export function exercicioAleatorio(tipo: TipoEsqueleto, rnd: () => number = Math.random): Exercicio {
  const b = aleatorioBasico(tipo, rnd); if (b) return { nums: b };
  const m = aleatorioMais(tipo, rnd); if (m) return { nums: m };
  const m2 = aleatorioMais2(tipo, rnd); if (m2) return m2;
  const l = aleatorioLog(tipo, rnd); if (l !== null) return { nums: [], entrada: l };
  throw new Error(`Tipo sem exercício: ${tipo}`);
}

/** Lê o que o aluno digitou no campo do exercício: devolve o exercício ou a mensagem de erro. */
export function lerExercicio(tipo: TipoEsqueleto, texto: string): { ex: Exercicio } | { erro: string } {
  const entrada = texto.trim();
  const nums = TIPOS_TEXTO.includes(tipo) ? [] : entrada.split(/[^0-9]+/).filter(Boolean).map(Number);
  const validadores = [() => validarLog(tipo, entrada), () => validarMais2(tipo, nums, entrada), () => validarBasico(tipo, nums), () => validarMais(tipo, nums)];
  for (const f of validadores) {
    const v = f();
    if (v === undefined) continue; // este grupo não conhece o tipo
    return v === null ? { ex: TIPOS_TEXTO.includes(tipo) ? { nums: [], entrada } : { nums } } : { erro: v };
  }
  return { erro: "Não entendi esse exercício." };
}

export const textoDoExercicio = (e: Esqueleto): string => (e.tipo === "proposicao" || e.tipo === "principios" || e.tipo === "simcomp" ? "" : e.entrada ?? e.nums.join(", "));

export function montarEsqueleto(tipo: TipoEsqueleto, ex: Exercicio, larg: number, med: Medidor, alt = 100000): Esqueleto {
  const e = montarBasico(tipo, ex.nums, larg, med, alt) ?? montarMais(tipo, ex.nums, larg, med, alt) ?? montarMais2(tipo, ex.nums, ex.entrada ?? "", larg, med, alt) ?? montarLog(tipo, ex.entrada ?? "", larg, med, alt);
  if (!e) throw new Error(`Esqueleto não montado: ${tipo}`);
  return e;
}

// ---------------------------------------------------------------- qual conta para qual aula
const sem = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** Cada assunto do catálogo → as contas dele (a primeira é a que abre sozinha). */
const POR_ASSUNTO: [RegExp, TipoEsqueleto[]][] = [
  // ---- Raciocínio Lógico
  [/conceito de proposicao|sentenca|proposicoes? logicas?$/, ["proposicao"]],
  [/principios fundamentais da logica|identidade|terceiro excluido/, ["principios"]],
  [/proposicoes simples e compostas|conectivos? logicos?/, ["simcomp", "tabela", "valor"]],
  [/tabela.?verdade|valor logico|valoracao/, ["tabela", "valor"]],
  [/tautologia|contradicao|contingencia/, ["tabela", "equiv"]],
  [/negacao|de morgan/, ["negacao", "quant"]],
  [/equivalencia/, ["equiv", "tabela"]],
  [/argument|silogism|validade|inferencia/, ["argumento", "tabela"]],
  [/quantificador|todo.*algum|algum.*nenhum/, ["quant", "negacao"]],
  [/diagrama|teoria dos conjuntos|conjuntos?$/, ["conj"]],
  [/sequencia|progressao|\bpa\b|\bpg\b/, ["pa", "pg"]],
  [/combinatoria|contagem|arranjo|permutacao|combinacao|principio fundamental/, ["pfc", "perm", "arr", "comb"]],
  [/probabilidade/, ["prob", "comb"]],
  [/logica proposicional|raciocinio logico|logica/, ["proposicao", "simcomp", "tabela", "valor", "negacao", "equiv", "argumento", "quant"]],
  // ---- Frações e decimais
  [/conversao entre fracoes e numeros decimais|fracao.*decimal|forma fracionaria e decimal/, ["convfd", "decimal"]],
  [/problemas envolvendo fracoes/, ["fracde", "pct", "convfd", "decimal", "frac"]],
  [/conceito, representacao e classificacao de fracoes|classificacao de fracoes/, ["classfrac", "convfd"]],
  [/equivalentes|simplificacao e comparacao/, ["fraceq", "classfrac"]],
  [/operacoes com fracoes/, ["frac", "fracs", "fracm", "fracd"]],
  [/operacoes com numeros decimais|numeros decimais/, ["decimal", "convfd"]],
  // ---- Matemática: Conjuntos numéricos e operações
  [/comparacao|ordenacao|reta numerica/, ["ordem"]],
  [/expressoes numericas/, ["expr", "soma", "sub", "mult", "div", "pot", "raiz"]],
  [/naturais.*inteiros|inteiros.*racionais|irracionais|conjuntos numericos/, ["classnum"]],
  [/operacoes fundamentais|adicao|subtracao|multiplicacao|divisao(?! proporcional)/, ["soma", "sub", "mult", "div"]],
  [/potenciacao|radiciacao|potencia|raiz/, ["pot", "raiz", "fat"]],
  [/propriedades das operacoes|comutativa|associativa|distributiva/, ["propr"]],
  [/forma fracionaria e decimal|conversao entre fracoes e numeros decimais|fracao.*decimal/, ["convfd", "decimal"]],
  // ---- Múltiplos, divisores
  [/criterios de divisibilidade|divisibilidade/, ["divisib", "primo"]],
  [/maximo divisor|\bmdc\b/, ["mdc", "mmc", "fat"]],
  [/minimo multiplo|\bmmc\b/, ["mmc", "mdc", "fat"]],
  [/multiplos e divisores/, ["divisores", "divisib"]],
  [/primos|fatores primos|decomposicao|fatoracao/, ["fat", "primo", "mmc"]],
  // ---- Porcentagem e matemática financeira
  [/aplicacoes de juros/, ["juros", "jurosc", "taxa"]],
  [/aumentos e descontos/, ["aumdesc", "sucessivas", "pct"]],
  [/capital, taxa, tempo e montante/, ["juros", "taxa", "jurosc"]],
  [/variacoes percentuais sucessivas|sucessiv/, ["sucessivas", "variacao", "aumdesc"]],
  [/porcentagem aplicada|problemas de porcentagem/, ["pct", "pctqto", "aumdesc", "sucessivas", "regra3"]],
  [/conceito e calculo de porcentagem|porcentagem|percentual/, ["pct", "pctqto", "aumdesc"]],
  [/juros compostos/, ["jurosc", "taxa"]],
  [/juros simples|juros/, ["juros", "taxa", "jurosc"]],
  // ---- Razão, proporção, regra de três
  [/regra de tres composta/, ["regra3c", "regra3", "regra3i"]],
  [/grandezas diretamente|inversamente/, ["regra3", "regra3i", "regra3c"]],
  [/regra de tres simples|regra de tres/, ["regra3", "regra3i", "regra3c"]],
  [/divisao proporcional/, ["razao", "proporcao"]],
  [/taxas de variacao/, ["variacao", "vel", "pctqto"]],
  [/razao|proporcao|proporcionalidade|propriedades das proporcoes/, ["proporcao", "razao", "regra3"]],
  // ---- demais conteúdos de matemática que podem entrar no catálogo
  [/sistema/, ["sistema", "eq1"]],
  [/equacao do 2|segundo grau|bhaskara/, ["eq2", "eq1"]],
  [/equacoes?|inequacoes?|incognita|algebra/, ["eq1", "eq2", "sistema"]],
  [/media ponderada/, ["mediap", "media"]],
  [/mediana|moda/, ["mediana", "media"]],
  [/media|estatistic/, ["media", "mediap", "mediana"]],
  [/circulo|circunferencia/, ["circ", "area"]],
  [/volume/, ["vol", "area"]],
  [/pitagoras|triangulo retangulo/, ["pit", "area"]],
  [/area|perimetro|geometria/, ["area", "circ", "vol", "pit"]],
  [/velocidade|escala/, ["vel", "regra3"]],
  [/unidades? de medida|sistema metrico|conversao de unidades/, ["conv"]],
];

const unico = <T,>(a: T[]) => [...new Set(a)];

/** Quais contas a lousa oferece nesta aula: as do assunto primeiro e, depois, todas as outras da matéria. */
export function tiposDaAula(titulo: string, materia?: string | null): TipoEsqueleto[] {
  const t = sem(titulo ?? ""), m = sem(materia ?? "");
  const grupo = /racioc|logic/.test(m) ? TIPOS_LOG : /matem/.test(m) ? TIPOS_MAT : /proposic|tautolog|tabela.verdade|silogism|argument/.test(t) ? TIPOS_LOG : TIPOS_MAT;
  const achou = POR_ASSUNTO.find(([re]) => re.test(t))?.[1] ?? [];
  const validos = achou.filter((x) => grupo.includes(x) || TIPOS_MAT.includes(x as never) || TIPOS_LOG.includes(x));
  return unico([...validos, ...grupo]);
}
