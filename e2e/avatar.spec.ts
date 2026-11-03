import { expect, test } from "@playwright/test";

/** Painel = avatar (réplica do layout oficial). Galeria com dados de exemplo. */
const URL = "/dev/galeria/painel";

test.describe("painel (avatar)", () => {
  test("só o avatar no painel: palco, card do aluno e editor", async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByTestId("painel-avatar")).toBeVisible();
    await expect(page.getByRole("heading", { name: /PERSONALIZE SEU AVATAR/ })).toBeVisible();
    await expect(page.getByTestId("avatar-info")).toContainText("Rafael Silva");
    await expect(page.getByTestId("avatar-xp")).toHaveText("1.250");
    await expect(page.getByTestId("avatar-ranking")).toHaveText(/#12\.487/);
    await expect(page.getByText(/Seu progresso|Acesso rápido|Seu desempenho/)).toHaveCount(0);
  });

  test("personagem respira, pisca e mexe a cabeça (arte oficial animada)", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(URL);
    const palco = page.getByTestId("avatar-palco");
    await expect(palco).toHaveAttribute("data-mode", "arte-2d");
    await expect(palco).toHaveAttribute("data-ready", "true");
    const read = () => palco.evaluate((c) => ({ breath: Number(c.dataset.breath), blinks: Number(c.dataset.blinks), head: Number(c.dataset.head) }));
    const samples = [];
    for (let i = 0; i < 8; i++) {
      samples.push(await read());
      await page.waitForTimeout(900);
    }
    const breaths = samples.map((s) => s.breath);
    expect(Math.max(...breaths) - Math.min(...breaths)).toBeGreaterThan(0.2);
    expect(new Set(samples.map((s) => s.head.toFixed(3))).size).toBeGreaterThan(3);
    expect(samples.at(-1)!.blinks).toBeGreaterThanOrEqual(1);
  });

  test("guarda-roupa, cores, item bloqueado, salvar e restaurar", async ({ page }) => {
    await page.goto(URL);
    await page.getByTestId("avatar-item-camiseta_preta").click();
    await expect(page.getByTestId("avatar-item-camiseta_preta")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("avatar-item-jaqueta_aprovum").dispatchEvent("click");
    await expect(page.getByTestId("avatar-msg")).toContainText("libera no nível 30");
    await page.getByTestId("avatar-pele-negra").first().click();
    await expect(page.getByTestId("avatar-pele-negra").first()).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("avatar-cabelo-cor-loiro").first().click();
    await page.getByTestId("avatar-salvar").click();
    await expect(page.getByTestId("avatar-msg")).toHaveText("Avatar salvo.");
    await page.getByTestId("avatar-restaurar").click();
    await expect(page.getByTestId("avatar-item-camiseta_oficial")).toHaveAttribute("aria-pressed", "true");
  });

  test("abas e troca para o avatar feminino", async ({ page }) => {
    await page.goto(URL);
    await page.getByTestId("avatar-aba-cabelo").click();
    await expect(page.getByTestId("avatar-item-cabelo_m_degrade").first()).toBeVisible();
    await page.getByTestId("avatar-genero-f").click();
    await expect(page.getByTestId("avatar-genero-f")).toHaveAttribute("aria-checked", "true");
    await expect(page.getByTestId("avatar-palco-producao")).toContainText("Personagem 3D em produção");
    await expect(page.getByText("Acessórios:")).toBeVisible();
  });

  test("manequim de teste 3D também anima (motor dos modelos futuros)", async ({ page }) => {
    await page.goto(`${URL}?avatar=manequim`);
    const palco = page.getByTestId("avatar-palco");
    await expect(palco).toHaveAttribute("data-mode", "3d");
    await expect.poll(async () => Number(await palco.getAttribute("data-breath")), { timeout: 8000 }).toBeGreaterThan(0.2);
  });
});
