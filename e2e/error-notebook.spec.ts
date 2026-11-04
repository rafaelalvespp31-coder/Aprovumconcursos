import { expect, test, type Page } from "@playwright/test";

/** Caderno de erros (somente leitura) na galeria: organizado por matéria › tema › assunto, com a resposta certa. */
const URL = "/dev/galeria/questoes/cadernos/11111111-1111-4111-8111-111111111111?retomar=1";

async function open(page: Page) {
  await page.goto(URL);
  await page.getByTestId("abrir-caderno-erros").click();
  const modal = page.getByRole("dialog", { name: "Caderno de erros" });
  await expect(modal.getByTestId("erro-item")).toHaveCount(4);
  return modal;
}

test.describe("caderno de erros", () => {
  test("organizado por matéria, tema e assunto, com a resposta certa de cada erro", async ({ page }) => {
    const modal = await open(page);
    await expect(modal.locator(".ce-materia-titulo")).toHaveText(["Direito Administrativo", "Direito Penal"]);
    await expect(modal.locator(".ce-assunto-titulo")).toHaveText(["Furto", "Roubo"]);
    await expect(modal.getByTestId("erro-resposta")).toHaveCount(4);
    await expect(modal.getByTestId("erro-resposta").first()).toContainText("Resposta certa:");
    await expect(modal.getByTestId("erro-resumo").first()).not.toBeEmpty();
  });

  test("não é editável: sem barra de formatação, sem campos e sem salvar", async ({ page }) => {
    const modal = await open(page);
    await expect(modal.getByRole("toolbar")).toHaveCount(0);
    await expect(modal.getByRole("textbox")).toHaveCount(0);
    await expect(modal.locator("[contenteditable=true]")).toHaveCount(0);
    await expect(modal.getByTestId("caderno-erros-salvar")).toHaveCount(0);
  });

  test("Esc e Fechar fecham a janela", async ({ page }) => {
    const modal = await open(page);
    await page.keyboard.press("Escape");
    await expect(modal).toBeHidden();
  });
});
