/**
 * Testes de isolamento entre contas (RLS) e das funções de servidor, executados num
 * PostgreSQL real com as migrações de produção + um shim do ambiente Supabase.
 *
 * Requer: TEST_DATABASE_URL apontando para um servidor onde o usuário pode criar bancos
 * (padrão: postgres local na porta 54329). Sem servidor disponível, os testes são pulados
 * e o motivo é exibido — nunca reportados como aprovados.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import pg from "pg";

const ADMIN_URL = process.env.TEST_DATABASE_URL ?? "postgres://postgres@localhost:54329/postgres?host=/tmp";
const DB = `na_test_${process.pid}`;
const root = path.resolve(import.meta.dirname, "../..");

let admin: pg.Client;
let db: pg.Client;
let available = true;
let unavailableReason = "";

const A = "00000000-0000-4000-8000-00000000000a";
const B = "00000000-0000-4000-8000-00000000000b";
const ids: Record<string, string> = {};

async function asUser<T>(uid: string | null, fn: (c: pg.Client) => Promise<T>): Promise<T> {
  await db.query("begin");
  try {
    await db.query(`set local role ${uid ? "authenticated" : "anon"}`);
    await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify(uid ? { sub: uid, role: "authenticated" } : { role: "anon" })]);
    return await fn(db);
  } finally {
    await db.query("rollback");
  }
}

/** Executa e devolve o código de erro do Postgres (ou null se não houve erro). */
async function errorCode(c: pg.Client, sql: string, params: unknown[] = []): Promise<string | null> {
  await c.query("savepoint s");
  try {
    await c.query(sql, params);
    await c.query("release savepoint s");
    return null;
  } catch (e) {
    await c.query("rollback to savepoint s");
    return (e as { code?: string }).code ?? "unknown";
  }
}

async function seedUser(uid: string, tag: string) {
  await db.query("insert into auth.users (id, email) values ($1, $2)", [uid, `${tag}@teste.local`]);
  const trail = await db.query(
    "insert into study_trails (user_id, title, board_slug, content_type) values ($1, $2, 'fgv', 'edital') returning id",
    [uid, `Trilha ${tag}`],
  );
  const t = trail.rows[0].id as string;
  const doc = await db.query("insert into source_documents (trail_id, user_id) values ($1, $2) returning id", [t, uid]);
  const ver = await db.query(
    "insert into source_document_versions (document_id, user_id, version, original_text, normalized_text, char_count, sha256) values ($1, $2, 1, 'x', 'x', 1, 'h') returning id",
    [doc.rows[0].id, uid],
  );
  const node = await db.query(
    "insert into content_nodes (trail_id, version_id, user_id, key, kind, title, source_text, span_start, span_end, depth, sort_order, path, requires_direct_coverage) values ($1,$2,$3,'N0001','topico','T','T',0,1,0,0,'1',true) returning id",
    [t, ver.rows[0].id, uid],
  );
  const mod = await db.query("insert into learning_modules (trail_id, user_id, key, title, sort_order) values ($1,$2,'M1','M',0) returning id", [t, uid]);
  const les = await db.query(
    "insert into lessons (trail_id, module_id, user_id, key, title, objective, sort_order, estimated_minutes) values ($1,$2,$3,'L1','Aula','Obj',0,30) returning id",
    [t, mod.rows[0].id, uid],
  );
  await db.query("insert into lesson_nodes (lesson_id, node_id, user_id, taught) values ($1,$2,$3,true)", [les.rows[0].id, node.rows[0].id, uid]);
  const q = await db.query(
    "insert into questions (lesson_id, node_id, user_id, type, statement, justification, difficulty) values ($1,$2,$3,'multipla_escolha','Enunciado','Justificativa',2) returning id",
    [les.rows[0].id, node.rows[0].id, uid],
  );
  await db.query(
    "insert into question_options (question_id, user_id, label, text, is_correct, explanation, sort_order) values ($1,$2,'A','Certa',true,'Porque sim',0), ($1,$2,'B','Errada',false,'Porque não',1)",
    [q.rows[0].id, uid],
  );
  await db.query("insert into learning_progress (user_id, lesson_id, trail_id, state) values ($1,$2,$3,'disponivel')", [uid, les.rows[0].id, t]);
  Object.assign(ids, {
    [`${tag}_trail`]: t,
    [`${tag}_node`]: node.rows[0].id,
    [`${tag}_lesson`]: les.rows[0].id,
    [`${tag}_module`]: mod.rows[0].id,
    [`${tag}_question`]: q.rows[0].id,
    [`${tag}_version`]: ver.rows[0].id,
  });
}

beforeAll(async () => {
  admin = new pg.Client({ connectionString: ADMIN_URL });
  try {
    await admin.connect();
  } catch (e) {
    available = false;
    unavailableReason = `PostgreSQL de teste indisponível (${(e as Error).message}).`;
    console.warn(`[db] ${unavailableReason} Testes de banco PULADOS.`);
    return;
  }
  await admin.query(`drop database if exists ${DB}`);
  await admin.query(`create database ${DB}`);
  const url = new URL(ADMIN_URL);
  url.pathname = `/${DB}`;
  db = new pg.Client({ connectionString: url.toString() });
  await db.connect();
  await db.query(readFileSync(path.join(root, "tests/db/supabase-shim.sql"), "utf8"));
  const dir = path.join(root, "supabase/migrations");
  for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
    await db.query(readFileSync(path.join(dir, f), "utf8"));
  }
  await seedUser(A, "a");
  await seedUser(B, "b");
});

