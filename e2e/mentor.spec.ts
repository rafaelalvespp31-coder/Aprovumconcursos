import { expect, test } from "@playwright/test";

/**
 * Mentor APROVUM: estados do card no painel, página com prioridades e o assistente guiado
 * (galeria de desenvolvimento, dados fictícios calculados pelo motor real; nada é gravado).
 */
const G = "/dev/galeria";

test.describe("card do Mentor no painel", () => {
  test("com recomendação: prioridade, motivo, progresso e ação real", async ({ page }) => {
    await page.goto(`${G}/painel?mentor=ok`);
    const card = page.getByTestId("mentor-card");
    await expect(card).toHaveAttribute("data-estado", "ok");
    await expect(card.getByText("Por quê:")).toBeVisible();
    await expect(card.getByRole("img", { name: /da aula/ })).toBeVisible();
    await expect(card.getByTestId("mentor-acao")).toHaveAttribute("href", `${G}/aula/l-ext`);
    await expect(card.getByRole("link", { name: "Falar com o mentor" })).toHaveAttribute("href", `${G}/mentor`);
    // O resto do painel continua lá.
    await expect(page.getByText("Galeria de desenvolvimento")).toBeVisible();
  });

  test("dispensar tira a recomendação da tela e avisa", async ({ page }) => {
    await page.goto(`${G}/painel?mentor=ok`);
    const card = page.getByTestId("mentor-card");
    const first = await card.locator("h3").first().textContent();
    await card.getByRole("button", { name: /^Dispensar/ }).click();
    await expect(card.getByRole("status")).toContainText("dispensada");
    await expect(card.locator("h3").first()).not.toHaveText(first ?? "");
  });

  for (const [estado, texto] of [
    ["vazio", "Você está em dia."],
    ["sem_dados", "Ainda não tenho dados seus suficientes"],
    ["sessao", "Sua sessão expirou."],
    ["erro", "Não foi possível carregar o Mentor agora."],
  ] as const) {
    test(`estado: ${estado}`, async ({ page }) => {
      await page.goto(`${G}/painel?mentor=${estado}`);
      const card = page.getByTestId("mentor-card");
      await expect(card).toHaveAttribute("data-estado", estado);
      await expect(card.getByText(texto)).toBeVisible();
    });
  }

  test("erro tem 'Tentar de novo'", async ({ page }) => {
    await page.goto(`${G}/painel?mentor=erro`);
    await expect(page.getByTestId("mentor-card").getByRole("button", { name: "Tentar de novo" })).toBeVisible();
  });
});

test.describe("página do Mentor e assistente guiado", () => {
  test("lista prioridades com motivo e links internos", async ({ page }) => {
    await page.goto(`${G}/mentor`);
    const lista = page.getByTestId("mentor-lista");
    await expect(lista.locator("li")).toHaveCount(3);
    await expect(lista.getByText("Por quê:").first()).toBeVisible();
    for (const href of await lista.getByRole("link").evaluateAll((as) => as.map((a) => a.getAttribute("href")))) {
      expect(href).toMatch(/^\/dev\/galeria\/[a-z]/);
    }
  });

  test("perguntas rápidas respondem com os dados do aluno", async ({ page }) => {
    await page.goto(`${G}/mentor`);
    await page.getByRole("button", { name: "O que estudar hoje?" }).click();
    const r1 = page.getByTestId("mentor-resposta").last();
    await expect(r1).toHaveAttribute("data-intencao", "hoje");
    await expect(r1.getByRole("link").first()).toHaveAttribute("href", /^\/dev\/galeria\//);

    await page.getByRole("button", { name: "Revisões vencidas" }).click();
    const r2 = page.getByTestId("mentor-resposta").last();
    await expect(r2).toHaveAttribute("data-intencao", "revisoes");
    await expect(r2).toContainText("Roubo");
  });

  test("pergunta livre e pergunta fora do escopo", async ({ page }) => {
    await page.goto(`${G}/mentor`);
    const input = page.getByLabel("Sua pergunta para o Mentor");
    await input.fill("Em quais assuntos estou errando mais?");
    await page.getByRole("button", { name: "Enviar pergunta" }).click();
    await expect(page.getByTestId("mentor-resposta").last()).toHaveAttribute("data-intencao", "erros");
    await input.fill("qual a capital da França?");
    await input.press("Enter");
    await expect(page.getByTestId("mentor-resposta").last()).toHaveAttribute("data-intencao", "fallback");
    await page.getByRole("button", { name: "Limpar" }).click();
    await expect(page.getByTestId("mentor-resposta")).toHaveCount(0);
  });

  test("sem dados: o Mentor diz isso honestamente", async ({ page }) => {
    await page.goto(`${G}/mentor?dados=vazio`);
    await expect(page.getByText("Ainda não tenho dados seus suficientes")).toBeVisible();
    await page.getByRole("button", { name: "O que estudar hoje?" }).click();
    await expect(page.getByTestId("mentor-resposta").last()).not.toContainText("%");
  });
});
