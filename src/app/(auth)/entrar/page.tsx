import { SignInForm } from "../forms";

export const metadata = { title: "Entrar" };

const NOTICES: Record<string, string> = {
  saiu: "Você saiu da sua conta.",
  link: "O link é inválido ou expirou. Entre novamente ou solicite um novo link.",
};

export default async function SignInPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const notice = sp.saiu ? NOTICES.saiu : sp.erro === "link" ? NOTICES.link : null;
  return (
    <>
      <h1 className="t-h1">Entrar</h1>
      <p className="mb-6 mt-1 text-tinta-suave">Continue de onde parou.</p>
      <SignInForm next={sp.next} notice={notice} />
    </>
  );
}
