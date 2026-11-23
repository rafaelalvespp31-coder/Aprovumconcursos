/**
 * Mentor por voz que abre o app: entende, pelo que o aluno FALOU (transcrição), se ele pediu para abrir um menu,
 * uma página, um concurso ou uma aula. Só regras puras: quem navega é a tela e quem acha a aula é o servidor.
 * O modelo de voz não recebe funções (isso já deixou o Mentor mudo); ele só confirma em uma frase e o app abre.
 */

export const normalizar = (s: string): string =>
  s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();

export type PaginaId =
  | "inicio" | "plano_estudo" | "assinatura" | "desempenho" | "questoes" | "revisoes" | "redacao" | "modo_jogo"
  | "meus_editais" | "meus_estudos" | "novo_estudo" | "perfil" | "area_aluno" | "depoimentos" | "mentor";

export const PAGINAS: ReadonlyArray<{ id: PaginaId; rota: string; rotulo: string; termos: readonly string[] }> = [
  { id: "inicio", rota: "/painel", rotulo: "a tela inicial", termos: ["tela inicial", "pagina inicial", "pagina principal", "inicio", "home"] },
  { id: "plano_estudo", rota: "/meu-plano-de-estudo", rotulo: "o seu plano de estudo", termos: ["plano de estudo", "plano de estudos", "cronograma", "minha rotina de estudo"] },
  { id: "assinatura", rota: "/plano", rotulo: "o seu plano e assinatura", termos: ["meu plano", "assinatura", "meus planos", "pagamento", "planos pagos"] },
  { id: "desempenho", rota: "/desempenho", rotulo: "o seu desempenho", termos: ["desempenho", "estatisticas", "meu progresso", "meus resultados"] },
  { id: "questoes", rota: "/questoes", rotulo: "os cadernos de questões", termos: ["caderno de questoes", "cadernos de questoes", "questoes", "banco de questoes"] },
  { id: "revisoes", rota: "/revisoes", rotulo: "as revisões", termos: ["revisoes", "revisao", "revisar"] },
  { id: "redacao", rota: "/redacao", rotulo: "a redação", termos: ["redacao"] },
  { id: "modo_jogo", rota: "/quiz", rotulo: "o modo jogo", termos: ["modo jogo", "quiz", "jogo"] },
  { id: "meus_editais", rota: "/meu-concurso", rotulo: "os seus editais", termos: ["meus editais", "meu edital", "anexar edital", "meu concurso"] },
  { id: "meus_estudos", rota: "/trilhas", rotulo: "os seus estudos", termos: ["meus estudos", "minhas trilhas", "minhas aulas", "trilhas", "minhas trilhas de estudo"] },
  { id: "novo_estudo", rota: "/nova-trilha", rotulo: "o novo estudo", termos: ["novo estudo", "nova trilha", "mapa do conhecimento"] },
  { id: "perfil", rota: "/perfil", rotulo: "o seu perfil", termos: ["perfil", "configuracoes", "minha conta"] },
  { id: "area_aluno", rota: "/area-do-aluno", rotulo: "a área do aluno", termos: ["area do aluno"] },
  { id: "depoimentos", rota: "/depoimentos", rotulo: "os depoimentos", termos: ["depoimentos"] },
  { id: "mentor", rota: "/mentor", rotulo: "a página do Mentor", termos: ["pagina do mentor", "chat do mentor", "conversa com o mentor por texto"] },
];

export type Comando =
  | { tipo: "menu"; alvo: "concursos" | "materias" }
  | { tipo: "pagina"; id: PaginaId; rota: string; rotulo: string }
  | { tipo: "aula"; consulta: string }
  | { tipo: "concurso"; consulta: string; abrir: boolean };

/** Palavras que não ajudam a achar o assunto. */
const VAZIAS = new Set(["a", "o", "as", "os", "um", "uma", "de", "do", "da", "dos", "das", "em", "no", "na", "nos", "nas", "pra", "para", "pro", "por", "pela", "pelo", "com", "sobre", "e", "que", "aula", "aulas", "assunto", "materia", "tema", "topico", "conteudo", "me", "ai", "agora", "favor", "mim", "ja", "so", "la", "ver", "estudar", "comecar", "iniciar", "abrir", "quero", "pode", "vamos", "vou", "gostaria", "sobre", "capitulo", "parte"]);

export const palavrasDaConsulta = (s: string): string[] => normalizar(s).split(" ").filter((p) => p.length > 1 && !VAZIAS.has(p));

/** Corta o que sobra no fim do pedido ("por favor", "agora", "pra mim"). */
function limparFim(s: string): string {
  return s.replace(/\b(por favor|pra mim|para mim|agora|ai|ja|rapidinho|ok|valeu|obrigado|ta bom|tudo bem)\b.*$/, "").trim();
}

