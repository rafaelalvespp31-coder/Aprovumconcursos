"use client";

import { useMemo, useState } from "react";
import { Icon } from "@/components/icons";
import { inputClass } from "@/components/ui";
import type { CatalogPickItem, CatalogPickerGroup } from "@/domain/catalog/picker";

const norm = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

/**
 * Seletor de aulas já catalogadas, separadas por matéria: busca, filtro por matéria
 * e cards selecionáveis (um por aula). Acessível como grupo de rádio.
 */
export function CatalogPicker({
  groups,
  value,
  onChange,
  invalid,
}: {
  groups: CatalogPickerGroup[];
  value: string | null;
  onChange: (t: CatalogPickItem) => void;
  invalid?: boolean;
}) {
  const [subject, setSubject] = useState<string>("Todas");
  const [q, setQ] = useState("");
  const total = groups.reduce((n, g) => n + g.topics.length, 0);

  const visible = useMemo(() => {
    const words = norm(q).split(/\s+/).filter(Boolean);
    return groups
      .filter((g) => subject === "Todas" || g.discipline === subject)
      .map((g) => ({
        ...g,
        topics: g.topics.filter((t) => {
          const hay = norm(`${t.title} ${t.summary ?? ""} ${g.discipline}`);
          return words.every((w) => hay.includes(w));
        }),
      }))
      .filter((g) => g.topics.length > 0);
  }, [groups, subject, q]);

  if (!total) {
    return <p className="rounded-md border border-linha bg-superficie p-4 t-small text-tinta-suave">Novas aulas estão sendo cadastradas. Volte em breve.</p>;
  }

  return (
    <div data-testid="seletor-catalogo">
      <div className="relative">
        <Icon name="busca" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-tinta-fraca" />
        <label htmlFor="busca-aula" className="sr-only">Buscar aula</label>
        <input
          id="busca-aula"
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar aula (ex.: inquérito)"
          className={`${inputClass} pl-9`}
          autoComplete="off"
        />
      </div>

      <div className="-mx-1 mt-3 flex gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]" role="tablist" aria-label="Matérias">
        {["Todas", ...groups.map((g) => g.discipline)].map((d) => {
          const n = d === "Todas" ? total : groups.find((g) => g.discipline === d)?.topics.length ?? 0;
          const on = subject === d;
          return (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={on}
              onClick={() => setSubject(d)}
              className={`shrink-0 rounded-full border px-3.5 py-2 t-tiny font-semibold transition-colors ${on ? "border-transparent bg-[#D90A00] text-white" : "border-linha-forte bg-superficie text-tinta-suave hover:border-[#D90A00] hover:text-[#B00800]"}`}
            >
              {d} <span className={on ? "text-white/80" : "text-tinta-fraca"}>({n})</span>
            </button>
          );
        })}
      </div>

      <div role="radiogroup" aria-label="Aulas disponíveis" aria-invalid={invalid} className="mt-4 flex flex-col gap-6">
        {visible.length === 0 && <p className="t-small text-tinta-suave">Nenhuma aula encontrada para “{q}”.</p>}
        {visible.map((g) => (
          <section key={g.discipline} aria-label={g.discipline}>
            <h3 className="flex items-center gap-2 t-tiny font-bold uppercase tracking-[0.12em] text-tinta-suave">
              <span className="h-3 w-1 rounded-full bg-[#D90A00]" aria-hidden /> {g.discipline}
              <span className="font-semibold normal-case tracking-normal text-tinta-fraca">· {g.topics.length} {g.topics.length === 1 ? "aula" : "aulas"}</span>
            </h3>
            <div className="mt-2 grid gap-2">
              {g.topics.map((t) => {
                const on = value === t.id;
                return (
                  <label
                    key={t.id}
                    className={`relative flex cursor-pointer items-start gap-3 rounded-xl border bg-superficie p-3.5 transition-[border-color,box-shadow] has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[#D90A00] ${on ? "border-[#D90A00] shadow-[0_0_0_1px_#D90A00,0_8px_20px_rgba(217,10,0,0.12)]" : "border-linha hover:border-linha-forte"}`}
                  >
                    <input type="radio" name="catalogPick" value={t.id} checked={on} onChange={() => onChange(t)} className="sr-only" />
                    <span className={`mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full border-2 ${on ? "border-[#D90A00] bg-[#D90A00] text-white" : "border-linha-forte"}`} aria-hidden>
                      {on && <Icon name="check" className="size-3" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold leading-snug">{t.title}</span>
                      {t.summary && <span className="mt-0.5 line-clamp-2 block t-tiny text-tinta-suave">{t.summary}</span>}
                      <span className="mt-1.5 inline-flex items-center gap-1 t-tiny text-tinta-fraca">
                        <Icon name="relogio" className="size-3.5" /> ~{t.minutes} min · aula, questões e PDF
                      </span>
                    </span>
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
