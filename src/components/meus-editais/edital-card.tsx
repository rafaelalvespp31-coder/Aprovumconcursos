import Link from "next/link";
import { BarChart3, BookOpenCheck, Briefcase, CheckCircle2, ChevronRight, CircleDashed, Clock3, Hourglass, Layers, LoaderCircle, Radar, TriangleAlert } from "lucide-react";
import type { EditalCard as Card } from "@/server/services/edital-overview";
import { OrgEmblem } from "@/components/aprovum-ai/org-emblem";
import { DeletePrep } from "@/components/aprovum-ai/delete-prep";
import { ProgressRing } from "./progress-ring";

type Tone = "verde" | "vermelho" | "cinza" | "neutro";
interface Status { label: string; tone: Tone; icon: React.ComponentType<{ className?: string; "aria-hidden"?: boolean }> }

const PROCESSING = new Set(["recebendo", "lendo", "identificando", "mapeando", "organizando"]);

/** Status do card: o status oficial da análise do edital vem primeiro; só depois o progresso de estudo. */
export function statusOf(c: Card): Status {
  if (c.status === "erro") return { label: "ERRO NA ANÁLISE", tone: "vermelho", icon: TriangleAlert };
  if (c.status === "conferencia") return { label: "CONFERÊNCIA", tone: "vermelho", icon: TriangleAlert };
  if (PROCESSING.has(c.status)) return { label: "ANALISANDO", tone: "neutro", icon: LoaderCircle };
  if (!c.progress) return { label: "SEM DADOS", tone: "neutro", icon: CircleDashed };
  if (c.progress.topics > 0 && c.progress.pct >= 100) return { label: "CONCLUÍDO", tone: "verde", icon: CheckCircle2 };
  if (c.progress.started) return { label: "EM ANDAMENTO", tone: "vermelho", icon: CircleDashed };
  return { label: "PENDENTE", tone: "cinza", icon: Hourglass };
}

const UF: Record<string, string> = {
  acre: "AC", alagoas: "AL", amapa: "AP", amazonas: "AM", bahia: "BA", ceara: "CE", "distrito federal": "DF", "espirito santo": "ES", goias: "GO", maranhao: "MA", "mato grosso do sul": "MS", "mato grosso": "MT",
  "minas gerais": "MG", para: "PA", paraiba: "PB", parana: "PR", pernambuco: "PE", piaui: "PI", "rio de janeiro": "RJ", "rio grande do norte": "RN", "rio grande do sul": "RS", rondonia: "RO", roraima: "RR",
  "santa catarina": "SC", "sao paulo": "SP", sergipe: "SE", tocantins: "TO",
};
const fold = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "Polícia Civil do Estado de Minas Gerais" → ["POLÍCIA", "CIVIL", "MG"] (última linha em vermelho). */
export function orgLines(name: string): string[] {
  let s = name.replace(/\s+/g, " ").trim();
  for (const [full, uf] of Object.entries(UF).sort((a, b) => b[0].length - a[0].length)) {
    const re = new RegExp(`\\s+(?:do|da|de)\\s+(?:estado\\s+(?:de|do|da)\\s+)?${full.replace(/ /g, "\\s+")}$`, "i");
    if (re.test(fold(s))) {
      const m = fold(s).match(re)!;
      s = `${s.slice(0, s.length - m[0].length)} ${uf}`;
      break;
    }
  }
  const words = s.toUpperCase().split(" ").filter(Boolean);
  if (words.length <= 3) return words;
  // Junta preposições à palavra seguinte e limita a 3 linhas.
  const merged: string[] = [];
  for (let i = 0; i < words.length; i++) {
    const w = words[i]!;
    if (/^(DE|DO|DA|DOS|DAS|E)$/.test(w) && i + 1 < words.length) { merged.push(`${w} ${words[++i]}`); continue; }
    merged.push(w);
  }
  if (merged.length <= 3) return merged;
  return [merged.slice(0, merged.length - 2).join(" "), merged[merged.length - 2]!, merged[merged.length - 1]!];
}

const dt = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : null);

