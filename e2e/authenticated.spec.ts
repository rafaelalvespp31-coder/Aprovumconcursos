import { expect, test } from "@playwright/test";

/**
 * Fluxo autenticado completo. Requer um ambiente de homologação com Supabase e IA
 * configurados e uma conta de teste (E2E_EMAIL / E2E_PASSWORD).
 */
const email = process.env.E2E_EMAIL;
const password = process.env.E2E_PASSWORD;

test.describe("fluxo do aluno", () => {
  test.skip(!email || !password, "E2E_EMAIL/E2E_PASSWORD não definidos: fluxo autenticado não executado.");

  test("cria um estudo de tema específico, sem edital, exigindo banca", async ({ page }) => {
    test.setTimeout(10 * 60_000);
    await page.goto("/entrar");
    await page.getByLabel("E-mail").fill(email!);
    await page.getByLabel("Senha", { exact: true }).fill(password!);
    await page.getByRole("button", { name: "Entrar" }).click();
    await page.goto("/nova-trilha");

    const build = page.getByRole("button", { name: "Começar este estudo" });
    await expect(build).toBeDisabled(); // banca obrigatória
    await page.getByText("CEBRASPE").click();
    await page.getByLabel("Conteúdo a estudar").fill("Prisão em flagrante");
    await build.click();

    await expect(page).toHaveURL(/\/trilhas\/.+\/processando/);
    await expect(page.getByRole("progressbar")).toBeVisible();
    // Pronto o estudo, vai direto para a primeira aula (sem página intermediária).
    await page.waitForURL(/\/aula\/[0-9a-f-]+/, { timeout: 9 * 60_000 });
    await expect(page.locator("nav.al-passos, form").first()).toBeVisible();
  });

  test("rota de outro usuário não é acessível", async ({ page }) => {
    await page.goto("/trilhas/00000000-0000-4000-8000-000000000000");
    await expect(page.getByRole("heading", { name: "Página não encontrada" })).toBeVisible();
  });
});
