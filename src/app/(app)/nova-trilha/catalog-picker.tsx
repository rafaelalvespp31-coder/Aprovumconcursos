"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { inputClass } from "@/components/ui";
import type { CatalogPickItem, CatalogPickerGroup } from "@/domain/catalog/picker";

/**
 * Seletor de aulas já catalogadas, em modo de seleção (listas, sem cards): primeiro a
 * matéria, depois a aula da matéria. Mostra o resumo da aula escolhida.
 */
export function CatalogPicker({
  groups,
  value,
  onChange,
  invalid,
  initialSubject,
}: {
  groups: CatalogPickerGroup[];
  initialSubject?: string;
  value: string | null;
  onChange: (t: CatalogPickItem) => void;
  invalid?: boolean;
}) {
  const total = groups.reduce((n, g) => n + g.topics.length, 0);
  const groupOf = (id: string | null) => (id ? groups.find((g) => g.topics.some((t) => t.id === id))?.discipline : undefined);
  const [subject, setSubject] = useState<string>(
    () => groupOf(value) ?? (initialSubject && groups.some((g) => g.discipline === initialSubject) ? initialSubject : ""),
  );
  const topics = useMemo(() => (subject ? (groups.find((g) => g.discipline === subject)?.topics ?? []) : groups.flatMap((g) => g.topics)), [groups, subject]);
  const picked = groups.flatMap((g) => g.topics).find((t) => t.id === value) ?? null;

  if (!total) {
    return <p className="rounded-md border border-linha bg-superficie p-4 t-small text-tinta-suave">Novas aulas estão sendo cadastradas. Volte em breve.</p>;
  }

  return (
    <div data-testid="seletor-catalogo" className="grid gap-4">
      <div>
        <label htmlFor="materia-aula" className="mb-1.5 block t-small font-semibold">Matéria</label>
        <select
          id="materia-aula"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          className={inputClass}
        >
          <option value="">Todas as matérias ({total})</option>
          {groups.map((g) => (
            <option key={g.discipline} value={g.discipline}>
              {g.discipline} ({g.topics.length})
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="aula-catalogo" className="mb-1.5 block t-small font-semibold">Aula</label>
        <select
          id="aula-catalogo"
          value={value && topics.some((t) => t.id === value) ? value : ""}
          onChange={(e) => {
            const t = topics.find((x) => x.id === e.target.value);
            if (t) onChange(t);
          }}
          aria-invalid={invalid || undefined}
          className={inputClass}
        >
          <option value="" disabled>
            Selecione a aula
          </option>
          {subject
            ? topics.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.title}
                </option>
              ))
            : groups.map((g) => (
                <optgroup key={g.discipline} label={g.discipline}>
                  {g.topics.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.title}
                    </option>
                  ))}
                </optgroup>
              ))}
        </select>
      </div>
      {picked && (
        <p className="rounded-md border border-linha bg-superficie px-3.5 py-3 t-small text-tinta-suave" data-testid="aula-escolhida">
          {picked.summary && <span className="block text-tinta">{picked.summary}</span>}
          <span className="mt-1 inline-flex items-center gap-1 t-tiny text-tinta-fraca">
            <Icon name="relogio" className="size-3.5" /> ~{picked.minutes} min · aula, questões e PDF
          </span>
        </p>
      )}
    </div>
  );
}
