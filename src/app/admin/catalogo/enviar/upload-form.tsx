"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { Button, Notice, Tag } from "@/components/ui";
import type { LessonUploadPreview } from "@/domain/catalog/upload-preview";
import { LESSON_PROMPT } from "@/domain/catalog/chatgpt-prompts";
import type { AdminResult, UploadPreviewResult } from "../actions";
import { BannerSlot, type BannerActions } from "../banners/banner-slot";
import { prepareLessonUpload } from "@/domain/catalog/upload-preview";
import { applyLineEdit, autoFixText, describeIssues, fixEdits, type FixAction, type LineEdit, type TextIssue } from "@/domain/catalog/upload-fixes";
import { IssueList, MarkedTextarea, type LineMark, type MarkedTextareaHandle } from "./paste-checker";

interface Actions {
  preview: (text: string) => Promise<UploadPreviewResult>;
  save: (text: string) => Promise<AdminResult>;
}

const LEVEL = { facil: "Fácil", medio: "Médio", dificil: "Difícil" } as const;

/**
 * Catalogação por texto colado: 1) copiar o comando para o ChatGPT, 2) colar a resposta,
 * 3) conferir como a aula vai ficar (módulos, seções, questões, erros e avisos), 4) salvar.
 */
export interface PromptModel {
  title: string;
  slug: string;
  stats: { modules: number; sections: number; questions: { facil: number; medio: number; dificil: number } };
  options: Array<{ slug: string; title: string }>;
  selfCheck: string[];
}

