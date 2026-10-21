import { requireUser } from "@/server/auth";
import { notebookLookups } from "@/server/services/notebooks";
import { NewNotebookForm } from "./form";

export const metadata = { title: "Questões — novo caderno" };

export default async function NewNotebookPage() {
  const user = await requireUser("/questoes/cadernos/novo");
  const lookups = await notebookLookups(user.id);
  return <NewNotebookForm lookups={lookups} base="" />;
}
