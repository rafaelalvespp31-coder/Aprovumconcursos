"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowRight, Compass, MessageCircle, RotateCcw, X } from "lucide-react";
import { mentorCardAction, mentorStatusAction } from "@/app/(app)/mentor/actions";
import type { MentorCardState, MentorItem } from "./types";

type Loader = () => Promise<MentorCardState>;
type SetStatus = (id: string, status: "visualizada" | "dispensada") => Promise<{ ok: true } | { ok: false; error: string; expired?: boolean }>;

const greeting = (name: string | null) => {
  const h = new Date().getHours();
  const part = h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
  return name ? `${part}, ${name}.` : `${part}.`;
};

/**
 * "Seu Mentor APROVUM" no painel: a prioridade principal do aluno, o motivo verificável, o
 * progresso real e o botão de ação. Carrega uma vez ao abrir (sem polling); nada fictício
 * enquanto carrega.
 */
export function MentorCard({ base = "", demo }: { base?: string; /** Galeria: estado em memória (nada é gravado). */ demo?: MentorCardState }) {
  // Funções estáveis: o card carrega UMA vez ao abrir (e no "Tentar de novo"), nunca em loop.
  const [load] = useState<Loader>(() => (demo ? async () => demo : mentorCardAction));
  const [setStatus] = useState<SetStatus>(() => (demo ? async () => ({ ok: true as const }) : mentorStatusAction));
  const [data, setData] = useState<MentorCardState | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fetchIt = useCallback(() => {
    setData(null);
    load()
      .then(setData)
      .catch(() => setData({ state: "erro" }));
  }, [load]);
  useEffect(() => {
    let alive = true;
    load()
      .then((d) => alive && setData(d))
      .catch(() => alive && setData({ state: "erro" }));
    return () => {
      alive = false;
    };
  }, [load]);

  const dismiss = async (item: MentorItem) => {
    if (!item.id || data?.state !== "ok") return;
    const before = data;
    setData({ ...data, items: data.items.filter((x) => x.key !== item.key), pending: Math.max(0, data.pending - 1) });
    const r = await setStatus(item.id, "dispensada").catch(() => ({ ok: false as const, error: "Não foi possível salvar agora. Tente de novo." }));
    if (!r.ok) {
      setData("expired" in r && r.expired ? { state: "sessao" } : before);
      setNotice(r.error);
    } else setNotice("Recomendação dispensada. Ela volta se a pendência continuar.");
  };
  const opened = (item: MentorItem) => {
    if (item.id && item.status === "nova") void setStatus(item.id, "visualizada").catch(() => undefined);
  };

  return (
    <section className="pc relative overflow-hidden p-5" aria-labelledby="mentor-titulo" aria-busy={data === null} data-testid="mentor-card" data-estado={data?.state ?? "carregando"}>
      <div className="flex items-center justify-between gap-3">
        <h2 id="mentor-titulo" className="flex min-w-0 items-center gap-2.5 text-[15px] font-bold tracking-[-0.01em] text-[#08090B]">
          <span className="pc-ico" aria-hidden>
            <Compass className="h-4 w-4" />
          </span>
          Seu Mentor APROVUM
        </h2>
        {data && data.state !== "sessao" && data.state !== "erro" && (
          <Link href={`${base}/mentor`} className="pc-vertodas">
            {data.state === "ok" && data.pending > 1 ? `Ver todas (${data.pending})` : "Abrir o Mentor"}
          </Link>
        )}
      </div>

      {data === null ? (
        <div className="mt-4 space-y-2.5" aria-hidden data-testid="mentor-carregando">
          <div className="h-3 w-40 animate-pulse rounded bg-[#ECEDF0]" />
          <div className="h-5 w-3/4 animate-pulse rounded bg-[#ECEDF0]" />
          <div className="h-3 w-2/3 animate-pulse rounded bg-[#ECEDF0]" />
          <div className="mt-3 h-10 w-44 animate-pulse rounded-[10px] bg-[#ECEDF0]" />
          <span className="sr-only">Carregando as recomendações do Mentor…</span>
        </div>
      ) : data.state === "sessao" ? (
        <div className="mt-3">
          <p className="text-[14px] font-semibold text-[#08090B]">Sua sessão expirou.</p>
          <p className="mt-1 text-[13px] text-[#64666D]">Entre novamente para ver as recomendações do seu Mentor.</p>
          <Link href="/entrar?next=/painel" className="pc-botao mt-4">
            Entrar <ArrowRight className="h-4 w-4" aria-hidden />
          </Link>
        </div>
      ) : data.state === "erro" ? (
        <div className="mt-3" role="alert">
          <p className="text-[14px] font-semibold text-[#08090B]">Não foi possível carregar o Mentor agora.</p>
          <button type="button" onClick={fetchIt} className="pc-botao mt-4">
            <RotateCcw className="h-4 w-4" aria-hidden /> Tentar de novo
          </button>
        </div>
      ) : data.state === "sem_dados" ? (
        <div className="mt-3">
          <p className="text-[13px] text-[#64666D]">{greeting(data.name)}</p>
          <p className="mt-1 text-[15px] font-bold text-[#08090B]">Ainda não tenho dados seus suficientes para recomendar algo.</p>
          <p className="mt-1 text-[13px] text-[#64666D]">Comece um estudo ou resolva algumas questões: eu passo a acompanhar o seu progresso real.</p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`${base}/nova-trilha`} className="pc-botao">
              Começar um estudo <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href={`${base}/questoes`} className="mentor-sec">
              Resolver questões
            </Link>
          </div>
        </div>
      ) : data.state === "vazio" ? (
        <div className="mt-3">
          <p className="text-[13px] text-[#64666D]">{greeting(data.name)}</p>
          <p className="mt-1 text-[15px] font-bold text-[#08090B]">Você está em dia.</p>
          <p className="mt-1 text-[13px] text-[#64666D]">
            Sem aula pela metade, revisão vencida ou caderno parado.{data.completed ? ` Aulas concluídas: ${data.completed}.` : ""} Escolha um novo assunto para avançar.
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href={`${base}/trilhas`} className="pc-botao">
              Escolher um assunto <ArrowRight className="h-4 w-4" aria-hidden />
            </Link>
            <Link href={`${base}/mentor`} className="mentor-sec">
              <MessageCircle className="h-4 w-4" aria-hidden /> Falar com o mentor
            </Link>
          </div>
        </div>
      ) : (
        <MentorMain data={data} base={base} onOpen={opened} onDismiss={dismiss} />
      )}
      {notice && (
        <p role="status" className="mt-3 text-[12px] text-[#64666D]">
          {notice}
        </p>
      )}
    </section>
  );
}

