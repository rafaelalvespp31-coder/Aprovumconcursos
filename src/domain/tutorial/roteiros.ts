/**
 * OPERAÇÃO APROVUM: roteiros do tour guiado e dos tutoriais por ferramenta.
 * Puro e sem DOM. Cada passo descreve só recursos que EXISTEM no app (rotas e elementos reais);
 * se o alvo não estiver na tela, o tour mostra o passo centralizado, sem destaque quebrado.
 * Não há etapa de "Simulados": o app não tem essa função.
 */
import { FREE_LIMITS } from "@/domain/plans/limits";

export type Alvo = string | { sel: string; nota: string };

export interface PassoTutorial {
  id: string;
  /** Título curto, em caixa alta: "PASSO 01 — {titulo}". */
  titulo: string;
  texto: string;
  /** Candidatos, do melhor ao pior; vale o primeiro VISÍVEL. `nota` entra no texto quando o alvo é o substituto (ex.: celular). */
  alvos: Alvo[];
  /** Rota onde o passo acontece (o tour navega até ela antes de mostrar). */
  rota?: string;
  lado?: "top" | "bottom" | "left" | "right";
}

export interface Tutorial {
  id: string;
  titulo: string;
  resumo: string;
  /** Rota recomendada onde o tutorial começa (e onde aparece em "tutoriais desta tela"). */
  rota: string;
  passos: PassoTutorial[];
}

export const TOUR_ID = "tour-completo";

const MENU_LATERAL = ".mt-desk";
const MENU_INFERIOR = '[data-testid="menu-inferior"]';
/** Item do menu: barra lateral no computador, menu inferior no celular (e a Área do Aluno quando o item mora lá). */
const menu = (rota: string, naArea = false): Alvo[] => [
  `${MENU_LATERAL} a[href="${rota}"]`,
  `${MENU_INFERIOR} a[href="${rota}"]`,
  ...(naArea ? [{ sel: `${MENU_INFERIOR} a[href="/area-do-aluno"]`, nota: "No celular, esta opção fica dentro de “Área”, no menu de baixo." } as Alvo] : []),
];


