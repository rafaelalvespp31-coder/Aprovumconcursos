"use client";

import { AllNotebooks } from "@/app/(app)/questoes/cadernos/all";
import { demoNotebooks } from "../../questoes-fixtures";
import { demoNotebookActions } from "../demo-actions";

export default function Page() {
  return <AllNotebooks notebooks={demoNotebooks} base="/dev/galeria" actions={demoNotebookActions} />;
}
