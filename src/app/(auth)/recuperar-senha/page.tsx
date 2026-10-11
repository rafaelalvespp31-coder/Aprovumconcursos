import Link from "next/link";
import { ResetRequestForm } from "../forms";

export const metadata = { title: "Recuperar senha" };

export default function ResetPage() {
  return (
    <>
      <h1 className="t-h1">Recuperar senha</h1>
      <p className="mb-6 mt-1 text-tinta-suave">Enviaremos um link para você criar uma nova senha.</p>
      <ResetRequestForm />
      <Link href="/entrar" className="mt-6 t-small text-destaque underline underline-offset-2">Voltar para entrar</Link>
    </>
  );
}
