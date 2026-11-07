import { z } from "zod";
import { CATEGORIA_IDS } from "./rubricas";

const txt = (max = 600) => z.string().trim().min(1).max(max);
const opt = (max = 600) => z.string().trim().max(max).nullish();
const nivel = z.enum(["fraco", "regular", "bom", "excelente"]);

/** Etapas 1, 2, 3, 5 e 6: tema, estrutura, coesão/coerência e argumentação (uma leitura analítica do texto). */
export const AnaliseSchema = z.object({
  tema: z.object({
    compreensao: txt(900),
    aderencia: z.enum(["adequado", "tangencia", "fuga"]),
    tipoTextual: z.enum(["adequado", "parcial", "inadequado"]),
  }),
  estrutura: z.object({
    introducao: z.object({ nivel, avaliacao: txt(700) }),
    desenvolvimento: z.object({ nivel, avaliacao: txt(700) }),
    conclusao: z.object({ nivel, avaliacao: txt(700) }),
    tese: z.object({ presente: z.boolean(), trecho: opt(500), observacao: txt(500) }),
    paragrafos: z.array(z.object({ indice: z.number().int().min(1), funcao: txt(120), observacao: txt(400) })).max(20),
  }),
  coesaoCoerencia: z.object({ nivel, avaliacao: txt(900) }),
  argumentacao: z.object({
    nivel,
    avaliacao: txt(900),
    repertorio: z.object({ presente: z.boolean(), avaliacao: txt(500) }),
    argumentosSuperficiais: z.array(z.object({ trecho: txt(400), motivo: txt(400) })).max(8),
    contradicoes: z.array(txt(400)).max(6),
  }),
  propostaIntervencao: z.object({
    exigida: z.boolean(),
    presente: z.boolean(),
    agente: z.boolean(),
    acao: z.boolean(),
    meio: z.boolean(),
    finalidade: z.boolean(),
    detalhamento: z.boolean(),
    respeitaDireitosHumanos: z.boolean(),
    observacao: txt(500),
  }),
  nota_zero: z.object({ aplica: z.boolean(), motivo: opt(400) }),
});
export type Analise = z.infer<typeof AnaliseSchema>;

const KINDS = ["erro_objetivo", "problema_construcao", "fragilidade_argumentativa", "oportunidade", "estilistica"] as const;

/** Etapa 4 (e marcações das etapas 3/5/6): apontamentos ancorados em trechos EXATOS do texto. */
export const ApontamentosSchema = z.object({
  apontamentos: z
    .array(
      z.object({
        trecho: txt(300),
        categoria: z.enum(CATEGORIA_IDS),
        tipo: z.enum(KINDS),
        gravidade: z.enum(["leve", "moderada", "grave"]),
        problema: txt(200),
        explicacao: txt(700),
        regra: opt(400),
        sugestao: opt(500),
        exemplo: opt(400),
      }),
    )
    .max(60),
});
export type Apontamentos = z.infer<typeof ApontamentosSchema>;

/** Etapa 7: pontuação por critério. */
export const PontuacaoSchema = z.object({
  criterios: z.array(z.object({ key: txt(60), pontuacao: z.number().min(0), justificativa: txt(900) })).min(1).max(12),
});
export type Pontuacao = z.infer<typeof PontuacaoSchema>;

/** Extração dos critérios do edital/espelho informados pelo aluno. */
export const CriteriosEditalSchema = z.object({
  encontrou: z.boolean(),
  criterios: z.array(z.object({ key: txt(40), label: txt(120), descricao: txt(400), max: z.number().positive().max(1000) })).max(12),
  observacao: opt(400),
});

/** Etapas 9 e 10: diagnóstico final obrigatório e plano de evolução. */
export const DiagnosticoSchema = z.object({
  semProblemasRelevantes: z.boolean(),
  resumo: txt(900),
  fezBem: z.array(txt(400)).max(8),
  fezMal: z.array(txt(400)).max(8),
  precisaMelhorar: z.array(txt(400)).max(8),
  paragrafosMelhorar: z.array(z.object({ paragrafo: z.number().int().min(1), motivo: txt(400) })).max(10),
  frasesReformular: z.array(z.object({ trecho: txt(300), motivo: txt(300), sugestao: txt(400) })).max(8),
  argumentosSuperficiais: z.array(z.object({ trecho: txt(300), motivo: txt(300), comoAprofundar: txt(500) })).max(6),
  errosRecorrentes: z.array(z.object({ categoria: z.enum(CATEGORIA_IDS), descricao: txt(300) })).max(8),
  conteudoEstudar: z.array(txt(160)).max(8),
  proximaRedacao: z.array(txt(300)).max(6),
  prioridade: txt(400),
  ondeMelhorar: z
    .array(z.object({ localizacao: txt(160), problema: txt(300), motivo: txt(400), explicacaoTecnica: txt(600), sugestao: txt(500), exemplo: txt(600) }))
    .max(8),
  naoMudar: z.array(z.object({ trecho: txt(300), motivo: txt(300) })).max(6),
  pontosPositivos: z.array(txt(300)).max(8),
  pontosNegativos: z.array(txt(300)).max(8),
  oportunidades: z.array(txt(300)).max(8),
  plano: z.array(z.object({ prioridade: z.number().int().min(1).max(5), acao: txt(300), porque: txt(300) })).min(1).max(5),
});
export type Diagnostico = z.infer<typeof DiagnosticoSchema>;

/** Tema gerado pela IA (proposta completa; nunca traz a redação pronta). */
export const TemaSchema = z.object({
  titulo: txt(160),
  categoria: txt(60),
  contextualizacao: txt(900),
  problema: txt(700),
  motivadores: z.array(z.object({ texto: txt(1400), referencia: txt(300) })).min(2).max(3),
  comando: txt(700),
  genero: txt(80),
  linhasMin: z.number().int().min(0).max(60).nullish(),
  linhasMax: z.number().int().min(0).max(60).nullish(),
  orientacoes: txt(700),
  fontes: z.array(z.object({ nome: txt(160), url: opt(300), data: opt(40) })).max(6),
});
export type TemaGerado = z.infer<typeof TemaSchema>;

export const ExercicioSchema = z.object({
  explicacao: txt(900),
  questoes: z
    .array(
      z.object({
        id: txt(20),
        enunciado: txt(700),
        tipo: z.enum(["multipla_escolha", "reescrita"]),
        alternativas: z.array(txt(240)).max(5).nullish(),
        // Gabarito fica só no servidor.
        gabarito: txt(600),
        explicacao: txt(700),
      }),
    )
    .min(3)
    .max(8),
});
export type ExercicioGerado = z.infer<typeof ExercicioSchema>;

export const CorrecaoExercicioSchema = z.object({
  itens: z.array(z.object({ id: txt(20), correta: z.boolean(), pontos: z.number().min(0).max(1), comentario: txt(600) })).min(1).max(10),
  resumo: txt(500),
});

export const ComparacaoSchema = z.object({
  resumo: txt(900),
  melhorou: z.array(txt(300)).max(8),
  continuaIgual: z.array(txt(300)).max(8),
  piorou: z.array(txt(300)).max(8),
  proximosPassos: z.array(txt(300)).max(5),
});
export type ComparacaoIA = z.infer<typeof ComparacaoSchema>;
