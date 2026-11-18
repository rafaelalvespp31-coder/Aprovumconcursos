"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { EVENTO_DESAFIO } from "@/components/tatico/desafio-watcher";
import { taticoBuscarAction, taticoCancelarDesafioAction, taticoDesafiarAction, taticoMateriasAction } from "./actions";
import type { AlunoBusca, MateriaDesafio, TaticoEstado, TaticoStats } from "@/server/services/tatico";
import "./lobby.css";

const inicial = (n: string) => (n.trim()[0] ?? "?").toUpperCase();

/** Três cartuchos = as 3 tentativas do dia; cada partida iniciada "gasta" um. */
function Municao({ usados }: { usados: number }) {
  return (
    <div className="lb-ammo" aria-label={`Desafios hoje: ${Math.min(3, usados)} de 3`} data-testid="tatico-tentativas">
      <span className="k">TENTATIVAS</span>
      {[0, 1, 2].map((i) => (
        <svg key={i} viewBox="0 0 14 30" className={i < 3 - usados ? "on" : "off"} aria-hidden>
          <path d="M3 10c0-4 1.4-7.5 4-9.5C9.6 2.5 11 6 11 10v18H3z" /><path d="M3 23h8" />
        </svg>
      ))}
      <b>{Math.min(3, usados)}/3</b>
    </div>
  );
}

