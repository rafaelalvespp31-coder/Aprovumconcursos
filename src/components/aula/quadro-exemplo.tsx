"use client";
import { FolhaExemplo } from "@/components/aula/folha-exemplo";
import { roteiroDeExemplo } from "@/domain/mentor/catalogo-lousa";

/** Exemplo da aula como folha de material didático (estilo apostila/PDF). A lousa fica só no Mentor. */
export function QuadroExemplo({ itens, roteiro, children }: { itens: string[]; roteiro?: string[]; children?: React.ReactNode }) {
  const ro = roteiro ?? roteiroDeExemplo(itens);
  if (!ro) return <>{children}</>;
  return (
    <>
      <FolhaExemplo roteiro={ro} />
      {children && <details className="qe-texto"><summary>Ver o exemplo em texto</summary>{children}</details>}
    </>
  );
}
