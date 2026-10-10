import { getPerformance } from "@/server/queries";
import { PerformanceView } from "./view";

export const metadata = { title: "Desempenho" };

export default async function PerformancePage() {
  return <PerformanceView data={await getPerformance(30)} />;
}
