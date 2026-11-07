"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2, RotateCcw } from "lucide-react";
import { reenviarAction } from "@/app/(app)/redacao/actions";
import { Aviso } from "./ui";

const ETAPAS = ["Identificando a modalidade e os critérios", "Interpretando o tema e analisando estrutura, coesão e argumentação", "Revisando gramática, ortografia e pontuação linha por linha", "Aplicando a rubrica de avaliação", "Revisando a consistência da pontuação", "Elaborando o diagnóstico final e o plano de evolução"];

/** Acompanhamento do processamento: atualiza a página até a correção concluir ou falhar. */
export function Acompanhar({ etapa }: { etapa: string | null }) {
  const router = useRouter();
  const [seg, setSeg] = useState(0);
  useEffect(() => {
    const t = setInterval(() => setSeg((s) => s + 1), 1000);
    const r = setInterval(() => router.refresh(), 4000);
    return () => {
      clearInterval(t);
      clearInterval(r);
    };
  }, [router]);
  const i = etapa ? ETAPAS.indexOf(etapa) : -1;
  return (
    <section className="pc flex flex-col gap-4 p-5" role="status" aria-live="polite" data-testid="redacao-processando">
      <div className="flex items-center gap-3">
        <Loader2 className="h-5 w-5 animate-spin text-[#E50914]" aria-hidden />
        <div>
          <h2 className="text-[16px] font-extrabold text-[#08090B]">O professor está corrigindo sua redação</h2>
          <p className="text-[12.5px] text-[#64666D]">Pode levar alguns minutos ({seg}s). Você pode sair e voltar: a correção continua e fica no histórico.</p>
        </div>
      </div>
      <ol className="flex flex-col gap-2">
        {ETAPAS.map((e, n) => (
          <li key={e} className={`flex items-center gap-2 text-[13px] ${n < i ? "text-[#047857]" : n === i ? "font-bold text-[#08090B]" : "text-[#9A9CA3]"}`}>
            <span aria-hidden className={`h-2 w-2 rounded-full ${n < i ? "bg-[#047857]" : n === i ? "animate-pulse bg-[#E50914]" : "bg-[#D9DBE0]"}`} />
            {e}
          </li>
        ))}
      </ol>
    </section>
  );
}

export function Falhou({ id, mensagem }: { id: string; mensagem: string | null }) {
  const router = useRouter();
  const [pend, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);
  return (
    <section className="pc flex flex-col gap-3 p-5" data-testid="redacao-falhou">
      <h2 className="text-[16px] font-extrabold text-[#08090B]">A correção não foi concluída</h2>
      <Aviso tom="erro">{mensagem ?? "Ocorreu uma falha no processamento."}</Aviso>
      <p className="text-[13px] text-[#64666D]">Nenhuma nota foi gerada. Sua redação está salva.</p>
      {erro && <Aviso tom="erro">{erro}</Aviso>}
      <div>
        <button type="button" disabled={pend} className="pc-botao" onClick={() => start(async () => { const r = await reenviarAction(id).catch(() => null); if (!r || !r.ok) return setErro(r && !r.ok ? r.error : "Não foi possível reenviar."); router.refresh(); })}>
          <RotateCcw className="h-4 w-4" aria-hidden /> {pend ? "Reenviando…" : "Tentar de novo"}
        </button>
      </div>
    </section>
  );
}
