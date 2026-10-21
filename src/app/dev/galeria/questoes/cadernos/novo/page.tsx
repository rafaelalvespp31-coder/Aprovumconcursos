"use client";

import { NewNotebookForm } from "@/app/(app)/questoes/cadernos/novo/form";
import { demoLookups, demoNotebooks } from "../../../questoes-fixtures";

export default function Page() {
  return <NewNotebookForm lookups={demoLookups} base="/dev/galeria" create={async () => ({ ok: true, data: demoNotebooks[0]!.id })} />;
}
