import { describe, expect, it } from "vitest";
import { buildSubjectsMenu } from "./subjects-menu";

describe("submenu de matérias", () => {
  it("agrupa os estudos por matéria do catálogo, depois pasta, depois 'Outras matérias'", () => {
    const menu = buildSubjectsMenu({
      trails: [
        { id: "a", title: "Homicídio", folder_id: null, last_studied_at: "2026-10-10", updated_at: "2026-10-01", catalogTopicIds: ["t1"] },
        { id: "b", title: "Furto", folder_id: null, last_studied_at: "2026-10-12", updated_at: "2026-10-01", catalogTopicIds: ["t2"] },
        { id: "c", title: "Inquérito", folder_id: "f1", last_studied_at: null, updated_at: "2026-10-05", catalogTopicIds: [] },
        { id: "d", title: "Solto", folder_id: null, last_studied_at: null, updated_at: "2026-10-05", catalogTopicIds: [] },
      ],
      folders: [{ id: "f1", name: "Processo Penal" }],
      topicDiscipline: new Map([["t1", "Direito Penal"], ["t2", "Direito Penal"]]),
    });
    expect(menu.map((m) => m.name)).toEqual(["Direito Penal", "Processo Penal", "Outras matérias"]);
    expect(menu[0]!.studies.map((s) => s.title)).toEqual(["Furto", "Homicídio"]);
  });
});
