import "server-only";
import { bankLookups, topicPath } from "@/server/services/bank";
import type { FormLookups } from "./form-state";

export async function formLookups(): Promise<FormLookups> {
  const lk = await bankLookups();
  return {
    subjects: lk.subjects.map((s) => ({ id: s.id, name: s.name, status: s.status })),
    topics: lk.topics.map((t) => ({ id: t.id, subject_id: t.subject_id, name: t.name, path: topicPath(lk.topics, t.id), status: t.status })).sort((a, b) => a.path.localeCompare(b.path, "pt-BR")),
    boards: lk.boards,
    exams: lk.exams,
    sources: lk.sources,
  };
}