afterAll(async () => {
  if (!available) return;
  await db?.end();
  await admin.query(`drop database if exists ${DB}`);
  await admin.end();
});

const itDb = (name: string, fn: () => Promise<void>) =>
  it(name, async (ctx) => {
    if (!available) ctx.skip(unavailableReason);
    await fn();
  });

describe("RLS — isolamento entre contas", () => {
  itDb("cadastro cria perfil e plano gratuito", async () => {
    const r = await db.query("select plan_id from subscriptions where user_id = $1", [A]);
    expect(r.rows[0].plan_id).toBe("free");
    expect((await db.query("select 1 from profiles where id = $1", [A])).rowCount).toBe(1);
  });

  const tables = [
    "study_trails", "source_documents", "source_document_versions", "content_nodes", "learning_modules",
    "lessons", "lesson_nodes", "questions", "learning_progress", "subscriptions", "profiles",
  ];

  itDb("cada usuário lê apenas os próprios registros", async () => {
    await asUser(A, async (c) => {
      for (const t of tables) {
        const col = t === "profiles" ? "id" : "user_id";
        const r = await c.query(`select distinct ${col}::text as owner from ${t}`);
        expect(r.rows.map((x) => x.owner), t).toEqual([A]);
      }
      const cov = await c.query("select distinct user_id::text u from topic_coverage");
      expect(cov.rows.map((r) => r.u)).toEqual([A]);
    });
  });

  itDb("não consegue ler dado de outro usuário nem pelo id", async () => {
    await asUser(A, async (c) => {
      const r = await c.query("select * from study_trails where id = $1", [ids.b_trail]);
      expect(r.rowCount).toBe(0);
      const q = await c.query("select * from questions where id = $1", [ids.b_question]);
      expect(q.rowCount).toBe(0);
    });
  });

  itDb("visitante anônimo não lê dados de alunos", async () => {
    await asUser(null, async (c) => {
      expect(await errorCode(c, "select * from study_trails")).toBe("42501");
      const boards = await c.query("select count(*)::int n from exam_boards");
      expect(boards.rows[0].n).toBeGreaterThanOrEqual(8);
    });
  });

  itDb("cliente não escreve em tabelas de conteúdo, progresso ou respostas", async () => {
    await asUser(A, async (c) => {
      expect(await errorCode(c, "insert into study_trails (user_id, title, board_slug, content_type) values ($1,'x','fgv','edital')", [A])).toBe("42501");
      expect(await errorCode(c, "update learning_progress set state = 'dominada' where user_id = $1", [A])).toBe("42501");
      expect(await errorCode(c, "insert into answer_attempts (question_id, user_id, answer_bool, is_correct) values ($1,$2,true,true)", [ids.a_question, A])).toBe("42501");
      expect(await errorCode(c, "update subscriptions set plan_id = 'premium' where user_id = $1", [A])).toBe("42501");
      expect(await errorCode(c, "insert into usage_events (user_id, kind) values ($1, 'trail_build')", [A])).toBe("42501");
      expect(await errorCode(c, "delete from study_trails where user_id = $1", [A])).toBe("42501");
    });
  });

  itDb("gabarito não é legível pelo cliente antes da resposta", async () => {
    await asUser(A, async (c) => {
      expect(await errorCode(c, "select is_correct from question_options")).toBe("42501");
      expect(await errorCode(c, "select explanation from question_options")).toBe("42501");
      const ok = await c.query("select label, text from question_options order by sort_order");
      expect(ok.rows.map((r) => r.label)).toEqual(["A", "B"]);
    });
  });

  itDb("edita só campos permitidos do próprio perfil", async () => {
    await asUser(A, async (c) => {
      const own = await c.query("update profiles set display_name = 'Rafa' where id = $1", [A]);
      expect(own.rowCount).toBe(1);
      const other = await c.query("update profiles set display_name = 'Hack' where id = $1", [B]);
      expect(other.rowCount).toBe(0);
      expect(await errorCode(c, "update profiles set id = $2 where id = $1", [A, B])).toBe("42501");
    });
  });

  itDb("funções privilegiadas não são executáveis pelo cliente", async () => {
    await asUser(A, async (c) => {
      expect(await errorCode(c, "select consume_quota($1, 'trail_build', 1)", [A])).toBe("42501");
      expect(await errorCode(c, "select check_rate_limit('x', 60, 1)")).toBe("42501");
      expect(await errorCode(c, "select acquire_job_lease($1, $2, 60)", [A, A])).toBe("42501");
    });
  });

  itDb("usuário comum não acessa área administrativa; admin acessa", async () => {
    await db.query("insert into audit_logs (action) values ('teste')");
    await asUser(A, async (c) => {
      expect((await c.query("select * from audit_logs")).rowCount).toBe(0);
      expect((await c.query("select public.is_admin() a")).rows[0].a).toBe(false);
    });
    await db.query("insert into admin_roles (user_id, role) values ($1, 'admin')", [B]);
    await asUser(B, async (c) => {
      expect((await c.query("select * from audit_logs")).rowCount).toBeGreaterThan(0);
      expect((await c.query("select distinct user_id::text u from study_trails")).rowCount).toBe(2);
    });
    await db.query("delete from admin_roles where user_id = $1", [B]);
  });
});

