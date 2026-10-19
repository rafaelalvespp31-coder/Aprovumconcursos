import { expect, test } from "@playwright/test";

test.describe("páginas públicas", () => {
  test("landing: estudo por conteúdo específico, com decomposição real de um artigo", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Você não precisa estudar mais. Precisa aprender melhor.");
    await expect(page.getByText(/sem precisar do edital/)).toBeVisible();
    // A régua mostra um segmento por item extraído pelo motor real.
    const ruler = page.getByRole("img", { name: /Cobertura do exemplo/ });
    await expect(ruler).toBeVisible();
    await expect(ruler).toHaveAttribute("aria-label", /\d+ itens/);
    // O item aparece na lista extraída (além da citação do texto original).
    await expect(page.getByRole("listitem").filter({ hasText: "ninguém será submetido a tortura" })).toBeVisible();
  });

  test("landing: navegação, carrossel de carreiras e chamadas para o cadastro", async ({ page }, info) => {
    await page.goto("/");
    const mobile = (page.viewportSize()?.width ?? 1200) < 900;
    if (mobile) {
      await page.getByRole("button", { name: "Abrir menu" }).click();
      const menu = page.locator("#lp-menu");
      await expect(menu.getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/entrar");
      await expect(menu.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/cadastro");
      await menu.getByRole("link", { name: "Como Funciona" }).click();
      await expect(menu).toBeHidden();
    } else {
      const nav = page.getByRole("navigation", { name: "Seções da página" });
      await expect(page.getByRole("banner").getByRole("link", { name: "Entrar" })).toHaveAttribute("href", "/entrar");
      await nav.getByRole("link", { name: "Como Funciona" }).click();
    }
    await expect(page.getByRole("heading", { name: "Simples, direto e feito para o seu resultado." })).toBeInViewport();
    // Carrossel: seta e pontos trocam o slide.
    const car = page.getByTestId("carrossel-carreiras");
    await car.scrollIntoViewIfNeeded();
    const dots = car.getByRole("tab");
    await expect(dots.nth(0)).toHaveAttribute("aria-selected", "true");
    await car.getByRole("button", { name: "Próximo" }).click();
    await expect(dots.nth(1)).toHaveAttribute("aria-selected", "true");
    await dots.nth(2).click();
    await expect(dots.nth(2)).toHaveAttribute("aria-selected", "true");
    await expect(page.getByRole("link", { name: /Criar conta grátis/ })).toHaveAttribute("href", "/cadastro");
    await expect(page.getByRole("link", { name: /Criar conta agora/ })).toHaveAttribute("href", "/cadastro");
    await page.getByRole("link", { name: /Conheça o método/ }).click();
    await expect(page.getByRole("heading", { name: "Exemplo de conteúdo" })).toBeInViewport();
    void info;
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
