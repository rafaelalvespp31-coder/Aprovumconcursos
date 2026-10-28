import { expect, test } from "@playwright/test";

/** Cadastro de matérias no catálogo do admin (galeria, em memória). */
test.describe("catálogo: nova matéria", () => {
  test("cadastrar, ver na lista, renomear, recusar repetida e excluir", async ({ page }) => {
    await page.goto("/dev/galeria/catalogo");
    const box = page.getByTestId("materias");
    await box.getByTestId("nova-materia").click();
    const form = box.getByRole("form", { name: "Cadastrar nova matéria" });
    await form.getByLabel("Nome da matéria").fill("Direitos Humanos");
    await form.getByLabel("Estilo das aulas").selectOption("direito_constitucional");
    await form.getByRole("button", { name: "Cadastrar matéria" }).click();
    await expect(box.getByTestId("materias-aviso")).toHaveText("Matéria “Direitos Humanos” cadastrada.");
    const linha = box.getByTestId("materia-linha").filter({ hasText: "Direitos Humanos" });
    await expect(linha).toContainText("Cadastrada");
    await expect(linha).toContainText("estilo como Direito Constitucional");

    // Nome repetido (sem diferença de acento/maiúscula) é recusado.
    await form.getByLabel("Nome da matéria").fill("direito penal");
    await form.getByRole("button", { name: "Cadastrar matéria" }).click();
    await expect(box.getByTestId("materias-aviso")).toContainText("já existe");

    // Renomear.
    await linha.getByRole("button", { name: "Editar" }).click();
    await box.getByLabel("Nome", { exact: true }).fill("Direitos Humanos e Cidadania");
    await box.getByRole("button", { name: "Salvar" }).click();
    const renomeada = box.getByTestId("materia-linha").filter({ hasText: "Direitos Humanos e Cidadania" });
    await expect(renomeada).toBeVisible();

    // Matéria em uso não exclui; a nova (sem aulas) exclui com confirmação.
    await expect(box.getByTestId("materia-linha").filter({ hasText: "Criminologia" }).getByRole("button", { name: "Excluir" })).toBeDisabled();
    await renomeada.getByRole("button", { name: "Excluir" }).click();
    await renomeada.getByRole("button", { name: "Sim, excluir" }).click();
    await expect(box.getByTestId("materia-linha").filter({ hasText: "Direitos Humanos" })).toHaveCount(0);
  });

  test("matérias fixas não têm editar nem excluir", async ({ page }) => {
    await page.goto("/dev/galeria/catalogo");
    const box = page.getByTestId("materias");
    await box.getByRole("button", { name: "Ver matérias" }).click();
    const penal = box.getByTestId("materia-linha").filter({ hasText: /^Direito Penal ·/ });
    await expect(penal).toContainText("Fixa");
    await expect(penal.getByRole("button")).toHaveCount(0);
  });
});

test("plano de tópicos: planos salvos ficam dentro da matéria de cada um", async ({ page }) => {
  await page.goto("/dev/galeria/catalogo");
  const pastas = page.getByTestId("planos-materia");
  // Ordem das matérias (Português, Constitucional, Penal) e os sem matéria por último.
  await expect(pastas.locator("summary .font-bold")).toHaveText(["Língua Portuguesa", "Direito Constitucional", "Direito Penal", "Sem matéria definida"]);
  const penal = pastas.filter({ hasText: "Direito Penal" });
  await expect(penal.locator("summary")).toContainText("2 planos");
  await expect(penal.getByTestId("plano-salvo")).toHaveText([/Penal — Parte Especial/, /Penal — Parte Geral/]);
  // Abre e fecha a pasta da matéria.
  await penal.locator("summary").click();
  await expect(penal.getByTestId("plano-salvo").first()).toBeHidden();
  await penal.locator("summary").click();
  await expect(penal.getByTestId("plano-salvo").first()).toBeVisible();
});
