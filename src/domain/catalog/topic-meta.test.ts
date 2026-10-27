import { describe, expect, it } from "vitest";
import { parseTopicMeta } from "./topic-meta";

describe("edição de tema e tipo", () => {
  it("tema: limpa espaços e zera lei e artigos", () => {
    expect(parseTopicMeta({ title: "  Inquérito   policial ", kind: "tema", law: "CP", articles: "155" })).toEqual({ ok: true, meta: { title: "Inquérito policial", kind: "tema", law_code: null, articles: [] } });
  });
  it("dispositivo: reconhece a lei por nome ou código e expande faixas de artigos", () => {
    const r = parseTopicMeta({ title: "Furto", kind: "dispositivo", law: "Código Penal", articles: "155 a 157" });
    expect(r).toEqual({ ok: true, meta: { title: "Furto", kind: "dispositivo", law_code: "CP", articles: ["155", "156", "157"] } });
    expect(parseTopicMeta({ title: "Drogas", kind: "dispositivo", law: "Lei 11.343", articles: "33" })).toMatchObject({ ok: true, meta: { law_code: "L11343" } });
  });
  it("recusa dados incompletos com mensagem clara", () => {
    expect(parseTopicMeta({ title: "x", kind: "tema" })).toMatchObject({ ok: false });
    expect(parseTopicMeta({ title: "Furto", kind: "dispositivo", law: "", articles: "155" })).toMatchObject({ ok: false, error: expect.stringContaining("lei") });
    expect(parseTopicMeta({ title: "Furto", kind: "dispositivo", law: "CP", articles: "" })).toMatchObject({ ok: false, error: expect.stringContaining("artigos") });
    expect(parseTopicMeta({ title: "Furto", kind: "outro" })).toMatchObject({ ok: false });
  });
});

describe("edição do tópico", () => {
  it("põe a aula num tópico e tira dele", () => {
    expect(parseTopicMeta({ title: "Excesso punível", kind: "tema", topicGroup: "4. Ilicitude", subtopicCode: "4.2" })).toMatchObject({ ok: true, meta: { topic_group: "Ilicitude", topic_group_code: "4", subtopic_code: "4.2" } });
    expect(parseTopicMeta({ title: "Excesso punível", kind: "tema", topicGroup: "Ilicitude", subtopicCode: "4.2." })).toMatchObject({ ok: true, meta: { topic_group_code: "4", subtopic_code: "4.2" } });
    expect(parseTopicMeta({ title: "Homicídio", kind: "tema", topicGroup: "", subtopicCode: "" })).toMatchObject({ ok: true, meta: { topic_group: null, subtopic_code: null } });
    expect(parseTopicMeta({ title: "Homicídio", kind: "tema" })).toEqual({ ok: true, meta: { title: "Homicídio", kind: "tema", law_code: null, articles: [] } });
  });
  it("recusa número que não bate com o tópico", () => {
    expect(parseTopicMeta({ title: "X y", kind: "tema", topicGroup: "4. Ilicitude", subtopicCode: "5.1" })).toMatchObject({ ok: false });
    expect(parseTopicMeta({ title: "X y", kind: "tema", topicGroup: "", subtopicCode: "4.1" })).toMatchObject({ ok: false });
    expect(parseTopicMeta({ title: "X y", kind: "tema", topicGroup: "Ilicitude", subtopicCode: "4.a" })).toMatchObject({ ok: false });
  });
});
