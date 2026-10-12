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
      expect(boards.rows[0].n).toBe(8);
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
