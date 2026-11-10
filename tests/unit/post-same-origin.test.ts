/** Rotas POST com cookie só aceitam requisições vindas do próprio site. */
import { describe, expect, it, vi } from "vitest";

vi.mock("@/server/auth", () => ({ getSessionUser: async () => null }));
vi.mock("@/server/services/payments", () => ({ createPayment: async () => ({}) }));
vi.mock("@/server/observability", () => ({ logEvent: async () => undefined }));

const { POST } = await import("@/app/api/payments/create/route");
const { NextRequest } = await import("next/server");

const req = (headers: Record<string, string>) =>
  new NextRequest("https://aprovumconcursos.com.br/api/payments/create", { method: "POST", headers: { host: "aprovumconcursos.com.br", ...headers }, body: "{}" });

describe("POST /api/payments/create: origem", () => {
  it("sem Origin → 403", async () => expect((await POST(req({}))).status).toBe(403));
  it("Origin de outro site → 403", async () => expect((await POST(req({ origin: "https://evil.example" }))).status).toBe(403));
  it("Origin do próprio site passa para a checagem de sessão (401 sem login)", async () =>
    expect((await POST(req({ origin: "https://aprovumconcursos.com.br" }))).status).toBe(401));
});
