"use client";
import { BookOpen, Calculator, FileText, Gavel, Hourglass, Landmark, Monitor, PenLine, Scale, ShieldCheck, type LucideIcon } from "lucide-react";
import { corDoIcone, iconeDe, temaDe } from "@/domain/mentor/cartao-exemplo";

const ICONES: Record<string, LucideIcon> = { Hourglass, Gavel, Landmark, FileText, Scale, PenLine, BookOpen, Calculator, ShieldCheck, Monitor };

/** Selo ilustrado no canto da lousa: o ícone muda com o assunto do título (martelo, ampulheta, calculadora, pena…). */
export function iconeDaLousa(titulo: string) {
  const ic = iconeDe(titulo, temaDe(null, titulo));
  return { ic, cor: corDoIcone(ic) };
}
export function IconeLousa({ titulo }: { titulo: string }) {
  if (!titulo.trim()) return null;
  const { ic, cor } = iconeDaLousa(titulo);
  const I = ICONES[ic] ?? BookOpen;
  return <span className="lz-ico" aria-hidden="true" style={{ color: cor, background: `color-mix(in srgb, ${cor} 12%, #fff)`, borderColor: cor }}><I size={34} strokeWidth={1.6} /></span>;
}
