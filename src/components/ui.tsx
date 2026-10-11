import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

type Variant = "primario" | "secundario" | "discreto" | "perigo";

const variants: Record<Variant, string> = {
  primario:
    "bg-azul text-white hover:bg-azul-escuro disabled:bg-linha-forte disabled:text-white",
  secundario:
    "bg-superficie text-tinta border border-linha-forte hover:border-azul hover:text-destaque disabled:text-tinta-fraca",
  discreto: "text-destaque hover:bg-nevoa disabled:text-tinta-fraca",
  perigo: "bg-superficie text-erro border border-erro/40 hover:bg-erro-fundo",
};

const base =
  "inline-flex items-center justify-center gap-2 rounded-md px-4 min-h-11 font-semibold text-[0.95rem] transition-colors disabled:cursor-not-allowed";

export function Button({
  variant = "primario",
  className = "",
  ...props
}: ComponentProps<"button"> & { variant?: Variant }) {
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function ButtonLink({
  variant = "primario",
  className = "",
  ...props
}: ComponentProps<typeof Link> & { variant?: Variant }) {
  return <Link className={`${base} ${variants[variant]} ${className}`} {...props} />;
}

export function Field({
  label,
  hint,
  error,
  id,
  children,
}: {
  label: string;
  hint?: ReactNode;
  error?: string | null;
  id: string;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className="font-semibold t-small">
        {label}
      </label>
      {children}
      {hint && !error && <p className="t-tiny text-tinta-fraca">{hint}</p>}
      {error && (
        <p id={`${id}-erro`} className="t-tiny text-erro" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}

export const inputClass =
  "w-full rounded-md border border-linha-forte bg-superficie px-3 min-h-11 text-[1rem] text-tinta placeholder:text-tinta-fraca focus:border-azul focus:outline-none focus:ring-2 focus:ring-azul/20 aria-[invalid=true]:border-erro";

type Tone = "info" | "sucesso" | "alerta" | "erro";
const tones: Record<Tone, string> = {
  info: "bg-nevoa text-tinta border-azul/25",
  sucesso: "bg-dominado-fundo text-tinta border-dominado/30",
  alerta: "bg-alerta-fundo text-tinta border-alerta/30",
  erro: "bg-erro-fundo text-tinta border-erro/30",
};

export function Notice({ tone = "info", title, children }: { tone?: Tone; title?: string; children?: ReactNode }) {
  return (
    <div role={tone === "erro" ? "alert" : "status"} className={`rounded-md border px-4 py-3 t-small ${tones[tone]}`}>
      {title && <p className="font-semibold">{title}</p>}
      {children && <div className={title ? "mt-1 text-tinta-suave" : ""}>{children}</div>}
    </div>
  );
}

export function Tag({ tone = "neutro", children }: { tone?: "neutro" | "azul" | "verde" | "ambar" | "vermelho"; children: ReactNode }) {
  const map = {
    neutro: "bg-papel text-tinta-suave border-linha",
    azul: "bg-nevoa text-destaque border-azul/20",
    verde: "bg-dominado-fundo text-dominado border-dominado/25",
    ambar: "bg-alerta-fundo text-alerta border-alerta/25",
    vermelho: "bg-erro-fundo text-erro border-erro/25",
  };
  return <span className={`inline-flex items-center rounded-sm border px-1.5 py-0.5 t-tiny font-semibold ${map[tone]}`}>{children}</span>;
}

export function EmptyState({ title, children, action }: { title: string; children?: ReactNode; action?: ReactNode }) {
  return (
    <div className="rounded-lg border border-dashed border-linha-forte bg-superficie px-5 py-8 text-center">
      <p className="t-h3">{title}</p>
      {children && <p className="mx-auto mt-1 max-w-md t-small text-tinta-suave">{children}</p>}
      {action && <div className="mt-4 flex justify-center">{action}</div>}
    </div>
  );
}

export function Spinner({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center gap-2" role="status">
      <span className="size-4 animate-spin rounded-full border-2 border-azul border-t-transparent" aria-hidden />
      <span className="t-small text-tinta-suave">{label}</span>
    </span>
  );
}

export function Skeleton({ className = "h-4 w-full" }: { className?: string }) {
  return <div className={`animate-pulse rounded-sm bg-linha/70 ${className}`} aria-hidden />;
}

/** Cartão funcional: quando tem href, o cartão inteiro leva à funcionalidade. */
export function Card({ href, children, className = "" }: { href?: string; children: ReactNode; className?: string }) {
  const cls = `block rounded-lg border border-linha bg-superficie p-4 sm:p-5 ${className}`;
  if (!href) return <section className={cls}>{children}</section>;
  return (
    <Link href={href} className={`${cls} transition-colors hover:border-azul focus-visible:border-azul`}>
      {children}
    </Link>
  );
}

export function SectionTitle({ title, action }: { title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
      <h2 className="t-h2">{title}</h2>
      {action}
    </div>
  );
}
