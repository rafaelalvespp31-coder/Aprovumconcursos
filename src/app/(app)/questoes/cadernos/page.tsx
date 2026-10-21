import Link from "next/link";
import { requireUser } from "@/server/auth";
import { listNotebooks } from "@/server/services/notebooks";
import { AllNotebooks } from "./all";

export const metadata = { title: "Todos os cadernos" };

export default async function AllNotebooksPage() {
  const user = await requireUser("/questoes/cadernos");
  const notebooks = await listNotebooks(user.id);
  return (
    <div className="flex flex-col gap-4">
      <Link href="/questoes" className="self-start text-[13px] font-semibold text-[#C8000C] underline underline-offset-2">
        ← Cadernos de Questões
      </Link>
      <AllNotebooks notebooks={notebooks} base="" />
    </div>
  );
}
