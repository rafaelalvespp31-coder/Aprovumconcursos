import { NewTrailForm } from "./form";

export const metadata = { title: "Nova trilha" };

export default function NewTrailPage() {
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="t-h1">Nova trilha</h1>
      <p className="mt-1 text-tinta-suave">Três escolhas e a sua trilha começa a ser montada.</p>
      <div className="mt-8">
        <NewTrailForm />
      </div>
    </div>
  );
}
