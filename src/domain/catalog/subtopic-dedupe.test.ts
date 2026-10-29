import { describe, expect, it } from "vitest";
import { existingForUpload, findAllCatalogFor } from "./topic-group";

const row = (id: string, title: string, sub: string | null, status = "publicado", slug = `s-${id}`, group = "4. Ilicitude") => ({ id, title, status, topicGroup: group.replace(/^\d+\.\s*/, ""), subtopicCode: sub, slug });

describe("subtópico já catalogado não duplica", () => {
  const catalog = [row("a", "Estado de necessidade", "4.1"), row("b", "Legítima defesa", "4.2"), row("c", "Extorsão", null, "rascunho", "s-c", "Patrimônio")];

  it("mesmo endereço (slug) atualiza a própria aula", () => {
    expect(existingForUpload({ title: "Qualquer", topicGroup: null, topicGroupCode: null, subtopicCode: null }, "s-b", catalog)).toMatchObject({ row: { id: "b" }, by: "endereco" });
  });

  it("título diferente mas mesmo tópico e número: atualiza a aula do subtópico em vez de criar outra", () => {
    const r = existingForUpload({ title: "Estado de necessidade (art. 24 do CP)", topicGroup: "Ilicitude", topicGroupCode: "4", subtopicCode: "4.1" }, "slug-novo", catalog);
    expect(r).toMatchObject({ row: { id: "a" }, by: "subtopico" });
  });

  it("sem número: só o título idêntico no mesmo tópico conta (nunca 'contém')", () => {
    expect(existingForUpload({ title: "Extorsão", topicGroup: "Patrimônio", topicGroupCode: null, subtopicCode: null }, "x", catalog)?.row.id).toBe("c");
    expect(existingForUpload({ title: "Extorsão mediante sequestro", topicGroup: "Patrimônio", topicGroupCode: null, subtopicCode: null }, "x", catalog)).toBeNull();
  });

  it("subtópico novo (outro número) cria aula nova", () => {
    expect(existingForUpload({ title: "Estrito cumprimento do dever legal", topicGroup: "Ilicitude", topicGroupCode: "4", subtopicCode: "4.3" }, "x", catalog)).toBeNull();
  });

  it("acha todas as aulas do mesmo subtópico (duplicadas), publicadas primeiro; arquivada não conta", () => {
    const dup = [...catalog, row("d", "Estado de necessidade — revisão", "4.1", "rascunho"), row("e", "Estado de necessidade", "4.1", "arquivado")];
    expect(findAllCatalogFor({ code: "4", title: "Ilicitude" }, { code: "4.1", title: "Estado de necessidade" }, dup).map((x) => x.id)).toEqual(["a", "d"]);
  });
});