describe("estatísticas do painel (nível, sequência, conquistas)", () => {
  itDb("my_study_stats só conta dados do próprio aluno", async () => {
    await db.query("begin");
    try {
      await db.query("insert into answer_attempts (question_id, user_id, answer_bool, is_correct, created_at) values ($1,$2,true,true, now()), ($1,$2,true,false, now() - interval '1 day')", [ids.a_question, A]);
      await db.query("insert into answer_attempts (question_id, user_id, answer_bool, is_correct) select $1,$2,true,true from generate_series(1,30)", [ids.b_question, B]);
      await db.query("update learning_progress set state = 'aguardando_dominio' where user_id = $1", [A]);
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: A, role: "authenticated" })]);
      const s = (await db.query("select my_study_stats() s")).rows[0].s;
      expect(s).toMatchObject({ answered: 2, correct: 1, maxInDay: 1, themesPassed: 1, themesMastered: 0, modulesClosed: 1 });
      expect(s.activeDays).toHaveLength(2);
    } finally {
      await db.query("rollback");
    }
  });
});

describe("quiz Complete a lei", () => {
  itDb("aluno só lê as próprias respostas, não grava direto, e o quiz conta na ofensiva", async () => {
    await db.query("begin");
    try {
      const topic = (await db.query("insert into catalog_topics (slug, title, kind) values ('quiz-t','Quiz','tema') returning id")).rows[0].id;
      // O servidor (service_role) grava depois de conferir.
      await db.query("insert into quiz_attempts (user_id, topic_id, node_key, correct, xp, created_at) values ($1,$3,'N0001',true,10, now() - interval '2 days'), ($2,$3,'N0001',true,10, now())", [A, B, topic]);
      expect(await errorCode(db, "insert into quiz_attempts (user_id, topic_id, node_key, correct, xp) values ($1,$2,'X1',true,10)", [A, topic])).toBe("23514");
      expect(await errorCode(db, "insert into quiz_attempts (user_id, topic_id, node_key, correct, xp) values ($1,$2,'N0002',true,999)", [A, topic])).toBe("23514");
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: A, role: "authenticated" })]);
      expect((await db.query("select count(*)::int n from quiz_attempts")).rows[0].n).toBe(1);
      expect(await errorCode(db, "insert into quiz_attempts (user_id, topic_id, node_key, correct, xp) values ($1,$2,'N0003',true,50)", [A, topic])).toBe("42501");
      const s = (await db.query("select my_study_stats() s")).rows[0].s;
      expect(s.answered).toBe(0);
      expect(s.activeDays).toHaveLength(1);
      // Ranking: vê todos, sem e-mail/id; marca a própria linha.
      const rk = (await db.query("select * from quiz_ranking(10)")).rows;
      expect(rk.map((r) => r.xp)).toEqual([10, 10]);
      expect(rk.filter((r) => r.is_me)).toHaveLength(1);
      expect(Object.keys(rk[0]).sort()).toEqual(["answered", "is_me", "name", "pos", "xp"]);
    } finally {
      await db.query("rollback");
    }
  });
});

describe("PDF por conteúdo", () => {
  itDb("cada aluno lê só os próprios PDFs e o cliente não grava PDF", async () => {
    await db.query("begin");
    try {
      await db.query("insert into study_pdfs (user_id, trail_id, version_id, pdf_version, snapshot, content_hash) values ($1,$2,$3,1,'{}',$4)", [A, ids.a_trail, ids.a_version, "b".repeat(64)]);
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: B, role: "authenticated" })]);
      expect((await db.query("select count(*)::int n from study_pdfs")).rows[0].n).toBe(0);
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: A, role: "authenticated" })]);
      expect((await db.query("select count(*)::int n from study_pdfs")).rows[0].n).toBe(1);
      await db.query("savepoint s");
      const ins = await db.query("insert into study_pdfs (user_id, trail_id, version_id, pdf_version, snapshot, content_hash) values ($1,$2,$3,2,'{}',$4)", [A, ids.a_trail, ids.a_version, "c".repeat(64)]).catch((e) => e);
      expect(ins.code).toBe("42501");
      await db.query("rollback to savepoint s");
      const fn = await db.query("select save_study_pdf($1,$2,'{}'::jsonb,'{}',$3)", [A, ids.a_trail, "d".repeat(64)]).catch((e) => e);
      expect(fn.code).toBe("42501");
    } finally {
      await db.query("rollback");
    }
  });
});

describe("integridade referencial por dono", () => {
  itDb("impede vincular registro a trilha de outro usuário", async () => {
    await db.query("begin");
    const code = await errorCode(db, "insert into learning_modules (trail_id, user_id, key, title, sort_order) values ($1, $2, 'MX', 'X', 1)", [ids.b_trail, A]);
    await db.query("rollback");
    expect(code).toBe("23503");
  });

  itDb("impede responder com alternativa de outra questão de outro dono", async () => {
    const optB = await db.query("select id from question_options where user_id = $1 limit 1", [B]);
    await db.query("begin");
    const code = await errorCode(db, "insert into answer_attempts (question_id, user_id, selected_option_id, is_correct) values ($1, $2, $3, true)", [ids.a_question, A, optB.rows[0].id]);
    await db.query("rollback");
    expect(code).toBe("23503");
  });

  itDb("permite no máximo uma alternativa correta", async () => {
    await db.query("begin");
    const code = await errorCode(db, "insert into question_options (question_id, user_id, label, text, is_correct, explanation, sort_order) values ($1,$2,'C','Outra',true,'x',2)", [ids.a_question, A]);
    await db.query("rollback");
    expect(code).toBe("23505");
  });
});

