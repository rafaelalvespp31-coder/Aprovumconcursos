import Link from "next/link";
import { PastelCard } from "@/components/pastel/card";

/** Telas do app sem versão de exemplo na galeria. */
export default function Page() {
  return (
    <PastelCard noTilt className="p-8">
      <h1 className="font-[Space_Grotesk] text-[20px] font-bold">Tela sem dados de exemplo</h1>
      <p className="mt-2 text-[13px] text-[#4D4D4D]">Esta tela existe no app, mas a galeria não tem uma versão de demonstração dela.</p>
      <Link href="/dev/galeria/painel" className="mt-4 inline-flex h-10 items-center rounded-[12px] bg-[#E10600] px-4 text-[12px] font-semibold text-white">Voltar ao painel</Link>
    </PastelCard>
  );
}
