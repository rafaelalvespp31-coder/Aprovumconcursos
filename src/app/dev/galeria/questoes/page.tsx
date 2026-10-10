import { Practice } from "@/app/(app)/questoes/practice";
import { bank } from "../fixtures";

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="t-h1">Questões</h1>
      <Practice questions={bank} />
    </div>
  );
}
