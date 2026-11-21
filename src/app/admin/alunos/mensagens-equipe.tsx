"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, Send } from "lucide-react";
import { Recibo } from "@/components/mentor/recibo";
import { dataLista, hora, rotuloDia, rotuloPresenca } from "@/domain/presenca";
import type { TeamMessage, TeamThread } from "@/server/services/team-chat";
import type { StudentActionResult } from "./actions";

export interface AlunoChat { id: string; name: string | null; email: string | null; ghost?: boolean }
type Acao = (id: string, text: string) => Promise<StudentActionResult>;
type Linha = { userId: string; name: string | null; email: string | null; ghost: boolean; thread: TeamThread | null };
type Pres = Record<string, { online: boolean; vistoEm: string | null }>;

const norm = (s: string) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
const POR_PAGINA = 40;
const VERDE = "#00a884";
const nomeDe = (l: Pick<Linha, "name" | "email">) => l.name ?? l.email ?? "Aluno";
const CORES = ["#6a7175", "#7b6bb0", "#3f8f9b", "#c0704a", "#4d8f5b", "#a45b8a", "#5b78a8"];
const corDe = (s: string) => CORES[[...s].reduce((a, c) => a + c.charCodeAt(0), 0) % CORES.length]!;
const ultima = (t: TeamThread | null): TeamMessage | null => t?.messages[t.messages.length - 1] ?? null;

function Avatar({ nome, online, tam = 48 }: { nome: string; online: boolean; tam?: number }) {
  return (
    <span className="relative shrink-0" style={{ width: tam, height: tam }}>
      <span className="flex h-full w-full items-center justify-center rounded-full font-semibold text-white" style={{ background: corDe(nome), fontSize: tam * 0.42, WebkitTextFillColor: "#fff" }} aria-hidden>{[...nome.trim()][0]?.toUpperCase() ?? "?"}</span>
      {online && <span className="absolute bottom-0 right-0 block rounded-full border-2 border-white" style={{ width: tam * 0.3, height: tam * 0.3, background: "#25d366" }} title="online" data-testid="ponto-online" />}
    </span>
  );
}

function Resumo({ m }: { m: TeamMessage | null }) {
  if (!m) return null;
  return (
    <span className="flex min-w-0 items-center gap-1">
      {m.sender === "equipe" && <span style={{ color: "#667781" }}><Recibo deliveredAt={m.deliveredAt} readAt={m.readAt} compacto /></span>}
      <span className="truncate">{m.body || (m.attachmentUrl ? "📷 Foto" : "")}</span>
    </span>
  );
}

function LinhaLista({ l, pres, ativo, onAbrir }: { l: Linha; pres: Pres[string] | undefined; ativo: boolean; onAbrir: () => void }) {
  const nome = nomeDe(l);
  const m = ultima(l.thread);
  const unread = l.thread?.unread ?? 0;
  return (
    <li>
      <button type="button" onClick={onAbrir} aria-current={ativo} className="flex w-full items-center gap-3 px-3 text-left" style={{ background: ativo ? "#f0f2f5" : "#fff" }} data-testid="equipe-conversa">
        <Avatar nome={nome} online={!!pres?.online} />
        <span className="min-w-0 flex-1 border-b py-3" style={{ borderColor: "#e9edef" }}>
          <span className="flex items-baseline justify-between gap-2">
            <strong className="truncate text-[15px] font-medium" style={{ color: "#111b21", WebkitTextFillColor: "#111b21" }}>{nome}{l.ghost ? " (fantasma)" : ""}</strong>
            {m && <span className="shrink-0 text-xs" style={{ color: unread ? "#1fa855" : "#667781" }}>{dataLista(m.createdAt)}</span>}
          </span>
          <span className="mt-0.5 flex items-center justify-between gap-2 text-[13px]" style={{ color: "#667781" }}>
            {m ? <Resumo m={m} /> : <span className="truncate" style={pres?.online ? { color: "#1fa855" } : undefined}>{rotuloPresenca(pres)}</span>}
            {unread > 0 && <span className="flex h-5 min-w-5 shrink-0 items-center justify-center rounded-full px-1.5 text-xs font-bold text-white" style={{ background: "#25d366", WebkitTextFillColor: "#fff" }}>{unread}</span>}
          </span>
        </span>
      </button>
    </li>
  );
}

