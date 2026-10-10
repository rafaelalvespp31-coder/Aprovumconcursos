import { NewPasswordForm } from "../forms";

export const metadata = { title: "Nova senha" };

export default function NewPasswordPage() {
  return (
    <>
      <h1 className="t-h1">Criar nova senha</h1>
      <p className="mb-6 mt-1 text-tinta-suave">Escolha uma senha que você não use em outros sites.</p>
      <NewPasswordForm />
    </>
  );
}
