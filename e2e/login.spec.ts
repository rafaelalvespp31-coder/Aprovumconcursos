import { expect, test } from "@playwright/test";

/**
 * Tela de login tática: controles reais (validação, mostrar senha, "Manter conectado",
 * links) e composição responsiva. Não testa login bem-sucedido (exige Supabase de
 * homologação — ver authenticated.spec.ts).
 */
test.describe("tela de login", () => {
  test("sessão única: aviso quando a conta entrou em outro aparelho", async ({ page }) => {
    await page.goto("/entrar?motivo=outro-aparelho");
    await expect(page.getByText(/acessada em outro aparelho/)).toBeVisible();
  });

  test("identidade visual: logo, título, arte e quatro pilares", async ({ page }, info) => {
    await page.goto("/entrar");
    await expect(page.getByRole("img", { name: /APROVUM/ })).toBeVisible();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText(/Acesso à\s*plataforma/i);
    if (info.project.name === "mobile") {
      const arte = page.locator(".login-arte img");
      await expect(arte).toBeVisible();
      expect(await arte.evaluate((i: HTMLImageElement) => i.complete && i.naturalWidth > 0)).toBe(true);
    } else {
      // Desktop: a cena de fundo cobre a tela inteira, com os soldados e a fumaça.
      const cena = page.locator(".login-cena");
      const box = await cena.boundingBox();
      const vp = page.viewportSize()!;
      expect(box!.x).toBe(0);
      expect(box!.width).toBeGreaterThanOrEqual(vp.width - 1);
      expect(box!.height).toBeGreaterThanOrEqual(vp.height);
      const bg = await cena.evaluate((e) => getComputedStyle(e, "::after").backgroundImage + getComputedStyle(e, "::before").backgroundImage);
      expect(bg).toContain("aprovum-login-hero.webp");
      expect(bg).toContain("aprovum-login-fumaca.jpg");
    }
    await expect(page.locator(".login-pilares li")).toHaveCount(4);
    await expect(page.getByText("Preparação de alto desempenho")).toBeVisible();
  });

  test("valida e-mail e senha no navegador antes de enviar", async ({ page }) => {
    await page.goto("/entrar");
    await page.getByRole("button", { name: "Entrar na operação" }).click();
    await expect(page.getByText("Informe seu e-mail.")).toBeVisible();
    await expect(page.getByText("Informe a senha.")).toBeVisible();
    await expect(page.getByLabel("E-mail")).toBeFocused();
    await expect(page.getByLabel("E-mail")).toHaveAttribute("aria-invalid", "true");

    await page.getByLabel("E-mail").fill("nao-e-email");
    await page.getByRole("button", { name: "Entrar na operação" }).click();
    await expect(page.getByText("Informe um e-mail válido.")).toBeVisible();
    await expect(page).toHaveURL(/\/entrar/);
  });

  test("mostrar/ocultar senha e caixa 'Manter conectado'", async ({ page }) => {
    await page.goto("/entrar");
    const senha = page.getByLabel("Senha", { exact: true });
    await senha.fill("segredo123");
    await expect(senha).toHaveAttribute("type", "password");
    await page.getByRole("button", { name: "Mostrar senha" }).click();
    await expect(senha).toHaveAttribute("type", "text");
    await page.getByRole("button", { name: "Ocultar senha" }).click();
    await expect(senha).toHaveAttribute("type", "password");

    const manter = page.getByRole("checkbox", { name: "Manter conectado" });
    await expect(manter).toBeChecked();
    await page.getByText("Manter conectado").click();
    await expect(manter).not.toBeChecked();
  });

  test("recuperar senha pede o nome completo e o e-mail da conta", async ({ page }) => {
    await page.goto("/recuperar-senha");
    await expect(page.getByLabel("Nome completo")).toBeVisible();
    await expect(page.getByLabel("E-mail da conta")).toBeVisible();
    await expect(page.getByRole("button", { name: "Conferir e enviar o link" })).toBeVisible();
  });

  test("links levam à recuperação de senha e ao cadastro existentes", async ({ page }) => {
    await page.goto("/entrar");
    await expect(page.getByRole("link", { name: "Esqueci minha senha" })).toHaveAttribute("href", "/recuperar-senha");
    await expect(page.getByRole("link", { name: "Criar conta" })).toHaveAttribute("href", "/cadastro");
    await page.getByRole("link", { name: "Criar conta" }).click();
    await expect(page).toHaveURL(/\/cadastro/);
  });

  test("composição: celular empilhado com pilares 2×2; desktop com painel à direita e pilares em linha", async ({ page }, info) => {
    await page.goto("/entrar");
    const painel = await page.locator(".login-painel").boundingBox();
    const arte = info.project.name === "mobile" ? await page.locator(".login-arte").boundingBox() : null;
    const pilares = page.locator(".login-pilares li");
    const tops = await pilares.evaluateAll((els) => els.map((e) => Math.round(e.getBoundingClientRect().top)));
    const vw = page.viewportSize()!.width;
    expect(painel!.x).toBeGreaterThanOrEqual(0);
    expect(painel!.x + painel!.width).toBeLessThanOrEqual(vw);
    if (info.project.name === "mobile") {
      expect(arte!.y).toBeLessThan(painel!.y); // soldados acima do formulário
      expect(new Set(tops).size).toBe(2);
    } else {
      expect(painel!.x).toBeGreaterThan(vw / 2); // painel à direita
      expect(new Set(tops).size).toBe(1);
    }
  });
});
