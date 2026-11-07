"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Shuffle, Tags, Newspaper, FileText } from "lucide-react";
import { gerarTemaAction } from "@/app/(app)/redacao/actions";
import { BANCAS } from "@/domain/redacao/rubricas";
import type { ThemeView } from "@/server/services/redacao";
import { Aviso, Secao, dataBR } from "./ui";

const MODOS = [
  { id: "surpreenda", nome: "Surpreenda-me", desc: "A IA escolhe categoria e tema.", Icon: Shuffle },
  { id: "categoria", nome: "Escolher categoria", desc: "Você escolhe o assunto.", Icon: Tags },
  { id: "atualidades", nome: "Atualidades", desc: "Questões sociais contemporâneas.", Icon: Newspaper },
  { id: "simulado", nome: "Simulado de concurso", desc: "Proposta no estilo de prova.", Icon: FileText },
] as const;
const NIVEIS = [["basico", "Básico"], ["intermediario", "Intermediário"], ["avancado", "Avançado"], ["especialista", "Especialista"]] as const;
const campo = "w-full rounded-[10px] border border-[#D9DBE0] bg-white px-3 py-2 text-[14px] outline-none focus:border-[#E50914]";

export function Temas({ categorias, temas, iaAtiva }: { categorias: { slug: string; name: string }[]; temas: ThemeView[]; iaAtiva: boolean }) {
  const router = useRouter();
  const [modo, setModo] = useState<(typeof MODOS)[number]["id"]>("surpreenda");
  const [cat, setCat] = useState("");
  const [nivel, setNivel] = useState<(typeof NIVEIS)[number][0]>("intermediario");
  const [banca, setBanca] = useState("");
  const [pend, start] = useTransition();
  const [erro, setErro] = useState<string | null>(null);

  const gerar = () => {
    setErro(null);
    if (modo === "categoria" && !cat) return setErro("Escolha uma categoria.");
    start(async () => {
      const r = await gerarTemaAction({ modo, categoria: modo === "categoria" ? cat : null, dificuldade: nivel, board: modo === "simulado" ? banca || null : null }).catch(() => null);
      if (!r || !r.ok) return setErro(r && !r.ok ? r.error : "Não foi possível gerar o tema.");
      router.push(`/redacao/escrever?tema=${r.id}`);
    });
  };

  return (
    <div className="flex flex-col gap-4" data-testid="redacao-temas">
      <Secao titulo="Desafio de Redação APROVUM">
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4" role="radiogroup" aria-label="Modo de seleção">
          {MODOS.map(({ id, nome, desc, Icon }) => (
            <button key={id} type="button" role="radio" aria-checked={modo === id} onClick={() => setModo(id)} className={`flex flex-col gap-1 rounded-[12px] border p-3 text-left transition-colors ${modo === id ? "border-[#E50914] bg-[#FFF5F5]" : "border-[#E6E7EB] bg-white hover:border-[#B3B5BB]"}`}>
              <Icon className="h-4 w-4 text-[#E50914]" aria-hidden />
              <span className="text-[13.5px] font-bold text-[#08090B]">{nome}</span>
              <span className="text-[12px] text-[#64666D]">{desc}</span>
            </button>
          ))}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-3">
          {modo === "categoria" && (
            <select className={campo} value={cat} onChange={(e) => setCat(e.target.value)} aria-label="Categoria">
              <option value="">Categoria…</option>
              {categorias.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
            </select>
          )}
          {modo === "simulado" && (
            <select className={campo} value={banca} onChange={(e) => setBanca(e.target.value)} aria-label="Banca">
              <option value="">Banca (opcional)</option>
              {BANCAS.map((b) => <option key={b} value={b}>{b}</option>)}
            </select>
          )}
          <select className={campo} value={nivel} onChange={(e) => setNivel(e.target.value as typeof nivel)} aria-label="Dificuldade">
            {NIVEIS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        {modo === "atualidades" && <div className="mt-3"><Aviso tom="alerta">O professor ainda não consulta fontes de notícias em tempo real. O tema de atualidades é uma questão social contemporânea <b>sem verificação de fatos ou datas recentes</b>; pesquise as fontes antes de usar dados.</Aviso></div>}
        {!iaAtiva && <div className="mt-3"><Aviso tom="alerta">A IA do professor ainda não está ativada neste ambiente; as propostas da equipe abaixo continuam disponíveis.</Aviso></div>}
        {erro && <div className="mt-3"><Aviso tom="erro">{erro}</Aviso></div>}
        <button type="button" onClick={gerar} disabled={pend || !iaAtiva} className="pc-botao mt-3" data-testid="redacao-gerar-tema">{pend ? "Criando a proposta…" : "Gerar proposta e começar a escrever"}</button>
        <p className="mt-2 text-[12px] text-[#64666D]">A proposta traz textos motivadores originais e comando. O professor nunca entrega a redação pronta.</p>
      </Secao>

      <Secao titulo="Propostas disponíveis para você">
        {temas.length === 0 ? <p className="text-[13px] text-[#64666D]">Você ainda não gerou propostas e a equipe não cadastrou nenhuma.</p> : (
          <ul className="flex flex-col divide-y divide-[#ECEDF0]">
            {temas.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <span className="min-w-0">
                  <span className="block text-[14px] font-bold text-[#08090B] [overflow-wrap:anywhere]">{t.title}</span>
                  <span className="text-[12px] text-[#64666D]">{t.team ? "Proposta da equipe" : "Gerada para você"} · {t.difficulty} · {dataBR(t.createdAt)}{t.mode === "atualidades" ? " · atualidades não verificado" : ""}</span>
                </span>
                <Link href={`/redacao/escrever?tema=${t.id}`} className="pc-vertodas shrink-0">Escrever</Link>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}