const VERBO_ABRIR = /\b(abr(?:e|a|ir|indo|o)|abre|acess(?:a|ar|e)|entr(?:a|ar|e) (?:na|no|nas|nos|em)|mostr(?:a|ar|e)|(?:vai|va|ir|vamos|leva|levar|me leva|me levar|bora)(?: ate| para| pra| pro| ao| a| na| no)|quero (?:ver|ir|abrir|acessar|entrar|a |o )|pode (?:abrir|me levar|mostrar|ir)|me (?:leva|mostra)|coloca|poe)\b/;
const VERBO_INICIAR = /\b(comec(?:a|ar|e|o|emos)|inici(?:a|ar|e|o|emos)|quero (?:estudar|comecar|iniciar|fazer|ver)|vamos (?:estudar|comecar|iniciar|ver|fazer)|bora (?:estudar|comecar)|estudar|pode (?:comecar|iniciar|dar inicio)|da inicio|dar inicio|me ensina|abr(?:e|a|ir))\b/;

function restoDepois(t: string, re: RegExp): string {
  const m = re.exec(t);
  return m ? limparFim(t.slice(m.index + m[0].length).trim()) : "";
}

/**
 * Lê o que o aluno falou e devolve o comando (ou null se for conversa normal). `ctx.perguntouConcurso` / `perguntouAula`
 * dizem que a última fala do Mentor perguntou qual concurso/aula: aí uma resposta curta, só com o nome, já vale.
 */
export function interpretarComando(fala: string, ctx: { perguntouConcurso?: boolean; perguntouAula?: boolean } = {}): Comando | null {
  const t = normalizar(fala);
  if (!t || t.length > 160) return null;
  const palavras = t.split(" ");
  const pergunta = /\b(o que|que e|qual e|quais|como|porque|por que|quando|onde|quanto|me explica|explica)\b/.test(t) && !/\b(abre|abrir|abra|mostra|mostrar|comecar|iniciar)\b/.test(t);

  const abrir = VERBO_ABRIR.test(t);
  const iniciar = VERBO_INICIAR.test(t);

  if (abrir || iniciar) {
    // 1) aula: "abre a aula de MMC", "começar pela aula de crase", "quero estudar regra de três"
    const aula = /\baulas?\b(?: (?:de|do|da|sobre|dos|das|em|pela|pelo))? ?/;
    if (aula.test(t)) {
      const c = restoDepois(t, aula);
      if (palavrasDaConsulta(c).length) return { tipo: "aula", consulta: c };
      return null; // "abre uma aula" sem dizer qual: o Mentor pergunta
    }
    // 2) concurso: "abre o concurso da PRF", "quero estudar para o concurso X"
    const conc = /\bconcurso\b(?: (?:de|do|da|dos|das|para|pra|pro|pelo|pela))? ?/;
    if (conc.test(t) && !/\bconcursos\b/.test(t)) {
      const c = restoDepois(t, conc);
      if (palavrasDaConsulta(c).length) return { tipo: "concurso", consulta: c, abrir: /\b(abr|mostr|acess|entr|ver)/.test(t) };
    }
    // 3) páginas (o termo mais longo vence: "plano de estudo" antes de "meu plano")
    let melhor: { p: (typeof PAGINAS)[number]; n: number } | null = null;
    for (const p of PAGINAS) for (const termo of p.termos) {
      if (new RegExp(`\\b${termo}\\b`).test(t) && (!melhor || termo.length > melhor.n)) melhor = { p, n: termo.length };
    }
    if (melhor && abrir) return { tipo: "pagina", id: melhor.p.id, rota: melhor.p.rota, rotulo: melhor.p.rotulo };
    // 4) menus da tela inicial
    if (/\b(concursos)\b/.test(t) && abrir) return { tipo: "menu", alvo: "concursos" };
    if (/\b(materias|materia)\b/.test(t) && abrir && !/\bestudar\b/.test(t)) return { tipo: "menu", alvo: "materias" };
    // 5) "quero estudar/começar X": X é o assunto da aula
    const est = /\b(?:estudar|comecar|iniciar|inicio|ver|fazer)\b(?: (?:por|pela|pelo|com|a|o|as|os|de|do|da|sobre)\b)* ?/;
    if (iniciar && est.test(t)) {
      const c = restoDepois(t, est);
      if (palavrasDaConsulta(c).length && !/^(concurso|concursos|materias?)\b/.test(c)) {
        // "quero estudar para a PRF": o aluno falou de concurso, não de aula; o Mentor segue a conversa
        return { tipo: "aula", consulta: c };
      }
    }
    return null;
  }

  // resposta curta, só com o nome, à pergunta do Mentor ("PRF", "MMC")
  if (!pergunta && palavras.length <= 5) {
    if (ctx.perguntouAula && palavrasDaConsulta(t).length) return { tipo: "aula", consulta: t };
    if (ctx.perguntouConcurso && palavrasDaConsulta(t).length) return { tipo: "concurso", consulta: t, abrir: false };
  }
  return null;
}

