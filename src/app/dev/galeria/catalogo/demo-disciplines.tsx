"use client";

import { useState } from "react";
import { DISCIPLINE_LABELS, DISCIPLINE_MODES } from "@/ai/pedagogy";
import { DisciplinesManager, type DisciplineItem } from "@/app/admin/catalogo/disciplines-manager";
import { disciplineSlug, foldName } from "@/domain/catalog/discipline-slug";

/** Matérias do catálogo na galeria: cadastrar, renomear e excluir em memória (nada é gravado). */
export function DemoDisciplines() {
  const [rows, setRows] = useState<DisciplineItem[]>(() => [
    ...DISCIPLINE_MODES.filter((m) => m !== "outra").map((m, i) => ({ slug: m, label: DISCIPLINE_LABELS[m], base: m, custom: false, lessons: i === 6 ? 12 : i % 3, outlines: i === 6 ? 1 : 0 })),
    { slug: "criminologia", label: "Criminologia", base: "direito_penal", custom: true, lessons: 2, outlines: 0 },
  ]);
  const taken = (label: string, except?: string) => rows.some((r) => r.slug !== except && foldName(r.label) === foldName(label));
  return (
    <DisciplinesManager
      rows={rows}
      actions={{
        create: async ({ label, base }) => {
          const name = label.trim();
          if (name.length < 2) return { ok: false, error: "Informe o nome da matéria." };
          if (taken(name)) return { ok: false, error: `“${name}” já existe entre as matérias.` };
          setRows((r) => [...r, { slug: disciplineSlug(name), label: name, base, custom: true, lessons: 0, outlines: 0 }]);
          return { ok: true, message: `Matéria “${name}” cadastrada.` };
        },
        update: async (slug, { label, base }) => {
          if (taken(label, slug)) return { ok: false, error: `“${label}” já existe entre as matérias.` };
          setRows((r) => r.map((x) => (x.slug === slug ? { ...x, label: label.trim(), base } : x)));
          return { ok: true, message: "Matéria atualizada." };
        },
        remove: async (slug) => {
          setRows((r) => r.filter((x) => x.slug !== slug));
          return { ok: true, message: "Matéria excluída." };
        },
      }}
    />
  );
}
