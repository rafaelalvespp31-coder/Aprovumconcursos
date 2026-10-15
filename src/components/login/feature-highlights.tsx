import { ChartColumnIncreasing, Crosshair, Trophy } from "lucide-react";

function ShieldStar({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      <path d="M12 2.5 4.5 5.5v6c0 4.6 3.1 8.4 7.5 10 4.4-1.6 7.5-5.4 7.5-10v-6L12 2.5Z" />
      <path d="m12 8 1.2 2.5 2.7.3-2 1.9.5 2.7L12 14.1l-2.4 1.3.5-2.7-2-1.9 2.7-.3L12 8Z" fill="currentColor" stroke="none" />
    </svg>
  );
}

const ITEMS = [
  { icon: ShieldStar, title: ["Concursos", "públicos"], text: ["Polícia • segurança", "defesa • administração"] },
  { icon: Crosshair, title: ["Estudo inteligente", "com IA"], text: ["Conteúdo atualizado", "e estratégico"] },
  { icon: ChartColumnIncreasing, title: ["Evolução", "contínua"], text: ["Do zero ao", "cargo dos sonhos"] },
  { icon: Trophy, title: ["Elite", "prepara"], text: ["Disciplina • foco", "resultado"] },
];

/** Os quatro pilares da plataforma (linha no desktop, grade 2 × 2 no celular). */
export function FeatureHighlights() {
  return (
    <ul className="login-pilares" aria-label="Pilares da plataforma">
      {ITEMS.map(({ icon: Icon, title, text }) => (
        <li key={title.join(" ")}>
          <Icon className="login-pilar-icone" strokeWidth={1.5} />
          <p className="login-pilar-titulo">
            {title[0]}
            <br />
            {title[1]}
          </p>
          <p className="login-pilar-texto">
            {text[0]}
            <br />
            {text[1]}
          </p>
        </li>
      ))}
    </ul>
  );
}
