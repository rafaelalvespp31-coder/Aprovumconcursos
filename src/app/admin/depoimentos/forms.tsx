"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Button, inputClass } from "@/components/ui";
import { TESTIMONIAL_CATEGORIES, type Founder, type StoryQuote } from "@/domain/testimonials";
import type { TestimonialAdminRow } from "@/server/services/testimonials";
import type { TestimonialInput } from "./actions";

type Result = { ok: boolean; error?: string };
type Prepare = (type: string, size: number) => Promise<{ ok: true; path: string; signedUrl: string; publicUrl: string; kind: "video" | "photo" } | { ok: false; error: string }>;
type Save = (input: TestimonialInput) => Promise<Result>;

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

const parseDuration = (s: string): number | undefined => {
  const t = s.trim();
  if (!t) return undefined;
  const m = /^(\d+):([0-5]?\d)$/.exec(t);
  if (m) return Number(m[1]) * 60 + Number(m[2]);
  return /^\d+$/.test(t) ? Number(t) : undefined;
};
const fmtDur = (n?: number | null) => (n ? `${Math.floor(n / 60)}:${String(n % 60).padStart(2, "0")}` : "");

/** Formulário de criação e edição (com `row`). */
export function TestimonialForm({ prepare, save, row, onDone }: { prepare: Prepare; save: Save; row?: TestimonialAdminRow; onDone?: () => void }) {
  const router = useRouter();
  const [f, setF] = useState({
    name: row?.name ?? "", headline: row?.headline ?? "", link: row?.videoUrl ?? "", thumbLink: row?.thumbUrl ?? "", captionsLink: row?.captionsUrl ?? "",
    category: row?.category ?? "aprovados", concurso: row?.concurso ?? "", cargo: row?.cargo ?? "", estado: row?.estado ?? "", description: row?.description ?? "",
    duration: fmtDur(row?.durationSeconds), approved: row?.approved ?? false, featured: row?.featured ?? false, sort: String(row?.sort ?? 0),
  });
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((p) => ({ ...p, [k]: v }));
  const [video, setVideo] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [thumb, setThumb] = useState<File | null>(null);
  const [vtt, setVtt] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const editing = !!row;

  const submit = () =>
    start(async () => {
      setMsg(null);
      try {
        const paths: string[] = [];
        let videoUrl: string | undefined = f.link.trim() || undefined;
        let photoUrl: string | undefined = row?.photoUrl ?? undefined;
        let thumbUrl: string | undefined = f.thumbLink.trim() || undefined;
        let captionsUrl: string | undefined = f.captionsLink.trim() || undefined;
        for (const [file, apply] of [
          [video, (u: { publicUrl: string }) => (videoUrl = u.publicUrl)],
          [photo, (u: { publicUrl: string }) => (photoUrl = u.publicUrl)],
          [thumb, (u: { publicUrl: string }) => (thumbUrl = u.publicUrl)],
          [vtt, (u: { publicUrl: string }) => (captionsUrl = u.publicUrl)],
        ] as const) {
          if (!file) continue;
          const u = await upload(file, prepare);
          paths.push(u.path);
          apply(u);
        }
        const input: TestimonialInput = {
          name: f.name, headline: f.headline || undefined, videoUrl, photoUrl, thumbUrl, captionsUrl, category: f.category,
          concurso: f.concurso, cargo: f.cargo, estado: f.estado.trim().toUpperCase(), description: f.description,
          durationSeconds: parseDuration(f.duration), approved: f.approved, featured: f.featured, sort: Number(f.sort) || 0, paths,
        };
        const r = await save(input);
        if (!r.ok) throw new Error(r.error);
        if (!editing) {
          setF((p) => ({ ...p, name: "", headline: "", link: "", thumbLink: "", captionsLink: "", concurso: "", cargo: "", estado: "", description: "", duration: "", approved: false, featured: false }));
          setVideo(null); setPhoto(null); setThumb(null); setVtt(null);
        }
        setMsg(editing ? "Alterações salvas." : "Depoimento publicado.");
        router.refresh();
        onDone?.();
      } catch (e) {
        setMsg((e as Error).message);
      }
    });

  const lbl = "flex flex-col gap-1 t-small font-semibold";
  return (
    <div className="grid max-w-3xl gap-3 rounded-lg border border-linha bg-superficie p-4 sm:grid-cols-2" data-testid={editing ? "depoimento-editar" : "depoimento-form"}>
      <label className={lbl}>Nome do aluno
        <input className={inputClass} value={f.name} maxLength={80} onChange={(e) => set("name", e.target.value)} data-testid="dep-nome" />
      </label>
      <label className={lbl}>Categoria
        <select className={inputClass} value={f.category} onChange={(e) => set("category", e.target.value as typeof f.category)} data-testid="dep-categoria">
          {TESTIMONIAL_CATEGORIES.map((c) => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
      </label>
      <label className={`${lbl} sm:col-span-2`}>Frase de destaque (aparece no card)
        <input className={inputClass} value={f.headline} maxLength={160} onChange={(e) => set("headline", e.target.value)} placeholder="Ex.: Aprovado na Polícia Penal MG em 8 meses" />
      </label>
      <label className={lbl}>Concurso
        <input className={inputClass} value={f.concurso} maxLength={120} onChange={(e) => set("concurso", e.target.value)} />
      </label>
      <label className={lbl}>Cargo
        <input className={inputClass} value={f.cargo} maxLength={120} onChange={(e) => set("cargo", e.target.value)} />
      </label>
      <label className={lbl}>Estado (UF)
        <input className={inputClass} value={f.estado} maxLength={2} onChange={(e) => set("estado", e.target.value)} placeholder="MG" />
      </label>
      <label className={lbl}>Duração (m:ss)
        <input className={inputClass} value={f.duration} onChange={(e) => set("duration", e.target.value)} placeholder="3:25" />
      </label>
      <label className={`${lbl} sm:col-span-2`}>Descrição (aparece no player)
        <textarea className={inputClass} rows={3} maxLength={1000} value={f.description} onChange={(e) => set("description", e.target.value)} />
      </label>
      <label className={lbl}>Vídeo (MP4, WEBM ou MOV até 50 MB)
        <input type="file" accept="video/mp4,video/webm,video/quicktime" className="text-sm" onChange={(e) => setVideo(e.target.files?.[0] ?? null)} data-testid="dep-video" />
      </label>
      <label className={lbl}>…ou link do vídeo (YouTube/Vimeo/arquivo https)
        <input className={inputClass} value={f.link} onChange={(e) => set("link", e.target.value)} placeholder="https://youtu.be/…" inputMode="url" data-testid="dep-link" />
      </label>
      <label className={lbl}>Miniatura do vídeo (JPG, PNG ou WEBP)
        <input type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" onChange={(e) => setThumb(e.target.files?.[0] ?? null)} data-testid="dep-thumb" />
      </label>
      <label className={lbl}>…ou link da miniatura
        <input className={inputClass} value={f.thumbLink} onChange={(e) => set("thumbLink", e.target.value)} inputMode="url" />
      </label>
      <label className={lbl}>Foto do aluno
        <input type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" onChange={(e) => setPhoto(e.target.files?.[0] ?? null)} data-testid="dep-foto" />
      </label>
      <label className={lbl}>Legendas (arquivo .vtt) ou link
        <input type="file" accept="text/vtt,.vtt" className="text-sm" onChange={(e) => setVtt(e.target.files?.[0] ?? null)} />
        <input className={inputClass} value={f.captionsLink} onChange={(e) => set("captionsLink", e.target.value)} inputMode="url" placeholder="https://…/legenda.vtt" />
      </label>
      <label className="flex items-center gap-2 t-small font-semibold">
        <input type="checkbox" checked={f.approved} onChange={(e) => set("approved", e.target.checked)} data-testid="dep-aprovado" /> Aluno comprovadamente aprovado (exibe o selo APROVADO)
      </label>
      <label className="flex items-center gap-2 t-small font-semibold">
        <input type="checkbox" checked={f.featured} onChange={(e) => set("featured", e.target.checked)} /> Destaque
      </label>
      <label className={lbl}>Ordem (menor aparece primeiro)
        <input className={inputClass} inputMode="numeric" value={f.sort} onChange={(e) => set("sort", e.target.value.replace(/\D/g, ""))} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="button" disabled={pending || !f.name.trim()} onClick={submit} data-testid="dep-salvar">{pending ? "Enviando…" : editing ? "Salvar alterações" : "Publicar depoimento"}</Button>
        {editing && <button type="button" className="t-small font-semibold underline" onClick={onDone}>Cancelar</button>}
        {msg && <span role="status" className="t-small">{msg}</span>}
      </div>
    </div>
  );
}

export function TestimonialList({ rows, prepare, save, toggle, remove }: { rows: TestimonialAdminRow[]; prepare: Prepare; save: (id: string, i: TestimonialInput) => Promise<Result>; toggle: (id: string, a: boolean) => Promise<Result>; remove: (id: string) => Promise<Result> }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
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
          <li key={r.id} className="rounded-lg border border-linha bg-superficie p-3" data-testid="dep-item">
            <div className="flex flex-wrap items-center gap-3">
              {r.thumbUrl || r.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={(r.thumbUrl ?? r.photoUrl)!} alt="" className="h-16 w-16 rounded object-cover" />
              ) : (
                <span className="flex h-16 w-16 items-center justify-center rounded bg-nevoa t-tiny">vídeo</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="font-semibold">{r.name}</p>
                {r.headline && <p className="t-small text-tinta-suave">{r.headline}</p>}
                <p className="t-tiny text-tinta-fraca">{r.category}{r.approved ? " · aprovado" : ""}{r.featured ? " · destaque" : ""} · {r.videoUrl ? "com vídeo" : "só foto"} · {r.active ? "visível" : "oculto"} · ordem {r.sort}</p>
              </div>
              <button type="button" className="t-small font-semibold underline" onClick={() => setEditId(editId === r.id ? null : r.id)} data-testid="dep-editar">Editar</button>
              <button type="button" disabled={pending} className="t-small font-semibold underline" onClick={() => run(() => toggle(r.id, !r.active))}>{r.active ? "Ocultar" : "Publicar"}</button>
              <button type="button" disabled={pending} className="t-small font-semibold text-erro underline" onClick={() => confirm("Apagar este depoimento e os arquivos enviados?") && run(() => remove(r.id))}>Apagar</button>
            </div>
            {editId === r.id && <div className="mt-3"><TestimonialForm prepare={prepare} save={(i) => save(r.id, i)} row={r} onDone={() => setEditId(null)} /></div>}
          </li>
        ))}
      </ul>
    </>
  );
}