function Painel({ l, pres, reply, markRead, seen, voltar }: { l: Linha; pres: Pres[string] | undefined; reply: Acao; markRead: (id: string) => Promise<StudentActionResult>; seen: (id: string) => Promise<StudentActionResult>; voltar: () => void }) {
  const t = l.thread;
  const msgs = useMemo(() => t?.messages ?? [], [t]);
  const unread = t?.unread ?? 0;
  const naoLidas = msgs.some((m) => m.sender === "aluno" && !m.readAt);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const rolagem = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const nome = nomeDe(l);
  const online = !!pres?.online;

  // Conversa aberta na tela = "Lido" (tiques azuis) para o aluno, inclusive para mensagens que chegam com ela aberta.
  useEffect(() => { if (naoLidas) void seen(l.userId); }, [naoLidas, seen, l.userId]);
  // Sempre mostra o fim da conversa, como no WhatsApp.
  useEffect(() => { const el = rolagem.current; if (el) el.scrollTop = el.scrollHeight; }, [msgs.length, l.userId]);

  const enviar = () => start(async () => {
    setErro(null);
    const r = await reply(l.userId, texto);
    if (r.ok) { setTexto(""); if (campo.current) campo.current.style.height = "auto"; } else setErro(r.error);
  });
  const cresce = (el: HTMLTextAreaElement) => { el.style.height = "auto"; el.style.height = `${Math.min(el.scrollHeight, 128)}px`; };

  return (
    <>
      <header className="flex items-center gap-3 px-3 py-2" style={{ background: "#f0f2f5" }}>
        <button type="button" onClick={voltar} aria-label="Voltar para as conversas" className="-ml-1 flex size-9 items-center justify-center rounded-full md:hidden" style={{ color: "#54656f" }}><ArrowLeft className="size-5" /></button>
        <Avatar nome={nome} online={online} tam={40} />
        <div className="min-w-0 flex-1">
          <strong className="block truncate text-[15px] font-medium" style={{ color: "#111b21", WebkitTextFillColor: "#111b21" }}>{nome}</strong>
          <span className="block truncate text-xs" style={{ color: online ? VERDE : "#667781" }} aria-live="polite" data-testid="equipe-status">{rotuloPresenca(pres)}</span>
        </div>
        {unread > 0 && <button type="button" disabled={pending} onClick={() => start(async () => void (await markRead(l.userId)))} className="shrink-0 rounded-full border px-3 py-1 text-xs font-semibold disabled:opacity-60" style={{ borderColor: "#d1d7db", color: "#54656f", background: "#fff" }}>Marcar como atendida</button>}
      </header>

      <div ref={rolagem} className="flex min-h-0 flex-1 flex-col gap-1 overflow-y-auto px-3 py-3 md:px-[6%]" style={{ background: "#efeae2" }}>
        {msgs.length === 0 && <p className="m-auto max-w-xs rounded-lg px-3 py-2 text-center text-xs" style={{ background: "#fff3c5", color: "#54656f" }}>Nenhuma mensagem ainda. Escreva abaixo para iniciar a conversa: o aluno vê um pop-up no app e recebe um aviso no celular, se tiver ativado.</p>}
        {msgs.map((m, i) => {
          const d = rotuloDia(m.createdAt);
          const novo = i === 0 || rotuloDia(msgs[i - 1]!.createdAt) !== d;
          const meu = m.sender === "equipe";
          return (
            <div key={m.id} className="contents">
              {novo && <span className="mx-auto my-2 rounded-lg px-3 py-1 text-xs shadow-sm" style={{ background: "#fff", color: "#54656f" }}>{d}</span>}
              <div className="max-w-[82%] whitespace-pre-wrap break-words rounded-lg px-2.5 py-1.5 text-[14.2px] shadow-sm" style={{ alignSelf: meu ? "flex-end" : "flex-start", background: meu ? "#d9fdd3" : "#fff", color: "#111b21", WebkitTextFillColor: "#111b21", borderTopRightRadius: meu ? 0 : undefined, borderTopLeftRadius: meu ? undefined : 0 }}>
                {m.attachmentUrl && (
                  <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mb-1 block" aria-label="Abrir a imagem em tamanho cheio">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={m.attachmentUrl} alt="Imagem enviada pelo aluno" loading="lazy" className="max-h-64 w-full rounded-md object-contain" />
                  </a>
                )}
                {m.body}
                <span className="mt-0.5 flex items-center justify-end gap-1 text-[11px]" style={{ color: "#667781", WebkitTextFillColor: "#667781" }}>{hora(m.createdAt)}{meu && <Recibo deliveredAt={m.deliveredAt} readAt={m.readAt} compacto />}</span>
              </div>
            </div>
          );
        })}
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if (texto.trim() && !pending) enviar(); }} className="px-2 py-2" style={{ background: "#f0f2f5" }}>
        {erro && <p role="alert" className="px-2 pb-1 text-xs font-semibold" style={{ color: "#b3261e" }}>{erro}</p>}
        <div className="flex items-end gap-2">
          <textarea ref={campo} value={texto} rows={1} maxLength={1000} onChange={(e) => { setTexto(e.target.value); cresce(e.currentTarget); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer: fine)").matches) { e.preventDefault(); if (texto.trim() && !pending) enviar(); } }}
            placeholder="Digite uma mensagem" aria-label="Mensagem para o aluno" className="max-h-32 min-h-10 flex-1 resize-none rounded-3xl border-0 bg-white px-4 py-2.5 text-[15px] outline-none" style={{ color: "#111b21", WebkitTextFillColor: "#111b21" }} />
          <button type="submit" disabled={pending || !texto.trim()} aria-label="Enviar mensagem" className="flex size-10 shrink-0 items-center justify-center rounded-full text-white transition-opacity disabled:opacity-50" style={{ background: VERDE, WebkitTextFillColor: "#fff" }}><Send className="size-5" /></button>
        </div>
      </form>
    </>
  );
}

