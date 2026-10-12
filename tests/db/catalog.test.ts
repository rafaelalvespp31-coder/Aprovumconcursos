/**
 * Catálogo revisado: acesso (só equipe), versões publicadas e montagem do estudo do
 * aluno com as mesmas funções SQL e payloads usados pelo servidor.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { normalizeContent } from "@/domain/content/normalize";
import { extractStructure } from "@/domain/content/extract";
import { auditPlan } from "@/domain/content/audit";
import { composeStudy, type CatalogQuestion, type CatalogTopicContent } from "@/domain/catalog/compose";
import { lessonPayload, nodesPayload, planPayload } from "@/server/repos/payloads";
import { asUser, createTestDb, errorCode, type TestDb } from "./helpers";

const ALUNO = "00000000-0000-4000-8000-0000000000e1";
const ADM = "00000000-0000-4000-8000-0000000000e2";
let t: TestDb;
let published = "";
let draft = "";
let content: CatalogTopicContent;

const LAW = "Art. 121. Matar alguém:\nPena - reclusão, de seis a vinte anos.\n§ 1º Se o agente comete o crime impelido por motivo de relevante valor social;\n§ 2º Se o homicídio é cometido mediante paga;";

beforeAll(async () => {
  t = await createTestDb("na_catalog");
  if (!t.available) return;
  const db = t.db;
  await db.query("insert into auth.users (id) values ($1), ($2)", [ALUNO, ADM]);
  await db.query("insert into admin_roles (user_id, role) values ($1, 'admin')", [ADM]);
  const sourceText = normalizeContent(LAW).normalized;
  const nodes = extractStructure(sourceText).nodes;
  const keys = nodes.filter((n) => n.requiresDirectCoverage).map((n) => n.key);
  const lesson = {
    title: "Homicídio",
    objective: "Dominar o art. 121",
    sections: [{ kind: "explicacao" as const, title: "Explicação", bodyMarkdown: "Texto da aula.", nodeKeys: keys }],
    taughtNodeKeys: keys,
    references: [],
    unverifiedClaims: [],
    verificationPending: false,
  };
  published = (await db.query(
    "insert into catalog_topics (slug, title, kind, law_code, articles, discipline_mode, source_text, nodes, lesson, status, version) values ('cp-art-121','Homicídio (CP, art. 121)','dispositivo','CP','{121}','direito_penal',$1,$2,$3,'publicado',1) returning id",
    [sourceText, JSON.stringify(nodes), JSON.stringify(lesson)],
  )).rows[0].id;
  draft = (await db.query("insert into catalog_topics (slug, title, kind) values ('rascunho','Rascunho','tema') returning id")).rows[0].id;
  const questions: CatalogQuestion[] = [];
  for (const [li, level] of (["facil", "medio", "dificil"] as const).entries()) {
    for (let i = 0; i < 12; i++) {
      const q = {
        type: "certo_errado" as const, statement: `Questão ${i} do nível ${level} sobre homicídio`, options: [], correctAnswerTrue: i % 2 === 0,
        justification: "Justificativa suficiente.", nodeKey: keys[i % keys.length]!, difficulty: li * 2 + 1, essential: i === 0, dependsOnExternalSource: false,
      };
      const id = (await db.query(
        "insert into catalog_questions (topic_id, level, type, statement, correct_answer_true, justification, node_key, difficulty, essential) values ($1,$2,$3,$4,$5,$6,$7,$8,$9) returning id",
        [published, level, q.type, q.statement, q.correctAnswerTrue, q.justification, q.nodeKey, q.difficulty, q.essential],
      )).rows[0].id;
      questions.push({ ...q, id, level });
    }
  }
  content = { id: published, title: "Homicídio (CP, art. 121)", version: 1, disciplineMode: "direito_penal", sourceText, nodes, lesson, questions };
});
afterAll(async () => t?.close());

const itDb = (name: string, fn: () => Promise<void>) =>
  it(name, async (ctx) => {
    if (!t.available) ctx.skip(t.reason);
    await fn();
  });

describe("acesso ao catálogo", () => {
  itDb("aluno não lê nem grava o catálogo; equipe lê", async () => {
    await asUser(t.db, ALUNO, async (c) => {
      expect((await c.query("select count(*)::int n from catalog_topics")).rows[0].n).toBe(0);
      expect((await c.query("select count(*)::int n from catalog_questions")).rows[0].n).toBe(0);
      expect(await errorCode(c, "insert into catalog_topics (slug, title, kind) values ('x','X','tema')")).toBe("42501");
      expect(await errorCode(c, "select publish_catalog_topic($1)", [published])).toBe("42501");
    });
    await asUser(t.db, ADM, async (c) => {
      expect((await c.query("select count(*)::int n from catalog_topics")).rows[0].n).toBe(2);
      // Mesmo a equipe só grava pelo servidor.
      expect(await errorCode(c, "update catalog_topics set title = 'x' where id = $1", [published])).toBe("42501");
    });
  });

  itDb("aluno vê só id e versão de temas publicados", async () => {
    await asUser(t.db, ALUNO, async (c) => {
      const r = await c.query("select * from catalog_topic_versions($1)", [[published, draft]]);
      expect(r.rows).toEqual([{ id: published, version: 1 }]);
    });
  });

  itDb("dispositivo exige lei e artigo; publicação incrementa a versão", async () => {
    await t.db.query("begin");
    expect(await errorCode(t.db, "insert into catalog_topics (slug, title, kind) values ('d','D','dispositivo')")).toBe("23514");
    await t.db.query("set local role service_role");
    const v = (await t.db.query("select publish_catalog_topic($1) v", [published])).rows[0].v;
    await t.db.query("rollback");
    expect(v).toBe(2);
  });
});

describe("estudo montado a partir do catálogo", () => {
  itDb("grava mapa, unidade, aula e 10 questões por nível com as funções do servidor; recuperação vem do banco", async () => {
    const db = t.db;
    const composed = composeStudy([content], { seed: ALUNO, moduleTitle: "CP, art. 121" });
    await db.query("begin");
    try {
      await db.query("set local role service_role");
      const trail = (await db.query("insert into study_trails (user_id, title, board_slug, content_type, status) values ($1,'CP, art. 121','fgv','artigo_lei','processing') returning id", [ALUNO])).rows[0].id;
      const doc = (await db.query("insert into source_documents (trail_id, user_id, kind) values ($1,$2,'texto') returning id", [trail, ALUNO])).rows[0].id;
      const ver = (await db.query(
        "insert into source_document_versions (document_id, user_id, version, original_text, normalized_text, char_count, sha256) values ($1,$2,1,'art 121 cp',$3,$4,'h') returning id",
        [doc, ALUNO, composed.normalizedText, composed.normalizedText.length],
      )).rows[0].id;
      await db.query("select replace_trail_nodes($1,$2,$3,$4)", [trail, ALUNO, ver, JSON.stringify(nodesPayload(composed.nodes))]);
      const audit = auditPlan({ normalizedText: composed.normalizedText, nodes: composed.nodes, unassigned: [], plan: composed.plan });
      await db.query("select persist_trail_plan($1,$2,$3)", [trail, ALUNO, JSON.stringify(planPayload({ plan: composed.plan, analysis: [], disciplineMode: "direito_penal", audit, repairs: [], ambiguities: [] }))]);
      const lesson = (await db.query("select id from lessons where trail_id = $1 and key = 'CAT-L1'", [trail])).rows[0].id;
      const u = composed.units[0]!;
      await db.query("select save_lesson_content($1,$2,$3)", [lesson, ALUNO, JSON.stringify(lessonPayload(u.lesson, "ready"))]);
      await db.query("update lessons set catalog_topic_id = $1, catalog_version = 1, catalog_key_map = $2 where id = $3", [published, JSON.stringify(u.keyMap), lesson]);
      for (const [i, lv] of (["facil", "medio", "dificil"] as const).entries()) {
        const n = (await db.query("select save_lesson_questions($1,$2,'várias bancas',$3,$4,$5) n", [lesson, ALUNO, JSON.stringify(u.questions[lv].map(({ id: _i, level: _l, ...q }) => (void _i, void _l, q))), i > 0, lv])).rows[0].n;
        expect(n).toBe(10);
      }
      const levels = (await db.query("select level, count(*)::int n from questions where lesson_id = $1 and active group by level order by level", [lesson])).rows;
      expect(levels).toEqual([{ level: "dificil", n: 10 }, { level: "facil", n: 10 }, { level: "medio", n: 10 }]);
      const taught = (await db.query("select bool_and(taught) t, count(*)::int n from lesson_nodes where lesson_id = $1", [lesson])).rows[0];
      expect(taught.t).toBe(true);
      expect(taught.n).toBe(composed.plan.modules[0]!.lessons[0]!.nodeKeys.length);
      expect((await db.query("select status, catalog_topic_id from lessons where id = $1", [lesson])).rows[0]).toEqual({ status: "ready", catalog_topic_id: published });

      // Recuperação a partir do banco: questão revisada que o aluno ainda não recebeu.
      const used = new Set((await db.query("select statement from questions where lesson_id = $1", [lesson])).rows.map((r) => r.statement));
      const spare = content.questions.find((q) => q.level === "facil" && !used.has(q.statement))!;
      const root = (await db.query("select id from questions where lesson_id = $1 and level = 'facil' and recovery_of is null limit 1", [lesson])).rows[0].id;
      const { id: _id, level: _lv, nodeKey: _nk, ...rest } = spare;
      void _id; void _lv; void _nk;
      const saved = (await db.query("select save_recovery_questions($1,$2,'várias bancas',$3) n", [ALUNO, lesson, JSON.stringify([{ ...rest, recoveryOf: root }])])).rows[0].n;
      expect(saved).toBe(1);
      expect((await db.query("select level from questions where recovery_of = $1", [root])).rows[0].level).toBe("facil");
    } finally {
      await db.query("rollback");
    }
  });
});