function MentorMain({ data, base, onOpen, onDismiss }: { data: Extract<MentorCardState, { state: "ok" }>; base: string; onOpen: (i: MentorItem) => void; onDismiss: (i: MentorItem) => void }) {
  const [main, ...rest] = data.items;
  if (!main) return null;
  return (
    <div className="mt-3">
      <p className="text-[13px] text-[#64666D]">{greeting(data.name)}</p>
      <p className="mt-2 text-[11.5px] font-bold uppercase tracking-[0.06em] text-[#E50914]">{main.title}</p>
      <h3 className="mt-1 text-[17px] font-extrabold leading-snug text-[#08090B]">{main.explanation}</h3>
      <p className="mt-1 text-[13px] text-[#64666D]">
        <span className="font-semibold text-[#3A3C42]">Por quê: </span>
        {main.reason}
      </p>
      {main.progress && (
        <div className="mt-3 max-w-md">
          <span className="pc-barra" role="img" aria-label={main.progress.label}>
            <span style={{ width: `${main.progress.pct}%` }} />
          </span>
          <p className="mt-1 text-[11.5px] text-[#64666D]">{main.progress.label}</p>
        </div>
      )}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Link href={`${base}${main.href}`} onClick={() => onOpen(main)} className="pc-botao" data-testid="mentor-acao">
          {main.actionLabel} <ArrowRight className="h-4 w-4" aria-hidden />
        </Link>
        <Link href={`${base}/mentor`} className="mentor-sec">
          <MessageCircle className="h-4 w-4" aria-hidden /> Falar com o mentor
        </Link>
        {main.id && (
          <button type="button" onClick={() => onDismiss(main)} className="mentor-dispensar" aria-label={`Dispensar: ${main.explanation}`}>
            <X className="h-3.5 w-3.5" aria-hidden /> Dispensar
          </button>
        )}
      </div>
      {rest.length > 0 && (
        <ul className="mt-4 divide-y divide-[#ECEDF0] border-t border-[#ECEDF0]" aria-label="Outras recomendações">
          {rest.map((r) => (
            <li key={r.key} className="flex items-center justify-between gap-3 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-[13.5px] font-semibold text-[#08090B]">{r.explanation}</span>
                <span className="block truncate text-[12px] text-[#64666D]">{r.reason}</span>
              </span>
              <Link href={`${base}${r.href}`} onClick={() => onOpen(r)} className="pc-vertodas shrink-0">
                {r.actionLabel}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
