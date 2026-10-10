import { PerformanceView } from "@/app/(app)/desempenho/view";
import { performance } from "../fixtures";

export default function Page() {
  return <PerformanceView data={performance} />;
}
