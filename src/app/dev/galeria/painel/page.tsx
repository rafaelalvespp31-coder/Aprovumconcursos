import { DashboardView } from "@/app/(app)/painel/view";
import { dashboard } from "../fixtures";

export default function Page() {
  return <DashboardView {...dashboard} />;
}
