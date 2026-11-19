"use client";
import { parseSmart } from "@/domain/bank/smart-import";
import { SmartImporter } from "@/app/banco/importar/smart-import";

const destinos = { subjects: [{ id: "00000000-0000-4000-8000-000000000001", name: "Língua Portuguesa", topics: [{ id: "00000000-0000-4000-8000-000000000002", name: "Ortografia", parentId: null }] }] };

/** Galeria: o importador com ações simuladas (sem banco), para conferir a tela. */
export function ImportadorDemo() {
  return (
    <div className="min-h-dvh bg-[#0b0b0b] p-3 text-white">
      <SmartImporter
        actions={{
          analyze: async (t) => ({ ok: true, data: { destinos, analysis: { baseTexts: [], drafts: parseSmart(t).drafts.map((d, i) => ({ ...d, duplicate: i === 1 ? ("ja_cadastrada" as const) : ("inedita" as const), duplicateCode: i === 1 ? "Q-000123" : null, suggestedSubjectId: destinos.subjects[0]!.id })) } } }),
          save: async (items) => ({ ok: true, data: { importId: "x", imported: (items as unknown[]).length, published: 0, ignored: 0, errors: 0, results: (items as Array<{ key: string }>).map((i) => ({ key: i.key, status: "importada" as const, code: null, message: "Simulado." })) } }),
          history: async () => ({ ok: true, data: [] }),
          saveBoard: async () => ({ ok: true }),
        }}
      />
    </div>
  );
}
