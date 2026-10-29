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

test("plano de tópicos: cores por matéria e quantos subtópicos estão publicados e quantos faltam", async ({ page }) => {
  await page.goto("/dev/galeria/catalogo");
  const penal = page.getByTestId("planos-materia").filter({ hasText: "Direito Penal" });
  // Soma da matéria: 2 + 3 publicados, 1 + 0 faltam.
  await expect(penal.getByTestId("materia-contagem")).toHaveText(/5 publicados\s*1 falta/);
  const especial = penal.getByTestId("plano-salvo").filter({ hasText: "Parte Especial" });
  await expect(especial.getByTestId("plano-contagem")).toHaveText(/2 publicados\s*1 falta/);
  await expect(especial).toContainText("67% publicado · 1 em rascunho");
  await expect(penal.getByTestId("plano-salvo").filter({ hasText: "Parte Geral" })).toContainText("100% publicado");
  // Cada matéria tem a sua cor.
  const cores = await page.getByTestId("planos-materia").evaluateAll((els) => els.map((e) => getComputedStyle(e).backgroundColor));
  expect(new Set(cores).size).toBe(cores.length);
});

test("plano de tópicos: subtópico com aula duplicada aparece com aviso no card e na matéria", async ({ page }) => {
  await page.goto("/dev/galeria/catalogo");
  const penal = page.getByTestId("planos-materia").filter({ hasText: "Direito Penal" });
  await expect(penal.getByTestId("materia-contagem")).toContainText("⚠ 1 duplicado");
  await expect(penal.getByTestId("plano-salvo").filter({ hasText: "Parte Especial" }).getByTestId("plano-duplicados")).toHaveText("⚠ 1 duplicado");
  await expect(penal.getByTestId("plano-salvo").filter({ hasText: "Parte Geral" }).getByTestId("plano-duplicados")).toHaveCount(0);
});
