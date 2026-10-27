"use client";

import { useState } from "react";
import { StudyPicker } from "@/components/estudos/study-picker";
import type { ThemeCard } from "@/domain/studies/home";
import { StartStudyDialog } from "./start-dialog";

/**
 * Novo estudo em lista (modo alternativo ao mapa): o aluno escolhe a matéria e o tema;
 * "Começar estudo" confirma e cria o estudo com a aula pronta do catálogo.
 */
export function StartPicker({ themes, base = "" }: { themes: ThemeCard[]; base?: string }) {
  const [theme, setTheme] = useState<ThemeCard | null>(null);
  return (
    <>
      <StudyPicker themes={themes} base={base} onStart={(t) => setTheme(t)} />
      <StartStudyDialog theme={theme} onClose={() => setTheme(null)} />
    </>
  );
}
