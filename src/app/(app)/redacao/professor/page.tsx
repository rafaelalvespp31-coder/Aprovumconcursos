import { requireUser } from "@/server/auth";
import { createAdminClient } from "@/server/supabase";
import { Professor } from "@/components/redacao/professor";

export const metadata = { title: "Professor de redação" };
export const dynamic = "force-dynamic";

export default async function ProfessorPage({ searchParams }: { searchParams: Promise<{ avaliacao?: string }> }) {
  const { avaliacao } = await searchParams;
  const user = await requireUser("/redacao/professor");
  let id: string | null = null;
  let titulo: string | null = null;
  if (avaliacao && /^[0-9a-f-]{36}$/i.test(avaliacao)) {
    const e = await createAdminClient().from("writing_evaluations").select("id, writing_submissions(title, theme_title)").eq("id", avaliacao).eq("user_id", user.id).eq("status", "concluida").maybeSingle();
    if (e.data) {
      id = e.data.id as string;
      const s = e.data.writing_submissions as unknown as { title: string; theme_title: string | null } | null;
      titulo = s?.title || s?.theme_title || null;
    }
  }
  return <Professor avaliacaoId={id} titulo={titulo} />;
}