export function EditalCard({ c, index }: { c: Card; index: number }) {
  const st = statusOf(c);
  const ready = c.status === "concluido";
  const p = c.progress;
  const detail = `/meu-concurso/${c.id}`;
  const continueHref = p?.nextLessonId ? `/aula/${p.nextLessonId}` : c.studyFolderId ? `/trilhas#pasta-${c.studyFolderId}` : `${detail}?aba=visao`;
  const lines = orgLines(c.contestName ?? c.title);
  const longest = Math.max(...lines.map((l) => l.length));
  const meta = c.raioX.analyzedAt
    ? { k: "Última análise", v: dt(c.raioX.analyzedAt) }
    : p?.lastActivity
      ? { k: "Última atividade", v: dt(p.lastActivity) }
      : { k: "Enviado em", v: dt(c.createdAt) };
  const StIcon = st.icon;

  return (
    <article className="me-card me-in" style={{ ["--d" as string]: `${0.12 + index * 0.07}s` }} data-tone={st.tone} aria-labelledby={`ed-${c.id}`}>
      <Link href={ready ? detail : `/aprovum-ai/${c.id}`} className="me-visual" style={{ ["--arte" as string]: `url(/meus-editais/ref-disc-${(index % 4) + 1}.webp)` }} aria-label={`Abrir ${c.title}`} tabIndex={-1}>
        <span className="me-visual-org" style={{ ["--n" as string]: Math.max(6, longest) }}>
          {lines.map((l, i) => <span key={i} data-ultima={i === lines.length - 1 && lines.length > 1 ? 1 : undefined}>{l}</span>)}
        </span>
        <span className="me-visual-emblema"><OrgEmblem logo={c.orgLogo} name={c.contestName ?? c.title} size={56} /></span>
        <span className="me-status" data-tone={st.tone}><StIcon className={st.icon === LoaderCircle ? "me-gira" : undefined} aria-hidden />{st.label}</span>
      </Link>

      <div className="me-info">
        <h2 id={`ed-${c.id}`}><Link href={ready ? detail : `/aprovum-ai/${c.id}`}>{c.title}</Link></h2>
        {c.roleName ? (
          <p className="me-cargo"><span><Briefcase aria-hidden />CARGO</span><b>{c.roleName}</b></p>
        ) : ready ? (
          <p className="me-cargo" data-falta="1"><span><Briefcase aria-hidden />CARGO</span><Link href={`${detail}?editar=1`}>Informar cargo</Link></p>
        ) : null}
        <p className="me-contagem">
          <Layers aria-hidden />
          {ready ? (
            <>
              <span>{c.stats.disciplines ?? 0} disciplinas</span><i aria-hidden>•</i>
              <span>{c.stats.topics ?? 0} tópicos</span><i aria-hidden>•</i>
              <span>{p ? p.lessons : (c.stats.completa ?? 0) + (c.stats.parcial ?? 0)} aulas</span>
              {p && (<><i aria-hidden>•</i><span>{p.topicsDone} concluídos</span></>)}
            </>
          ) : (
            <span>{c.status === "erro" ? "A análise foi interrompida." : c.status === "conferencia" ? "Aguardando a sua conferência." : "A APROVUM está lendo este edital…"}</span>
          )}
        </p>
        {ready && (
          <span className="me-barra" role="progressbar" aria-label="Progresso do edital" aria-valuemin={0} aria-valuemax={100} aria-valuenow={p?.pct ?? 0} data-tone={st.tone}>
            <i style={{ ["--w" as string]: `${p?.pct ?? 0}%` }} />
          </span>
        )}
      </div>

      <div className="me-progresso">
        {ready ? (
          <Link href={`${detail}?aba=desempenho`} className="me-ring-link" aria-label={p ? `${p.pct}% concluído — ver desempenho neste edital` : "Ver desempenho neste edital"}>
            <ProgressRing pct={p?.pct ?? null} tone={st.tone === "verde" ? "green" : p && p.pct > 0 ? "red" : "gray"}>
              <b>{p ? `${p.pct}%` : "—"}</b>
              <small>{!p ? "Sem dados" : p.started || p.pct > 0 ? "Concluído" : "Não iniciado"}</small>
            </ProgressRing>
          </Link>
        ) : (
          <span className="me-ring-link" aria-hidden>
            <ProgressRing pct={null} tone="gray"><b>{c.status === "erro" ? "!" : "…"}</b><small>{c.status === "erro" ? "Erro" : "Análise"}</small></ProgressRing>
          </span>
        )}
      </div>

      <Link href={ready ? detail : `/aprovum-ai/${c.id}`} className="me-go" aria-label={ready ? `Ver detalhes de ${c.title}` : `Acompanhar ${c.title}`}><ChevronRight aria-hidden /></Link>

      <div className="me-acoes">
        {ready ? (
          <>
            <Link href={detail} className="me-btn me-btn-preto">Ver Detalhes <ChevronRight aria-hidden /></Link>
            <Link href={continueHref} className="me-btn me-btn-linha">{p?.started ? "Continuar Estudo" : "Começar Estudo"} <ChevronRight aria-hidden /></Link>
            {c.raioX.available && <Link href={`${detail}?aba=raiox`} className="me-btn me-btn-raio"><Radar aria-hidden /> Raio-X do edital</Link>}
          </>
        ) : (
          <Link href={`/aprovum-ai/${c.id}`} className="me-btn me-btn-preto">{c.status === "conferencia" ? "Conferir agora" : c.status === "erro" ? "Ver o que houve" : "Acompanhar análise"} <ChevronRight aria-hidden /></Link>
        )}
      </div>

      <footer className="me-rodape-card">
        <span className="me-meta">
          {meta.k === "Última análise" ? <BarChart3 aria-hidden /> : meta.k === "Última atividade" ? <Clock3 aria-hidden /> : <BookOpenCheck aria-hidden />}
          <span>{meta.k}: <b>{meta.v ?? "—"}</b></span>
        </span>
        {ready && p && <span className="me-meta me-meta-sec">{p.lessonsDone}/{p.lessons} aulas concluídas · {p.questions} questões</span>}
        <span className="me-excluir"><DeletePrep id={c.id} compact /></span>
      </footer>
    </article>
  );
}
