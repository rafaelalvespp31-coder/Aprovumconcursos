import { afterEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { OpenAICompatProvider, parseJsonLoose, sanitizeSchema } from "./openai-compat";
import { AIError } from "./provider";

const schema = z.object({ title: z.string().min(2), keys: z.array(z.string().regex(/^N\d{4}$/)).min(1) });
const req = { task: "plan_lessons" as const, system: "sys", prompt: "faça", schema, schemaName: "registrar plano", maxOutputTokens: 1000 };

const reply = (content: string, finish = "stop") =>
  new Response(JSON.stringify({ model: "m", choices: [{ finish_reason: finish, message: { content } }], usage: { prompt_tokens: 10, completion_tokens: 5 } }), { status: 200 });

const provider = (jsonMode: "schema" | "object" = "schema") =>
  new OpenAICompatProvider({ name: "gemini", baseUrl: "https://exemplo.test/v1/", apiKey: "k", model: "m", inputPricePerMTok: null, outputPricePerMTok: null, jsonMode });

afterEach(() => vi.unstubAllGlobals());

describe("adaptador compatível (Gemini, Groq, OpenRouter, Ollama)", () => {
  it("envia json_schema reduzido, autentica e valida a resposta", async () => {
    const fetchMock = vi.fn().mockResolvedValue(reply('```json\n{"title":"Plano","keys":["N0001"]}\n```'));
    vi.stubGlobal("fetch", fetchMock);
    const r = await provider().generateStructured(req);
    expect(r.data).toEqual({ title: "Plano", keys: ["N0001"] });
    expect(r.usage).toMatchObject({ inputTokens: 10, outputTokens: 5 });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe("https://exemplo.test/v1/chat/completions");
    expect(init.headers.Authorization).toBe("Bearer k");
    const body = JSON.parse(init.body);
    expect(body.response_format.type).toBe("json_schema");
    expect(body.response_format.json_schema.name).toBe("registrar_plano");
    expect(JSON.stringify(body.response_format.json_schema.schema)).not.toMatch(/pattern|minLength|\$schema/);
  });

  it("cai para JSON simples quando o modelo não aceita json_schema", async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"error":{"message":"response_format json_schema not supported"}}', { status: 400 }))
      .mockResolvedValueOnce(reply('{"title":"Plano","keys":["N0002"]}'));
    vi.stubGlobal("fetch", fetchMock);
    const r = await provider().generateStructured(req);
    expect(r.data.keys).toEqual(["N0002"]);
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body).response_format).toEqual({ type: "json_object" });
  });

  it("pede correção uma vez e falha de forma explícita se persistir", async () => {
    const fetchMock = vi.fn().mockResolvedValueOnce(reply('{"title":"P","keys":[]}')).mockResolvedValueOnce(reply('{"title":"Plano","keys":["N0003"]}'));
    vi.stubGlobal("fetch", fetchMock);
    const ok = await provider().generateStructured(req);
    expect(ok.attempts).toBe(2);
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body).messages.at(-1).content).toMatch(/não passou na validação/);

    vi.stubGlobal("fetch", vi.fn().mockImplementation(async () => reply("texto sem json")));
    await expect(provider().generateStructured(req)).rejects.toMatchObject({ kind: "invalid_output" });
  });

  it("classifica limite gratuito, credencial e truncamento", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 429 })));
    await expect(provider().generateStructured(req)).rejects.toMatchObject({ kind: "rate_limited", retryable: true });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 401 })));
    await expect(provider().generateStructured(req)).rejects.toMatchObject({ kind: "not_configured", retryable: false });
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(reply('{"title":"Pla', "length")));
    const e = await provider().generateStructured(req).catch((x) => x);
    expect(e).toBeInstanceOf(AIError);
    expect(e.kind).toBe("invalid_output");
  });

  it("HTTP 400: retira reasoning_effort, avisa chave/modelo inválidos e não vaza a chave no log", async () => {
    const withReasoning = () =>
      new OpenAICompatProvider({ name: "gemini", baseUrl: "https://exemplo.test/v1", apiKey: "k", model: "m", inputPricePerMTok: null, outputPricePerMTok: null, jsonMode: "schema", reasoningEffort: "low" });
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('{"error":{"message":"Invalid value for reasoning_effort"}}', { status: 400 }))
      .mockResolvedValueOnce(reply('{"title":"Plano","keys":["N0004"]}'));
    vi.stubGlobal("fetch", fetchMock);
    expect((await withReasoning().generateStructured(req)).data.keys).toEqual(["N0004"]);
    expect(JSON.parse(fetchMock.mock.calls[0]![1].body).reasoning_effort).toBe("low");
    expect(JSON.parse(fetchMock.mock.calls[1]![1].body).reasoning_effort).toBeUndefined();

    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('[{"error":{"message":"API key not valid. Please pass a valid API key. AIzaSyFAKEFAKEFAKE123","status":"INVALID_ARGUMENT"}}]', { status: 400 })));
    await expect(provider().generateStructured(req)).rejects.toMatchObject({ kind: "not_configured", message: expect.stringMatching(/GEMINI_API_KEY/) });
    expect(err.mock.calls.flat().join(" ")).not.toMatch(/AIzaSyFAKE/);

    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response('{"error":{"message":"models/m is not found for API version v1beta"}}', { status: 400 })));
    await expect(provider().generateStructured(req)).rejects.toMatchObject({ kind: "not_configured", message: expect.stringMatching(/AI_MODEL/) });
    err.mockRestore();
  });

  it("utilitários", () => {
    expect(parseJsonLoose('Aqui está: {"a":1} pronto')).toEqual({ a: 1 });
    expect(sanitizeSchema({ type: "string", pattern: "x", minLength: 2, description: "d" })).toEqual({ type: "string", description: "d" });
  });
});
