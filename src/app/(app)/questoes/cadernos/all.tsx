"use client";

import type { Notebook } from "@/server/services/notebooks";
import { NotebooksCard, type NotebookActions } from "../notebooks-card";

/** "Ver todos": a mesma lista, sem o limite de recentes nem as abas. */
export function AllNotebooks({ notebooks, base, actions }: { notebooks: Notebook[]; base: string; actions?: NotebookActions }) {
  return <NotebooksCard notebooks={notebooks} base={base} actions={actions} full />;
}
