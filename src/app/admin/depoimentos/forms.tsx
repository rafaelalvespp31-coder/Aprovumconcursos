"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, inputClass } from "@/components/ui";
import type { TestimonialAdminRow } from "@/server/services/testimonials";

type Result = { ok: boolean; error?: string };
type Prepare = (type: string, size: number) => Promise<{ ok: true; path: string; signedUrl: string; publicUrl: string; kind: "video" | "photo" } | { ok: false; error: string }>;
type Create = (i: { name: string; headline?: string; videoUrl?: string; photoUrl?: string; paths?: string[] }) => Promise<Result>;

/** Envia o arquivo direto ao armazenamento (URL assinada), sem passar pelo limite de tamanho do servidor. */
async function upload(file: File, prepare: Prepare): Promise<{ path: string; publicUrl: string; kind: "video" | "photo" }> {
  const p = await prepare(file.type, file.size);
  if (!p.ok) throw new Error(p.error);
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", file);
  const res = await fetch(p.signedUrl, { method: "PUT", body, headers: { "x-upsert": "false" } });
  if (!res.ok) throw new Error("O envio do arquivo falhou. Confira o tamanho e a conexão e tente de novo.");
  return { path: p.path, publicUrl: p.publicUrl, kind: p.kind };
}

export function TestimonialForm({ prepare, create }: { prepare: Prepare; create: Create }) {
  const router = useRouter();
  const [name, setName] = useState("");
  const [headline, setHeadline] = useState("");
  const [link, setLink] = useState("");
  const [video, setVideo] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const submit = () =>
    start(async () => {
      setMsg(null);
      try {
        const paths: string[] = [];
        let videoUrl: string | undefined = link.trim() || undefined;
        let photoUrl: string | undefined;
        if (video) {
          const u = await upload(video, prepare);
          if (u.kind !== "video") throw new Error("O arquivo de vídeo não é um vídeo.");
          videoUrl = u.publicUrl;
          paths.push(u.path);
        }
        if (photo) {
          const u = await upload(photo, prepare);
          if (u.kind !== "photo") throw new Error("O arquivo de foto não é uma imagem.");
          photoUrl = u.publicUrl;
          paths.push(u.path);
        }
        const r = await create({ name, headline: headline || undefined, videoUrl, photoUrl, paths });
        if (!r.ok) throw new Error(r.error);
        setName("");
        setHeadline("");
        setLink("");
        setVideo(null);
        setPhoto(null);
        setMsg("Depoimento publicado.");
        router.refresh();
      } catch (e) {
        setMsg((e as Error).message);
      }
    });

  return (
    <div className="grid max-w-2xl gap-3 rounded-lg border border-linha bg-superficie p-4" data-testid="depoimento-form">
      <label className="flex flex-col gap-1 t-small font-semibold">Nome do aluno
        <input className={inputClass} value={name} maxLength={80} onChange={(e) => setName(e.target.value)} data-testid="dep-nome" />
      </label>
      <label className="flex flex-col gap-1 t-small font-semibold">Frase de destaque (opcional)
        <input className={inputClass} value={headline} maxLength={160} onChange={(e) => setHeadline(e.target.value)} placeholder="Ex.: Aprovado na Polícia Penal MG em 8 meses" />
      </label>
      <label className="flex flex-col gap-1 t-small font-semibold">Vídeo (arquivo MP4, WEBM ou MOV até 50 MB)
        <input type="file" accept="video/mp4,video/webm,video/quicktime" className="text-sm" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} data-testid="dep-video" />
      </label>
      <label className="flex flex-col gap-1 t-small font-semibold">…ou link do vídeo (YouTube/Vimeo)
        <input className={inputClass} value={link} onChange={(e) => setLink(e.target.value)} placeholder="https://youtu.be/…" inputMode="url" data-testid="dep-link" />
      </label>
      <label className="flex flex-col gap-1 t-small font-semibold">Foto do aluno (JPG, PNG ou WEBP até 8 MB)
        <input type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} data-testid="dep-foto" />
      </label>
      <div className="flex items-center gap-3">
        <Button type="button" disabled={pending || !name.trim() || (!video && !photo && !link.trim())} onClick={submit}>{pending ? "Enviando…" : "Publicar depoimento"}</Button>
        {msg && <span role="status" className="t-small">{msg}</span>}
      </div>
    </div>
  );
}

export function TestimonialList({ rows, toggle, remove }: { rows: TestimonialAdminRow[]; toggle: (id: string, a: boolean) => Promise<Result>; remove: (id: string) => Promise<Result> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  if (!rows.length) return <p className="t-small text-tinta-suave">Nenhum depoimento ainda.</p>;
  const run = (fn: () => Promise<Result>) =>
    start(async () => {
      const r = await fn();
      setMsg(r.ok ? null : (r.error ?? "Erro."));
      router.refresh();
    });
  return (
    <>
      {msg && <p role="alert" className="t-small text-erro">{msg}</p>}
      <ul className="flex flex-col gap-2">
        {rows.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-lg border border-linha bg-superficie p-3" data-testid="dep-item">
            {r.photoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={r.photoUrl} alt="" className="h-16 w-16 rounded object-cover" />
            ) : (
              <span className="flex h-16 w-16 items-center justify-center rounded bg-nevoa t-tiny">vídeo</span>
            )}
            <div className="min-w-0 flex-1">
              <p className="font-semibold">{r.name}</p>
              {r.headline && <p className="t-small text-tinta-suave">{r.headline}</p>}
              <p className="t-tiny text-tinta-fraca">{r.videoUrl ? "com vídeo" : "só foto"}{r.photoUrl && r.videoUrl ? " + foto" : ""} · {r.active ? "visível" : "oculto"}</p>
            </div>
            <button type="button" disabled={pending} className="t-small font-semibold underline" onClick={() => run(() => toggle(r.id, !r.active))}>{r.active ? "Ocultar" : "Mostrar"}</button>
            <button type="button" disabled={pending} className="t-small font-semibold text-erro underline" onClick={() => confirm("Apagar este depoimento e os arquivos enviados?") && run(() => remove(r.id))}>Apagar</button>
          </li>
        ))}
      </ul>
    </>
  );
}
