import { describe, expect, it } from "vitest";
import { searchSubtopics, type SubtopicEntry } from "./subtopic-search";

const e = (code: string, title: string): SubtopicEntry => ({ topicId: code, title, code, lessonId: null, pct: null, done: false, current: false });
const items = [e("1.10", "Advocacia administrativa"), e("1.2", "Peculato culposo"), e("1.1", "Peculato"), e("1.3", "Concussão"), e("14.2", "Outro")];

describe("busca de subtópicos", () => {
  it("sem busca: todos na ordem do edital", () => {
    expect(searchSubtopics(items, "").map((i) => i.code)).toEqual(["1.1", "1.2", "1.3", "1.10", "14.2"]);
  });
  it("por nome, sem acento e com várias palavras", () => {
    expect(searchSubtopics(items, "peculato").map((i) => i.code)).toEqual(["1.1", "1.2"]);
    expect(searchSubtopics(items, "CONCUSSAO").map((i) => i.code)).toEqual(["1.3"]);
    expect(searchSubtopics(items, "peculato culposo").map((i) => i.code)).toEqual(["1.2"]);
  });
  it("por número: casa o começo do código", () => {
    expect(searchSubtopics(items, "1.1").map((i) => i.code)).toEqual(["1.1"]);
    expect(searchSubtopics(items, "1").map((i) => i.code)).toEqual(["1.1", "1.2", "1.3", "1.10"]);
    expect(searchSubtopics(items, "4.2")).toEqual([]);
  });
});
