"use client";

import Link from "next/link";
import { BookOpen, Brain, Calculator, ChevronDown, Cog, Landmark, Languages, Monitor, Scale, Shield, type LucideIcon } from "lucide-react";
import { useStored } from "@/components/use-stored";
import type { StudyStatus, SubjectMenuItem } from "@/domain/studies/subjects-menu";

const sem = (t: string) => t.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
/** Ícone da matéria pelo nome (padrão: livro). */
function iconeDa(nome: string): LucideIcon {
  const n = sem(nome);
  if (/matematica|financeir|estatistic/.test(n)) return Calculator;
  if (/raciocinio|logic/.test(n)) return Brain;
  if (/portugu|ingles|espanhol|redacao/.test(n)) return Languages;
  if (/informatica|tecnologia/.test(n)) return Monitor;
  if (/process/.test(n)) return Cog;
  if (/constitucional|administrativ/.test(n)) return Landmark;
  if (/penal|direito|legisla|lei/.test(n)) return Scale;
  if (/seguranca|polici|execucao/.test(n)) return Shield;
  return BookOpen;
}

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
  const estudo = (s: SubjectMenuItem["studies"][number]) => (
    <Link href={studyHref(s.id)} onClick={onNavigate} aria-current={path === `/trilhas/${s.id}` ? "page" : undefined} data-status={s.status}>
      <span className="sub-assunto-status" aria-hidden />
      <span className="sub-assunto-titulo">{s.title}</span>
      <span className="sr-only"> — {STATUS_LABEL[s.status]}</span>
    </Link>
  );
  return (
    <ul className={`sub-materias sub-materias-${variant}`} aria-label="Matérias que você estuda" data-testid={`submenu-materias-${variant}`}>
      {subjects.map((m) => {
        const isOpen = open.includes(m.name) || m.studies.some((s) => path === `/trilhas/${s.id}`);
        const Icone = iconeDa(m.name);
        return (
          <li key={m.name}>
            <button type="button" className="sub-materia" aria-expanded={isOpen} onClick={() => toggle(m.name)}>
              <span className="sub-materia-ico" aria-hidden><Icone /></span>
              <span className="sub-materia-nome">{m.name}</span>
              <span className="sub-materia-qtd">{m.studies.length}</span>
              <ChevronDown className={`size-3.5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`} aria-hidden />
            </button>
            {isOpen && (
              <ul className="sub-assuntos">
                {m.topics.map((tp) => {
                  const key = `${m.name}::${tp.name ?? ""}`;
                  if (tp.name === null) return tp.studies.map((s) => <li key={s.id}>{estudo(s)}</li>);
                  const tOpen = open.includes(key) || tp.studies.some((s) => path === `/trilhas/${s.id}`);
                  return (
                    <li key={key}>
                      <button type="button" className="sub-topico" aria-expanded={tOpen} onClick={() => toggle(key)}>
                        <span className="sub-topico-nome">{tp.name}</span>
                        <span className="sub-materia-qtd">{tp.studies.length}</span>
                        <ChevronDown className={`size-3 shrink-0 transition-transform ${tOpen ? "rotate-180" : ""}`} aria-hidden />
                      </button>
                      {tOpen && <ul className="sub-subtopicos">{tp.studies.map((s) => <li key={s.id}>{estudo(s)}</li>)}</ul>}
                    </li>
                  );
                })}
              </ul>
            )}
          </li>
        );
      })}
    </ul>
  );
}
