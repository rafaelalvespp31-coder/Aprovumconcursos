import { expect, test } from "vitest";
import { parseOutline, removeSubtopicFromOutlineText } from "@/domain/catalog/topic-group";
test("remove subtópico repetido e seus itens", () => {
  const t = "3. Provas\n3.6 Interrogatório\n3.6.1 a\n3.7 Confissão\n3.7.1 b\n3.7.2 c\n3.7. Perguntas ao ofendido\n3.7.1 d\n3.8 Testemunhas\n3.8.1 e\n4. Outro\n4.1 Assunto longo";
  const o = parseOutline(t);
  const si = o.groups[0]!.subtopics.findIndex((s) => s.title === "Perguntas ao ofendido");
  const out = removeSubtopicFromOutlineText(t, 0, si)!;
  expect(out).not.toContain("Perguntas");
  expect(out).not.toContain("3.7.1 d");
  expect(out).toContain("3.7.2 c");
  expect(out).toContain("3.8 Testemunhas");
  expect(parseOutline(out).groups[1]!.subtopics.length).toBe(1);
  expect(removeSubtopicFromOutlineText(t, 0, 99)).toBeNull();
});
