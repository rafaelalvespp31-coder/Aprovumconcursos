"use client";

import { useState } from "react";
import { Check, Copy, Gift, Share2 } from "lucide-react";
import type { MyReferral } from "@/server/services/referral";

const STATUS: Record<string, string> = { pendente: "A caminho: a equipe vai combinar a entrega", enviado: "Enviado", cancelado: "Cancelado" };

/** Cartão "Indique um amigo" do perfil: código, link para compartilhar e andamento das indicações. */
export function Indicacao({ data, origin }: { data: MyReferral; origin: string }) {
  const [copiado, setCopiado] = useState<"" | "codigo" | "link">("");
  if (!data.code) return null;
  const link = `${origin}/cadastro?ref=${data.code}`;
  const copiar = async (txt: string, tipo: "codigo" | "link") => {
    try {
      await navigator.clipboard.writeText(txt);
      setCopiado(tipo);
      setTimeout(() => setCopiado(""), 1800);
    } catch {
      /* sem permissão da área de transferência: o código continua visível para copiar à mão */
    }
  };
  const compartilhar = async () => {
    const texto = `Estude para concursos na APROVUM! Use meu ID de indicação ${data.code} no cadastro: ${link}`;
    if (navigator.share) await navigator.share({ title: "APROVUM", text: texto }).catch(() => undefined);
    else await copiar(texto, "link");
  };
  return (
    <div data-testid="indicacao">
      <p className="mb-3 text-[12px] text-[#5C5C5C]">
        Passe seu ID para um amigo se cadastrar. Se ele assinar o plano <b>anual ou vitalício</b>, <b>vocês dois ganham um copo e uma camisa</b> da APROVUM.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded-xl border border-[#E4E4E4] bg-[#F7F7F8] px-4 py-2.5 text-[17px] font-extrabold tracking-[0.12em]" data-testid="indicacao-codigo">{data.code}</code>
        <button type="button" onClick={() => copiar(data.code!, "codigo")} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#0A0A0A] px-4 text-[13px] font-bold text-white active:scale-95">
          {copiado === "codigo" ? <Check className="h-4 w-4" aria-hidden /> : <Copy className="h-4 w-4" aria-hidden />} {copiado === "codigo" ? "Copiado" : "Copiar ID"}
        </button>
        <button type="button" onClick={compartilhar} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl border border-[#D8D8D8] px-4 text-[13px] font-bold active:scale-95">
          {copiado === "link" ? <Check className="h-4 w-4" aria-hidden /> : <Share2 className="h-4 w-4" aria-hidden />} {copiado === "link" ? "Copiado" : "Compartilhar"}
        </button>
      </div>
      {data.rewards.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {data.rewards.map((r, i) => (
            <li key={i} className="flex items-center gap-2 rounded-xl bg-[#FFF4F4] px-3 py-2 text-[13px]">
              <Gift className="h-4 w-4 shrink-0 text-[#E50914]" aria-hidden />
              <span><b>{r.item}</b> · {r.role === "indicador" ? "por indicar" : "por ter sido indicado"} · {STATUS[r.status]}</span>
            </li>
          ))}
        </ul>
      )}
      {data.friends.length > 0 && (
        <div className="mt-4">
          <h3 className="mb-1.5 text-[12px] font-bold uppercase tracking-wide text-[#5C5C5C]">Seus indicados</h3>
          <ul className="flex flex-col divide-y divide-[#EEE] text-[13px]">
            {data.friends.map((f, i) => (
              <li key={i} className="flex items-center justify-between py-1.5">
                <span>{f.name}</span>
                <span className={f.status === "comprou" ? "font-bold text-[#0A7A3B]" : "text-[#6B6B6B]"}>{f.status === "comprou" ? "Assinou" : "Cadastrado"}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
