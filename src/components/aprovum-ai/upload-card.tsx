"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import "./aprovum-ai.css";

const MAX = 25 * 1024 * 1024;
const BUCKET = "editais";

const size = (n: number) => (n >= 1048576 ? `${(n / 1048576).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`);

async function sha256(file: File): Promise<string> {
  const buf = await file.arrayBuffer();
  const d = await crypto.subtle.digest("SHA-256", buf);
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Card de envio do edital: arrastar e soltar, validação, campos opcionais e envio direto ao armazenamento seguro. */
export function UploadCard() {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState<null | "hash" | "upload" | "start">(null);
  const [err, setErr] = useState<string | null>(null);
  const [f, setF] = useState({ contestName: "", roleName: "", board: "", year: "" });

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
      const year = f.year.trim() ? Number(f.year) : undefined;
      if (year !== undefined && !(year >= 1990 && year <= 2100)) throw new Error("Ano inválido.");
      const res = await fetch("/api/edital", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileName: file.name, size: file.size, hash, contestName: f.contestName || undefined, roleName: f.roleName || undefined, board: f.board || undefined, year }),
      });
      const j = (await res.json()) as { id?: string; existing?: boolean; upload?: { path: string; token: string } | null; error?: string };
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

  const label = busy === "hash" ? "VERIFICANDO ARQUIVO…" : busy === "upload" ? "ENVIANDO EDITAL…" : busy === "start" ? "INICIANDO…" : "INICIAR PROCESSAMENTO";
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF((v) => ({ ...v, [k]: e.target.value }));

  return (
    <div className="ai-card ai-root" data-testid="ai-upload">
      {!file ? (
        <div
          className="ai-drop"
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
          <span className="ai-pdf" aria-hidden>PDF</span>
          <b>Arraste o edital aqui</b>
          <small>ou toque para selecionar · PDF de até 25 MB</small>
          <span className="ai-ghost" style={{ lineHeight: "44px", marginTop: 4 }}>Selecionar arquivo</span>
        </div>
      ) : (
        <div className="ai-file">
          <span className="ai-pdf" aria-hidden>PDF</span>
          <div>
            <b title={file.name}>{file.name}</b>
            <small>{size(file.size)} · formato válido</small>
          </div>
          <button type="button" className="ai-x" onClick={() => { setFile(null); if (input.current) input.current.value = ""; }} disabled={!!busy} aria-label="Remover arquivo">✕</button>
        </div>
      )}
      <input ref={input} type="file" accept="application/pdf,.pdf" hidden onChange={(e) => pick(e.target.files)} data-testid="ai-arquivo" />

      <div className="ai-fields">
        <label className="ai-field"><span>Nome do concurso (opcional)</span><input value={f.contestName} onChange={set("contestName")} maxLength={160} placeholder="Ex.: PRF 2026" autoComplete="off" /></label>
        <label className="ai-field"><span>Cargo pretendido (opcional)</span><input value={f.roleName} onChange={set("roleName")} maxLength={160} placeholder="Ex.: Policial Rodoviário Federal" autoComplete="off" /></label>
        <label className="ai-field"><span>Banca organizadora (opcional)</span><input value={f.board} onChange={set("board")} maxLength={80} placeholder="Ex.: Cebraspe" autoComplete="off" /></label>
        <label className="ai-field"><span>Ano do concurso (opcional)</span><input value={f.year} onChange={set("year")} inputMode="numeric" maxLength={4} placeholder="2026" autoComplete="off" /></label>
      </div>
      {err && <p className="ai-msg" role="alert">{err}</p>}
      <button type="button" className="ai-go" disabled={!file || !!busy} aria-busy={!!busy} onClick={start} data-testid="ai-iniciar">{label}</button>
    </div>
  );
}
