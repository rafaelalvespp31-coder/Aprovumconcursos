"use client";

import { useState } from "react";
import { KnowledgeOps } from "@/components/knowledge-map/knowledge-ops";
import type { ThemeCard } from "@/domain/studies/home";
import { StartStudyDialog, type StartTheme } from "./start-dialog";

/** Novo estudo no Mapa do Conhecimento: escolher o assunto no mapa e confirmar o estudo. */
export function MapStart({ themes, name, base = "" }: { themes: ThemeCard[]; name: string | null; base?: string }) {
  const [theme, setTheme] = useState<StartTheme | null>(null);
  return (
    <>
      <KnowledgeOps themes={themes} name={name} base={base} onStart={setTheme} />
      <StartStudyDialog theme={theme} onClose={() => setTheme(null)} />
    </>
  );
}
