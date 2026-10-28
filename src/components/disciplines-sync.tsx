"use client";

import type { ReactNode } from "react";
import { setCustomDisciplines, type CustomDiscipline } from "@/ai/pedagogy";

/**
 * Leva para o navegador as matérias cadastradas pela equipe (nomes e estilo base), antes de as
 * telas abaixo desenharem: rótulos, mapa e validações ficam iguais aos do servidor.
 */
export function DisciplinesSync({ list, children }: { list: CustomDiscipline[]; children: ReactNode }) {
  setCustomDisciplines(list);
  return children;
}
