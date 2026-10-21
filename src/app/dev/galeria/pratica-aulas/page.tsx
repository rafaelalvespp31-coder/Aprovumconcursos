import { Practice } from "./practice";
import { bank } from "../fixtures";

export default function Page() {
  return (
    <div className="flex flex-col gap-5">
      <h1 className="t-h1">Prática (componente das questões)</h1>
      <Practice questions={bank} />
    </div>
  );
}