/** Idealizadores, indicadores e citação da página (só dados reais cadastrados aqui aparecem). */
export function StoriesEditor({ founders, stats, quote, saveConfig, prepare }: { founders: Founder[]; stats: { students: number | null; approved: number | null; satisfaction: string | null; studentsReal: number; approvedReal: number }; quote: StoryQuote; saveConfig: (k: "founders" | "stats" | "quote", v: unknown) => Promise<Result>; prepare: Prepare }) {
  const router = useRouter();
  const [fs, setFs] = useState(founders);
  const [files, setFiles] = useState<Record<string, File | null>>({});
  const [st, setSt] = useState({ students: stats.students?.toString() ?? "", approved: stats.approved?.toString() ?? "", satisfaction: stats.satisfaction ?? "" });
  const [q, setQ] = useState(quote);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const lbl = "flex flex-col gap-1 t-small font-semibold";
  const num = (s: string) => (s.trim() === "" ? null : Number(s));
  const nul = (s: string | null) => (s && s.trim() ? s : null);
  const run = (k: "founders" | "stats" | "quote", v: unknown) =>
    start(async () => {
      const r = await saveConfig(k, v);
      setMsg(r.ok ? "Salvo." : (r.error ?? "Erro."));
      router.refresh();
    });
  const sendPhoto = (i: number) =>
    start(async () => {
      const f = fs[i]!;
      const file = files[f.slug];
      if (!file) return;
      setMsg(null);
      try {
        const u = await upload(file, prepare);
        if (u.kind !== "photo") throw new Error("O arquivo não é uma imagem.");
        const next = fs.map((x, j) => (j === i ? { ...x, photo: u.publicUrl } : x));
        const r = await saveConfig("founders", next);
        if (!r.ok) throw new Error(r.error);
        setFs(next);
        setFiles((p) => ({ ...p, [f.slug]: null }));
        setMsg(`Foto de ${f.name} atualizada.`);
        router.refresh();
      } catch (e) {
        setMsg((e as Error).message);
      }
    });
  const resetPhoto = (i: number) =>
    start(async () => {
      const next = fs.map((x, j) => (j === i ? { ...x, photo: null } : x));
      const r = await saveConfig("founders", next);
      if (r.ok) setFs(next);
      setMsg(r.ok ? "Foto original restaurada." : (r.error ?? "Erro."));
      router.refresh();
    });
  const upd = (i: number, p: Partial<Founder>) => setFs((a) => a.map((x, j) => (j === i ? { ...x, ...p } : x)));
  return (
    <div className="grid max-w-3xl gap-4" data-testid="historias-editor">
      {msg && <p role="status" className="t-small">{msg}</p>}
      <div className="grid gap-3 rounded-lg border border-linha bg-superficie p-4">
        <h3 className="t-h3">Idealizadores (só o que for preenchido aparece; idade, cidade e história não são inventadas)</h3>
        {fs.map((f, i) => (
          <fieldset key={f.slug} className="grid gap-2 sm:grid-cols-2">
            <legend className="font-semibold">{f.slug === "rafael" ? "Rafael" : "William"}</legend>
            <div className="flex flex-wrap items-center gap-3 rounded-lg border-2 border-red-600 bg-nevoa p-3 sm:col-span-2" data-testid={`foto-editor-${f.slug}`}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={files[f.slug] ? URL.createObjectURL(files[f.slug]!) : (f.photo ?? `/depoimentos/${f.slug}.webp`)} alt={`Foto de ${f.name}`} className="h-24 w-24 rounded-lg border border-linha object-cover" />
              <div className="flex min-w-0 flex-1 flex-col gap-2">
                <p className="t-small font-bold">Foto de {f.name.split(" ")[0]} (aparece em &quot;Conheça nossa história&quot;)</p>
                <input type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" onChange={(e) => setFiles((p) => ({ ...p, [f.slug]: e.target.files?.[0] ?? null }))} data-testid={`foto-arq-${f.slug}`} />
                <div className="flex flex-wrap gap-3">
                  <Button type="button" disabled={pending || !files[f.slug]} onClick={() => sendPhoto(i)} data-testid={`foto-enviar-${f.slug}`}>Enviar foto de {f.name.split(" ")[0]}</Button>
                  <button type="button" disabled={pending || !f.photo} className="t-small font-semibold underline disabled:opacity-40" onClick={() => resetPhoto(i)}>Voltar à original</button>
                </div>
              </div>
            </div>
            <label className={lbl}>Nome<input className={inputClass} value={f.name} onChange={(e) => upd(i, { name: e.target.value })} /></label>
            <label className={lbl}>Função<input className={inputClass} value={f.role} onChange={(e) => upd(i, { role: e.target.value })} /></label>
            <label className={lbl}>Idade<input className={inputClass} inputMode="numeric" value={f.age ?? ""} onChange={(e) => upd(i, { age: e.target.value ? Number(e.target.value.replace(/\D/g, "")) : null })} /></label>
            <label className={lbl}>Cidade/UF<input className={inputClass} value={f.city ?? ""} onChange={(e) => upd(i, { city: nul(e.target.value) })} /></label>
            <label className={`${lbl} sm:col-span-2`}>Resumo (placa e topo do modal)<textarea className={inputClass} rows={2} maxLength={600} value={f.bio ?? ""} onChange={(e) => upd(i, { bio: nul(e.target.value) })} /></label>
            <label className={`${lbl} sm:col-span-2`}>História completa<textarea className={inputClass} rows={4} maxLength={4000} value={f.story ?? ""} onChange={(e) => upd(i, { story: nul(e.target.value) })} /></label>
            <label className={`${lbl} sm:col-span-2`}>Trajetória<textarea className={inputClass} rows={4} maxLength={4000} value={f.trajectory ?? ""} onChange={(e) => upd(i, { trajectory: nul(e.target.value) })} /></label>
            <label className={`${lbl} sm:col-span-2`}>Frase<input className={inputClass} maxLength={300} value={f.quote ?? ""} onChange={(e) => upd(i, { quote: nul(e.target.value) })} /></label>
          </fieldset>
        ))}
        <div><Button type="button" disabled={pending} onClick={() => run("founders", fs)} data-testid="salvar-fundadores">Salvar idealizadores</Button></div>
      </div>
      <div className="grid gap-3 rounded-lg border border-linha bg-superficie p-4 sm:grid-cols-3">
        <h3 className="t-h3 sm:col-span-3">Indicadores (vazio = usa o dado real: {stats.studentsReal} alunos, {stats.approvedReal} aprovados ativos)</h3>
        <label className={lbl}>Alunos<input className={inputClass} inputMode="numeric" value={st.students} onChange={(e) => setSt({ ...st, students: e.target.value.replace(/\D/g, "") })} /></label>
        <label className={lbl}>Aprovados<input className={inputClass} inputMode="numeric" value={st.approved} onChange={(e) => setSt({ ...st, approved: e.target.value.replace(/\D/g, "") })} /></label>
        <label className={lbl}>Satisfação (ex.: 4.9/5)<input className={inputClass} maxLength={10} value={st.satisfaction} onChange={(e) => setSt({ ...st, satisfaction: e.target.value })} /></label>
        <div className="sm:col-span-3"><Button type="button" disabled={pending} onClick={() => run("stats", { students: num(st.students), approved: num(st.approved), satisfaction: nul(st.satisfaction) })} data-testid="salvar-indicadores">Salvar indicadores</Button></div>
      </div>
      <div className="grid gap-3 rounded-lg border border-linha bg-superficie p-4">
        <h3 className="t-h3">Cartão de citação</h3>
        <label className={lbl}>Texto<textarea className={inputClass} rows={2} maxLength={300} value={q.text} onChange={(e) => setQ({ ...q, text: e.target.value })} /></label>
        <label className={lbl}>Autores<input className={inputClass} maxLength={120} value={q.authors} onChange={(e) => setQ({ ...q, authors: e.target.value })} /></label>
        <div><Button type="button" disabled={pending} onClick={() => run("quote", q)} data-testid="salvar-citacao">Salvar citação</Button></div>
      </div>
    </div>
  );
}