/** A última fala do Mentor perguntou qual concurso / qual aula? */
export function perguntaDoMentor(fala: string): { concurso: boolean; aula: boolean } {
  const t = normalizar(fala);
  return { concurso: /\b(qual|que) concurso\b/.test(t), aula: /\b(qual|que) aula\b|\bcomecar (?:por|pela)\b/.test(t) };
}

// ---------------------------------------------------------------------------
// Achar a aula pelo título
// ---------------------------------------------------------------------------

const raiz = (p: string) => (p.length > 4 ? p.replace(/(s|es|oes|aes|ais)$/, "") : p);

/** 0 a 1: quanto do que o aluno pediu aparece no título (tolera plural e acento). */
export function pontuarTitulo(consulta: string, titulo: string): number {
  const q = palavrasDaConsulta(consulta);
  if (!q.length) return 0;
  const tit = normalizar(titulo);
  const tp = tit.split(" ").map(raiz);
  const achou = q.filter((p) => {
    const r = raiz(p);
    return tp.some((x) => x === r || (r.length >= 4 && (x.startsWith(r) || r.startsWith(x) && x.length >= 4)));
  }).length;
  let s = achou / q.length;
  if (s > 0 && tit.includes(normalizar(consulta))) s = Math.min(1, s + 0.1);
  // título mais curto e exato ganha do que só contém o termo no meio de um texto longo
  return s - Math.min(0.15, Math.max(0, tp.length - q.length) * 0.012);
}

export interface Candidato { id: string; titulo: string; origem: "aluno" | "catalogo" }

export type Achado =
  | { tipo: "nenhum" }
  | { tipo: "um"; escolhido: Candidato }
  | { tipo: "varios"; opcoes: Candidato[] };

/**
 * Escolhe a aula: precisa cobrir pelo menos 2/3 do que o aluno pediu. Se duas aulas diferentes empatam de perto,
 * devolve as opções (o Mentor pergunta qual). A aula que o aluno já tem vence a do catálogo de mesmo título.
 */
export function acharAula(consulta: string, candidatos: readonly Candidato[]): Achado {
  const pontuados = candidatos
    .map((c) => ({ c, s: pontuarTitulo(consulta, c.titulo) }))
    .filter((x) => x.s >= 0.66)
    .sort((a, b) => b.s - a.s || (a.c.origem === "aluno" ? -1 : 1) - (b.c.origem === "aluno" ? -1 : 1) || a.c.titulo.length - b.c.titulo.length);
  if (!pontuados.length) return { tipo: "nenhum" };
  const topo = pontuados[0]!;
  // pedido de uma palavra só ('administrativo') bate em muitas aulas: pergunta qual; com mais palavras o título mais exato vence
  const folga = palavrasDaConsulta(consulta).length <= 1 ? 0.06 : 0.02;
  const perto = pontuados.filter((x) => topo.s - x.s < folga);
  const titulosDistintos = new Set(perto.map((x) => normalizar(x.c.titulo)));
  // com a pergunta toda coberta e um título só (ou o do aluno e o do catálogo iguais), não precisa perguntar
  if (titulosDistintos.size > 1 && normalizar(topo.c.titulo) !== normalizar(consulta)) return { tipo: "varios", opcoes: [...new Map(perto.map((x) => [normalizar(x.c.titulo), x.c])).values()].slice(0, 4) };
  return { tipo: "um", escolhido: topo.c };
}

/**
 * Rede de segurança: se a transcrição do que o aluno falou falhar, a primeira frase do próprio Mentor ("Já abro a aula de
 * MMC.", "Abrindo as matérias.") também vale como comando. Ofertas ("posso abrir", "quer que eu abra") não valem.
 */
export function comandoDaFalaDoMentor(fala: string): Comando | null {
  const frase = fala.split(/[.!?\n]/).map((x) => x.trim()).find((x) => x.length > 0) ?? "";
  const t = normalizar(frase);
  if (!/^(?:(?:ja|vou|entao|claro|certo|beleza|ok|pronto|perfeito|show|tranquilo|bora)\s+)*(?:abrindo|abro|vou abrir|vou abrir ja|abrindo ja|iniciando|vou iniciar|inicio)\b/.test(t)) return null;
  if (/\b(posso|quer|quiser|gostaria|talvez|se voce|que eu|caso)\b/.test(t)) return null;
  const c = interpretarComando(t.replace(/^(?:(?:ja|vou|entao|claro|certo|beleza|ok|pronto|perfeito|show|tranquilo|bora)\s+)*(?:vou\s+)?(?:abrindo|abro|abrir|iniciando|inicio|iniciar)\b(?: ja)?/, "abre"));
  return c;
}
