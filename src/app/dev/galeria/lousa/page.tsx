"use client";
import { MentorLousa } from "@/components/mentor/mentor-lousa";
import type { Lousa } from "@/domain/mentor/lousa";

/** Só galeria: lousa de exemplo (conta + desenho). */
const dados: Lousa = {
  mostrar: true,
  titulo: "Teorema de Pitágoras",
  passos: [
    { texto: "Num triângulo retângulo, a hipotenusa é o lado maior.", conta: "a² = b² + c²" },
    { texto: "Catetos 3 e 4: some os quadrados.", conta: "3² + 4² = 9 + 16 = 25" },
    { texto: "Tire a raiz quadrada.", conta: "a = √25 = 5" },
  ],
  desenho: [
    { t: "linha", x1: 60, y1: 210, x2: 300, y2: 210, cor: "grafite" },
    { t: "linha", x1: 60, y1: 210, x2: 60, y2: 50, cor: "grafite" },
    { t: "linha", x1: 60, y1: 50, x2: 300, y2: 210, cor: "vermelho", seta: true },
    { t: "texto", x: 160, y: 232, s: "4", cor: "azul" },
    { t: "texto", x: 32, y: 135, s: "3", cor: "azul" },
    { t: "texto", x: 190, y: 112, s: "a = 5", cor: "vermelho" },
  ],
};
export default function Page() { return <div style={{ minHeight: "100vh", background: "#eee" }}><MentorLousa lousa={dados} onClose={() => {}} /></div>; }