/** Chat da Equipe no estilo WhatsApp: lista de TODOS os alunos (com online/offline) e a conversa ao lado. */
export function MensagensEquipe({ threads, students, reply, markRead, seen }: { threads: TeamThread[]; students: AlunoChat[]; reply: Acao; markRead: (id: string) => Promise<StudentActionResult>; seen: (id: string) => Promise<StudentActionResult> }) {
  const router = useRouter();
  const [busca, setBusca] = useState("");
  const [filtro, setFiltro] = useState<"todos" | "conversas" | "novas" | "online">("todos");
  const [pagina, setPagina] = useState(1);
  const [sel, setSel] = useState<string | null>(null);
  const [pres, setPres] = useState<Pres>({});

  // Mensagens novas e recibos aparecem sem recarregar a página.
  useEffect(() => {
    const t = setInterval(() => { if (document.visibilityState === "visible") router.refresh(); }, 10000);
    return () => clearInterval(t);
  }, [router]);
  // Online/offline em tempo quase real (a cada 4 s), a partir da batida de presença do app do aluno.
  useEffect(() => {
    let vivo = true;
    const buscar = async () => {
      try {
        const r = await fetch("/api/admin/presenca", { cache: "no-store" });
        if (r.ok && vivo) setPres(((await r.json()) as { alunos: Pres }).alunos ?? {});
      } catch { /* sem rede: tenta no próximo ciclo */ }
    };
    const primeira = setTimeout(() => void buscar(), 0);
    const tick = () => { if (document.visibilityState === "visible") void buscar(); };
    const id = setInterval(tick, 4000);
    document.addEventListener("visibilitychange", tick);
    return () => { vivo = false; clearTimeout(primeira); clearInterval(id); document.removeEventListener("visibilitychange", tick); };
  }, []);

  const linhas = useMemo<Linha[]>(() => {
    const por = new Map(threads.map((t) => [t.userId, t]));
    const base: Linha[] = students.map((s) => ({ userId: s.id, name: s.name, email: s.email, ghost: !!s.ghost, thread: por.get(s.id) ?? null }));
    const conhecidos = new Set(students.map((s) => s.id));
    for (const t of threads) if (!conhecidos.has(t.userId)) base.push({ userId: t.userId, name: t.name, email: t.email, ghost: false, thread: t });
    // Como no WhatsApp: conversa mais recente no topo; quem ainda não tem conversa vem depois, em ordem alfabética.
    return base.sort((a, b) => (b.thread ? 1 : 0) - (a.thread ? 1 : 0) || (b.thread?.lastAt ?? "").localeCompare(a.thread?.lastAt ?? "") || nomeDe(a).localeCompare(nomeDe(b), "pt-BR"));
  }, [threads, students]);

  const q = norm(busca.trim());
  const naoLidas = linhas.filter((l) => (l.thread?.unread ?? 0) > 0).length;
  const onlineN = linhas.filter((l) => pres[l.userId]?.online).length;
  const filtradas = linhas.filter((l) => (filtro === "todos" || (filtro === "conversas" && l.thread) || (filtro === "novas" && (l.thread?.unread ?? 0) > 0) || (filtro === "online" && pres[l.userId]?.online)) && (!q || norm(`${l.name ?? ""} ${l.email ?? ""}`).includes(q)));
  const visiveis = filtradas.slice(0, pagina * POR_PAGINA);
  const atual = sel ? linhas.find((l) => l.userId === sel) ?? null : null;
  const chip = (id: typeof filtro, rotulo: string) => (
    <button type="button" onClick={() => { setFiltro(id); setPagina(1); }} aria-pressed={filtro === id} className="shrink-0 rounded-full px-3 py-1 text-[13px] font-medium" style={filtro === id ? { background: "#d9fdd3", color: "#0a5c36", WebkitTextFillColor: "#0a5c36" } : { background: "#f0f2f5", color: "#54656f", WebkitTextFillColor: "#54656f" }}>{rotulo}</button>
  );

  return (
    <section id="mensagens" className="mt-4 scroll-mt-20" data-testid="mensagens-equipe">
      <h2 className="t-small font-bold">Chat com os alunos <span className="font-normal text-tinta-fraca">· {onlineN} online agora{naoLidas > 0 ? ` · ${naoLidas} com mensagem nova` : ""}</span></h2>
      <div className="mt-2 flex h-[min(78vh,680px)] overflow-hidden rounded-lg border" style={{ borderColor: "#d1d7db", background: "#fff" }}>
        <aside className={`${atual ? "hidden md:flex" : "flex"} w-full min-w-0 flex-col md:w-[360px] md:shrink-0 md:border-r`} style={{ borderColor: "#e9edef" }}>
          <div className="flex flex-col gap-2 px-3 py-2" style={{ background: "#fff" }}>
            <label className="flex items-center gap-3 rounded-lg px-3" style={{ background: "#f0f2f5" }}>
              <Search className="size-4 shrink-0" style={{ color: "#667781" }} aria-hidden />
              <input type="search" value={busca} onChange={(e) => { setBusca(e.target.value); setPagina(1); }} placeholder="Pesquisar aluno por nome ou e-mail" aria-label="Buscar aluno" className="min-h-9 w-full bg-transparent text-sm outline-none" style={{ color: "#111b21", WebkitTextFillColor: "#111b21" }} data-testid="equipe-busca" />
            </label>
            <div className="flex gap-2 overflow-x-auto pb-0.5">
              {chip("todos", `Todos (${linhas.length})`)}
              {chip("novas", `Não lidas (${naoLidas})`)}
              {chip("online", `Online (${onlineN})`)}
              {chip("conversas", `Conversas (${linhas.filter((l) => l.thread).length})`)}
            </div>
          </div>
          <ul className="min-h-0 flex-1 overflow-y-auto">
            {filtradas.length === 0 ? <li className="p-4 text-center text-sm" style={{ color: "#667781" }}>Nenhum aluno encontrado.</li> : visiveis.map((l) => <LinhaLista key={l.userId} l={l} pres={pres[l.userId]} ativo={l.userId === sel} onAbrir={() => setSel(l.userId)} />)}
            {visiveis.length < filtradas.length && (
              <li className="p-3 text-center"><button type="button" onClick={() => setPagina((p) => p + 1)} className="rounded-full border px-4 py-1.5 text-sm font-medium" style={{ borderColor: "#d1d7db", color: "#54656f" }}>Mostrar mais ({filtradas.length - visiveis.length})</button></li>
            )}
          </ul>
        </aside>
        <div className={`${atual ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col`} style={{ background: "#efeae2" }}>
          {atual ? <Painel key={atual.userId} l={atual} pres={pres[atual.userId]} reply={reply} markRead={markRead} seen={seen} voltar={() => setSel(null)} /> : (
            <div className="m-auto max-w-xs p-6 text-center" style={{ color: "#667781" }}>
              <p className="text-lg font-light" style={{ color: "#41525d" }}>Chat da Equipe APROVUM</p>
              <p className="mt-1 text-sm">Selecione um aluno na lista para ver a conversa ou iniciar uma nova.</p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
