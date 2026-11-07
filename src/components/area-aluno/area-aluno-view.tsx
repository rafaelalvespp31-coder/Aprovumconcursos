import Link from "next/link";
import { BrainCircuit, ChartColumn, Clock3, Landmark, Settings, Video, type LucideIcon } from "lucide-react";

const ITEMS: Array<{ id: string; path: string; label: string; desc: string; icon: LucideIcon }> = [
  { id: "revisoes", path: "/revisoes", label: "Revisões", desc: "Fixe o que já estudou", icon: Clock3 },
  { id: "desempenho", path: "/desempenho", label: "Desempenho", desc: "Acompanhe seu progresso", icon: ChartColumn },
  { id: "aprovum-ai", path: "/aprovum-ai", label: "APROVUM AI", desc: "Transforme seu edital em preparação", icon: BrainCircuit },
  { id: "concursos", path: "/concursos", label: "Concursos", desc: "Editais, vagas e datas de prova", icon: Landmark },
  { id: "depoimentos", path: "/depoimentos", label: "Depoimentos", desc: "Histórias de alunos aprovados", icon: Video },
  { id: "perfil", path: "/perfil", label: "Perfil", desc: "Seus dados e metas", icon: Settings },
];

/** Área do Aluno (celular): os menus do computador que não cabem no menu inferior. */
export function AreaAlunoView({ base = "" }: { base?: string }) {
  return (
    <nav aria-label="Área do Aluno" className="area" data-testid="area-aluno">
      <p className="area-intro">Tudo do seu menu lateral do computador, num só lugar.</p>
      <ul className="area-grade">
        {ITEMS.map((it) => (
          <li key={it.id}>
            <Link href={`${base}${it.path}`} className="area-card" data-testid={`area-${it.id}`}>
              <span className="area-ico" aria-hidden><it.icon className="size-6" /></span>
              <span className="area-txt">
                <b>{it.label}</b>
                <small>{it.desc}</small>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
