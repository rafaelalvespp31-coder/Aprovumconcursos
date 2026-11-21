/** Mapa do painel da equipe: o mesmo cadastro alimenta o menu lateral e os cartões da página inicial. */
export interface NavBadges { planos: number; equipe: number; avatares: number; raiox: number; pagamentos: number; feedbacks: number; indicacoes: number; parceiros: number }
export const EMPTY_BADGES: NavBadges = { planos: 0, equipe: 0, avatares: 0, raiox: 0, pagamentos: 0, feedbacks: 0, indicacoes: 0, parceiros: 0 };
/** Áreas sem fila própria: abrir a tela zera o aviso de novidades. */
export const SEEN_KEYS: ReadonlyArray<keyof NavBadges> = ["pagamentos", "feedbacks", "parceiros"];
export interface NavItem { href: string; label: string; desc: string; icon: string; badge?: keyof NavBadges }
export interface NavGroup { id: string; title: string; icon: string; items: NavItem[] }

export const NAV_GROUPS: NavGroup[] = [
  {
    id: "conteudo", title: "Conteúdo", icon: "M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2V5zM8 3v18",
    items: [
      { href: "/admin/catalogo", label: "Catálogo", desc: "Aulas e temas revisados", icon: "M4 5a2 2 0 012-2h12v18H6a2 2 0 01-2-2V5zM8 3v18" },
      { href: "/admin/catalogo/enviar", label: "Catalogar aula", desc: "Enviar e organizar novas aulas", icon: "M12 16V4m0 0l-4 4m4-4l4 4M4 20h16" },
      { href: "/admin/catalogo/plano", label: "Plano de tópicos", desc: "Estrutura de matérias e tópicos", icon: "M8 6h12M8 12h12M8 18h12M4 6h.01M4 12h.01M4 18h.01" },
      { href: "/admin/legislacao", label: "Legislação", desc: "Leis e artigos do catálogo", icon: "M12 3v18M5 7h14M5 7l-3 7a3 3 0 006 0L5 7zm14 0l-3 7a3 3 0 006 0l-3-7z" },
      { href: "/admin/editais", label: "Editais", desc: "Editais cadastrados", icon: "M7 3h8l4 4v14H7V3zm8 0v4h4M10 12h6M10 16h6" },
      { href: "/admin/concursos", label: "Concursos", desc: "Concursos e cargos", icon: "M12 21a9 9 0 100-18 9 9 0 000 18zM12 16a4 4 0 100-8 4 4 0 000 8zM12 12h.01" },
      { href: "/banco", label: "Banco de questões", desc: "Importar e revisar questões", icon: "M12 21a9 9 0 100-18 9 9 0 000 18zM9.5 9.5a2.5 2.5 0 115 .5c0 1.5-2.5 2-2.5 3.5M12 17h.01" },
      { href: "/admin/redacao", label: "Redação", desc: "Temas e correções", icon: "M4 20h4L19 9l-4-4L4 16v4zM13 7l4 4" },
      { href: "/admin/tutoriais", label: "Tutoriais", desc: "Tutoriais da plataforma", icon: "M5 4l14 8-14 8V4z" },
    ],
  },
  {
    id: "ia", title: "Inteligência artificial", icon: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5",
    items: [
      { href: "/admin/fila", label: "Fila da IA", desc: "Gerações em andamento", icon: "M12 3l9 5-9 5-9-5 9-5zM3 13l9 5 9-5" },
      { href: "/admin/estrategico", label: "Estratégico", desc: "Raio-X e provas por concurso", icon: "M5 21V4m0 0h11l-2 4 2 4H5", badge: "raiox" },
    ],
  },
  {
    id: "alunos", title: "Alunos e comunidade", icon: "M16 20v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7z",
    items: [
      { href: "/admin/alunos", label: "Alunos", desc: "Contas, planos e pedidos", icon: "M16 20v-1a4 4 0 00-4-4H8a4 4 0 00-4 4v1M10 11a3.5 3.5 0 100-7 3.5 3.5 0 000 7zM20 20v-1a3 3 0 00-2-2.8M16 4.3a3.5 3.5 0 010 6.4", badge: "planos" },
      { href: "/admin/alunos#mensagens", label: "Mensagens", desc: "Dúvidas dos alunos para a Equipe", icon: "M4 5h16v11H9l-5 4V5zM8 9h8M8 12h5", badge: "equipe" },
      { href: "/admin/avatares", label: "Avatares", desc: "Avatares personalizados", icon: "M12 21a9 9 0 100-18 9 9 0 000 18zM8.5 14a4.5 4.5 0 007 0M9 9.5h.01M15 9.5h.01", badge: "avatares" },
      { href: "/admin/feedbacks", label: "Feedbacks", desc: "Retornos dos alunos", icon: "M4 5h16v11H9l-5 4V5z", badge: "feedbacks" },
      { href: "/admin/depoimentos", label: "Depoimentos", desc: "Depoimentos do site", icon: "M7 17h3l2-4V7H6v6h3M15 17h3l2-4V7h-6v6h3" },
      { href: "/admin/aprovados", label: "Aprovados", desc: "Galeria de aprovados", icon: "M8 21h8M12 17v4M7 4h10v5a5 5 0 01-10 0V4zM17 5h3v2a3 3 0 01-3 3M7 5H4v2a3 3 0 003 3" },
    ],
  },
  {
    id: "vendas", title: "Vendas e crescimento", icon: "M3 17l6-6 4 4 8-8M15 7h6v6",
    items: [
      { href: "/admin/pagamentos", label: "Pagamentos", desc: "Cobranças do Mercado Pago", icon: "M3 6h18v12H3V6zM3 10h18", badge: "pagamentos" },
      { href: "/admin/parceiros", label: "Parceiros", desc: "Cupons, links e vendas", icon: "M10 14a4 4 0 005.7 0l3-3a4 4 0 00-5.7-5.7l-1 1M14 10a4 4 0 00-5.7 0l-3 3a4 4 0 005.7 5.7l1-1", badge: "parceiros" },
      { href: "/admin/indicacoes", label: "Indicações", desc: "Indicações entre alunos", icon: "M4 11h16v10H4V11zM3 7h18v4H3V7zM12 7v14", badge: "indicacoes" },
      { href: "/admin/campanha-caveira", label: "Campanha Caveira", desc: "Campanha promocional", icon: "M12 3c1 4 5 5 5 10a5 5 0 01-10 0c0-2 1-3 2-4 0 2 1 3 2 3 0-3-1-5 1-9z" },
      { href: "/admin/catalogo/banners", label: "Banners", desc: "Banners do app", icon: "M4 5h16v14H4V5zM4 15l5-5 4 4 3-3 4 4M9 9h.01" },
      { href: "/admin/avisos-push", label: "Avisos no celular", desc: "Notificações push", icon: "M6 9a6 6 0 1112 0c0 6 2 7 2 7H4s2-1 2-7zM10 20a2 2 0 004 0" },
    ],
  },
  {
    id: "equipe", title: "Equipe", icon: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z",
    items: [{ href: "/admin/socio", label: "Sócio admin", desc: "Contas e permissões de sócios", icon: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z" }],
  },
];
