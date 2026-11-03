/** Artes fixas dos aprovados (equipe APROVUM) — usadas no servidor e no carrossel. */
export interface ApprovalBanner {
  src: string;
  srcSm: string;
  /** Texto alternativo: o que a arte diz (nome do aluno e onde foi aprovado). */
  alt: string;
}

/** Banners de aprovação de alunos (artes fornecidas pela equipe APROVUM). */
export const APPROVAL_BANNERS: ApprovalBanner[] = [
  {
    src: "/images/aprovados/william-abreu.webp",
    srcSm: "/images/aprovados/william-abreu-sm.webp",
    alt: "Nosso aluno aprovado William Abreu. Aprovado em: GCM BH (Guarda Civil Municipal), PMPA (Polícia Militar do Pará), Socioeducativo MG, Polícia Penal MG, STM (Superior Tribunal Militar), TRT10 e TRF6. Disciplina + foco + resultado.",
  },
  {
    src: "/images/aprovados/fabio-bezerra.webp",
    srcSm: "/images/aprovados/fabio-bezerra-sm.webp",
    alt: "Nosso aluno aprovado Fábio Bezerra. Aprovado em: Polícia Penal MG, Polícia Militar RJ e Guarda Municipal de Nova Iguaçu. Disciplina + foco + resultado.",
  },
  {
    src: "/images/aprovados/rafael-alves.webp",
    srcSm: "/images/aprovados/rafael-alves-sm.webp",
    alt: "Nosso aluno aprovado Rafael Alves. Aprovado em: GCM São Gonçalo (RJ), Polícia Militar RJ e Polícia Penal MG. Disciplina + foco + resultado.",
  },
  {
    src: "/images/aprovados/sd-lacerda.webp",
    srcSm: "/images/aprovados/sd-lacerda-sm.webp",
    alt: "Nosso aluno aprovado Sd Lacerda, PM DF. Aprovado em: Polícia Militar do Distrito Federal. Sonhe, planeje, conquiste.",
  },
];
