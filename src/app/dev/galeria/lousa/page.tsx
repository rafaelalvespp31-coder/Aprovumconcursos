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
    { tipo: "texto", texto: "Se 5 maçãs 🍎 custam R$ 20,00,", nivel: 1, realce: [{ trecho: "R$ 20,00", cor: "verde" }] },
    { tipo: "texto", texto: "quanto custam 8 maçãs?", nivel: 1, sublinhar: "reta", cor: "preto" },
    { tipo: "texto", texto: "Montar a regra de 3:", nivel: 1 },
    { tipo: "figuras", texto: "5 maçãs:", figuras: [{ e: "🍎", n: 5 }], nivel: 2, cor: "preto" },
    { tipo: "par", texto: "5 maçãs", dir: "R$ 20,00", nivel: 2, cor: "preto" },
    { tipo: "par", texto: "8 maçãs", dir: "R$ x", nivel: 2, cor: "preto", circular: "x" },
    { tipo: "texto", texto: "Multiplicar cruzado:", nivel: 2, marca: "seta_baixo" },
    { tipo: "conta", texto: "5 · x = 8 · 20", nivel: 3 },
    { tipo: "conta", texto: "5x = 160", nivel: 3, cor: "azul", marca: "seta_dir" },
    { tipo: "conta", texto: "x = 160 ÷ 5", nivel: 3 },
    { tipo: "conta", texto: "x = 32", nivel: 3, cor: "verde", caixa: true },
    { tipo: "resposta", texto: "Resposta: 8 maçãs custam R$ 32,00.", nivel: 3, marca: "estrela" },
    { tipo: "nota", texto: "regra de 3 direta: mais maçãs → mais custo", cor: "laranja", realce: [{ trecho: "direta", cor: "roxo" }] },
  ],
  desenho: [],
});
const falas = ["", "Vamos ver um exemplo.", "Se cinco maçãs custam vinte reais,", "quanto custam oito maçãs?", "Primeiro, montamos a regra de três.", "Olha as cinco maçãs aqui.", "Cinco maçãs estão para vinte reais,", "assim como oito maçãs estão para x.", "Agora multiplicamos cruzado.", "Cinco vezes x é igual a oito vezes vinte.", "Isso dá cinco x igual a cento e sessenta.", "Dividimos por cinco.", "E o x vale trinta e dois.", "Então oito maçãs custam trinta e dois reais.", "Lembre: mais maçãs, mais custo."];
const comFala = { ...dados, linhas: dados.linhas.map((l, i) => ({ ...l, fala: falas[i] ?? "" })) };
const t0 = typeof performance !== "undefined" ? performance.now() : 0;
const sync = () => { const c = ((performance.now() - t0) / 1000) * 14; const tot = comFala.linhas.reduce((a, l) => a + l.fala.length, 0); return { c: Math.min(c, tot), fim: c > tot + 14 }; };
const t00 = typeof performance !== "undefined" ? performance.now() / 1000 : 0;
const vivo = { quandos: comFala.linhas.map(() => t00), agora: () => performance.now() / 1000 };
void sync;
export default function Page() { return <div style={{ minHeight: "100vh", background: "#eee" }}><MentorLousa lousa={comFala} vivo={vivo} onClose={() => {}} /></div>; }
