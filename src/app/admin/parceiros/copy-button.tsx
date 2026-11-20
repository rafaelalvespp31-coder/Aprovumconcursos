"use client";

import { useState } from "react";

/** Copia um texto (cupom ou link) e confirma ao lado. */
export function CopyButton({ text, label }: { text: string; label: string }) {
  const [done, setDone] = useState(false);
  return (
    <button
      type="button"
      className="rounded-md border border-linha px-2 py-1 t-tiny font-semibold hover:bg-fundo"
      onClick={() => {
        void navigator.clipboard?.writeText(text).then(() => {
          setDone(true);
          setTimeout(() => setDone(false), 1800);
        });
      }}
    >
      {done ? "Copiado" : label}
    </button>
  );
}
