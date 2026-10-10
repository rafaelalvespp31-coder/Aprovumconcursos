import { ButtonLink } from "@/components/ui";
import { Logo } from "@/components/logo";

export default function NotFound() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col justify-center gap-4 px-5">
      <Logo />
      <h1 className="t-h1">Página não encontrada</h1>
      <p className="text-tinta-suave">O endereço não existe ou o conteúdo não pertence à sua conta.</p>
      <ButtonLink href="/painel" className="self-start">Ir para o painel</ButtonLink>
    </main>
  );
}
