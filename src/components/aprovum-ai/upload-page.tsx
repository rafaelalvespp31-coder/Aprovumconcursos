"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { ArrowLeft, BarChart3, Bell, Briefcase, CalendarDays, Check, ChevronRight, Crown, FolderOpen, Landmark, Target, Trophy, Zap, BrainCircuit } from "lucide-react";
import "./upload-page.css";

const MAX = 25 * 1024 * 1024;
const BUCKET = "editais";
/** Teto técnico (corpo da requisição na Vercel); a interface não corta nada: se passar, avisa e pede para dividir. */
const MAX_CONTENT = 1_500_000;
const size = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

async function sha256(file: File): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

function PdfIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 48 56" fill="none" aria-hidden width="100%" height="100%">
      <path d="M6 4h24l12 12v36H6V4Z" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" fill="#fff" />
      <path d="M30 4v12h12" stroke="currentColor" strokeWidth="3" strokeLinejoin="round" />
      <text x="24" y="42" textAnchor="middle" fontFamily="Barlow Condensed, Inter, sans-serif" fontStyle="italic" fontWeight="800" fontSize="17" fill="currentColor">PDF</text>
    </svg>
  );
}

export function UploadPage({ name, dueReviews, hasPreps }: { name: string | null; dueReviews: number; hasPreps: boolean }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<null | "hash" | "upload" | "start">(null);
  const [err, setErr] = useState<string | null>(null);
  const [more, setMore] = useState(false);
  const [f, setF] = useState({ contestName: "", roleName: "", board: "", year: "" });
  const [content, setContent] = useState("");
  const area = useRef<HTMLTextAreaElement>(null);
  const first = name?.trim().split(/\s+/)[0] ?? null;

  const pick = (list: FileList | null | undefined) => {
    setErr(null);
    const x = list?.[0];
    if (!x) return;
    if (x.type !== "application/pdf" && !/\.pdf$/i.test(x.name)) return setErr("Formato inválido. Envie o edital em PDF.");
    if (x.size === 0) return setErr("O arquivo está vazio.");
    if (x.size > MAX) return setErr(`O PDF tem ${size(x.size)}. O limite é 25 MB.`);
    setFile(x);
  };

  const start = async () => {
    if (!file || busy) return;
    setErr(null);
    try {
      setBusy("hash");
      const hash = await sha256(file);
      if (content.length > MAX_CONTENT) throw new Error(`O conteúdo tem ${content.length.toLocaleString("pt-BR")} caracteres e o limite técnico é ${MAX_CONTENT.toLocaleString("pt-BR")}. Nada foi cortado: divida em duas partes.`);
      const year = f.year.trim() ? Number(f.year) : undefined;
      if (year !== undefined && !(year >= 1990 && year <= 2100)) throw new Error("Ano inválido.");
      const res = await fetch("/api/edital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, size: file.size, hash, contestName: f.contestName.trim() || undefined, roleName: f.roleName.trim() || undefined, board: f.board.trim() || undefined, year, content: content.trim() || undefined }),
      });
      const j = (await res.json()) as { id?: string; upload?: { path: string; token: string } | null; error?: string };
      if (!res.ok || !j.id) throw new Error(j.error ?? "Não foi possível iniciar.");
      if (j.upload) {
        setBusy("upload");
        const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        if (!url || !key) throw new Error("Envio indisponível no momento.");
        const sb = createClient(url, key, { auth: { persistSession: false } });
        const up = await sb.storage.from(BUCKET).uploadToSignedUrl(j.upload.path, j.upload.token, file, { contentType: "application/pdf" });
        if (up.error) throw new Error("Falha no envio do arquivo. Verifique a conexão e tente novamente.");
      }
      setBusy("start");
      router.push(`/aprovum-ai/${j.id}`);
    } catch (e) {
      setErr((e as Error).message || "Não foi possível enviar o edital.");
      setBusy(null);
    }
  };

  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((v) => ({ ...v, [k]: e.target.value }));
  const label = busy === "hash" ? "VERIFICANDO ARQUIVO…" : busy === "upload" ? "ENVIANDO EDITAL…" : busy === "start" ? "INICIANDO…" : "INICIAR PROCESSAMENTO";
  const fields: Array<[keyof typeof f, string, string, React.ReactNode, string?]> = [
    ["contestName", "Nome do concurso", "Ex: Polícia Civil MG", <Trophy key="a" size={22} aria-hidden />],
    ["board", "Banca organizadora", "Ex: Cebraspe", <Landmark key="c" size={22} aria-hidden />],
    ["year", "Ano do concurso", "Ex: 2026", <CalendarDays key="d" size={22} aria-hidden />, "numeric"],
  ];

  return (
    <div className="up" data-testid="ai-home">
      <div className="up-wrap">
        <header className="up-head">
          <div className="up-brand">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="up-mark" src="/icons/aprovum-mark.png" alt="" width={44} height={44} />
            <span className="up-logo">APROVUM <b>AI</b></span>
            <span className="up-sys">INTELLIGENCE SYSTEM</span>
          </div>
          <div className="up-right">
            <Link href="/painel" className="up-back" aria-label="Voltar ao painel"><ArrowLeft size={16} aria-hidden /><span>Painel</span></Link>
            <Link href="/revisoes" className="up-bell" aria-label={`Revisões pendentes: ${dueReviews}`}>
              <Bell size={22} aria-hidden />
              {dueReviews > 0 && <em>{dueReviews > 99 ? "99+" : dueReviews}</em>}
            </Link>
            <Link href="/perfil" className="up-user" aria-label="Perfil">
              <span className="up-ava" aria-hidden>{(first ?? "A").charAt(0).toUpperCase()}</span>
              <span className="n">{first ? `Olá, ${first}!` : "Olá!"}</span>
            </Link>
          </div>
        </header>

        <section className="up-hero" aria-label="Apresentação">
          <div>
            <h1>Transforme seu edital em uma <em>preparação completa.</em></h1>
            <p>Envie o edital do concurso que você deseja conquistar e deixe a APROVUM organizar sua preparação.</p>
            <div className="up-stripes" aria-hidden />
          </div>
          <div className="up-art" aria-hidden>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/images/landing-hero.webp" alt="" />
          </div>
          <p className="up-tagline" aria-hidden>ESTUDE COM INTELIGÊNCIA.<b>CONQUISTE SEU OBJETIVO.</b></p>
        </section>

        <div className="up-grid">
          <section className="up-panel" aria-label="Enviar edital" data-testid="ai-upload">
            <span className="up-tab">{/* eslint-disable-next-line @next/next/no-img-element */}<img src="/icons/aprovum-mark.png" alt="" />APROVUM <b>AI</b></span>
            {!file ? (
              <div
                className="up-drop"
                role="button"
                tabIndex={0}
                data-over={over ? 1 : undefined}
                onClick={() => input.current?.click()}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), input.current?.click())}
                onDragOver={(e) => (e.preventDefault(), setOver(true))}
                onDragLeave={() => setOver(false)}
                onDrop={(e) => (e.preventDefault(), setOver(false), pick(e.dataTransfer.files))}
                aria-label="Selecionar o edital em PDF"
              >
                <span className="up-pdf"><PdfIcon /></span>
                <strong>Arraste o edital aqui</strong>
                <small>ou selecione um arquivo PDF (até 25 MB)</small>
                <span className="up-btn" style={{ marginTop: 4 }}><FolderOpen size={19} aria-hidden />Selecionar arquivo</span>
              </div>
            ) : (
              <div className="up-file">
                <span className="up-pdf"><PdfIcon /></span>
                <div><b title={file.name}>{file.name}</b><small>{size(file.size)} · arquivo válido</small></div>
                <div className="acts">
                  <button type="button" onClick={() => input.current?.click()} disabled={!!busy}>Substituir</button>
                  <button type="button" onClick={() => { setFile(null); if (input.current) input.current.value = ""; }} disabled={!!busy} aria-label="Remover arquivo">Remover</button>
                </div>
              </div>
            )}
            <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pick(e.target.files)} data-testid="ai-arquivo" />

            <div className="up-or">CONTEÚDO PROGRAMÁTICO DO CONCURSO</div>
            <p className="up-help" style={{ fontSize: 13.5, lineHeight: 1.5, margin: "0 0 8px" }}>
              Para aumentar a precisão da análise, cole abaixo o conteúdo programático completo do cargo pretendido, conforme consta no edital. O APROVUM utilizará essas informações em conjunto com o PDF para identificar todas as matérias, tópicos e subtópicos.
            </p>
            <textarea
              ref={area}
              className="up-area"
              value={content}
              onChange={(e) => {
                setContent(e.target.value);
                e.currentTarget.style.height = "auto";
                e.currentTarget.style.height = `${e.currentTarget.scrollHeight}px`;
              }}
              placeholder="Cole aqui o conteúdo programático completo do concurso, incluindo todas as matérias, tópicos e subtópicos…"
              aria-label="Conteúdo programático do concurso"
              data-testid="ai-conteudo"
              rows={6}
              disabled={!!busy}
              style={{ width: "100%", minHeight: 150, resize: "vertical", overflow: "hidden", padding: 12, borderRadius: 12, border: "1.5px solid #cfd2d8", fontSize: 14.5, lineHeight: 1.5, fontFamily: "inherit" }}
            />
            <p style={{ fontSize: 12.5, margin: "6px 0 0", color: content.length > MAX_CONTENT ? "#b0061a" : "inherit" }} data-testid="ai-conteudo-contagem">
              {content.length > 0 ? `${content.length.toLocaleString("pt-BR")} caracteres. ` : ""}Quanto mais completo for o conteúdo informado, mais precisa será a identificação do que você precisa estudar.
            </p>

            <div className="up-or">CARGO PRETENDIDO</div>
            <p className="up-help" style={{ fontSize: 13.5, lineHeight: 1.5, margin: "0 0 8px" }}>
              Selecione o cargo para o qual você está se preparando. Isso permite que o APROVUM identifique somente as matérias e os conteúdos correspondentes à sua função. Se o edital tiver vários cargos e você deixar em branco, mostramos a lista encontrada no PDF para você escolher.
            </p>
            <div className="up-fields">
              <label className="up-f">
                <Briefcase size={22} aria-hidden />
                <span>Cargo pretendido<input value={f.roleName} onChange={set("roleName")} placeholder="Ex: Guarda Civil Municipal" maxLength={160} autoComplete="off" data-testid="ai-cargo-campo" /></span>
              </label>
            </div>

            <div className="up-or">OU PREENCHA OS DADOS DO CONCURSO</div>
            <div className="up-fields">
              {fields.map(([k, title, ph, icon, mode]) => (
                <label key={k} className="up-f">
                  {icon}
                  <span>{title}<input value={f[k]} onChange={set(k)} placeholder={ph} maxLength={k === "year" ? 4 : 160} inputMode={mode as "numeric" | undefined} autoComplete="off" /></span>
                </label>
              ))}
            </div>
            {err && <p className="up-msg" role="alert">{err}</p>}
            <button type="button" className="up-go" disabled={!file || !!busy} aria-busy={!!busy} onClick={start} data-testid="ai-iniciar">
              {busy ? <span className="up-spin" aria-hidden /> : <Zap size={20} aria-hidden />}
              {label}
            </button>
            {hasPreps && <p style={{ marginTop: 12, textAlign: "center", fontSize: 13.5 }}><Link href="/meu-concurso" style={{ color: "#e50919", fontWeight: 700, textDecoration: "underline" }}>Ver minhas preparações</Link></p>}
          </section>

          <aside className="up-side" aria-label="APROVUM AI">
            <div className="up-card">
              <header><Target size={34} aria-hidden /><div><h2>APROVUM AI</h2><small>Inteligência Estratégica</small></div></header>
              <ul className="up-ul">
                {["Extração inteligente do conteúdo programático", "Busca automática nas nossas aulas", "RAIO-X completo do concurso", "Preparação personalizada"].map((t) => <li key={t}><Check aria-hidden />{t}</li>)}
              </ul>
            </div>
            <div className="up-rx">
              <h3>RAIO-X DO EDITAL</h3>
              <p>Diagnóstico estratégico do seu concurso.</p>
              <svg className="ch" viewBox="0 0 200 58" aria-hidden preserveAspectRatio="none">
                {[10, 18, 14, 26, 20, 34, 28, 42].map((h, i) => <rect key={i} x={6 + i * 24} y={56 - h} width="12" height={h} rx="2" fill={i % 2 ? "#e50919" : "#5b5f6a"} />)}
                <polyline points="8,44 36,38 60,41 84,28 108,32 132,18 156,22 192,6" fill="none" stroke="#ff3b44" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              {more && <p style={{ color: "#fff", fontSize: 12.5, lineHeight: 1.45 }}>Dentro da sua preparação, o RAIO-X mostra notas de corte, incidência de matérias e assuntos e prioridades de estudo, com fonte, quando o concurso já foi catalogado pela equipe APROVUM.</p>}
                            <a href="#" onClick={(e) => { e.preventDefault(); setMore((v) => !v); }} role="button" aria-expanded={more}>{more ? "Fechar" : "Saiba mais"}<ChevronRight size={15} aria-hidden /></a>
            </div>
          </aside>
        </div>

        <div className="up-bar" aria-label="Diferenciais">
          <div><BrainCircuit size={30} aria-hidden /><span><b>Análise inteligente</b>do seu edital</span></div>
          <div><BarChart3 size={30} aria-hidden /><span><b>Histórico de provas</b>e notas de corte</span></div>
          <div><Target size={30} aria-hidden /><span><b>Direcionamento</b>preciso</span></div>
          <div><Crown size={30} aria-hidden /><span><b>Sua aprovação</b>mais perto</span></div>
        </div>
        <footer className="up-foot"><strong>APROVUM</strong><small>SUA PREPARAÇÃO. SEU PRÓXIMO CARGO.</small></footer>
      </div>
    </div>
  );
}
