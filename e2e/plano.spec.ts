import { expect, test } from "@playwright/test";

const URL = "/dev/galeria/plano";

test.describe("Meu Plano", () => {
  test("arte oficial com as cinco áreas de plano e o plano atual marcado", async ({ page }) => {
    await page.goto(`${URL}?atual=semestral`);
    await expect(page.getByAltText(/Escolha seu plano APROVUM/)).toBeVisible();
    for (const id of ["gratuito", "mensal", "semestral", "anual", "vitalicio"]) await expect(page.getByTestId(`plano-${id}`)).toBeVisible();
    await expect(page.getByTestId("plano-atual")).toHaveText("SEU PLANO ATUAL");
    await expect(page.getByTestId("plano-gratuito")).toHaveAttribute("href", "/painel");
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("escolher um plano pede confirmação e registra o pedido", async ({ page }) => {
    await page.goto(URL);
    await page.getByTestId("plano-anual").click();
    const d = page.getByTestId("plano-dialogo");
    await expect(d).toContainText("Plano Anual");
    await expect(d).toContainText("R$ 347,00");
    await page.getByTestId("plano-confirmar").click();
    await expect(page.getByTestId("plano-enviado")).toContainText("A equipe APROVUM libera o plano");
  });
});
