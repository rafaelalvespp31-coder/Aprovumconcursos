import { requireUser } from "@/server/auth";
import { loadPartnerDashboard } from "@/server/services/partner";
import { createAdminClient } from "@/server/supabase";
import { periodDays } from "@/domain/partner/series";
import { visibleSections } from "@/domain/partner/sections";
import { signOut } from "@/app/(auth)/actions";
import { BusinessNotice, BusinessShell } from "@/components/business/shell";
import { BusinessDashboard } from "@/components/business/dashboard";
import { AutoRefresh } from "@/components/business/auto-refresh";

export const dynamic = "force-dynamic";

export default async function BusinessPage({
  searchParams,
}: {
  searchParams: Promise<{ periodo?: string }>;
}) {
  const user = await requireUser("/business");
  const period = periodDays((await searchParams).periodo);
  const [data, profile] = await Promise.all([
    loadPartnerDashboard(period),
    createAdminClient()
      .from("profiles")
      .select("display_name")
      .eq("id", user.id)
      .maybeSingle(),
  ]);
  const who = {
    name: (profile.data?.display_name as string | null) ?? null,
    email: user.email,
  };

  if (data.status !== "ok") {
    return (
      <BusinessShell sections={new Set()} who={who} signOut={signOut}>
        <AutoRefresh />
        {data.status === "desativado" ? (
          <BusinessNotice
            title="Acesso desativado"
            testId="business-desativado"
          >
            O administrador do APROVUM desativou este acesso. Fale com ele para
            reativar.
          </BusinessNotice>
        ) : (
          <BusinessNotice title="Sem acesso" testId="business-sem-acesso">
            Esta conta não tem acesso ao painel do sócio.
          </BusinessNotice>
        )}
      </BusinessShell>
    );
  }
  return (
    <BusinessShell sections={visibleSections(data)} who={who} signOut={signOut} catalogo={data.permissions.includes("catalogar_aulas")}>
      <AutoRefresh />
      <BusinessDashboard data={data} period={period} />
    </BusinessShell>
  );
}
