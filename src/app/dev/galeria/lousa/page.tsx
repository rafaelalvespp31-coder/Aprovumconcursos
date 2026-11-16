"use client";
import { MentorLousa } from "@/components/mentor/mentor-lousa";
import { lousaSchema } from "@/domain/mentor/lousa";

/** Só galeria: quadro de exemplo (regra de três), como um professor escreveria. */
const dados = lousaSchema.parse({
  mostrar: true,
  titulo: "Regra de três",
  linhas: [
    { tipo: "titulo", texto: "Regra de 3", cor: "azul", sublinhar: "onda" },
    { tipo: "texto", texto: "Exemplo:", sublinhar: "reta", cor: "preto" },
    { tipo: "texto", texto: "Se 5 maçãs custam R$ 20,00,", nivel: 1 },
    { tipo: "texto", texto: "quanto custam 8 maçãs?", nivel: 1, sublinhar: "reta", cor: "preto" },
    { tipo: "texto", texto: "Montar a regra de 3:", nivel: 1 },
    { tipo: "par", texto: "5 maçãs", dir: "R$ 20,00", nivel: 2, cor: "preto" },
    { tipo: "par", texto: "8 maçãs", dir: "R$ x", nivel: 2, cor: "preto", circular: "x" },
    { tipo: "texto", texto: "Multiplicar cruzado:", nivel: 2, marca: "seta_baixo" },
    { tipo: "conta", texto: "5 · x = 8 · 20", nivel: 3 },
    { tipo: "conta", texto: "5x = 160", nivel: 3, cor: "azul", marca: "seta_dir" },
    { tipo: "conta", texto: "x = 160 ÷ 5", nivel: 3 },
    { tipo: "conta", texto: "x = 32", nivel: 3, cor: "azul", caixa: true },
    { tipo: "resposta", texto: "Resposta: 8 maçãs custam R$ 32,00.", nivel: 3, marca: "estrela" },
    { tipo: "nota", texto: "regra de 3 direta: mais maçãs → mais custo" },
  ],
  desenho: [],
});
export default function Page() { return <div style={{ minHeight: "100vh", background: "#eee" }}><MentorLousa lousa={dados} onClose={() => {}} /></div>; }