export const TUTORIAIS: Tutorial[] = [
  {
    id: TOUR_ID,
    titulo: "Conheça o APROVUM",
    resumo: "O tour completo pelas principais ferramentas.",
    rota: "/trilhas",
    passos: [
      { id: "estudos", titulo: "ESTUDOS: MATÉRIAS E AULAS", alvos: menu("/trilhas"), lado: "right", texto: "Em Estudos ficam suas matérias e assuntos. Entre numa matéria, escolha o assunto e abra a aula para ler o conteúdo e responder as questões dela." },
      { id: "novo", titulo: "NOVO ESTUDO", alvos: menu("/nova-trilha"), lado: "right", texto: "Quer começar outra matéria ou aula? Em Novo Estudo você escolhe a matéria e a aula no mapa do conhecimento." },
      { id: "mentor", titulo: "MENTOR APROVUM", alvos: ['[data-testid="mentor-bolha"]', '[data-testid="mentor-flutuante"]'], lado: "left", texto: "Este é o Mentor. Toque nele para ver seu plano e suas prioridades, tirar dúvidas e conversar por voz na aba Voz. Você pode arrastá-lo para o lugar que preferir." },
      { id: "lousa", titulo: "LOUSA INTELIGENTE", alvos: ['[data-testid="mentor-bolha"]', '[data-testid="mentor-flutuante"]'], lado: "left", texto: "Na conversa por voz, peça “desenha no quadro” e o Mentor abre a lousa: ele escreve e desenha com uma caneta enquanto explica. Para fechar, é só pedir “fecha a lousa”." },
      { id: "questoes", titulo: "QUESTÕES", alvos: menu("/questoes"), lado: "right", texto: "Em Questões você monta cadernos com os filtros que quiser, resolve, confere a resposta com explicação e acompanha seu desempenho." },
      { id: "jogo", titulo: "MODO JOGO", alvos: menu("/quiz"), lado: "right", texto: `No Modo Jogo você estuda jogando: completa a lei contra o relógio. No plano gratuito são ${FREE_LIMITS.gameQuestionsPerDay} questões por dia; nos pagos, sem limite.` },
      { id: "revisoes", titulo: "REVISÕES", alvos: menu("/revisoes", true), lado: "right", texto: "As revisões trazem de volta, na hora certa, o que você já estudou. As pendentes aparecem aqui; revisar é o que fixa o conteúdo." },
      { id: "concursos", titulo: "CONCURSOS", alvos: menu("/concursos", true), lado: "right", texto: "Aqui estão os concursos cadastrados, com vagas, datas de prova e informações dos editais." },
      { id: "desempenho", titulo: "DESEMPENHO", alvos: menu("/desempenho", true), lado: "right", texto: "Acompanhe suas respostas, seus acertos e sua evolução, e descubra em que assuntos você mais erra." },
      { id: "redacao", titulo: "REDAÇÃO ELITE", alvos: menu("/redacao", true), lado: "right", texto: "Escreva sua redação e receba correção. Aqui você também treina com propostas de tema e exercícios." },
      { id: "perfil", titulo: "PERFIL, NÍVEL E CONQUISTAS", rota: "/perfil", alvos: ['[data-testid="perfil-carteirinha"]', '[data-testid="nivel"]', '[data-testid="perfil-topo"]'], lado: "bottom", texto: "No Perfil ficam seus dados, suas metas, seu nível e suas conquistas. Cada medalha mostra o quanto falta para você ganhá-la." },
      { id: "app-avisos", titulo: "ÍCONE NO CELULAR E AVISOS", rota: "/trilhas", alvos: ['[data-testid="mentor-avisos"]', '[data-testid="mentor-bolha"]', '[data-testid="mentor-flutuante"]'], lado: "left", texto: "Instale o APROVUM como ícone na tela do celular: no Android, Chrome → ⋮ → Instalar app; no iPhone, Safari → Compartilhar → Adicionar à Tela de Início. Depois toque no sininho do Mentor para ativar os avisos: revisões e concursos chegam mesmo com o app fechado." },
      { id: "plano", titulo: "MEU PLANO", alvos: menu("/plano"), lado: "right", texto: "Em Meu Plano você vê o seu plano atual e pode escolher outro para estudar sem os limites diários." },
    ],
  },
  {
    id: "estudos",
    titulo: "Como estudar uma matéria",
    resumo: "Matérias, assuntos e aulas.",
    rota: "/trilhas",
    passos: [
      { id: "geral", titulo: "SEU PROGRESSO", rota: "/trilhas", alvos: ['[data-testid="progresso-geral"]', "#conteudo"], lado: "bottom", texto: "Aqui você vê o quanto já avançou nos seus estudos." },
      { id: "continuar", titulo: "CONTINUAR DE ONDE PAROU", rota: "/trilhas", alvos: ['[data-testid="banner-continuar"]', "#conteudo"], lado: "bottom", texto: "Este destaque leva você direto para a aula que estava estudando." },
      { id: "materias", titulo: "SUAS MATÉRIAS", rota: "/trilhas", alvos: ['[data-testid="seus-estudos"]', "#conteudo"], lado: "top", texto: "Escolha uma matéria, depois o assunto, e abra a aula. Cada aula tem o texto, os exemplos e as questões do assunto." },
    ],
  },
  {
    id: "aula",
    titulo: "Como usar a aula e as ferramentas",
    resumo: "Post-its, explicação por IA, PDF e lousas do Mentor.",
    rota: "/aula",
    passos: [
      { id: "ferramentas", titulo: "BARRA DE FERRAMENTAS", alvos: ['[data-testid="st-dock"]'], lado: "top", texto: "Estas são as ferramentas de estudo da aula: post-its de revisão, explicação do trecho selecionado por IA, o seu PDF de revisão e as lousas que o Mentor desenhou." },
    ],
  },
  {
    id: "mentor",
    titulo: "Como usar o Mentor e a lousa",
    resumo: "Dúvidas, voz e explicações no quadro.",
    rota: "/trilhas",
    passos: [
      { id: "bolha", titulo: "ABRA O MENTOR", rota: "/trilhas", alvos: ['[data-testid="mentor-bolha"]', '[data-testid="mentor-flutuante"]'], lado: "left", texto: "Toque no Mentor para abrir. Ele mostra seu plano e suas prioridades de estudo." },
      { id: "voz", titulo: "CONVERSE POR VOZ", rota: "/trilhas", alvos: ['[data-testid="mentor-bolha"]', '[data-testid="mentor-flutuante"]'], lado: "left", texto: "Na aba Voz você conversa com o Mentor falando. Pergunte o que quiser sobre a matéria que está estudando." },
      { id: "lousa", titulo: "PEÇA O QUADRO", rota: "/trilhas", alvos: ['[data-testid="mentor-bolha"]', '[data-testid="mentor-flutuante"]'], lado: "left", texto: "Peça “mostra no quadro” e ele escreve e desenha enquanto explica. Diga “fecha a lousa” para fechar. Se não entender, peça para explicar de outro jeito." },
    ],
  },
  {
    id: "app-avisos",
    titulo: "Instale o app e ative os avisos",
    resumo: "Ícone na tela do celular (Android e iPhone) e notificações.",
    rota: "/trilhas",
    passos: [
      { id: "android", titulo: "ANDROID: INSTALE O APP", rota: "/trilhas", alvos: ['[data-testid="mentor-avisos"]', '[data-testid="mentor-bolha"]', '[data-testid="mentor-flutuante"]'], lado: "left", texto: "No Android, abra o APROVUM no Chrome, toque nos três pontinhos (⋮) e em “Instalar app” (ou “Adicionar à tela inicial”). O ícone da APROVUM aparece na tela do celular." },
      { id: "ios", titulo: "IPHONE: ADICIONE À TELA DE INÍCIO", rota: "/trilhas", alvos: ['[data-testid="mentor-avisos"]', '[data-testid="mentor-bolha"]', '[data-testid="mentor-flutuante"]'], lado: "left", texto: "No iPhone, abra o APROVUM no Safari, toque em Compartilhar (o quadrado com a seta) e em “Adicionar à Tela de Início”. Depois abra o app pelo ícone novo. Exige iOS 16.4 ou mais novo." },
      { id: "sino", titulo: "ATIVE O SININHO DO MENTOR", rota: "/trilhas", alvos: ['[data-testid="mentor-avisos"]', '[data-testid="mentor-bolha"]', '[data-testid="mentor-flutuante"]'], lado: "left", texto: "Abra o Mentor e toque no sininho do topo. Permita os avisos quando o celular perguntar. Pronto: lembretes de revisão e concursos abertos chegam mesmo com o app fechado." },
    ],
  },
  {
    id: "questoes",
    titulo: "Como resolver questões",
    resumo: "Cadernos, filtros e correção.",
    rota: "/questoes",
    passos: [
      { id: "home", titulo: "QUESTÕES", rota: "/questoes", alvos: ['[data-testid="questoes-home"]', "#conteudo"], lado: "bottom", texto: "Aqui você organiza e resolve suas questões." },
      { id: "cadernos", titulo: "SEUS CADERNOS", rota: "/questoes", alvos: ['[data-testid="cadernos-card"]', '[data-testid="questoes-home"]', "#conteudo"], lado: "top", texto: "Crie um caderno escolhendo os filtros, resolva e continue de onde parou. Ao responder, você confere o gabarito com a explicação." },
    ],
  },
  {
    id: "jogo",
    titulo: "Como jogar o Modo Jogo",
    resumo: "Estude jogando.",
    rota: "/quiz",
    passos: [
      { id: "jogo", titulo: "MODO JOGO", rota: "/quiz", alvos: ['[data-testid="jogo-banner"]', '[data-testid="cota-jogo"]', "#conteudo"], lado: "bottom", texto: `Complete a lei contra o relógio e evolua jogando. No plano gratuito são ${FREE_LIMITS.gameQuestionsPerDay} questões por dia; nos pagos, sem limite.` },
    ],
  },
  {
    id: "revisoes",
    titulo: "Como usar as revisões",
    resumo: "Revisão espaçada do que você já estudou.",
    rota: "/revisoes",
    passos: [
      { id: "revisoes", titulo: "REVISÕES", rota: "/revisoes", alvos: ["#conteudo"], lado: "top", texto: "Aqui estão as revisões pendentes. Revisar na hora certa fixa o que você já estudou." },
    ],
  },
  {
    id: "desempenho",
    titulo: "Como ler seu desempenho",
    resumo: "Acertos, evolução e dificuldades.",
    rota: "/desempenho",
    passos: [
      { id: "desempenho", titulo: "DESEMPENHO", rota: "/desempenho", alvos: ["#conteudo"], lado: "top", texto: "Aqui você acompanha suas respostas, seus acertos e sua evolução, para descobrir onde precisa reforçar." },
    ],
  },
  {
    id: "concursos",
    titulo: "Concursos e editais",
    resumo: "Concursos, vagas e o edital do seu concurso.",
    rota: "/concursos",
    passos: [
      { id: "lista", titulo: "CONCURSOS", rota: "/concursos", alvos: ['[data-testid="concursos-lista"]', '[data-testid="mapa-brasil"]', "#conteudo"], lado: "top", texto: "Veja os concursos cadastrados, as vagas e as datas de prova." },
    ],
  },
  {
    id: "perfil",
    titulo: "Perfil, nível e conquistas",
    resumo: "Seus dados, metas e medalhas.",
    rota: "/perfil",
    passos: [
      { id: "perfil", titulo: "SEU PERFIL", rota: "/perfil", alvos: ['[data-testid="perfil-carteirinha"]', '[data-testid="perfil-topo"]', "#conteudo"], lado: "bottom", texto: "Aqui ficam seus dados, suas metas e o seu nível." },
      { id: "conquistas", titulo: "CONQUISTAS", rota: "/perfil", alvos: ['[data-testid="nivel"]', '[data-testid="perfil-nivel"]', "#conteudo"], lado: "bottom", texto: "Cada medalha mostra o quanto falta para você ganhá-la. Estude, responda e suba de nível." },
    ],
  },
];

export const TUTORIAL_IDS = TUTORIAIS.map((t) => t.id);
export const tutorialPorId = (id: string): Tutorial | undefined => TUTORIAIS.find((t) => t.id === id);

/** "Passo 03 de 14" com zeros à esquerda. */
export const rotuloPasso = (i: number, total: number): string => `PASSO ${String(i + 1).padStart(2, "0")} DE ${String(total).padStart(2, "0")}`;

/** Agrupa passos consecutivos da mesma rota: cada grupo vira uma sessão do Driver.js (navega entre grupos). */
export function segmentos(passos: PassoTutorial[], rotaInicial: string): Array<{ rota: string; de: number; ate: number }> {
  const out: Array<{ rota: string; de: number; ate: number }> = [];
  let rota = rotaInicial;
  passos.forEach((p, i) => {
    if (p.rota) rota = p.rota;
    const ult = out[out.length - 1];
    if (ult && ult.rota === rota) ult.ate = i;
    else out.push({ rota, de: i, ate: i });
  });
  return out;
}

/** O passo pode abrir o tutorial agora (progresso salvo fora do limite volta ao começo). */
export const passoValido = (t: Tutorial, i: number): number => (Number.isInteger(i) && i >= 0 && i < t.passos.length ? i : 0);
