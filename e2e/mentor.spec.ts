import { expect, test } from "@playwright/test";

/**
 * Mentor APROVUM: o Mentor flutuante (bolha/painel), página com prioridades e o assistente guiado
 * (galeria de desenvolvimento, dados fictícios calculados pelo motor real; nada é gravado).
 */
const G = "/dev/galeria";

test.describe("Mentor flutuante (em todas as telas)", () => {
  test("bolha com o número de prioridades; abre, mostra motivo/progresso e minimiza", async ({ page }) => {
    await page.goto(`${G}/painel?mentor=ok`);
    const bolha = page.getByTestId("mentor-bolha");
    await expect(bolha).toBeVisible();
    await expect(bolha).toHaveAccessibleName(/3 prioridades/);
    await bolha.click();
    const painel = page.getByTestId("mentor-painel");
    await expect(painel).toHaveAttribute("data-estado", "ok");
    await expect(painel.getByText("Por quê:").first()).toBeVisible();
    await expect(painel.getByRole("img", { name: /da aula/ }).first()).toBeVisible();
    await expect(painel.getByTestId("mentor-acao").first()).toHaveAttribute("href", `${G}/aula/l-ext`);
    await page.getByTestId("mentor-minimizar").click();
    await expect(painel).toBeHidden();
    await expect(bolha).toBeFocused();
    // Esc também minimiza.
    await bolha.click();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("mentor-painel")).toBeHidden();
  });

  test("acompanha a navegação e lembra se estava aberto (com a conversa)", async ({ page }) => {
    await page.goto(`${G}/painel?mentor=ok`);
    await page.getByTestId("mentor-bolha").click();
    await page.getByRole("tab", { name: "Conversar" }).click();
    await page.getByRole("button", { name: "O que estudar hoje?" }).click();
    await expect(page.getByTestId("mentor-resposta").last()).toHaveAttribute("data-intencao", "hoje");
    // Navegação dentro do app: o Mentor continua aberto e a conversa continua lá.
    await page.locator(".bn-wrap").getByRole("link", { name: /Questões/ }).first().click();
    await expect(page).toHaveURL(/\/questoes/);
    await expect(page.getByTestId("mentor-painel")).toBeVisible();
    await expect(page.getByTestId("mentor-resposta")).toHaveCount(1);
    // Recarregar a página: continua aberto na mesma aba.
    await page.reload();
    await expect(page.getByTestId("mentor-painel")).toBeVisible();
    await expect(page.getByRole("tab", { name: "Conversar" })).toHaveAttribute("aria-selected", "true");
  });

  test("arrastar a bolha muda a posição (e não abre); a posição é lembrada", async ({ page, isMobile }) => {
    await page.goto(`${G}/painel?mentor=ok`);
    const bolha = page.getByTestId("mentor-bolha");
    const a = (await bolha.boundingBox())!;
    const cx = a.x + a.width / 2;
    const cy = a.y + a.height / 2;
    if (isMobile) {
      await bolha.dispatchEvent("pointerdown", { pointerId: 1, clientX: cx, clientY: cy, isPrimary: true });
      await bolha.dispatchEvent("pointermove", { pointerId: 1, clientX: cx - 120, clientY: cy - 150, isPrimary: true });
      await bolha.dispatchEvent("pointerup", { pointerId: 1, clientX: cx - 120, clientY: cy - 150, isPrimary: true });
    } else {
      await page.mouse.move(cx, cy);
      await page.mouse.down();
      await page.mouse.move(cx - 60, cy - 80, { steps: 4 });
      await page.mouse.move(cx - 120, cy - 150, { steps: 4 });
      await page.mouse.up();
    }
    const b = (await bolha.boundingBox())!;
    expect(a.x - b.x).toBeGreaterThan(100);
    expect(a.y - b.y).toBeGreaterThan(120);
    await expect(page.getByTestId("mentor-painel")).toBeHidden();
    await page.reload();
    const c = (await page.getByTestId("mentor-bolha").boundingBox())!;
    expect(Math.abs(c.x - b.x)).toBeLessThan(3);
  });

  test("dispensar tira a recomendação e avisa", async ({ page }) => {
    await page.goto(`${G}/painel?mentor=ok`);
    await page.getByTestId("mentor-bolha").click();
    const painel = page.getByTestId("mentor-painel");
    await expect(painel.getByTestId("mentor-lista").locator("li")).toHaveCount(3);
    await painel.getByRole("button", { name: /^Dispensar/ }).first().click();
    await expect(painel.getByRole("status")).toContainText("dispensada");
    await expect(painel.getByTestId("mentor-lista").locator("li")).toHaveCount(2);
  });

  for (const [estado, texto] of [
    ["em_dia", "Você está em dia."],
    ["sem_dados", "Ainda não tenho dados seus suficientes"],
    ["sessao", "Sua sessão expirou."],
    ["erro", "Não foi possível carregar o Mentor agora."],
  ] as const) {
    test(`estado: ${estado}`, async ({ page }) => {
      await page.goto(`${G}/painel?mentor=${estado}`);
      await page.getByTestId("mentor-bolha").click();
      await expect(page.getByTestId("mentor-painel").getByText(texto)).toBeVisible();
    });
  }

  test("o painel aberto cabe na tela e não cria rolagem lateral", async ({ page }) => {
    await page.goto(`${G}/trilhas?mentor=ok`);
    await page.getByTestId("mentor-bolha").click();
    const box = (await page.getByTestId("mentor-painel").boundingBox())!;
    const vp = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.y).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width);
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test("não aparece duplicado na página do Mentor", async ({ page }) => {
    await page.goto(`${G}/mentor`);
    await expect(page.getByTestId("mentor-pagina")).toBeVisible();
    await expect(page.getByTestId("mentor-bolha")).toHaveCount(0);
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
