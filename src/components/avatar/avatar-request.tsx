"use client";

import { useRef, useState, useTransition } from "react";
import { Camera, Lightbulb, Upload, X } from "lucide-react";

export interface AvatarRequestInfo {
  status: "enviada" | "em_producao" | "concluida" | "recusada";
  note: string | null;
  createdAt: string;
}
export type RequestAction = (form: FormData) => Promise<{ ok: true; request: AvatarRequestInfo } | { ok: false; error: string }>;

const STATUS: Record<AvatarRequestInfo["status"], string> = {
  enviada: "Foto recebida — aguardando produção",
  em_producao: "Seu avatar está em produção",
  concluida: "Seu avatar ficou pronto",
  recusada: "A foto não pôde ser usada",
};
/** A hospedagem aceita até ~4,5 MB por envio: a foto é reduzida no próprio aparelho. */
const MAX_SEND = 4_200_000;

async function shrink(file: File): Promise<File> {
  if (file.size <= 1_800_000 && file.type === "image/jpeg") return file;
  try {
    const bmp = await createImageBitmap(file);
    const scale = Math.min(1, 2400 / Math.max(bmp.width, bmp.height));
    const c = document.createElement("canvas");
    c.width = Math.round(bmp.width * scale);
    c.height = Math.round(bmp.height * scale);
    c.getContext("2d")!.drawImage(bmp, 0, 0, c.width, c.height);
    const blob = await new Promise<Blob | null>((r) => c.toBlob(r, "image/jpeg", 0.88));
    return blob ? new File([blob], "corpo-inteiro.jpg", { type: "image/jpeg" }) : file;
  } catch {
    return file;
  }
}

/** "Solicitar meu avatar": envio de uma foto de corpo inteiro (local bem iluminado). */
export function AvatarRequestBox({ initial, action }: { initial: AvatarRequestInfo | null; action: RequestAction }) {
  const [req, setReq] = useState(initial);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const input = useRef<HTMLInputElement>(null);

  const choose = (f: File | null) => {
    setError(null);
    if (preview) URL.revokeObjectURL(preview);
    if (!f) return (setFile(null), setPreview(null));
    if (!f.type.startsWith("image/")) return setError("Escolha uma imagem (foto).");
    setFile(f);
    setPreview(URL.createObjectURL(f));
  };
  const send = () =>
    start(async () => {
      if (!file) return setError("Escolha uma foto de corpo inteiro.");
      const ready = await shrink(file);
      if (ready.size > MAX_SEND) return setError("Não conseguimos reduzir essa foto aqui. Envie em JPG (ou tire a foto de novo pela câmera).");
      const fd = new FormData();
      fd.set("foto", ready);
      const r = await action(fd);
      if (!r.ok) return setError(r.error);
      setReq(r.request);
      setOpen(false);
      choose(null);
    });

  return (
    <div className="avr" data-testid="avatar-solicitar">
      {req && (
        <p className={`avr-status avr-${req.status}`} role="status" data-testid="avatar-solicitacao-status">
          {STATUS[req.status]} · enviada em {new Date(req.createdAt).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" })}
          {req.note ? ` — ${req.note}` : ""}
        </p>
      )}
      {!open ? (
        <button type="button" className="avr-btn" onClick={() => setOpen(true)} data-testid="avatar-solicitar-botao">
          <Camera aria-hidden /> {req ? "Enviar outra foto" : "Solicitar meu avatar"}
        </button>
      ) : (
        <div className="avr-caixa" data-testid="avatar-solicitar-caixa">
          <div className="avr-topo">
            <p className="avr-titulo">Solicitar meu avatar</p>
            <button type="button" className="avr-fechar" aria-label="Fechar" onClick={() => (setOpen(false), choose(null))}>
              <X aria-hidden />
            </button>
          </div>
          <p className="avr-texto">Envie uma foto sua de <b>corpo inteiro</b>, em pé e de frente, da cabeça aos pés. A equipe APROVUM cria o seu personagem a partir dela.</p>
          <p className="avr-obs" data-testid="avatar-obs-iluminacao">
            <Lightbulb aria-hidden />
            <span>
              <b>Observação:</b> o lugar tem que estar <b>bem iluminado</b> (luz de frente, sem contraluz) e com o corpo inteiro aparecendo na foto.
            </span>
          </p>
          <label className={`avr-drop ${preview ? "tem-foto" : ""}`}>
            <input ref={input} type="file" accept="image/*" className="sr-only" onChange={(e) => choose(e.target.files?.[0] ?? null)} data-testid="avatar-foto" />
            {/* eslint-disable-next-line @next/next/no-img-element */}
            {preview ? <img src={preview} alt="Sua foto" /> : (
              <span className="avr-drop-vazio">
                <Upload aria-hidden /> Escolher foto de corpo inteiro
                <small>JPG, PNG, WEBP ou HEIC</small>
              </span>
            )}
          </label>
          {error && (
            <p className="avr-erro" role="alert" data-testid="avatar-solicitar-erro">
              {error}
            </p>
          )}
          <div className="avr-acoes">
            {preview && (
              <button type="button" className="avr-btn avr-btn-sec" onClick={() => input.current?.click()}>
                Trocar foto
              </button>
            )}
            <button type="button" className="avr-btn" disabled={pending || !file} onClick={send} data-testid="avatar-enviar-foto">
              {pending ? "Enviando…" : "Enviar foto"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
