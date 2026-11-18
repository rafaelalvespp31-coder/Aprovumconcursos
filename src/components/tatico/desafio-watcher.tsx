"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { taticoDesafiosAction, taticoResponderDesafioAction, taticoSairAction } from "@/app/(app)/quiz/tatico/actions";
import type { DesafiosEstado } from "@/server/services/tatico";
import "./desafio.css";

type Entrada = NonNullable<DesafiosEstado["entrada"]>;
type Aviso = { n: number; texto: string; tom: "ok" | "erro" };

/** Evento global: o Desafio Tático (quando aberto) reage a recusa/aceite sem depender da página. */
export const EVENTO_DESAFIO = "tatico-desafio";

/**
 * Card de desafio, independente da página: consulta o servidor com frequência baixa (e alta quando há
 * desafio pendente) e mostra "aceitar / recusar" por cima de qualquer tela do app. Também avisa quem desafiou
 * em tempo real (recusou, não respondeu, aceitou).
 */
export function DesafioWatcher() {
  const router = useRouter();
  const [ent, setEnt] = useState<{ d: Entrada; at: number } | null>(null);
  const [now, setNow] = useState(0);
  const [aviso, setAviso] = useState<Aviso | null>(null);
  const [busy, setBusy] = useState(false);
  const pendente = useRef(false);
  const vistos = useRef<Set<string>>(new Set());

  const emitir = useCallback((detail: { status: string; match?: string | null; para?: string }) => {
    window.dispatchEvent(new CustomEvent(EVENTO_DESAFIO, { detail }));
  }, []);

  useEffect(() => {
    let vivo = true; let timer: ReturnType<typeof setTimeout>;
    const ciclo = async () => {
      if (!document.hidden) {
        const r = await taticoDesafiosAction();
        if (vivo && r) {
          setEnt(r.entrada ? { d: r.entrada, at: Date.now() } : null);
          pendente.current = !!r.entrada || r.saida?.status === "pendente";
          const sd = r.saida;
          if (sd && sd.status !== "pendente" && !vistos.current.has(sd.id)) {
            vistos.current.add(sd.id);
            if (sd.status === "aceito") { emitir({ status: "aceito", match: sd.match, para: sd.para }); router.push("/quiz/tatico?jogo=1"); }
            else {
              const texto = sd.status === "recusado" ? (sd.reason === "indisponivel" ? `${sd.para} não pôde aceitar agora.` : `${sd.para} recusou o desafio.`) : sd.status === "expirado" ? `${sd.para} não respondeu ao desafio.` : "";
              if (texto) setAviso({ n: Date.now(), texto, tom: "erro" });
              emitir({ status: sd.status, para: sd.para });
            }
          }
        }
      }
      if (vivo) timer = setTimeout(ciclo, pendente.current ? 1500 : 3000);
    };
    timer = setTimeout(ciclo, 1200);
    // saiu da aba/app → some da lista de online na hora; voltou → reaparece na hora
    const vis = () => { if (document.hidden) void taticoSairAction(); else void taticoDesafiosAction(); };
    const fim = () => { void taticoSairAction(); };
    document.addEventListener("visibilitychange", vis); window.addEventListener("pagehide", fim);
    return () => { vivo = false; clearTimeout(timer); document.removeEventListener("visibilitychange", vis); window.removeEventListener("pagehide", fim); };
  }, [emitir, router]);

  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(t); }, []);
  useEffect(() => { if (!aviso) return; const t = setTimeout(() => setAviso(null), 6500); return () => clearTimeout(t); }, [aviso]);

  const responder = async (aceitar: boolean) => {
    if (!ent || busy) return;
    setBusy(true);
    const r = await taticoResponderDesafioAction(ent.d.id, aceitar);
    setBusy(false); setEnt(null);
    if (!r.ok) { setAviso({ n: Date.now(), texto: r.erro ?? "Não foi possível responder.", tom: "erro" }); return; }
    if (aceitar && r.match) { emitir({ status: "aceito", match: r.match }); router.push("/quiz/tatico?jogo=1"); }
  };

  const restante = ent ? Math.max(0, ent.d.ms - Math.max(0, now - ent.at)) : 0;
  return (
    <>
      {ent && restante > 0 && (
        <div className="dsf-card" role="alertdialog" aria-labelledby="dsf-t" data-testid="desafio-card">
          <div className="dsf-topo"><span className="dsf-ico" aria-hidden>⚔</span><div><p className="dsf-kick">DESAFIO TÁTICO</p><p id="dsf-t" className="dsf-nome"><b>{ent.d.de}</b> te desafiou!</p></div></div>
          <p className="dsf-sub">{ent.d.materia ? <b className="dsf-mat">{ent.d.materia}</b> : "Todas as matérias"} · 10 questões ao vivo · +200 / −100 XP</p>
          <div className="dsf-barra" aria-hidden><i style={{ width: `${Math.min(100, (restante / 60000) * 100)}%` }} /></div>
          <div className="dsf-btns">
            <button className="dsf-aceitar" disabled={busy} onClick={() => responder(true)} data-testid="desafio-aceitar">ACEITAR</button>
            <button className="dsf-recusar" disabled={busy} onClick={() => responder(false)} data-testid="desafio-recusar">RECUSAR</button>
          </div>
        </div>
      )}
      {aviso && <div key={aviso.n} className={`dsf-toast ${aviso.tom}`} role="status" data-testid="desafio-aviso">{aviso.texto}</div>}
    </>
  );
}
