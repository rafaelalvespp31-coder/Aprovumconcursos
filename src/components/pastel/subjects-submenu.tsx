"use client";

import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { useStored } from "@/components/use-stored";
import type { StudyStatus, SubjectMenuItem } from "@/domain/studies/subjects-menu";

const STATUS_LABEL: Record<StudyStatus, string> = { concluido: "concluído", andamento: "em andamento", nao_iniciado: "não iniciado" };

/**
 * Submenu de "Estudos": as matérias que o aluno estuda; tocar numa matéria abre os
 * assuntos (estudos) dela. Usado na barra lateral (desktop) e no menu do celular.
 */
export function SubjectsSubmenu({
  subjects,
  base,
  path,
  onNavigate,
  variant = "lateral",
}: {
  subjects: SubjectMenuItem[];
  base: string;
  path: string;
  onNavigate?: () => void;
  variant?: "lateral" | "menu";
}) {
  const [open, setOpen] = useStored<string[]>("na:menu-materias", []);
  if (!subjects.length) return null;
  // A galeria tem uma única página de estudo de exemplo.
  const studyHref = (id: string) => (base ? `${base}/trilha` : `/trilhas/${id}`);
  const toggle = (name: string) => setOpen(open.includes(name) ? open.filter((n) => n !== name) : [...open, name]);
  return (
    <ul className={`sub-materias sub-materias-${variant}`} aria-label="Matérias que você estuda" data-testid={`submenu-materias-${variant}`}>
      {subjects.map((m) => {
        const isOpen = open.includes(m.name) || m.studies.some((s) => path === `/trilhas/${s.id}`);
        return (
          <li key={m.name}>
            <button type="button" className="sub-materia" aria-expanded={isOpen} onClick={() => toggle(m.name)}>
              <span className="sub-materia-ponto" aria-hidden />
              <span className="sub-materia-nome">{m.name}</span>
              <span className="sub-materia-qtd">{m.studies.length}</span>
              <ChevronDown className={`size-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {isOpen && (
              <ul className="sub-assuntos">
                {m.studies.map((s) => (
                  <li key={s.id}>
                    <Link href={studyHref(s.id)} onClick={onNavigate} aria-current={path === `/trilhas/${s.id}` ? "page" : undefined} data-status={s.status}>
                      <span className="sub-assunto-status" aria-hidden />
                      <span className="sub-assunto-titulo">{s.title}</span>
                      <span className="sr-only"> — {STATUS_LABEL[s.status]}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
