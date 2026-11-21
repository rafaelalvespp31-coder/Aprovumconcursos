"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Camera, ImagePlus, MessageCircle, Send, X } from "lucide-react";
import type { TeamMessage } from "@/server/services/team-chat";
import { Recibo } from "./recibo";
import { equipeListAction, equipeSendAction } from "@/app/(app)/mentor/actions";

const hora = (iso: string) => new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });

const MAX_LADO = 1600;

/** Reduz a foto/print (lado maior 1600 px, JPEG) para caber no envio e abrir rápido para a Equipe. */
async function prepararImagem(file: File): Promise<Blob> {
  if (file.size <= 600 * 1024 && /^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  const bmp = await createImageBitmap(file);
  const k = Math.min(1, MAX_LADO / Math.max(bmp.width, bmp.height));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(bmp.width * k));
  c.height = Math.max(1, Math.round(bmp.height * k));
  const ctx = c.getContext("2d");
  if (!ctx) throw new Error("sem canvas");
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, c.width, c.height);
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.82));
  if (!blob) throw new Error("falha ao converter");
  return blob;
}

/** Chat para tirar dúvida com a Equipe APROVUM. As mensagens chegam no painel da equipe (aba Alunos). */
export function EquipeChat({ tema = "escuro" }: { tema?: "claro" | "escuro" }) {
  const [msgs, setMsgs] = useState<TeamMessage[] | null>(null);
  const [texto, setTexto] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const fim = useRef<HTMLDivElement>(null);
  const [foto, setFoto] = useState<{ blob: Blob; url: string } | null>(null);
  const [preparando, setPreparando] = useState(false);
  const aoEscolher = async (file: File | undefined) => {
    if (!file) return;
    setErro(null);
    if (!file.type.startsWith("image/")) return setErro("Escolha uma imagem (foto ou print).");
    setPreparando(true);
    try {
      const blob = await prepararImagem(file);
      if (blob.size > 4 * 1024 * 1024) return setErro("A imagem é grande demais. Tire um print menor.");
      setFoto((a) => { if (a) URL.revokeObjectURL(a.url); return { blob, url: URL.createObjectURL(blob) }; });
    } catch {
      setErro("Não consegui ler essa imagem. Tente outra.");
    } finally {
      setPreparando(false);
    }
  };
  const limparFoto = () => { setFoto((a) => { if (a) URL.revokeObjectURL(a.url); return null; }); };
  const cor = tema === "escuro" ? "#fff" : "#08090B";
  const dim = tema === "escuro" ? "rgba(255,255,255,.7)" : "#64666D";

  useEffect(() => {
    let vivo = true;
    const carregar = () => equipeListAction().then((r) => { if (!vivo) return; if (r.ok) setMsgs(r.messages); else setErro((e) => e ?? r.error); }).catch(() => undefined);
    carregar();
    const t = setInterval(() => { if (document.visibilityState === "visible") carregar(); }, 8000);
    return () => { vivo = false; clearInterval(t); };
  }, []);

  useEffect(() => { fim.current?.scrollIntoView({ block: "nearest" }); }, [msgs?.length]);

  const enviar = () => start(async () => {
    setErro(null);
    let path: string | null = null;
    if (foto) {
      const fd = new FormData();
      fd.append("file", foto.blob, "anexo");
      try {
        const res = await fetch("/api/equipe/anexo", { method: "POST", body: fd });
        const j = (await res.json().catch(() => null)) as { ok?: boolean; path?: string; error?: string } | null;
        if (!res.ok || !j?.ok || !j.path) return setErro(j?.error ?? "Não foi possível enviar a imagem agora.");
        path = j.path;
      } catch {
        return setErro("Sem conexão para enviar a imagem. Tente de novo.");
      }
    }
    const r = await equipeSendAction(texto, path);
    if (!r.ok) return setErro(r.error);
    setMsgs(r.messages);
    setTexto("");
    limparFoto();
  });

  return (
    <div className="flex flex-col gap-3" data-testid="equipe-chat">
      <div className="rounded-2xl rounded-tl-sm bg-[#111] p-3.5">
        <p className="flex items-center gap-2 text-[14px] font-bold" style={{ color: "#fff", WebkitTextFillColor: "#fff" }}><MessageCircle className="h-4 w-4 text-[#ff5a52]" aria-hidden /> Fale com a nossa Equipe</p>
        <p className="mt-1 text-[12px]" style={{ color: "rgba(255,255,255,.7)", WebkitTextFillColor: "rgba(255,255,255,.7)" }}>Tire dúvidas sobre a plataforma, seu plano ou seus estudos. A Equipe APROVUM responde por aqui.</p>
      </div>

      <div className="flex max-h-[46vh] min-h-24 flex-col gap-2 overflow-y-auto pr-1" role="log" aria-live="polite" aria-label="Conversa com a Equipe APROVUM">
        {msgs === null && !erro && <p className="text-[12.5px]" style={{ color: dim, WebkitTextFillColor: dim }}>Carregando conversa…</p>}
        {msgs?.length === 0 && <p className="text-[12.5px]" style={{ color: dim, WebkitTextFillColor: dim }}>Ainda não há mensagens. Escreva a sua dúvida abaixo.</p>}
        {msgs?.map((m) => (
          <div key={m.id} className={`max-w-[88%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-[13.5px] leading-snug ${m.sender === "aluno" ? "self-end rounded-br-sm bg-[#E10600]" : "self-start rounded-bl-sm bg-[#F1F1F3]"}`}
            style={m.sender === "aluno" ? { color: "#fff", WebkitTextFillColor: "#fff" } : { color: "#08090B", WebkitTextFillColor: "#08090B" }} data-testid={m.sender === "aluno" ? "equipe-msg-aluno" : "equipe-msg-equipe"}>
            {m.sender === "equipe" && <b className="mb-0.5 block text-[11px] uppercase tracking-wide text-[#E10600]" style={{ WebkitTextFillColor: "#E10600" }}>Equipe APROVUM</b>}
            {m.attachmentUrl && (
              <a href={m.attachmentUrl} target="_blank" rel="noopener noreferrer" className="mb-1 block" aria-label="Abrir a imagem anexada">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={m.attachmentUrl} alt="Imagem enviada na conversa" loading="lazy" className="max-h-56 w-full rounded-lg object-cover" />
              </a>
            )}
            {m.body}
            <span className="mt-0.5 flex items-center justify-end gap-2 text-[10.5px] opacity-80">{hora(m.createdAt)}{m.sender === "aluno" && <Recibo deliveredAt={m.deliveredAt} readAt={m.readAt} escuro />}</span>
          </div>
        ))}
        <div ref={fim} />
      </div>

      <form onSubmit={(e) => { e.preventDefault(); if ((texto.trim() || foto) && !pending && !preparando) enviar(); }} className="flex flex-col gap-2">
        <textarea value={texto} onChange={(e) => setTexto(e.target.value)} maxLength={1000} rows={3} placeholder="Escreva a sua dúvida (ou anexe um print do erro)…" aria-label="Mensagem para a Equipe APROVUM" data-testid="equipe-input"
          onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey) && texto.trim() && !pending) { e.preventDefault(); enviar(); } }}
          className="w-full resize-none rounded-xl border border-[#D4D4D4] bg-white p-3 text-[16px] text-[#08090B] caret-[#08090B] outline-none focus:border-[#E10600]" style={{ color: "#08090B", WebkitTextFillColor: "#08090B" }} />
        {foto && (
          <div className="relative w-fit" data-testid="equipe-previa">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={foto.url} alt="Prévia da imagem que será enviada" className="max-h-32 rounded-lg border border-white/25" />
            <button type="button" onClick={limparFoto} aria-label="Remover a imagem" className="absolute -right-2 -top-2 grid size-7 place-items-center rounded-full bg-[#E10600]" style={{ color: "#fff", WebkitTextFillColor: "#fff" }}><X className="h-4 w-4" aria-hidden /></button>
          </div>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-white/30 bg-white px-3 text-[13px] font-bold text-[#08090B]" data-testid="equipe-foto">
            <Camera className="h-4 w-4" aria-hidden /> Tirar foto
            <input type="file" accept="image/*" capture="environment" className="sr-only" onChange={(e) => { void aoEscolher(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          <label className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-xl border border-white/30 bg-white px-3 text-[13px] font-bold text-[#08090B]" data-testid="equipe-anexar">
            <ImagePlus className="h-4 w-4" aria-hidden /> Anexar imagem
            <input type="file" accept="image/jpeg,image/png,image/webp,image/*" className="sr-only" onChange={(e) => { void aoEscolher(e.target.files?.[0]); e.target.value = ""; }} />
          </label>
          {preparando && <span className="text-[12px]" style={{ color: dim, WebkitTextFillColor: dim }}>Preparando imagem…</span>}
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px]" style={{ color: dim, WebkitTextFillColor: dim }}>{texto.length}/1000</span>
          <button type="submit" disabled={pending || preparando || (!texto.trim() && !foto)} className="inline-flex min-h-11 items-center gap-1.5 rounded-xl bg-[#E10600] px-5 text-[14px] font-extrabold disabled:opacity-50" style={{ color: "#fff", WebkitTextFillColor: "#fff" }} data-testid="equipe-enviar">
            <Send className="h-4 w-4" aria-hidden /> {pending ? "Enviando…" : "Enviar"}
          </button>
        </div>
        {erro && <p role="alert" className="text-[12.5px] font-semibold text-[#ff8a84]">{erro}</p>}
      </form>
      <span className="sr-only" style={{ color: cor }}>Conversa com a Equipe</span>
    </div>
  );
}
