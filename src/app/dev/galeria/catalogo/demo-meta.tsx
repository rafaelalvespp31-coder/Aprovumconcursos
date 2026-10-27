"use client";

import { TopicMetaEditor } from "@/app/admin/catalogo/[id]/meta-editor";
import { parseTopicMeta } from "@/domain/catalog/topic-meta";

/** Prévia: valida como o servidor, mas não grava nada. */
export function DemoTopicMeta() {
  return (
    <TopicMetaEditor
      id="exemplo"
      title="Homicídio"
      kind="dispositivo"
      lawCode="CP"
      articles={["121"]}
      save={async (_id, data) => {
        const r = parseTopicMeta(data);
        return r.ok ? { ok: true } : { ok: false, error: r.error };
      }}
    />
  );
}
