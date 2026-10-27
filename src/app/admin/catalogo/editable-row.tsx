"use client";

import { useState, type ReactNode } from "react";
import { TopicMetaEditor } from "./[id]/meta-editor";

interface RowTopic {
  id: string;
  title: string;
  kind: string;
  lawCode: string | null;
  articles: string[];
  topicGroup: string | null;
  topicGroupCode: string | null;
  subtopicCode: string | null;
}

/**
 * Linha do catálogo com edição no lugar: o botão "Editar" abre, logo abaixo, o formulário de
 * tema, tipo, tópico e subtópico (sem sair da lista).
 */
export function EditableRow({ topic, cells, cols }: { topic: RowTopic; cells: ReactNode; cols: number }) {
  const [open, setOpen] = useState(false);
  const [saved, setSaved] = useState(false);
  return (
    <>
      <tr data-testid="linha-catalogo">
        {cells}
        <td className="px-3 py-2 align-top">
          <button
            type="button"
            onClick={() => {
              setSaved(false);
              setOpen((v) => !v);
            }}
            aria-expanded={open}
            className="t-small font-semibold text-destaque underline underline-offset-2"
            data-testid="editar-linha"
          >
            {open ? "Fechar" : "Editar"}
          </button>
          {saved && <span className="ml-2 t-tiny text-tinta-suave" role="status">Salvo</span>}
        </td>
      </tr>
      {open && (
        <tr>
          <td colSpan={cols} className="bg-nevoa px-3 py-3">
            <TopicMetaEditor
              {...topic}
              onClose={(ok) => {
                setOpen(false);
                setSaved(ok);
              }}
            />
          </td>
        </tr>
      )}
    </>
  );
}
