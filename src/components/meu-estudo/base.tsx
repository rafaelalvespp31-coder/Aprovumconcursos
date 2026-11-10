"use client";

import { createElement, useId } from "react";
import { BookOpen, Building2, Calculator, Globe, Landmark, MessageCircle, Monitor, Scale, ShieldCheck, Target } from "lucide-react";
import type { BoardFolder, BoardTrail } from "@/app/(app)/trilhas/folder-board";

export interface EstudoFolder extends BoardFolder {
  /** Ícone escolhido pelo aluno; ausente = automático pelo nome. */
  icon?: string | null;
}
export interface EstudoTrail extends BoardTrail {
  banca: string;
  bancaLabel: string;
  updatedAt: string;
  /** Data do último estudo (null = ainda não estudada). */
  lastStudiedAt?: string | null;
}

/** Paleta das pastas. "amarelo" (cor livre do banco) é exibida como laranja, como na referência. */
export const PALETA: Record<string, { nome: string; main: string; dark: string; light: string; tint: string }> = {
  vermelho: { nome: "Vermelho", main: "#e10600", dark: "#8f0400", light: "#ff5a52", tint: "#ffe9e7" },
  azul: { nome: "Azul", main: "#1d5fe8", dark: "#0b2f8f", light: "#5b93ff", tint: "#e6eeff" },
  verde: { nome: "Verde", main: "#15a34a", dark: "#0b5d29", light: "#4ade80", tint: "#e2f8ea" },
  amarelo: { nome: "Laranja", main: "#f97316", dark: "#b34a05", light: "#ffa65c", tint: "#ffeedd" },
  preto: { nome: "Preto", main: "#2b2b2b", dark: "#0a0a0a", light: "#6b6b6b", tint: "#ececec" },
  cinza: { nome: "Cinza", main: "#8a8f98", dark: "#4b5058", light: "#c3c7cd", tint: "#eef0f3" },
};
export const COR = (c: string) => PALETA[c] ?? PALETA.vermelho!;

export type Glifo = typeof Scale;
export const ICONES: Record<string, { nome: string; G: Glifo }> = {
  balanca: { nome: "Justiça", G: Scale },
  escudo: { nome: "Polícia", G: ShieldCheck },
  calculadora: { nome: "Cálculo", G: Calculator },
  conversa: { nome: "Linguagem", G: MessageCircle },
  livro: { nome: "Livro", G: BookOpen },
  colunas: { nome: "Constituição", G: Landmark },
  predio: { nome: "Administração", G: Building2 },
  monitor: { nome: "Informática", G: Monitor },
  alvo: { nome: "Foco", G: Target },
  globo: { nome: "Atualidades", G: Globe },
};

/** Ícone automático pelo nome da pasta (é só ilustração, não é dado). */
export function iconeAutomatico(nome: string): string {
  const n = nome.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
  if (/(processo|policia|processual)/.test(n)) return "escudo";
  if (/(penal|civil|direito|lei|legisl)/.test(n)) return "balanca";
  if (/(mat|racioc|logic|estat)/.test(n)) return "calculadora";
  if (/(portugu|redac|lingua|texto)/.test(n)) return "conversa";
  if (/(constitu|human)/.test(n)) return "colunas";
  if (/(administr|admin)/.test(n)) return "predio";
  if (/(inform|tecnolog)/.test(n)) return "monitor";
  if (/(atualid|geograf|histor)/.test(n)) return "globo";
  return "livro";
}
export const glifoDa = (nome: string, icon?: string | null): Glifo => (ICONES[icon ?? ""] ?? ICONES[iconeAutomatico(nome)]!).G;

export function tempo(seg: number): string {
  const min = Math.floor(seg / 60);
  if (min < 1) return seg > 0 ? "< 1min" : "0min";
  const h = Math.floor(min / 60);
  const m = min % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}min` : `${m}min`;
}
export const plural = (n: number, s: string, p: string) => `${n} ${n === 1 ? s : p}`;
export const dataCurta = (iso: string) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", year: "2-digit" });

/** Pasta 3D (SVG leve) com o glifo da matéria no corpo. */
export function PastaIcone({ cor, Glifo, className = "" }: { cor: string; Glifo: Glifo; className?: string }) {
  const id = useId().replace(/:/g, "");
  const c = COR(cor);
  return (
    <span className={`me-pasta ${className}`} aria-hidden>
      <svg viewBox="0 0 120 96" width="100%" height="100%">
        <defs>
          <linearGradient id={`${id}a`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.light} /><stop offset="1" stopColor={c.main} /></linearGradient>
          <linearGradient id={`${id}b`} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor={c.main} /><stop offset="1" stopColor={c.dark} /></linearGradient>
        </defs>
        <path className="me-pasta-aba" d="M6 18a8 8 0 0 1 8-8h30c4 0 6 2 8.5 5 2 2.6 3.8 3.5 7 3.5H106a8 8 0 0 1 8 8v8H6z" fill={c.dark} />
        <g className="me-pasta-frente">
          <rect x="6" y="26" width="108" height="62" rx="9" fill={`url(#${id}b)`} />
          <path d="M6 35a9 9 0 0 1 9-9h90a9 9 0 0 1 9 9v6H6z" fill={`url(#${id}a)`} opacity=".9" />
          <rect x="6.5" y="26.5" width="107" height="61" rx="8.5" fill="none" stroke="#fff" strokeOpacity=".28" />
        </g>
      </svg>
      <Glifo className="me-pasta-glifo" strokeWidth={1.8} />
    </span>
  );
}

/** Marca-d'água temática do card (glifo grande e discreto). */
export function Marca({ Glifo }: { Glifo: Glifo }) {
  return createElement(Glifo, { className: "me-card-marca", strokeWidth: 1.1, "aria-hidden": true });
}
