import { expect, test } from "@playwright/test";

test.describe("páginas públicas", () => {
  test("landing demonstra a decomposição real do edital", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Cole o edital. Estude tudo o que ele pede.");
    // A régua mostra um segmento por item extraído pelo motor real.
    const ruler = page.getByRole("img", { name: /Cobertura do exemplo/ });
    await expect(ruler).toBeVisible();
    await expect(ruler).toHaveAttribute("aria-label", /\d+ itens/);
    // O item aparece na lista extraída (além da citação do texto original).
    await expect(page.getByRole("listitem").filter({ hasText: "Invalidação, anulação e revogação" })).toBeVisible();
  });

  test("sem rolagem horizontal", async ({ page }) => {
    for (const path of ["/", "/entrar", "/cadastro", "/offline"]) {
      await page.goto(path);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
      expect(overflow, path).toBeLessThanOrEqual(0);
    }
  });

  test("cabeçalhos de segurança presentes", async ({ request }) => {
    const res = await request.get("/");
    const h = res.headers();
    expect(h["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(h["x-frame-options"]).toBe("DENY");
    expect(h["x-content-type-options"]).toBe("nosniff");
    expect(h["x-powered-by"]).toBeUndefined();
  });

  test("PWA: manifest, ícones e service worker", async ({ request }) => {
    const m = await (await request.get("/manifest.webmanifest")).json();
    expect(m.display).toBe("standalone");
    expect(m.icons.map((i: { sizes: string }) => i.sizes)).toEqual(expect.arrayContaining(["192x192", "512x512"]));
    for (const i of m.icons) expect((await request.get(i.src)).ok()).toBe(true);
    const sw = await request.get("/sw.js");
    expect(sw.ok()).toBe(true);
    expect(sw.headers()["cache-control"]).toContain("no-cache");
    expect((await request.get("/offline")).ok()).toBe(true);
  });

  test("cadastro valida campos antes de enviar ao servidor de autenticação", async ({ page }) => {
    await page.goto("/cadastro");
    await page.getByLabel("Nome").fill("Teste");
    await page.getByLabel("E-mail").fill("nao-e-email");
    await page.getByLabel("Senha", { exact: true }).fill("curta");
    await page.getByRole("button", { name: "Criar conta" }).click();
    await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
    await expect(page.getByText(/pelo menos 8 caracteres/).last()).toBeVisible();
    await expect(page.getByText(/aceitar os termos/)).toBeVisible();
  });

  test("navegação por teclado alcança o formulário de login com foco visível", async ({ page }) => {
    await page.goto("/entrar");
    await page.getByLabel("E-mail").focus();
    await expect(page.getByLabel("E-mail")).toBeFocused();
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Senha", { exact: true })).toBeFocused();
  });
});
