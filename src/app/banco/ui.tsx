import Link from "next/link";
import type { ReactNode } from "react";

/** Primitivos do painel escuro do banco de questões (fundo escuro, detalhes vermelhos). */
export const dInput =
  "w-full min-h-11 rounded-md border border-white/15 bg-white/[0.06] px-3 text-[15px] text-white placeholder:text-white/35 focus:border-[#ff2a2a] focus:outline-none focus:ring-1 focus:ring-[#ff2a2a]/60 disabled:opacity-50";
export const dTextarea = `${dInput} min-h-28 py-2 leading-relaxed`;
export const dLabel = "mb-1 block text-[13px] font-semibold text-white/80";

const btn = {
  primario: "bg-[#e10600] text-white hover:bg-[#ff1e1e] shadow-[0_6px_20px_rgba(225,6,0,0.35)]",
  secundario: "border border-white/20 bg-white/[0.04] text-white hover:bg-white/[0.09]",
  perigo: "border border-[#ff4d4d]/50 bg-[#ff2a2a]/10 text-[#ff8080] hover:bg-[#ff2a2a]/20",
  discreto: "text-white/70 hover:bg-white/[0.06]",
} as const;
export type DTone = keyof typeof btn;
export const dButton = (tone: DTone = "primario") =>
  `inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-[14px] font-semibold transition active:scale-[0.97] touch-manipulation disabled:cursor-not-allowed disabled:opacity-40 ${btn[tone]}`;

export function DLink({ href, children, tone = "primario" }: { href: string; children: ReactNode; tone?: DTone }) {
  return (
    <Link href={href} className={dButton(tone)}>
      {children}
    </Link>
  );
}

export function DCard({ children, className = "", title, action }: { children: ReactNode; className?: string; title?: string; action?: ReactNode }) {
  return (
    <section className={`rounded-xl border border-white/10 bg-white/[0.03] p-4 sm:p-5 ${className}`}>
      {(title || action) && (
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          {title && <h2 className="font-[Space_Grotesk] text-[15px] font-bold uppercase tracking-[0.08em] text-white/90">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

const badgeTone: Record<string, string> = {
  verde: "border-emerald-400/40 bg-emerald-400/10 text-emerald-300",
  vermelho: "border-[#ff4d4d]/50 bg-[#ff2a2a]/10 text-[#ff8a8a]",
  ambar: "border-amber-400/40 bg-amber-400/10 text-amber-200",
  azul: "border-sky-400/40 bg-sky-400/10 text-sky-200",
  neutro: "border-white/15 bg-white/[0.06] text-white/75",
};
export function DBadge({ tone = "neutro", children }: { tone?: keyof typeof badgeTone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full border px-2 py-0.5 text-[12px] font-semibold ${badgeTone[tone]}`}>{children}</span>;
}

export const STATUS_TONE: Record<string, keyof typeof badgeTone> = {
  rascunho: "neutro",
  importada: "azul",
  aguardando_conferencia: "ambar",
  em_revisao: "ambar",
  correcao_necessaria: "vermelho",
  aprovada: "azul",
  publicada: "verde",
  suspensa: "vermelho",
  arquivada: "neutro",
};

export function DStat({ label, value, hint, tone = "neutro" }: { label: string; value: ReactNode; hint?: string; tone?: "neutro" | "vermelho" | "verde" | "ambar" }) {
  const color = { neutro: "text-white", vermelho: "text-[#ff4d4d]", verde: "text-emerald-300", ambar: "text-amber-200" }[tone];
  return (
    <div className="rounded-xl border border-white/10 bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-4">
      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-white/55">{label}</p>
      <p className={`mt-1 font-[Space_Grotesk] text-[28px] font-bold tabular-nums leading-none ${color}`}>{value}</p>
      {hint && <p className="mt-1 text-[12px] text-white/50">{hint}</p>}
    </div>
  );
}

export function DNotice({ tone = "info", children }: { tone?: "info" | "erro" | "ok" | "alerta"; children: ReactNode }) {
  const cls = {
    info: "border-white/15 bg-white/[0.05] text-white/85",
    erro: "border-[#ff4d4d]/50 bg-[#ff2a2a]/10 text-[#ffb3b3]",
    ok: "border-emerald-400/40 bg-emerald-400/10 text-emerald-200",
    alerta: "border-amber-400/40 bg-amber-400/10 text-amber-100",
  }[tone];
  return (
    <div role={tone === "erro" ? "alert" : "status"} className={`rounded-md border px-3 py-2 text-[14px] ${cls}`}>
      {children}
    </div>
  );
}

export function fmtDate(iso: string | null | undefined, withTime = false): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return withTime
    ? d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short" })
    : d.toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}
