"use client";

import { useCallback } from "react";
import { useRouter } from "next/navigation";
import type { ConcursoCard } from "@/domain/missao/materias";
import { acharAula, type Comando, type Candidato } from "@/domain/mentor/navegacao";
import type { ResultadoComando } from "@/components/mentor/mentor-voz";
import { abrirConcursoAction } from "@/app/(missao)/painel/actions";

const AVISO = "[AVISO DO APLICATIVO]";

type RespostaAula = { ok: true; destino: string; titulo: string; iniciada: boolean } | { ok: false; motivo: "nao_encontrada" | "varios" | "limite"; opcoes?: string[]; mensagem?: string };

/**
 * Executa na Central o que o aluno pediu falando com o Mentor: abre o menu (Concursos/Matérias) ou troca de página.
 * A página só troca depois que o Mentor termina de confirmar (`depois`); quando não dá, devolve um aviso para ele
 * explicar ao aluno, em vez de fingir que abriu.
 */
export function useNavegarPorVoz({ concursos, abrirMenu, fecharMenu }: { concursos: ConcursoCard[]; abrirMenu: (qual: "concursos" | "materias") => void; fecharMenu: () => void }) {
  const router = useRouter();
  return useCallback(async (cmd: Comando): Promise<ResultadoComando> => {
    switch (cmd.tipo) {
      case "menu":
        abrirMenu(cmd.alvo);
        return null;
      case "pagina":
        if (cmd.id === "inicio") { fecharMenu(); return null; }
        return { depois: () => router.push(cmd.rota) };
      case "aula": {
        const r = await fetch("/api/mentor/navegar", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ consulta: cmd.consulta }) })
          .then((x) => x.json() as Promise<RespostaAula>)
          .catch((): RespostaAula => ({ ok: false, motivo: "limite", mensagem: "Sem conexão agora." }));
        if (r.ok) return { depois: () => router.push(r.destino) };
        if (r.motivo === "varios") return { aviso: `${AVISO} O aluno pediu a aula "${cmd.consulta}" e há mais de uma com esse nome: ${(r.opcoes ?? []).join("; ")}. Não abra nada ainda. Diga as opções e pergunte qual ele quer abrir.` };
        if (r.motivo === "limite") return { aviso: `${AVISO} Não foi possível abrir a aula "${cmd.consulta}": ${r.mensagem ?? "erro no aplicativo"} Explique isso ao aluno em uma frase curta e não diga que vai abrir.` };
        return { aviso: `${AVISO} O aluno pediu a aula "${cmd.consulta}", mas não existe aula com esse nome na plataforma. Não diga que vai abrir. Diga em uma frase que não encontrou e peça para ele falar o assunto de outro jeito, ou ofereça abrir o menu de Matérias para ele escolher.` };
      }
      case "concurso": {
        const candidatos: Candidato[] = concursos.map((c) => ({ id: c.id, titulo: [c.nome, c.orgao, c.cargo, c.uf].filter(Boolean).join(" "), origem: "catalogo" }));
        const a = acharAula(cmd.consulta, candidatos);
        if (a.tipo === "nenhum") return { aviso: `${AVISO} O aluno falou do concurso "${cmd.consulta}", mas ele não está na lista da plataforma. Diga isso em uma frase e ofereça abrir o menu de Concursos para ele ver os que existem.` };
        if (a.tipo === "varios") return { aviso: `${AVISO} Há mais de um concurso parecido com "${cmd.consulta}": ${a.opcoes.map((o) => o.titulo).join("; ")}. Pergunte qual deles o aluno quer.` };
        const c = concursos.find((x) => x.id === a.escolhido.id);
        if (!c) return null;
        if (c.estado === "breve") return { aviso: `${AVISO} O concurso ${c.nome} está na plataforma, mas o edital ainda está sendo preparado. Diga isso em uma frase e pergunte se ele quer ver outro concurso ou estudar uma matéria agora.` };
        if (!cmd.abrir) return { aviso: `${AVISO} O aluno escolheu o concurso ${c.nome}${c.cargo ? ` (${c.cargo})` : ""}. Confirme em uma frase e pergunte por qual aula ele quer começar; diga que, se quiser, é só pedir que você abre a aula por aqui.` };
        if (c.estado === "analise") return { depois: () => router.push(`/analise-concurso/${c.id}?voltar=%2Fpainel`) };
        const r = await abrirConcursoAction(c.id).catch(() => ({ ok: false as const, error: "Não foi possível abrir este concurso agora." }));
        if (r.ok) return { depois: () => router.push(r.destino) };
        return { aviso: `${AVISO} Não foi possível abrir o concurso ${c.nome}: ${r.error} Explique em uma frase.` };
      }
    }
  }, [concursos, abrirMenu, fecharMenu, router]);
}
