import { expect, test } from "@playwright/test";

/** Avatar no painel (galeria: manequim de teste no lugar dos modelos finais). */
const URL = "/dev/galeria/painel";

test.describe("avatar no painel", () => {
  test("respira, pisca e mexe a cabeça sozinho (sem escala no personagem inteiro)", async ({ page }) => {
    await page.goto(URL);
    const palco = page.getByTestId("avatar-palco");
    await expect(palco).toHaveAttribute("data-ready", "true");
    const read = () => palco.evaluate((c) => ({ breath: Number(c.dataset.breath), blinks: Number(c.dataset.blinks), chest: Number(c.dataset.chest), head: Number(c.dataset.head) }));
    const samples = [];
    for (let i = 0; i < 8; i++) {
      samples.push(await read());
      await page.waitForTimeout(900);
    }
    const breaths = samples.map((s) => s.breath);
    expect(Math.max(...breaths) - Math.min(...breaths)).toBeGreaterThan(0.2);
    expect(Math.max(...samples.map((s) => s.chest))).toBeGreaterThan(1.005);
    expect(new Set(samples.map((s) => s.head.toFixed(3))).size).toBeGreaterThan(3);
    expect(samples.at(-1)!.blinks).toBeGreaterThanOrEqual(1);
  });

  test("nome, nível e XP; editor com troca de gênero, pele e item bloqueado", async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByTestId("avatar-info")).toContainText("Rafael Silva");
    await expect(page.getByTestId("avatar-xp")).toHaveText("1.250");
    await page.getByTestId("avatar-personalizar").click();
    const editor = page.getByTestId("avatar-editor");
    await expect(editor).toBeVisible();
    await page.getByTestId("avatar-genero-f").click();
    await expect(page.getByTestId("avatar-genero-f")).toHaveAttribute("aria-checked", "true");
    await page.getByTestId("avatar-aba-pele").click();
    await page.getByTestId("avatar-pele-negra").click();
    await expect(page.getByTestId("avatar-pele-negra")).toHaveAttribute("aria-pressed", "true");
    await page.getByTestId("avatar-aba-roupas").click();
    await page.getByTestId("avatar-item-uniforme_prf").dispatchEvent("click");
    await expect(page.getByTestId("avatar-msg")).toContainText("libera no nível 20");
    await expect(page.getByTestId("avatar-item-uniforme_prf")).toHaveAttribute("aria-pressed", "false");
    await page.getByTestId("avatar-salvar").click();
    await expect(page.getByTestId("avatar-msg")).toHaveText("Avatar salvo.");
    await page.getByTestId("avatar-restaurar").click();
    await page.getByTestId("avatar-aba-pele").click();
    await expect(page.getByTestId("avatar-pele-morena_clara")).toHaveAttribute("aria-pressed", "true");
  });

  test("sem modelo 3D publicado, mostra o aviso de produção (nunca um boneco genérico)", async ({ page }) => {
    await page.goto(`${URL}?avatar=producao`);
    await expect(page.getByTestId("avatar-palco-producao")).toContainText("Personagem 3D em produção");
    await expect(page.getByTestId("avatar-palco")).toHaveCount(0);
  });
});
