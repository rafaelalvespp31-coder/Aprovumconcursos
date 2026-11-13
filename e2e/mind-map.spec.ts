import { expect, test } from "@playwright/test";

/** Mapa mental: botão do mapa mental (o PDF da aula agora é o "Meu PDF de Revisão" da barra de estudo), na página "Revisão e fontes" (galeria). */
const pages = (page: import("@playwright/test").Page) => page.getByRole("navigation", { name: "Páginas da aula" });

test.describe("mapa mental da aula", () => {
  test("bloqueado até concluir os módulos", async ({ page }) => {
    await page.goto("/dev/galeria/aula");
    await pages(page).getByRole("button", { name: /Revisão e fontes/ }).click();
    const btn = page.locator("section#pdf").getByTestId("gerar-mapa-mental");
    await expect(btn).toBeDisabled();
    await expect(page.locator("section#pdf")).toContainText("Mapa mental liberado após a aprovação");
  });

  test("liberado: baixa o PDF do mapa mental", async ({ page }) => {
    await page.goto("/dev/galeria/aula?pronto=1");
    await pages(page).getByRole("button", { name: /Revisão e fontes/ }).click();
    const pdf = page.locator("section#pdf");
    await expect(pdf.getByRole("heading", { name: "Mapa mental da aula" })).toBeVisible();
    await expect(pdf.getByRole("button", { name: /^Gerar PDF/ })).toHaveCount(0);
    const download = page.waitForEvent("download");
    await pdf.getByTestId("gerar-mapa-mental").click();
    const file = await download;
    expect(file.suggestedFilename()).toBe("aprovum-mapa-mental-homicidio.pdf");
  });
});