describe("pastas do aluno", () => {
  itDb("cada aluno vê só as próprias pastas, não grava direto e não usa pasta alheia", async () => {
    await db.query("begin");
    try {
      const fa = (await db.query("insert into study_folders (user_id, name) values ($1, 'Penal A') returning id", [A])).rows[0].id;
      const fb = (await db.query("insert into study_folders (user_id, name) values ($1, 'Penal B') returning id", [B])).rows[0].id;
      // A não pode colocar o próprio estudo na pasta de B (chave composta pasta+dono).
      expect(await errorCode(db, "update study_trails set folder_id = $1 where id = $2", [fb, ids.a_trail])).toBe("23503");
      await db.query("update study_trails set folder_id = $1 where id = $2", [fa, ids.a_trail]);
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: A, role: "authenticated" })]);
      const seen = (await db.query("select name from study_folders order by name")).rows.map((r) => r.name);
      expect(seen).toEqual(["Penal A"]);
      expect(await errorCode(db, "insert into study_folders (user_id, name) values ($1, 'X')", [A])).toBe("42501");
      expect(await errorCode(db, "update study_folders set name = 'Y' where id = $1", [fa])).toBe("42501");
      await db.query("reset role");
      // Excluir a pasta não apaga o estudo: ele só fica sem pasta.
      await db.query("delete from study_folders where id = $1", [fa]);
      const t = (await db.query("select folder_id from study_trails where id = $1", [ids.a_trail])).rows[0];
      expect(t.folder_id).toBeNull();
    } finally {
      await db.query("rollback");
    }
  });
});

describe("excluir estudo", () => {
  itDb("apagar o estudo remove em cascata tudo o que é dele e não toca no de outro aluno", async () => {
    await db.query("begin");
    try {
      const tables = (
        await db.query("select table_name from information_schema.columns where table_schema = 'public' and column_name = 'trail_id' and table_name in (select table_name from information_schema.tables where table_schema = 'public' and table_type = 'BASE TABLE')")
      ).rows.map((r) => r.table_name as string);
      const count = async (trail: string) => {
        let n = 0;
        for (const t of tables) n += Number((await db.query(`select count(*) c from public.${t} where trail_id = $1`, [trail])).rows[0].c);
        return n;
      };
      expect(await count(ids.a_trail!)).toBeGreaterThan(0);
      const otherBefore = await count(ids.b_trail!);
      await db.query("delete from study_trails where id = $1 and user_id = $2", [ids.a_trail, A]);
      expect(await count(ids.a_trail!)).toBe(0);
      expect(await count(ids.b_trail!)).toBe(otherBefore);
    } finally {
      await db.query("rollback");
    }
  });
});

describe("cotas, limite de taxa e lease (servidor)", () => {
  itDb("consome cota até o limite do plano e então bloqueia", async () => {
    const limit = (await db.query("select max_trail_builds_per_month l from plans where id = 'free'")).rows[0].l as number;
    const results: boolean[] = [];
    for (let i = 0; i < limit + 1; i++) {
      const r = await db.query("select consume_quota($1, 'trail_build', 1) r", [A]);
      results.push(r.rows[0].r.allowed);
    }
    expect(results.filter(Boolean)).toHaveLength(limit);
    expect(results.at(-1)).toBe(false);
    // Cota de B não é afetada.
    expect((await db.query("select consume_quota($1, 'trail_build', 1) r", [B])).rows[0].r.allowed).toBe(true);
  });

  itDb("rejeita tipo de cota desconhecido", async () => {
    await db.query("begin");
    const code = await errorCode(db, "select consume_quota($1, 'xpto', 1)", [A]);
    await db.query("rollback");
    expect(code).toBe("22023");
  });

  itDb("limite de taxa bloqueia após o máximo na janela", async () => {
    const out: boolean[] = [];
    for (let i = 0; i < 4; i++) out.push((await db.query("select check_rate_limit('ip:1', 60, 3) ok")).rows[0].ok);
    expect(out).toEqual([true, true, true, false]);
  });

  itDb("lease impede processamento simultâneo do mesmo job", async () => {
    const job = await db.query("insert into ai_generation_jobs (user_id, trail_id, kind) values ($1, $2, 'build_trail') returning id", [A, ids.a_trail]);
    const first = await db.query("select acquire_job_lease($1, $2, 60) ok", [job.rows[0].id, A]);
    const second = await db.query("select acquire_job_lease($1, $2, 60) ok", [job.rows[0].id, A]);
    const wrongUser = await db.query("select acquire_job_lease($1, $2, 60) ok", [job.rows[0].id, B]);
    expect([first.rows[0].ok, second.rows[0].ok, wrongUser.rows[0].ok]).toEqual([true, false, false]);
  });
});