export function Lobby({ s, stats, erro, onRetomar, onEncerrar }: {
  onEncerrar: () => void; onRetomar: () => void; s: TaticoEstado; stats: TaticoStats; erro: string | null;
}) {
  const usados = "usados" in s && typeof s.usados === "number" ? s.usados : 0;
  const esgotado = s.estado === "limite" || usados >= 3;
  const wr = stats && stats.partidas ? Math.round((100 * stats.vitorias) / stats.partidas) : 0;
  return (
    <div className="lb" data-testid="tatico-lobby">
      <div className="lb-bg" aria-hidden />
      <div className="lb-in">
        <header className="lb-top">
          <Link href="/quiz" className="lb-back">← Modo Jogo</Link>
          <Municao usados={usados} />
        </header>

        <section className="lb-hero">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/tatico/caveira.webp" alt="" className="lb-emblema" draggable={false} />
          <p className="lb-eyebrow">MODO JOGO · 1 × 1 AO VIVO</p>
          <h1>DESAFIO <em>TÁTICO</em></h1>
          <ul className="lb-pills">
            <li>10 questões</li><li className="ok">Vitória +200 XP</li><li className="no">Derrota −100 XP</li><li>Morte súbita no empate</li>
          </ul>
        </section>

        {s.estado === "partida" && s.phase !== "fim" && (
          <div className="lb-panel lb-gold lb-enter" data-testid="tatico-andamento" role="status">
            <p className="lb-pt"><b>{s.solo ? "Seu treino ainda está aberto" : "Você tem uma partida em andamento"}</b></p>
            <div className="lb-row">
              <button onClick={onRetomar} className="lb-btn red">VOLTAR AO ESTANDE</button>
              {s.solo && <button onClick={onEncerrar} data-testid="tatico-encerrar-treino-lobby" className="lb-btn ghost gold">ENCERRAR TREINO</button>}
            </div>
          </div>
        )}

        {esgotado ? (
          <div className="lb-panel lb-gold lb-enter"><p className="lb-pt"><b>Você usou os 3 desafios de hoje.</b></p><p className="lb-sub">Eles voltam amanhã (horário de Brasília).</p></div>
        ) : s.estado === "sem_questoes" ? (
          <div className="lb-panel lb-gold lb-enter"><p className="lb-pt"><b>Ainda não há questões suficientes para o desafio.</b></p></div>
        ) : (
          <DesafiarAluno />
        )}

        {erro && <p role="alert" className="lb-erro">{erro}</p>}

        {stats && stats.partidas > 0 && (
          <section className="lb-stats" data-testid="tatico-stats" aria-label="Seu desempenho">
            <h2 className="lb-h2">SEU DESEMPENHO</h2>
            <div className="lb-tiles">
              {([["Partidas", stats.partidas], ["Vitórias", `${stats.vitorias} · ${wr}%`], ["Derrotas", stats.derrotas], ["Melhor sequência", `${stats.melhorSequencia}x`], ["XP ganho", `+${stats.xpGanho}`], ["XP perdido", `−${stats.xpPerdido}`], ["Acertos", stats.acertos], ["Erros", stats.erros]] as const).map(([a, b]) => (
                <div key={a} className="lb-tile"><span>{a}</span><b>{b}</b></div>
              ))}
            </div>
            {stats.recentes.length > 0 && (
              <ul className="lb-hist" aria-label="Histórico">
                {stats.recentes.map((h) => (
                  <li key={h.match}>
                    <span className={h.venceu ? "v" : "d"}>{h.venceu ? "VITÓRIA" : "DERROTA"}{h.desempate ? " · morte súbita" : ""}</span>
                    <span className="m">{h.acertos} acertos · {h.erros} erros · {new Date(h.quando).toLocaleDateString("pt-BR")}</span>
                  </li>
                ))}
              </ul>
            )}
            {stats.assuntos.length > 0 && (
              <div className="lb-panel">
                <p className="lb-k">ASSUNTOS PARA REFORÇAR</p>
                <ul className="lb-ass">{stats.assuntos.slice(0, 4).map((a) => (
                  <li key={a.assunto}><span>{a.assunto}</span><i style={{ ["--p" as string]: `${a.taxa}%` }} aria-hidden /><b>{a.taxa}%</b></li>
                ))}</ul>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}

function DesafiarAluno() {
  const [q, setQ] = useState("");
  const [lista, setLista] = useState<AlunoBusca[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [materias, setMaterias] = useState<MateriaDesafio[]>([]);
  const [mat, setMat] = useState<string | null>(null);
  const [esp, setEsp] = useState<{ id: string; para: string; materia: string | null } | null>(null);
  const [enviando, setEnviando] = useState<string | null>(null);
  const [restante, setRestante] = useState(60);        // segundos do convite, em contagem regressiva
  const [msg, setMsg] = useState<{ tom: "erro" | "recusa"; texto: string; n: number } | null>(null);

  useEffect(() => { let vivo = true; taticoMateriasAction().then((m) => { if (vivo) setMaterias(m); }); return () => { vivo = false; }; }, []);
  useEffect(() => {
    if (esp) return;
    let vivo = true;
    const buscar = async () => { const r = await taticoBuscarAction(q.trim()); if (vivo) { setLista(r); setCarregando(false); } };
    const t = setTimeout(buscar, q.trim().length >= 2 ? 300 : 0);
    const iv = setInterval(buscar, 2000);        // quem entra/sai da plataforma aparece/some sozinho
    return () => { vivo = false; clearTimeout(t); clearInterval(iv); };
  }, [q, esp]);
  const esperando = !!esp;
  useEffect(() => {
    if (!esperando) return;
    const t0 = Date.now();
    const iv = setInterval(() => setRestante(Math.max(0, 60 - Math.floor((Date.now() - t0) / 1000))), 250);
    return () => clearInterval(iv);
  }, [esperando]);
  useEffect(() => {
    const h = (e: Event) => {
      const d = (e as CustomEvent<{ status: string; para?: string }>).detail;
      if (!d) return;
      if (d.status === "recusado") { setEsp(null); setMsg((m) => ({ tom: "recusa", texto: `${d.para ?? "O aluno"} recusou o desafio.`, n: (m?.n ?? 0) + 1 })); }
      else if (d.status === "expirado") { setEsp(null); setMsg((m) => ({ tom: "recusa", texto: `${d.para ?? "O aluno"} não respondeu ao desafio.`, n: (m?.n ?? 0) + 1 })); }
    };
    window.addEventListener(EVENTO_DESAFIO, h); return () => window.removeEventListener(EVENTO_DESAFIO, h);
  }, []);

  const desafiar = async (a: AlunoBusca) => {
    if (enviando) return;
    setMsg((m) => (m ? { ...m, texto: "" } : null)); setEnviando(a.id);
    const r = await taticoDesafiarAction(a.id, mat);
    setEnviando(null);
    if (!r.ok) { setMsg((m) => ({ tom: "erro", texto: r.erro ?? "Não foi possível desafiar.", n: (m?.n ?? 0) + 1 })); return; }
    setRestante(60);
    setEsp({ id: r.id!, para: r.para ?? a.name, materia: r.materia ?? mat });
  };
  const cancelar = async () => { if (esp) await taticoCancelarDesafioAction(esp.id); setEsp(null); };

  if (esp) {
    return (
      <div className="lb-panel lb-esp lb-enter" data-testid="tatico-aguardando" role="status">
        <div className="lb-radar">
          <svg viewBox="0 0 100 100" aria-hidden><circle cx="50" cy="50" r="46" className="bg" /><circle key={esp.id} cx="50" cy="50" r="46" className="fg" /></svg>
          <i className="ping" aria-hidden /><i className="ping p2" aria-hidden />
          <span className="av">{inicial(esp.para)}</span>
        </div>
        <p className={`lb-cd ${restante <= 10 ? "low" : ""}`} data-testid="tatico-contagem" aria-live="off"><b>{restante}</b><small>s</small></p>
        <p className="lb-k">DESAFIO ENVIADO</p>
        <h3>{esp.para}</h3>
        <p className="lb-mat"><span>{esp.materia ?? "Todas as matérias"}</span></p>
        <p className="lb-sub">Aguardando resposta… o convite expira quando chegar a zero</p>
        <button onClick={cancelar} className="lb-btn ghost">CANCELAR DESAFIO</button>
      </div>
    );
  }
  return (
    <div className="lb-grid">
      <section className="lb-panel lb-enter" aria-labelledby="lb-s1">
        <h2 id="lb-s1" className="lb-step"><i>1</i>ESCOLHA A MATÉRIA</h2>
        <div className="lb-chips" role="group" aria-label="Matéria do desafio" data-testid="tatico-materias">
          <button type="button" aria-pressed={mat === null} className={`lb-chip ${mat === null ? "on" : ""}`} onClick={() => setMat(null)}>
            <b>Todas</b><small>mistura</small>
          </button>
          {materias.map((m) => (
            <button key={m.materia} type="button" aria-pressed={mat === m.materia} className={`lb-chip ${mat === m.materia ? "on" : ""}`} onClick={() => setMat(m.materia)}>
              <b>{m.materia}</b><small>{Number(m.n).toLocaleString("pt-BR")} questões</small>
            </button>
          ))}
        </div>
      </section>

      <section className="lb-panel lb-enter lb-d1" aria-labelledby="lb-s2" data-testid="tatico-lista-alunos">
        <h2 id="lb-s2" className="lb-step"><i>2</i>ESCOLHA O ADVERSÁRIO<span className="lb-live"><b />{lista.length} online</span></h2>
        <label className="lb-busca">
          <svg viewBox="0 0 20 20" aria-hidden><circle cx="8.5" cy="8.5" r="5.5" /><path d="M13 13l4 4" /></svg>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar aluno online pelo nome" aria-label="Buscar aluno" inputMode="search" autoComplete="off" />
          {q && <button type="button" onClick={() => setQ("")} aria-label="Limpar busca">×</button>}
        </label>
        {msg && msg.texto && <p key={msg.n} role="alert" data-testid="tatico-msg-desafio" className={`lb-msg ${msg.tom}`}>{msg.texto}</p>}
        <ul className="lb-alunos">
          {lista.map((a, i) => (
            <li key={a.id} style={{ ["--i" as string]: Math.min(i, 8) }}>
              <span className="av"><b>{inicial(a.name)}</b><i aria-hidden /></span>
              <span className="nm"><strong>{a.name}</strong><small className={a.em_partida ? "emj" : undefined}>{a.em_partida ? "em desafio agora" : "online agora"}</small></span>
              <button onClick={() => desafiar(a)} disabled={!!enviando || a.em_partida} data-testid="tatico-desafiar-btn" className={`lb-btn red sm ${enviando === a.id ? "load" : ""}`}>
                {enviando === a.id ? <><i className="spin" aria-hidden />ENVIANDO</> : (a.em_partida ? "EM DESAFIO" : "DESAFIAR")}
              </button>
            </li>
          ))}
          {!carregando && lista.length === 0 && (
            <li className="vazio">{q.trim().length >= 2 ? "Nenhum aluno online com esse nome." : "Nenhum outro aluno online no momento. Assim que alguém entrar, aparece aqui."}</li>
          )}
          {carregando && lista.length === 0 && [0, 1, 2].map((i) => <li key={i} className="sk" aria-hidden />)}
        </ul>
      </section>
    </div>
  );
}