export function LessonUploadForm({
  actions,
  bannerActions,
  prompt = LESSON_PROMPT,
  parts,
  compact,
  model,
  initialMode,
}: {
  actions: Actions;
  bannerActions?: BannerActions;
  prompt?: string;
  /** O mesmo comando em 2 partes (aula; depois questões). */
  parts?: { part1: string; part2: string } | null;
  /** Comando compacto (recomendado): resposta em 2 mensagens (aula; depois questões). */
  compact?: string | null;
  model?: PromptModel | null;
  /** Modo inicial dos comandos (ex.: o plano de tópicos abre aula grande já em 2 partes). */
  initialMode?: "compacto" | "partes" | "inteiro";
}) {
  // Com aula-modelo, começa no compacto (cabe no ChatGPT).
  type Mode = "compacto" | "partes" | "inteiro";
  const [mode, setMode] = useState<Mode>(initialMode ?? (compact ? "compacto" : parts && prompt.length > 60_000 ? "partes" : "inteiro"));
  const [text, setText] = useState("");
  // Resposta grande: dá para colar em 2 partes (a segunda é juntada no fim da primeira).
  const [split, setSplit] = useState(false);
  const [text2, setText2] = useState("");
  const [checked, setChecked] = useState("");
  const [preview, setPreview] = useState<LessonUploadPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<number | null>(null);
  const [pending, start] = useTransition();
  const [saving, setSaving] = useState(false);
  const usingTwo = split || mode === "partes";
  const combined = usingTwo && text2.trim() ? `${text.trimEnd()}\n\n${text2.trim()}\n` : text;
  const commands =
    mode === "compacto" && compact
      ? [{ label: "Comando compacto", text: compact }]
      : mode === "partes" && parts
        ? [{ label: "Comando 1 · a aula", text: parts.part1 }, { label: "Comando 2 · as questões (na mesma conversa)", text: parts.part2 }]
        : [{ label: "Comando", text: prompt }];
  const multi = commands.length > 1;

  const check = (override?: string) => {
    setPreview(null);
    setError(null);
    const t = override ?? combined;
    start(async () => {
      const r = await actions.preview(t);
      if (r.ok) {
        setPreview(r.preview);
        setChecked(t);
      } else setError(r.error);
    });
  };
  const save = () => {
    setSaving(true);
    start(async () => {
      const r = await actions.save(checked);
      // Em caso de sucesso a página muda para a aula criada.
      if (!r.ok) setError(r.error ?? "Não foi possível salvar.");
      setSaving(false);
    });
  };
  const copy = async (i: number, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(i);
      setTimeout(() => setCopied(null), 2500);
    } catch {
      setError("Não consegui copiar automaticamente. Abra “Ver o comando” e copie o texto, ou baixe o .txt.");
    }
  };
  const download = (value: string, suffix: string) => {
    const url = URL.createObjectURL(new Blob([value], { type: "text/plain;charset=utf-8" }));
    const el = document.createElement("a");
    el.href = url;
    el.download = `comando-aprovum${model ? `-modelo-${model.slug}` : ""}${suffix}.txt`;
    el.click();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  };
  const stale = preview && combined !== checked;

  // --- Conferência ao vivo: o texto é lido no navegador enquanto você cola/edita.
  const [live, setLive] = useState<{ text: string; issues: TextIssue[] } | null>(null);
  useEffect(() => {
    if (!combined.trim()) return;
    const h = setTimeout(() => {
      try {
        const p = prepareLessonUpload(combined);
        setLive({ text: combined, issues: describeIssues(combined, p.errors, p.warnings.filter((w) => !/^Nível /.test(w))) });
      } catch {
        setLive(null);
      }
    }, 350);
    return () => clearTimeout(h);
  }, [combined]);
  const liveNow = combined.trim() && live ? live : null;
  const liveFresh = !!liveNow && liveNow.text === combined;

  // Linha do texto juntado → campo (1 ou 2) e linha dentro dele.
  const field1Lines = text.trimEnd().split("\n").length;
  const joined = usingTwo && !!text2.trim();
  const lead2 = (text2.match(/^\s*/)?.[0] ?? "").split("\n").length - 1;
  const locate = (line: number): { field: 1 | 2; line: number } => (joined && line > field1Lines ? { field: 2, line: Math.max(1, line - (field1Lines + 1) + lead2) } : { field: 1, line });
  const ta1 = useRef<MarkedTextareaHandle>(null);
  const ta2 = useRef<MarkedTextareaHandle>(null);
  const goTo = (i: TextIssue) => {
    if (!i.line) return;
    const a = locate(i.line);
    const b = i.endLine ? locate(i.endLine) : null;
    (a.field === 2 ? ta2 : ta1).current?.goTo(a.line, b && b.field === a.field ? b.line : null);
  };
  const applyOne = (e: LineEdit) => {
    const a = locate(e.start);
    if (a.field === 2) {
      setText2((t) => applyLineEdit(t, { ...e, start: a.line }));
    } else {
      const max = Math.max(0, field1Lines - e.start + 1);
      setText((t) => applyLineEdit(t, { ...e, deleteCount: Math.min(e.deleteCount, max) }));
    }
  };
  const fix = (f: FixAction) => {
    for (const e of fixEdits(f)) applyOne(e);
    setPreview(null);
  };
  const [autoMsg, setAutoMsg] = useState<{ applied: string[]; remaining: number } | null>(null);
  const autoFixAll = () => {
    const r = autoFixText(combined, (t) => prepareLessonUpload(t));
    setAutoMsg({ applied: r.applied, remaining: r.remaining.length });
    if (r.text !== combined) {
      setText(r.text);
      setText2("");
      if (mode !== "partes") setSplit(false);
      setLive(null);
      check(r.text);
    }
  };
  const autoButton = (
    <div className="flex flex-col gap-2">
      <Button onClick={autoFixAll} disabled={pending} className="self-start" data-testid="autocorrigir">
        ✓ Corrigir tudo automaticamente
      </Button>
    </div>
  );
  const autoNotice = autoMsg && (
    <Notice tone={autoMsg.remaining ? "alerta" : "sucesso"} title={autoMsg.applied.length ? `${autoMsg.applied.length} correção(ões) feita(s) no texto` : "Nada que dê para corrigir sozinho"}>
      {autoMsg.applied.length > 0 && (
        <details className="mt-1">
          <summary className="cursor-pointer">Ver o que mudou</summary>
          <ul className="mt-1 list-disc pl-5">{autoMsg.applied.map((a, k) => <li key={k}>{a}</li>)}</ul>
        </details>
      )}
      <p className="mt-1">{autoMsg.remaining ? `Falta(m) ${autoMsg.remaining} erro(s) que precisam da sua escolha: use os botões de cada um abaixo.` : "Sem erros de formato. Confira a prévia e catalogue."}</p>
    </Notice>
  );
  const shownIssues = preview && !stale ? null : liveNow?.issues ?? null;
  const previewIssues = useMemo(() => (preview ? describeIssues(checked, preview.errors, preview.warnings.filter((w) => !/^Nível /.test(w))) : []), [preview, checked]);
  const markIssues = (preview && !stale ? previewIssues : liveFresh ? liveNow!.issues : []) ?? [];
  const markKey = `${markIssues.map((i) => `${i.line}-${i.endLine}-${i.severity}`).join(",")}|${field1Lines}|${lead2}|${joined}`;
  const marks = useMemo(() => {
    const m: [Map<number, LineMark>, Map<number, LineMark>] = [new Map(), new Map()];
    for (const i of markIssues) {
      if (!i.line) continue;
      const end = Math.max(i.line + 1, i.endLine ?? i.line + 1);
      for (let l = i.line; l < end && l < i.line + 400; l++) {
        const at = locate(l);
        const kind: LineMark = l === i.line ? i.severity : "foco";
        const mm = at.field === 2 ? m[1] : m[0];
        const cur = mm.get(at.line);
        if (cur !== "erro") mm.set(at.line, kind === "foco" && cur ? cur : kind);
      }
    }
    return m;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markKey]);
  const lineLabel = (line: number) => {
    const a = locate(line);
    return joined ? `parte ${a.field} · linha ${a.line}` : `linha ${a.line}`;
  };
  const full = !!preview && preview.questions.facil >= 10 && preview.questions.medio >= 10 && preview.questions.dificil >= 10;

  return (
    <div className="flex flex-col gap-5" data-testid="upload-aula">
      <div className="rounded-lg border border-linha bg-superficie p-4">
        <p className="font-semibold">1. Peça a aula ao ChatGPT</p>
        {model ? (
          <p className="mt-1 t-small text-tinta-suave">
            O comando leva a aula <strong>{model.title}</strong> como modelo oficial ({model.stats.modules} módulos, {model.stats.sections} seções, {model.stats.questions.facil}/{model.stats.questions.medio}/{model.stats.questions.dificil} questões por nível) e manda o ChatGPT fazer a nova aula exatamente na mesma forma. Troque só a linha <strong>TEMA DA NOVA AULA</strong>.
          </p>
        ) : (
          <p className="mt-1 t-small text-tinta-suave">Copie o comando, troque o tema na primeira linha e envie no ChatGPT. Ele responde já no formato do painel.</p>
        )}
        {model && model.options.length > 1 && (
          <form method="get" className="mt-2 flex flex-wrap items-center gap-2 t-small">
            <label htmlFor="modelo" className="font-semibold">Aula-modelo:</label>
            <select id="modelo" name="modelo" defaultValue={model.slug} className="min-h-10 rounded-md border border-linha-forte bg-superficie px-2" onChange={(e) => e.currentTarget.form?.requestSubmit()}>
              {model.options.map((o) => (
                <option key={o.slug} value={o.slug}>{o.title}</option>
              ))}
            </select>
          </form>
        )}
        {model && model.selfCheck.length > 0 && (
          <Notice tone="alerta" title="A aula-modelo tem pontos que o painel não lê bem">
            <ul className="list-disc pl-5">{model.selfCheck.slice(0, 5).map((e) => <li key={e}>{e}</li>)}</ul>
          </Notice>
        )}
        {(parts || compact) && (
          <div className="mt-3 inline-flex flex-wrap rounded-md border border-linha-forte p-0.5 t-small" role="radiogroup" aria-label="Como enviar o comando">
            {(
              [
                ["compacto", "Compacto (recomendado)", !!compact],
                ["partes", "Em 2 comandos (aula grande)", !!parts],
                ["inteiro", "Completo", true],
              ] as const
            )
              .filter(([, , ok]) => ok)
              .map(([m, label]) => (
                <button
                  key={m}
                  type="button"
                  role="radio"
                  aria-checked={mode === m}
                  onClick={() => {
                    setMode(m);
                    setPreview(null);
                  }}
                  className={`min-h-9 rounded px-3 font-semibold ${mode === m ? "bg-tinta text-white" : "text-tinta-suave"}`}
                >
                  {label}
                </button>
              ))}
          </div>
        )}
        {mode === "compacto" && compact && (
          <p className="mt-2 t-small text-tinta-suave">
            Envie o comando no ChatGPT: ele responde com a aula completa (teoria e questões). Se ele cortar, escreva <strong>continue</strong> e cole a continuação logo abaixo, no mesmo campo.
          </p>
        )}
        {mode === "partes" && parts && (
          <p className="mt-2 t-small text-tinta-suave">
            Envie o <strong>comando 1</strong> (a aula) no ChatGPT e, quando ele terminar, envie o <strong>comando 2</strong> (as questões) <strong>na mesma conversa</strong>. Cole a resposta do comando 1 no primeiro campo e a do comando 2 no segundo: são publicadas juntas, como uma aula só.
          </p>
        )}
        <div className="mt-3 flex flex-col gap-3">
          {commands.map((c, i) => (
            <div key={c.label} className={multi ? "rounded-md border border-linha p-3" : ""}>
              {multi && <p className="mb-2 t-small font-semibold">{c.label}</p>}
              <div className="flex flex-wrap items-center gap-2">
                <Button variant="secundario" onClick={() => copy(i, c.text)}>{copied === i ? "Comando copiado ✓" : multi ? `Copiar comando ${i + 1}` : "Copiar comando para o ChatGPT"}</Button>
                <Button variant="discreto" onClick={() => download(c.text, multi ? `-comando-${i + 1}` : mode === "compacto" ? "-compacto" : "")}>Baixar (.txt)</Button>
                <span className="t-tiny text-tinta-fraca">{c.text.length.toLocaleString("pt-BR")} caracteres</span>
              </div>
              <details className="mt-2 t-small">
                <summary className="cursor-pointer text-destaque">Ver o comando</summary>
                <pre className="mt-2 max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-nevoa p-3 t-tiny">{c.text}</pre>
              </details>
            </div>
          ))}
        </div>
        {mode === "inteiro" && prompt.length > 60_000 && <p className="mt-1 t-tiny text-tinta-fraca">Comando longo: se o ChatGPT não aceitar, use o “Compacto” ou anexe o .txt.</p>}
      </div>

      <div className="flex flex-col gap-2">
        <label htmlFor="texto-aula" className="font-semibold">{usingTwo ? "2. Cole aqui a parte 1 da resposta" : "2. Cole aqui a resposta completa do ChatGPT (aula e questões)"}</label>
        <MarkedTextarea ref={ta1} id="texto-aula" value={text} onChange={setText} marks={marks[0]} placeholder={"=== AULA ===\nTítulo: …\nMatéria: …\n…\n=== QUESTÕES: FÁCIL ===\n…"} />
        {usingTwo ? (
          <>
            <label htmlFor="texto-parte-2" className="mt-2 font-semibold">Cole aqui a parte 2 da resposta (continuação ou questões)</label>
            <MarkedTextarea ref={ta2} id="texto-parte-2" value={text2} onChange={setText2} marks={marks[1]} placeholder={"Continuação da resposta (ex.: depois de “continue”) ou as questões"} />
            <p className="t-tiny text-tinta-fraca">As duas partes são juntadas na ordem (parte 1 e depois parte 2) e conferidas e publicadas como uma aula só.</p>
            {mode !== "partes" && (
              <button type="button" className="self-start t-small font-semibold text-destaque underline underline-offset-2" onClick={() => { setSplit(false); setText((t) => (text2.trim() ? `${t.trimEnd()}\n\n${text2.trim()}\n` : t)); setText2(""); setPreview(null); }}>
                Voltar para um campo só
              </button>
            )}
          </>
        ) : (
          <button type="button" className="self-start t-small font-semibold text-destaque underline underline-offset-2" onClick={() => { setSplit(true); setPreview(null); }} data-testid="colar-em-2-partes">
            Resposta muito grande? Colar em 2 partes
          </button>
        )}
        <div className="flex flex-wrap items-center gap-2">
          <Button disabled={!text.trim() || pending} onClick={() => check()}>{pending && !saving ? "Conferindo…" : "3. Conferir aula"}</Button>
          {text && (
            <Button variant="discreto" disabled={pending} onClick={() => { setText(""); setText2(""); setPreview(null); setError(null); }}>Limpar</Button>
          )}
          <span className="t-tiny text-tinta-fraca">{combined.trim().length.toLocaleString("pt-BR")} caracteres</span>
        </div>
        {shownIssues && (
          <div className={`mt-1 flex flex-col gap-2 ${liveFresh ? "" : "opacity-60"}`} aria-live="polite" data-testid="conferencia-ao-vivo">
            {shownIssues.some((i) => i.severity === "erro") ? (
              <p className="t-small font-semibold text-erro">
                {shownIssues.filter((i) => i.severity === "erro").length} erro(s) no texto — destacados em vermelho no campo. Corrija com os botões ou edite direto no texto.
              </p>
            ) : (
              <p className="t-small font-semibold text-acerto">Nenhum erro de formato no texto. Clique em “Conferir aula”.</p>
            )}
            {shownIssues.some((i) => i.severity === "erro") && autoButton}
            <IssueList issues={shownIssues} disabled={!liveFresh || pending} onGo={goTo} onFix={(f) => fix(f)} lineLabel={lineLabel} />
          </div>
        )}
      </div>

      {autoNotice}
      {stale && <Notice tone="alerta">O texto mudou depois da conferência. Clique em “Conferir aula” de novo antes de salvar.</Notice>}
      {error && <Notice tone="erro" title="Não deu para usar este texto">{error}</Notice>}

      {preview && (
        <section aria-labelledby="previa" className="flex flex-col gap-4 rounded-lg border border-linha p-5">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 id="previa" className="t-h2">{preview.title || "(sem título)"}</h2>
              <p className="mt-1 t-small text-tinta-suave">
                {preview.subject ?? "Matéria não reconhecida"} · {preview.kind === "dispositivo" ? preview.law : "Tema"} · {preview.items} item(ns) a ensinar
              </p>
              {preview.group && (
                <p className="mt-1 t-small" data-testid="previa-topico">
                  Entra no tópico <strong>{preview.group}</strong> (criado na hora se ainda não existir).
                </p>
              )}
              {preview.existing && (
                <p className="mt-1 t-small">
                  Já existe <strong>{preview.existing.title}</strong> ({preview.existing.status}) com o mesmo endereço: ela será atualizada com este texto.
                </p>
              )}
            </div>
            <Tag tone={preview.ok ? "verde" : "vermelho"}>{preview.ok ? (full ? "Pronto para publicar" : "Pronto para salvar") : `${preview.errors.length} erro(s)`}</Tag>
          </div>

          {preview.errors.length > 0 && (
            <Notice tone="erro" title="Corrija o texto (com os botões abaixo, editando no campo ou pedindo ao ChatGPT) e confira de novo">
              <div className="mt-2 flex flex-col gap-2">
                {!stale && autoButton}
                <IssueList issues={previewIssues.filter((i) => i.severity === "erro")} disabled={!!stale || pending} onGo={goTo} onFix={(f) => fix(f)} lineLabel={lineLabel} />
              </div>
            </Notice>
          )}
          {preview.warnings.length > 0 && (
            <Notice tone="alerta" title="Avisos (não impedem salvar)">
              {preview.warnings.filter((w) => /^Nível /.test(w)).length > 0 && <ul className="mb-2 list-disc pl-5">{preview.warnings.filter((w) => /^Nível /.test(w)).map((w) => <li key={w}>{w}</li>)}</ul>}
              <IssueList issues={previewIssues.filter((i) => i.severity === "aviso")} disabled={!!stale || pending} onGo={goTo} onFix={(f) => fix(f)} lineLabel={lineLabel} />
            </Notice>
          )}

          {preview.modules.length > 0 && (
            <div>
              <h3 className="t-h3">Estrutura da aula</h3>
              <ol className="mt-2 flex flex-col gap-3">
                {preview.modules.map((m) => (
                  <li key={m.name} className="rounded-md border border-linha bg-superficie p-3">
                    <p className="font-semibold">{m.name}</p>
                    <ul className="mt-1 flex flex-col gap-0.5 t-small">
                      {m.sections.map((s, i) => (
                        <li key={i} className="flex flex-wrap gap-x-2">
                          <span>{s.title}</span>
                          <span className="text-tinta-fraca">· {s.kind} · {s.items} item(ns)</span>
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {bannerActions && preview.disciplineMode && (
            <div>
              <h3 className="t-h3">Banner da matéria ({preview.subject})</h3>
              <p className="mt-1 mb-2 t-small text-tinta-suave">Vale para todas as aulas de {preview.subject}. Anexe uma vez; troque quando quiser.</p>
              <BannerSlot compact mode={preview.disciplineMode} label={preview.subject ?? preview.disciplineMode} url={preview.banner ?? null} actions={bannerActions} />
            </div>
          )}

          <div>
            <h3 className="t-h3">Questões de fixação</h3>
            <p className="mt-1 t-small tabular-nums">
              {(Object.keys(LEVEL) as Array<keyof typeof LEVEL>).map((k) => (
                <span key={k} className={`mr-3 ${preview.questions[k] < 10 ? "text-erro" : ""}`}>{LEVEL[k]}: {preview.questions[k]}</span>
              ))}
            </p>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button disabled={!preview.ok || pending || !!stale} onClick={save}>{saving ? "Salvando…" : full ? "4. Catalogar e publicar" : "4. Salvar como rascunho"}</Button>
          </div>
          <p className="t-tiny text-tinta-fraca">
            {full
              ? "Ao catalogar, a aula já é publicada e aparece no site para os alunos, sem etapa de aprovação."
              : "Com menos de 10 questões em algum nível a aula fica como rascunho; complete as questões e cole de novo para publicar."}
          </p>
        </section>
      )}
    </div>
  );
}