// -----------------------------------------------------------------------------
// Banco de questões (Fase 2)
// -----------------------------------------------------------------------------
describe("banco de questões", () => {
  const AUTOR = "00000000-0000-4000-8000-0000000000c1";
  const REVISOR = "00000000-0000-4000-8000-0000000000c2";
  const OUTRO = "00000000-0000-4000-8000-0000000000c3";

  async function staff() {
    for (const [id, tag] of [[AUTOR, "autor"], [REVISOR, "revisor"], [OUTRO, "outro"]] as const) {
      await db.query("insert into auth.users (id, email) values ($1, $2) on conflict do nothing", [id, `${tag}@teste.local`]);
    }
    await db.query("insert into staff_roles (user_id, role) values ($1, 'autor'), ($2, 'revisor') on conflict do nothing", [AUTOR, REVISOR]);
  }
  const subject = async (slug = "direito-penal") => (await db.query("select id from subjects where slug = $1", [slug])).rows[0].id as string;

  async function newQuestion(opts: { statement?: string; origin?: string; rights?: string; slug?: string; difficulty?: string } = {}) {
    const sid = await subject(opts.slug);
    const q = await db.query(
      `insert into bank_questions (subject_id, origin, question_type, statement, initial_difficulty, justification, usage_rights, created_by)
       values ($1, $2, 'multipla_escolha', $3, $4, 'Justificativa do gabarito fictícia.', $5, $6) returning id`,
      [sid, opts.origin ?? "autoral_humana", opts.statement ?? "Enunciado fictício sobre homicídio qualificado e suas hipóteses.", opts.difficulty ?? "dificil", opts.rights ?? "proprio", AUTOR],
    );
    const id = q.rows[0].id as string;
    await db.query(
      "insert into bank_question_options (question_id, label, text, sort_order, is_correct) values ($1,'A','Alternativa certa',0,true), ($1,'B','Alternativa errada',1,false)",
      [id],
    );
    return id;
  }
  const move = (id: string, status: string, by: string, extra = "") =>
    db.query(`update bank_questions set status = $2, status_changed_by = $3 ${extra} where id = $1`, [id, status, by]);
  const checkAll = (id: string) =>
    db.query("update bank_questions set content_checked = true, answer_checked = true, source_checked = true, rights_checked = true where id = $1", [id]);

  async function approve(id: string) {
    await move(id, "em_revisao", AUTOR);
    await checkAll(id);
    await db.query("update bank_questions set status = 'aprovada', status_changed_by = $2, approved_by = $2, change_reason = 'Conferida' where id = $1", [id, REVISOR]);
  }

  itDb("o aluno não lê nem grava nada do banco (gabarito protegido)", async () => {
    await db.query("begin");
    try {
      await staff();
      await newQuestion();
      await db.query("set local role authenticated");
      await db.query("select set_config('request.jwt.claims', $1, true)", [JSON.stringify({ sub: A, role: "authenticated" })]);
      for (const t of ["bank_questions", "bank_question_options", "bank_question_versions", "ranked_form_items", "bank_attempts", "question_sources", "subjects"]) {
        expect(await errorCode(db, `select * from ${t} limit 1`)).toBe("42501");
      }
      expect(await errorCode(db, "insert into bank_attempts (question_id, version, user_id, context, is_correct) values (gen_random_uuid(), 1, $1, 'treino', true)", [A])).toBe("42501");
    } finally {
      await db.query("rollback");
    }
  });

  itDb("aprovação exige outro revisor, checklist completo e gera versão imutável", async () => {
    await db.query("begin");
    try {
      await staff();
      const id = await newQuestion();
      await move(id, "em_revisao", AUTOR);
      // pular etapas não é permitido
      expect(await errorCode(db, "update bank_questions set status = 'publicada', status_changed_by = $2 where id = $1", [id, REVISOR])).toBe("23514");
      // checklist incompleto
      expect(await errorCode(db, "update bank_questions set status = 'aprovada', status_changed_by = $2, approved_by = $2 where id = $1", [id, REVISOR])).toBe("23514");
      await checkAll(id);
      // quem criou não aprova
      expect(await errorCode(db, "update bank_questions set status = 'aprovada', status_changed_by = $2, approved_by = $2 where id = $1", [id, AUTOR])).toBe("23514");
      // sem papel de revisor não aprova
      expect(await errorCode(db, "update bank_questions set status = 'aprovada', status_changed_by = $2, approved_by = $2 where id = $1", [id, OUTRO])).toBe("42501");
      await db.query("update bank_questions set status = 'aprovada', status_changed_by = $2, approved_by = $2, change_reason = 'Conferida' where id = $1", [id, REVISOR]);
      const v1 = (await db.query("select version, snapshot from bank_question_versions where question_id = $1", [id])).rows;
      expect(v1).toHaveLength(1);
      expect(v1[0].version).toBe(1);
      expect(v1[0].snapshot.options).toHaveLength(2);
      // conteúdo travado depois de aprovado
      expect(await errorCode(db, "update bank_questions set statement = 'Outro enunciado qualquer aqui' where id = $1", [id])).toBe("23514");
      expect(await errorCode(db, "update bank_question_options set text = 'mudou' where question_id = $1 and label = 'A'", [id])).toBe("23514");
      expect(await errorCode(db, "update bank_question_versions set reason = 'x' where question_id = $1", [id])).toBe("23514");
      expect(await errorCode(db, "delete from bank_questions where id = $1", [id])).toBe("23503");
      await move(id, "publicada", REVISOR);
      // correção: volta para revisão, edita e reaprova → versão 2; a 1 continua igual
      await move(id, "em_revisao", REVISOR, ", change_reason = 'Lei alterada'");
      const back = (await db.query("select approved_by, content_checked from bank_questions where id = $1", [id])).rows[0];
      expect(back).toEqual({ approved_by: null, content_checked: false });
      await db.query("update bank_questions set statement = 'Enunciado corrigido após alteração legislativa fictícia.' where id = $1", [id]);
      await checkAll(id);
      await db.query("update bank_questions set status = 'aprovada', status_changed_by = $2, approved_by = $2, change_reason = 'Atualização' where id = $1", [id, REVISOR]);
      const versions = (await db.query("select version, previous_version, snapshot->>'statement' s from bank_question_versions where question_id = $1 order by version", [id])).rows;
      expect(versions.map((v) => v.version)).toEqual([1, 2]);
      expect(versions[1].previous_version).toBe(1);
      expect(versions[0].s).toMatch(/^Enunciado fictício/);
      const log = (await db.query("select to_status from bank_question_reviews where question_id = $1 order by id", [id])).rows.map((r) => r.to_status);
      expect(log).toEqual(["em_revisao", "aprovada", "publicada", "em_revisao", "aprovada"]);
    } finally {
      await db.query("rollback");
    }
  });

  itDb("procedência e direito de uso não podem ser inventados", async () => {
    await db.query("begin");
    try {
      await staff();
      const sid = await subject();
      // questão de IA não pode declarar ano/banca de origem
      expect(await errorCode(db,
        "insert into bank_questions (subject_id, origin, question_type, statement, initial_difficulty, year, created_by) values ($1, 'ia_assistida', 'certo_errado', 'Enunciado fictício de teste.', 'dificil', 2023, $2)",
        [sid, AUTOR])).toBe("23514");
      // prova anterior exige fonte
      expect(await errorCode(db,
        "insert into bank_questions (subject_id, origin, question_type, statement, initial_difficulty, correct_answer_true, created_by) values ($1, 'prova_anterior', 'certo_errado', 'Enunciado fictício de teste.', 'dificil', true, $2)",
        [sid, AUTOR])).toBe("23514");
      // prova anterior com fonte sem autorização verificada não é aprovada
      const src = (await db.query("insert into question_sources (name, kind, url) values ('Prova fictícia', 'prova_oficial', 'https://exemplo.invalid/prova.pdf') returning id")).rows[0].id;
      const q = (await db.query(
        "insert into bank_questions (subject_id, origin, question_type, statement, initial_difficulty, correct_answer_true, justification, usage_rights, source_id, created_by) values ($1, 'prova_anterior', 'certo_errado', 'Enunciado fictício de prova.', 'dificil', true, 'Justificativa fictícia longa.', 'autorizado', $2, $3) returning id",
        [sid, src, AUTOR])).rows[0].id;
      await move(q, "em_revisao", AUTOR);
      await checkAll(q);
      expect(await errorCode(db, "update bank_questions set status = 'aprovada', status_changed_by = $2, approved_by = $2 where id = $1", [q, REVISOR])).toBe("23514");
      await db.query("update question_sources set reuse_verified = true, reuse_verified_by = $2, reuse_verified_at = now() where id = $1", [src, REVISOR]);
      await db.query("update bank_questions set status = 'aprovada', status_changed_by = $2, approved_by = $2 where id = $1", [q, REVISOR]);
      // direito "não verificado" bloqueia
      const q2 = await newQuestion({ rights: "nao_verificado", statement: "Outro enunciado fictício totalmente diferente sobre informática." });
      await move(q2, "em_revisao", AUTOR);
      await checkAll(q2);
      expect(await errorCode(db, "update bank_questions set status = 'aprovada', status_changed_by = $2, approved_by = $2 where id = $1", [q2, REVISOR])).toBe("23514");
    } finally {
      await db.query("rollback");
    }
  });

  itDb("duplicidade por semelhança e alerta de lei alterada", async () => {
    await db.query("begin");
    try {
      await staff();
      const id = await newQuestion({ statement: "Considere que Fulano matou Beltrano por motivo fútil. Assinale a alternativa correta sobre o homicídio qualificado." });
      const sim = (await db.query("select question_id, similarity from bank_similar_questions($1, null, 0.45, null)", [
        "Considere que Fulano matou Beltrano por motivo fútil. Assinale a alternativa correta quanto ao homicídio qualificado.",
      ])).rows;
      expect(sim[0].question_id).toBe(id);
      expect(Number(sim[0].similarity)).toBeGreaterThan(0.7);
      await db.query("insert into bank_question_legal_refs (question_id, norm_name, norm_number, article, consulted_on) values ($1, 'Código Penal', 'DL 2.848/1940', '121', current_date)", [id]);
      expect(await errorCode(db, "insert into bank_question_legal_refs (question_id, norm_name, consulted_on, case_law_thesis) values ($1, 'X', current_date, 'tese sem identificação')", [id])).toBe("23514");
      expect((await db.query("select bank_flag_outdated('DL 2.848/1940', '121', $1, 'Alteração fictícia') n", [REVISOR])).rows[0].n).toBe(1);
      // não duplica alerta aberto
      expect((await db.query("select bank_flag_outdated('DL 2.848/1940', '121', $1, 'De novo') n", [REVISOR])).rows[0].n).toBe(0);
      expect(await errorCode(db, "select bank_flag_outdated('DL 2.848/1940', '121', $1, 'x')", [AUTOR])).toBe("42501");
    } finally {
      await db.query("rollback");
    }
  });

  itDb("assuntos não formam ciclo e pertencem à mesma matéria", async () => {
    await db.query("begin");
    try {
      const penal = await subject();
      const adm = await subject("direito-administrativo");
      const a = (await db.query("insert into subject_topics (subject_id, slug, name) values ($1, 'teoria-do-crime', 'Teoria do Crime') returning id", [penal])).rows[0].id;
      const b = (await db.query("insert into subject_topics (subject_id, parent_id, slug, name) values ($1, $2, 'tipicidade', 'Tipicidade') returning id", [penal, a])).rows[0].id;
      expect(await errorCode(db, "update subject_topics set parent_id = $1 where id = $2", [b, a])).toBe("23514");
      expect(await errorCode(db, "insert into subject_topics (subject_id, parent_id, slug, name) values ($1, $2, 'outra', 'Outra matéria')", [adm, a])).toBe("23503");
    } finally {
      await db.query("rollback");
    }
  });

  itDb("Ranked: prova só com publicadas, fiel ao blueprint, congelada e sem reenvio de resposta", async () => {
    await db.query("begin");
    try {
      await staff();
      const blueprint = { total: 2, subjects: [{ subject: "direito-penal", count: 2, tiers: { dificil: 1, extrema: 1 } }] };
      const season = (await db.query("insert into ranked_seasons (slug, name, blueprint, scoring_rules) values ('t1', 'Temporada teste', $1, '{\"acerto\":1}') returning id", [blueprint])).rows[0].id;
      const form = (await db.query("insert into ranked_forms (season_id, code) values ($1, 'A') returning id", [season])).rows[0].id;
      const q1 = await newQuestion({ statement: "Questão fictícia de ranked número um sobre dolo eventual." });
      const q2 = await newQuestion({ statement: "Questão fictícia de ranked número dois sobre culpa consciente.", difficulty: "extrema" });
      await approve(q1);
      // aprovada mas não publicada: não entra
      expect(await errorCode(db, "insert into ranked_form_items (form_id, position, question_id, version, subject_id, tier) values ($1, 1, $2, 1, $3, 'dificil')", [form, q1, await subject()])).toBe("23514");
      await move(q1, "publicada", REVISOR);
      await approve(q2);
      await move(q2, "publicada", REVISOR);
      // tier e matéria vêm da versão congelada, não do que for enviado
      await db.query("insert into ranked_form_items (form_id, position, question_id, version, subject_id, tier) values ($1, 1, $2, 1, $3, 'extrema')", [form, q1, await subject("matematica")]);
      const item = (await db.query("select tier, subject_id from ranked_form_items where form_id = $1 and position = 1", [form])).rows[0];
      expect(item).toEqual({ tier: "dificil", subject_id: await subject() });
      // fora do blueprint: falta a 'extrema'
      expect(await errorCode(db, "update ranked_forms set status = 'validada' where id = $1", [form])).toBe("23514");
      await db.query("insert into ranked_form_items (form_id, position, question_id, version, subject_id, tier) values ($1, 2, $2, 1, $3, 'dificil')", [form, q2, await subject()]);
      await db.query("update ranked_forms set status = 'validada' where id = $1", [form]);
      expect(await errorCode(db, "delete from ranked_form_items where form_id = $1 and position = 1", [form])).toBe("23514");
      await db.query("update ranked_forms set status = 'ativa' where id = $1", [form]);
      await db.query("update ranked_seasons set status = 'ativa' where id = $1", [season]);
      expect(await errorCode(db, "update ranked_seasons set scoring_rules = '{\"acerto\":2}' where id = $1", [season])).toBe("23514");
      const match = (await db.query("insert into ranked_matches (season_id, form_id, user_id, scoring_snapshot) values ($1, $2, $3, '{\"acerto\":1}') returning id", [season, form, A])).rows[0].id;
      expect(await errorCode(db, "insert into ranked_matches (season_id, form_id, user_id, scoring_snapshot) values ($1, $2, $3, '{}')", [season, form, A])).toBe("23505");
      await db.query("insert into bank_attempts (question_id, version, user_id, context, match_id, position, selected_label, is_correct) values ($1, 1, $2, 'ranked', $3, 1, 'A', true)", [q1, A, match]);
      expect(await errorCode(db, "insert into bank_attempts (question_id, version, user_id, context, match_id, position, selected_label, is_correct) values ($1, 1, $2, 'ranked', $3, 1, 'B', false)", [q1, A, match])).toBe("23505");
      // a questão problemática pode ser suspensa; a versão usada continua preservada
      await move(q1, "suspensa", REVISOR, ", change_reason = 'Gabarito contestado'");
      expect((await db.query("select count(*)::int n from bank_question_versions where question_id = $1", [q1])).rows[0].n).toBe(1);
      await db.query("insert into ranked_item_invalidations (form_id, position, rule, reason, decided_by) values ($1, 1, 'anular_conta_acerto', 'Gabarito contestado', $2)", [form, REVISOR]);
      const bp = (await db.query("select ranked_default_blueprint() b")).rows[0].b;
      expect(bp.total).toBe(120);
      expect(bp.subjects.reduce((s: number, x: { count: number }) => s + x.count, 0)).toBe(120);
      for (const s of bp.subjects) expect(Object.values(s.tiers as Record<string, number>).reduce((a, b) => a + b, 0)).toBe(s.count);
    } finally {
      await db.query("rollback");
    }
  });
});