/** Banner dos Idealizadores (topo da página Depoimentos): trocar ou voltar ao original. */
export function HeroEditor({ hero, prepare, saveConfig }: { hero: { desktop: string | null; mobile: string | null; desktopTrim?: number | null; mobileTrim?: number | null }; prepare: Prepare; saveConfig: (k: "hero", v: unknown) => Promise<Result> }) {
  const router = useRouter();
  const [d, setD] = useState<File | null>(null);
  const [m, setM] = useState<File | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const prev = (f: File | null, cur: string | null, orig: string) => (f ? URL.createObjectURL(f) : (cur ?? orig));
  const [dt, setDt] = useState(String(hero.desktopTrim ?? 0));
  const [mt, setMt] = useState(String(hero.mobileTrim ?? 0));
  const trims = { desktopTrim: Number(dt.replace(",", ".")) || 0, mobileTrim: Number(mt.replace(",", ".")) || 0 };
  const save = (next: { desktop: string | null; mobile: string | null; desktopTrim?: number; mobileTrim?: number }, ok: string) =>
    start(async () => {
      setMsg(null);
      try {
        const r = await saveConfig("hero", next);
        if (!r.ok) throw new Error(r.error);
        setD(null); setM(null);
        setMsg(ok);
        router.refresh();
      } catch (e) {
        setMsg((e as Error).message);
      }
    });
  const publish = () =>
    start(async () => {
      setMsg(null);
      try {
        let desktop = hero.desktop;
        let mobile = hero.mobile;
        if (d) { const u = await upload(d, prepare); if (u.kind !== "photo") throw new Error("O arquivo do computador não é uma imagem."); desktop = u.publicUrl; }
        if (m) { const u = await upload(m, prepare); if (u.kind !== "photo") throw new Error("O arquivo do celular não é uma imagem."); mobile = u.publicUrl; }
        const r = await saveConfig("hero", { desktop, mobile, ...trims });
        if (!r.ok) throw new Error(r.error);
        setD(null); setM(null);
        setMsg("Banner atualizado na página Depoimentos.");
        router.refresh();
      } catch (e) {
        setMsg((e as Error).message);
      }
    });
  return (
    <div className="rounded-xl border-2 border-red-600 bg-superficie p-5 shadow-md" data-testid="hero-editor">
      <h2 className="t-h2">Banner dos Idealizadores</h2>
      <p className="mt-1 max-w-3xl t-small text-tinta-suave">Imagem do topo da página Depoimentos (Rafael e William). Envie uma nova para trocar; as placas dos nomes ficam por cima. Use JPG, PNG ou WEBP de até 8 MB. Se a arte trouxer algo indesejado no alto (um menu, por exemplo), use “Cortar do topo”: o banner encolhe sem deixar espaço vazio.</p>
      <div className="mt-4 grid gap-5 md:grid-cols-[2fr_1fr]">
        <div className="space-y-2">
          <p className="t-small font-bold">Computador — proporção 1024×369 (pode conter o título)</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={prev(d, hero.desktop, "/depoimentos/hero-d.webp")} alt="Banner atual no computador" className="w-full rounded-lg border border-linha" data-testid="hero-prev-d" />
          <input type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" onChange={(e) => setD(e.target.files?.[0] ?? null)} data-testid="hero-arq-d" />
          <label className="flex items-center gap-2 t-small font-semibold">Cortar do topo (%)<input className={`${inputClass} !w-20`} inputMode="decimal" value={dt} onChange={(e) => setDt(e.target.value.replace(/[^\d.,]/g, ""))} data-testid="hero-corte-d" /></label>
        </div>
        <div className="space-y-2">
          <p className="t-small font-bold">Celular — proporção 594×369 (só a arte, sem título)</p>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={prev(m, hero.mobile, "/depoimentos/hero-arte-m.webp")} alt="Banner atual no celular" className="w-full rounded-lg border border-linha" data-testid="hero-prev-m" />
          <input type="file" accept="image/jpeg,image/png,image/webp" className="text-sm" onChange={(e) => setM(e.target.files?.[0] ?? null)} data-testid="hero-arq-m" />
          <label className="flex items-center gap-2 t-small font-semibold">Cortar do topo (%)<input className={`${inputClass} !w-20`} inputMode="decimal" value={mt} onChange={(e) => setMt(e.target.value.replace(/[^\d.,]/g, ""))} data-testid="hero-corte-m" /></label>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="button" disabled={pending || (!d && !m && trims.desktopTrim === (hero.desktopTrim ?? 0) && trims.mobileTrim === (hero.mobileTrim ?? 0))} onClick={publish} data-testid="hero-salvar">{pending ? "Enviando…" : d || m ? "Trocar banner" : "Salvar corte"}</Button>
        <button type="button" disabled={pending || (!hero.desktop && !hero.mobile)} className="t-small font-semibold underline disabled:opacity-40" onClick={() => confirm("Voltar ao banner original?") && save({ desktop: null, mobile: null, desktopTrim: 0, mobileTrim: 0 }, "Banner original restaurado.")} data-testid="hero-restaurar">Voltar ao original</button>
        {msg && <span role="status" className="t-small">{msg}</span>}
      </div>
    </div>
  );
}
