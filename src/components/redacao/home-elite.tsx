import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight, BarChart3, CalendarDays, Check, ChevronRight, ClipboardCheck, Crosshair, Dices, FilePenLine,
  MessagesSquare, PenLine, ShieldCheck, Star, TrendingUp, Trophy,
} from "lucide-react";
import type { CompetenciaView, HistoryItem } from "@/server/services/redacao";
import { Aviso, MODALIDADE_LABEL } from "@/components/redacao/ui";

const ACOES = [
  { href: "/redacao/escrever", t: "Escrever Redação", d: "Produza seu texto e envie para correção.", cta: "Começar Agora", Icon: PenLine },
  { href: "/redacao/temas", t: "Desafio de Redação", d: "Receba um tema aleatório ou escolha por categoria.", cta: "Escolher Tema", Icon: Dices },
  { href: "/redacao/escrever", t: "Treinar por Modalidade", d: "ENEM, Concursos, Vestibulares e mais.", cta: "Selecionar Modalidade", Icon: Crosshair },
  { href: "/redacao/evolucao", t: "Acompanhar Evolução", d: "Veja seu progresso e suas conquistas.", cta: "Ver Meu Desempenho", Icon: BarChart3 },
  { href: "/redacao/professor", t: "Conversar com o Professor", d: "Tire dúvidas e receba dicas personalizadas.", cta: "Falar com o Professor", Icon: MessagesSquare },
];

const RECURSOS = [
  { href: "/redacao/escrever", t: "Correção Detalhada", d: "Análise completa linha por linha, com explicações claras.", Icon: FilePenLine },
  { href: "/redacao/evolucao", t: "Diagnóstico Personalizado", d: "Descubra exatamente onde melhorar.", Icon: ShieldCheck },
  { href: "/redacao/exercicios", t: "Plano de Evolução", d: "Receba um plano focado nas suas maiores dificuldades.", Icon: ClipboardCheck },
  { href: "/redacao/temas", t: "Temas Atualizados", d: "Propostas de redação sobre os principais assuntos do momento.", Icon: Check },
];

function selo(pct: number) {
  if (pct >= 80) return { txt: "Excelente!", bg: "#2DB34A" };
  if (pct >= 75) return { txt: "Muito bom!", bg: "#3C8DDE" };
  if (pct >= 60) return { txt: "Bom!", bg: "#A34BD0" };
  return { txt: "Em evolução", bg: "#E50914" };
}

function quando(iso: string) {
  const fmt = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(d);
  const dias = Math.round((Date.parse(fmt(new Date())) - Date.parse(fmt(new Date(iso)))) / 86_400_000);
  if (dias <= 0) return "Hoje";
  if (dias === 1) return "Ontem";
  return `${dias} dias atrás`;
}

const statusTxt = (h: HistoryItem) => (h.status === "rascunho" ? "Rascunho" : h.status === "processando" ? "Corrigindo" : h.status === "falhou" ? "Falhou" : "—");

function Cabecalho({ titulo, aside }: { titulo: string; aside?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-3 bg-[#111214] px-4 py-3 text-white">
      <h2 className="text-[15px] font-bold tracking-[-0.01em]">{titulo}</h2>
      {aside}
    </div>
  );
}

function Medidor({ pct, nota, max }: { pct: number | null; nota: number | null; max: number | null }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(100, pct ?? 0)) / 100;
  return (
    <div className="relative h-[116px] w-[116px] shrink-0">
      <svg viewBox="0 0 132 132" className="h-full w-full -rotate-90" aria-hidden>
        <circle cx="66" cy="66" r={r} fill="none" stroke="#E4E5E9" strokeWidth="11" />
        {p > 0 && <circle cx="66" cy="66" r={r} fill="none" stroke="url(#medidor)" strokeWidth="11" strokeLinecap="round" strokeDasharray={`${c * p} ${c}`} data-mv-arco="" />}
        <defs>
          <linearGradient id="medidor" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FF2A2A" />
            <stop offset="1" stopColor="#B9000B" />
          </linearGradient>
        </defs>
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center leading-none">
        <span className="text-[30px] font-black tracking-[-0.03em] text-[#08090B]">{nota ?? "—"}</span>
        <span className="mt-1 text-[14px] font-semibold text-[#3A3C42]">/ {max ?? 1000}</span>
      </div>
    </div>
  );
}