describe("banco de questões — funções do servidor (Fase 3)", () => {
  const AUT = "00000000-0000-4000-8000-0000000000d1";
  const REV = "00000000-0000-4000-8000-0000000000d2";
  const ADM = "00000000-0000-4000-8000-0000000000d3";
  async function team() {
    for (const [id, tag] of [[AUT, "aut3"], [REV, "rev3"], [ADM, "adm3"]] as const) {
      await db.query("insert into auth.users (id, email) values ($1, $2) on conflict do nothing", [id, `${tag}@teste.local`]);
    }
    await db.query("insert into admin_roles (user_id, role) values ($1, 'admin') on conflict do nothing", [ADM]);
  }
  const payload = async (extra: Record<string, unknown> = {}) => ({
    subject_id: (await db.query("select id from subjects where slug = 'direito-constitucional'")).rows[0].id,
    origin: "autoral_humana",
    question_type: "multipla_escolha",
    statement: "Enunciado fictício sobre direitos fundamentais e seus limites.",
    initial_difficulty: "muito_dificil",
    justification: "Justificativa fictícia suficientemente longa.",
    usage_rights: "proprio",
    options: [
      { label: "A", text: "Certa", is_correct: true, explanation: "Porque sim" },
      { label: "B", text: "Errada", is_correct: false },
      { label: "C", text: "Errada 2", is_correct: false },
    ],
    legal_refs: [{ norm_name: "Constituição Federal", norm_number: "CF/1988", article: "5", consulted_on: "2026-10-01", official_url: "https://www.planalto.gov.br/ccivil_03/constituicao/constituicao.htm" }],
    ...extra,
  });

  itDb("só admin gerencia equipe; papéis valem no banco", async () => {
    await db.query("begin");
    try {
      await team();
      expect(await errorCode(db, "select bank_set_staff_role($1, 'aut3@teste.local', 'autor', true)", [REV])).toBe("42501");
      await db.query("select bank_set_staff_role($1, 'AUT3@teste.local', 'autor', true)", [ADM]);
      await db.query("select bank_set_staff_role($1, 'rev3@teste.local', 'revisor', true)", [ADM]);
      expect(await errorCode(db, "select bank_set_staff_role($1, 'ninguem@teste.local', 'autor', true)", [ADM])).toBe("P0002");
      const list = (await db.query("select email, roles, is_admin from bank_staff_list() where email like '%3@teste.local' order by email")).rows;
      expect(list).toEqual([
        { email: "adm3@teste.local", roles: [], is_admin: true },
        { email: "aut3@teste.local", roles: ["autor"], is_admin: false },
        { email: "rev3@teste.local", roles: ["revisor"], is_admin: false },
      ]);
    } finally {
      await db.query("rollback");
    }
  });

  itDb("salvar é atômico (questão + alternativas + referências) e respeita papéis", async () => {
    await db.query("begin");
    try {
      await team();
      await db.query("select bank_set_staff_role($1, 'aut3@teste.local', 'autor', true)", [ADM]);
      await db.query("select bank_set_staff_role($1, 'rev3@teste.local', 'revisor', true)", [ADM]);
      // revisor (sem papel de autor) não cadastra
      expect(await errorCode(db, "select bank_save_question($1, null, $2)", [REV, await payload()])).toBe("42501");
      const id = (await db.query("select bank_save_question($1, null, $2) id", [AUT, await payload()])).rows[0].id;
      expect((await db.query("select count(*)::int n from bank_question_options where question_id = $1", [id])).rows[0].n).toBe(3);
      expect((await db.query("select count(*)::int n from bank_question_legal_refs where question_id = $1", [id])).rows[0].n).toBe(1);
      // falha no meio (duas corretas) não deixa nada pela metade
      const bad = await payload({ statement: "Outro enunciado fictício diferente.", options: [{ label: "A", text: "x", is_correct: true }, { label: "B", text: "y", is_correct: true }] });
      expect(await errorCode(db, "select bank_save_question($1, $2, $3)", [AUT, id, bad])).toBe("23505");
      expect((await db.query("select statement from bank_questions where id = $1", [id])).rows[0].statement).toMatch(/^Enunciado fictício sobre direitos/);
      // fluxo pelo bank_decide
      await db.query("select bank_decide($1, $2, 'em_revisao', '', null)", [AUT, id]);
      expect(await errorCode(db, "select bank_decide($1, $2, null, '', $3)", [AUT, id, { content: true, answer: true, source: true, rights: true }])).toBe("42501");
      expect(await errorCode(db, "select bank_decide($1, $2, 'correcao_necessaria', 'x', null)", [REV, id])).toBe("23514");
      await db.query("select bank_decide($1, $2, 'aprovada', 'Conferida com a CF', $3)", [REV, id, { content: true, answer: true, source: true, rights: true }]);
      await db.query("select bank_decide($1, $2, 'publicada', '', null)", [REV, id]);
      // publicada: autor não mexe; revisor só com motivo
      expect(await errorCode(db, "select bank_decide($1, $2, 'em_revisao', 'Lei mudou', null)", [AUT, id])).toBe("42501");
      expect(await errorCode(db, "select bank_decide($1, $2, 'suspensa', '', null)", [REV, id])).toBe("23514");
      expect(await errorCode(db, "select bank_save_question($1, $2, $3)", [AUT, id, await payload()])).toBe("23514");
      await db.query("select bank_decide($1, $2, 'suspensa', 'Gabarito contestado', null)", [REV, id]);
      const d = (await db.query("select bank_dashboard() d")).rows[0].d;
      expect(d.by_status.suspensa).toBeGreaterThanOrEqual(1);
      expect(d.recent.length).toBeGreaterThan(0);
    } finally {
      await db.query("rollback");
    }
  });
});
