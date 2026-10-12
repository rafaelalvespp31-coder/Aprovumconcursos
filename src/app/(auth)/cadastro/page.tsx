import { SignUpForm } from "../forms";

export const metadata = { title: "Criar conta" };

export default function SignUpPage() {
  return (
    <>
      <h1 className="t-h1">Criar conta</h1>
      <p className="mb-6 mt-1 text-tinta-suave">Em seguida você informa o tema, o artigo ou a matéria do seu primeiro estudo.</p>
      <SignUpForm />
    </>
  );
}
