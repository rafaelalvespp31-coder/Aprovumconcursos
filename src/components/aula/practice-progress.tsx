"use client";

import { createContext, useContext } from "react";

/** O que o aluno já fez em cada card "Na prática" (por seção): respostas vistas, "entendi" e exemplo aberto. */
export interface PracticeState { o: number[]; g: number[]; i: number }
export type PracticeProgress = Record<string, PracticeState>;

export const EMPTY_PRACTICE: PracticeState = { o: [], g: [], i: 0 };

export const PracticeCtx = createContext<{ progress: PracticeProgress; update: (key: string, next: PracticeState) => void } | null>(null);
export const usePracticeProgress = () => useContext(PracticeCtx);

const SIZE = (p: PracticeState | undefined) => p?.o.length ?? 0;
/** Seção com exemplo ainda sem nenhum "Pensei — ver a resposta". */
export const practiceDone = (p: PracticeProgress, sectionId: string) => SIZE(p[sectionId]) > 0;