/** Página inicial da Redação Elite: `hist` vem do mais recente para o mais antigo; `competencias` são as da última redação corrigida. */
export function RedacaoHomeElite({ hist, competencias, iaAtiva }: { hist: HistoryItem[]; competencias: CompetenciaView[]; iaAtiva: boolean }) {
  const corrigidas = hist.filter((h) => h.score !== null && h.max);
  const ultima = corrigidas[0] ?? null;
  const anterior = corrigidas[1] ?? null;
  const pct = ultima ? Math.round((ultima.score! / ultima.max!) * 100) : null;
  const delta = ultima && anterior && ultima.max === anterior.max ? Math.round(ultima.score! - anterior.score!) : null;
  const barras = corrigidas.slice(0, 6).reverse().map((h) => (h.score! / h.max!) * 100);
  const recentes = hist.slice(0, 4);
  const rascunho = hist.find((h) => h.status === "rascunho");

  return (
    <div className="flex flex-col gap-4" data-testid="redacao-home">
      {/* ───── Hero ───── */}
      <section className="relative isolate overflow-hidden rounded-[18px] bg-[#0B0B0D] text-white shadow-[0_18px_40px_-20px_rgba(0,0,0,0.6)]">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[radial-gradient(120%_90%_at_0%_0%,#2A2B2F_0%,#0B0B0D_55%)]" />
        <div aria-hidden className="absolute inset-y-0 right-0 -z-10 hidden w-[50%] overflow-hidden sm:block xl:w-[62%]">
          <Image src="/redacao/hero-arte.webp" alt="" fill priority sizes="62vw" data-mv-paralaxe="" className="object-cover object-right [mask-image:linear-gradient(90deg,transparent_0%,#000_22%)]" />
        </div>
        <div className="relative px-5 py-6 sm:max-w-[60%] sm:px-8 sm:py-7 xl:max-w-[700px]">
          <h1 data-mv-titulo="" className="font-black italic uppercase leading-[0.92] tracking-[-0.02em]">
            <span className="block text-[34px] sm:text-[38px] xl:text-[46px]">APROVUM</span>
            <span className="block text-[38px] sm:text-[46px] xl:text-[58px]">
              <span className="text-[#E50914] [text-shadow:0_2px_0_#7A0006]">REDAÇÃO</span> ELITE
            </span>
          </h1>
          <p className="mt-3 text-[13px] font-extrabold italic tracking-[0.18em] sm:text-[17px]">ESCREVA. CORRIJA. EVOLUA. CONQUISTE.</p>
          <p className="mt-3 max-w-[500px] text-[13px] leading-snug text-white/85 sm:text-[14.5px]">
            Seu professor particular de redação, com inteligência artificial especializada em Língua Portuguesa, gramática e os critérios do ENEM e dos principais concursos públicos.
          </p>
          <ul className="mt-4 flex flex-col gap-2 text-[12.5px] sm:flex-row sm:flex-wrap sm:gap-x-5">
            {["Corrija sua redação com IA especializada", "Receba nota e diagnóstico", "Evolua com um plano personalizado"].map((t) => (
              <li key={t} className="flex items-center gap-2">
                <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center rounded-full bg-[#E50914]"><Check className="h-3 w-3" strokeWidth={3.5} aria-hidden /></span>
                {t}
              </li>
            ))}
          </ul>
          {rascunho && (
            <Link href={`/redacao/escrever?id=${rascunho.id}`} className="mt-4 inline-flex items-center gap-1.5 rounded-[10px] border border-white/30 px-3.5 py-1.5 text-[12.5px] font-semibold hover:bg-white/10">
              Continuar rascunho <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          )}
        </div>
        <div aria-hidden className="relative aspect-[611/283] w-full sm:hidden">
          <Image src="/redacao/hero-arte.webp" alt="" fill sizes="100vw" className="object-cover [mask-image:linear-gradient(180deg,transparent_0%,#000_25%)]" />
        </div>
      </section>

      {!iaAtiva && <Aviso tom="alerta">O professor de IA ainda não foi ativado neste ambiente (a equipe precisa configurar o provedor de IA). Você já pode escrever e salvar rascunhos; a correção fica disponível assim que a IA for ativada.</Aviso>}

      {/* ───── Ações ───── */}
      <div data-mv-grupo="" className="grid grid-cols-2 gap-2.5 sm:gap-3 md:grid-cols-3 xl:grid-cols-5">
        {ACOES.map(({ href, t, d, cta, Icon }) => (
          <Link key={t} href={href} className="group flex flex-col items-center rounded-[14px] border border-[#ECECEF] bg-white px-2.5 pb-3 pt-4 text-center last:max-md:col-span-2 sm:px-4 sm:pb-4 sm:pt-5 shadow-[0_6px_18px_-12px_rgba(8,9,11,0.35)] transition hover:-translate-y-0.5 hover:border-[#F2C4C7] hover:shadow-[0_18px_34px_-16px_rgba(229,9,20,0.3)]">
            <span data-mv-ico="" className="block"><Icon className="h-9 w-9 text-[#E50914] drop-shadow-[0_3px_4px_rgba(229,9,20,0.3)] sm:h-11 sm:w-11" strokeWidth={2.2} aria-hidden /></span>
            <span className="mt-2 text-[14px] font-extrabold leading-tight tracking-[-0.01em] text-[#08090B] sm:mt-3 sm:text-[16px]">{t}</span>
            <span className="mt-1 flex-1 text-[11.5px] leading-snug text-[#3A3C42] sm:text-[12.5px]">{d}</span>
            <span data-mv-brilho="" className="mt-3 inline-flex w-full items-center justify-center gap-1.5 rounded-[6px] bg-gradient-to-b from-[#F0141C] to-[#C8000A] px-2 py-2 text-[11.5px] font-bold sm:px-3 sm:text-[12.5px] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.25)] transition group-hover:brightness-110">
              {cta} <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </span>
          </Link>
        ))}
      </div>

      {/* ───── Painéis ───── */}
      <div data-mv-grupo="" className="grid gap-3 md:grid-cols-2 xl:grid-cols-[1.28fr_1.2fr_1.06fr_0.74fr]">
        {/* Desempenho */}
        <section className="@container flex flex-col overflow-hidden rounded-[12px] border border-[#ECECEF] bg-white shadow-[0_6px_18px_-12px_rgba(8,9,11,0.35)]" data-testid="redacao-desempenho">
          <Cabecalho titulo="Seu Desempenho em Redação" />
          {ultima ? (
            <div className="flex flex-1 flex-col gap-3 p-4">
              <div className="flex flex-col items-center gap-2.5 sm:flex-row sm:items-start">
                <div className="flex flex-col items-center">
                  <Medidor pct={pct} nota={ultima.score} max={ultima.max} />
                  <span data-mv-selo="" className="-mt-2 inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-extrabold text-[#08090B]" style={{ background: "#F5B400" }}>
                    <Trophy className="h-4 w-4 text-[#B30000]" aria-hidden /> {selo(pct!).txt}
                  </span>
                </div>
                <ul className="w-full min-w-0 flex-1 rounded-[10px] bg-[#FAFAFB] px-2.5 py-2 shadow-[0_4px_14px_-10px_rgba(8,9,11,0.4)]">
                  {competencias.map((c) => (
                    <li key={c.key} className="flex items-center justify-between gap-1.5 py-[5px] text-[12px]">
                      <span className="flex min-w-0 items-center gap-1.5" title={c.label}>
                        <span className="flex h-[16px] w-[16px] shrink-0 items-center justify-center rounded-full" style={{ background: c.score / c.max >= 0.7 ? "#2DB34A" : "#3C6FDE" }}>
                          <Check className="h-2.5 w-2.5 text-white" strokeWidth={4} aria-hidden />
                        </span>
                        <span className="truncate text-[#2B2D33]">
                          <span className="@[380px]:hidden">{c.label.split(" — ")[0]!.replace(/^Competência\b/, "Comp.")}</span>
                          <span className="hidden @[380px]:inline">{c.label.split(" — ")[0]}</span>
                        </span>
                      </span>
                      <span className="shrink-0 font-semibold text-[#08090B]">{c.score}/{c.max}</span>
                    </li>
                  ))}
                  {!competencias.length && <li className="py-2 text-[12.5px] text-[#64666D]">Detalhamento por competência indisponível.</li>}
                </ul>
              </div>
              <div className="mt-auto flex items-end justify-between gap-3">
                <div className="flex items-start gap-2">
                  <TrendingUp className="mt-0.5 h-5 w-5 text-[#E50914]" aria-hidden />
                  {delta !== null ? (
                    <p className="leading-tight"><span className="text-[13px] font-extrabold text-[#08090B]">{delta >= 0 ? "+" : ""}{delta} pontos</span><br /><span className="text-[11px] text-[#64666D]">em relação à sua última redação</span></p>
                  ) : (
                    <p className="leading-tight"><span className="text-[13px] font-extrabold text-[#08090B]">Primeira nota</span><br /><span className="text-[11px] text-[#64666D]">corrija outra para comparar</span></p>
                  )}
                </div>
                <div className="flex h-[64px] items-end gap-[6px]" role="img" aria-label={`Últimas notas: ${barras.map((b) => Math.round(b)).join(", ")}%`}>
                  {barras.map((b, i) => (
                    <span key={i} data-mv-barra="" className="w-[15px] rounded-[2px]" style={{ height: `${Math.max(14, b)}%`, background: i === 0 && barras.length > 2 ? "#6B6D74" : i === barras.length - 1 ? "#C8000A" : "#E50914" }} />
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 p-5 text-center">
              <Medidor pct={0} nota={null} max={1000} />
              <p className="text-[13px] text-[#64666D]">Corrija sua primeira redação para ver sua nota e as competências aqui.</p>
              <Link href="/redacao/escrever" className="inline-flex items-center gap-1.5 rounded-[6px] bg-[#E50914] px-3.5 py-2 text-[12.5px] font-bold text-white">Escrever agora <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>
            </div>
          )}
        </section>

        {/* Últimas redações */}
        <section className="flex flex-col overflow-hidden rounded-[12px] border border-[#ECECEF] bg-white shadow-[0_6px_18px_-12px_rgba(8,9,11,0.35)]">
          <Cabecalho titulo="Últimas Redações" aside={<Link href="/redacao/historico" data-toque="" className="inline-flex items-center gap-1 text-[12px] font-semibold underline underline-offset-2 hover:text-[#FF6B73]">Ver Histórico <ArrowRight className="h-3.5 w-3.5" aria-hidden /></Link>} />
          {recentes.length === 0 ? (
            <p className="p-5 text-[13px] text-[#64666D]">Você ainda não escreveu nenhuma redação.</p>
          ) : (
            <ul data-mv-grupo="" className="flex flex-col divide-y divide-[#ECEDF0] px-3">
              {recentes.map((h) => {
                const p = h.score !== null && h.max ? (h.score / h.max) * 100 : null;
                return (
                  <li key={h.id}>
                    <Link href={h.status === "rascunho" || h.status === "falhou" ? `/redacao/escrever?id=${h.id}` : `/redacao/${h.id}`} className="flex items-center gap-3 py-3 transition hover:bg-[#FAFAFB]">
                      <span className={`flex h-[34px] min-w-[52px] shrink-0 items-center justify-center rounded-[9px] px-2 font-extrabold text-white ${p === null ? "bg-[#9A9CA3] text-[11px]" : "text-[17px]"}`} style={p !== null ? { background: selo(p).bg } : undefined}>
                        {h.score !== null ? h.score : statusTxt(h)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[13.5px] font-semibold text-[#08090B]">Tema: {h.themeTitle || h.title}</span>
                        <span className="block truncate text-[12px] text-[#64666D]">{quando(h.createdAt)} • {MODALIDADE_LABEL[h.modality] ?? h.modality}</span>
                      </span>
                      <ChevronRight className="h-5 w-5 shrink-0 text-[#08090B]" aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Recursos exclusivos */}
        <section className="flex flex-col overflow-hidden rounded-[12px] border border-[#ECECEF] bg-white shadow-[0_6px_18px_-12px_rgba(8,9,11,0.35)]">
          <Cabecalho titulo="Recursos Exclusivos" />
          <ul className="flex flex-col gap-1 p-3">
            {RECURSOS.map(({ href, t, d, Icon }) => (
              <li key={t}>
                <Link href={href} className="flex gap-3 rounded-[8px] p-1.5 transition hover:bg-[#FAFAFB]">
                  <span className="flex h-[38px] w-[38px] shrink-0 items-center justify-center rounded-[8px] bg-[#FDECEC]">
                    <Icon className="h-5 w-5 text-[#E50914]" strokeWidth={2.4} aria-hidden />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[13px] font-bold text-[#08090B]">{t}</span>
                    <span className="block text-[11.5px] leading-snug text-[#4A4C52]">{d}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* Desafio semanal */}
        <section className="relative isolate flex min-h-[260px] flex-col justify-end overflow-hidden rounded-[12px] bg-[#0A0A0B] p-5 text-white shadow-[0_6px_18px_-12px_rgba(8,9,11,0.5)]">
          <Image src="/redacao/globo.webp" alt="" width={328} height={220} aria-hidden className="pointer-events-none absolute right-0 top-0 -z-10 w-[78%] max-w-[260px] [mask-image:radial-gradient(circle_at_70%_30%,#000_45%,transparent_78%)]" />
          <CalendarDays className="h-8 w-8 rounded-[6px] bg-[#E50914] p-1" aria-hidden />
          <h2 className="mt-3 text-[20px] font-extrabold leading-tight">Desafio Semanal de Redação</h2>
          <p className="mt-2 text-[13.5px] leading-snug text-white/85">Teste seus conhecimentos com temas atuais!</p>
          <Link href="/redacao/temas" className="mt-4 inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-[6px] bg-gradient-to-b from-[#F0141C] to-[#C8000A] px-3 py-2.5 text-[13px] font-bold transition hover:brightness-110">
            Participar Agora <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </section>
      </div>

      {/* ───── Faixa final ───── */}
      <section className="relative isolate flex flex-col items-start gap-3 overflow-hidden rounded-[12px] bg-[#0B0B0D] px-5 py-4 text-white sm:flex-row sm:items-center sm:justify-between">
        <div aria-hidden className="absolute inset-0 -z-10 bg-[linear-gradient(115deg,transparent_0%,transparent_8%,#B3000A_8.5%,transparent_14%,transparent_70%,#C8000A_74%,#7A0006_86%,transparent_92%)] opacity-90" />
        <p className="flex items-center gap-3 text-[13.5px] sm:text-[15px]">
          <Star className="h-7 w-7 shrink-0 fill-[#F5B400] text-[#F5B400]" aria-hidden />
          <span>Com o <b>APROVUM REDAÇÃO ELITE</b>, você se prepara com o que há de melhor em tecnologia e ensino.</span>
        </p>
        <p className="flex items-center gap-3 font-bold leading-tight">
          <Trophy className="h-9 w-9 shrink-0 text-[#F5B400]" aria-hidden />
          <span className="text-[15px] sm:text-[16px]">Sua nota mais alta<br />está ao seu alcance!</span>
        </p>
      </section>
    </div>
  );
}
