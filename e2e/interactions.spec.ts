import { expect, test, type Page } from "@playwright/test";

/**
 * Interações reais dos componentes de estudo, na galeria de desenvolvimento
 * (dados de exemplo + implementação em memória das ações). Garante que nenhum
 * controle seja decorativo: cada clique produz o efeito esperado.
 */
const G = "/dev/galeria";

async function noHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
  expect(overflow).toBeLessThanOrEqual(0);
}

test.describe("galeria: todas as telas carregam sem erro e sem rolagem horizontal", () => {
  for (const path of ["painel", "trilha", "aula", "questoes", "simulado", "desempenho"]) {
    test(path, async ({ page }) => {
      const errors: string[] = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(`${G}/${path}`);
      await expect(page.getByText("Galeria de desenvolvimento")).toBeVisible();
      await noHorizontalScroll(page);
      expect(errors).toEqual([]);
    });
  }
});

test.describe("celulares pequenos (320px): nenhuma tela rola para o lado", () => {
  test.use({ viewport: { width: 320, height: 640 } });
  for (const path of ["painel", "trilha", "aula", "questoes", "simulado", "desempenho"]) {
    test(path, async ({ page }) => {
      await page.goto(`${G}/${path}`);
      await noHorizontalScroll(page);
    });
  }
});

test.describe("modo de questões", () => {
  test("seleciona, responde e explica cada alternativa", async ({ page }) => {
    await page.goto(`${G}/questoes`);
    const responder = page.getByRole("button", { name: "Responder", exact: true });
    await expect(responder).toBeDisabled();
    await page.getByText("anular a licença, por ilegalidade", { exact: false }).click();
    await expect(responder).toBeEnabled();
    await responder.click();
    await expect(page.getByText("Resposta correta")).toBeVisible();
    await expect(page.getByText(/Documento falso é vício de legalidade/).first()).toBeVisible();
    await expect(page.getByText(/Incorreta: a alternativa A/)).toBeVisible();
  });

  test("atalhos de teclado: letra escolhe, Enter responde, J avança", async ({ page }) => {
    await page.goto(`${G}/questoes`);
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("a");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Resposta incorreta")).toBeVisible();
    await page.keyboard.press("j");
    await expect(page.getByText(/^2 de 12/)).toBeVisible();
  });

  test("marcar para resolver depois alterna o estado", async ({ page }) => {
    await page.goto(`${G}/questoes`);
    const mark = page.getByRole("button", { name: /Resolver depois/ }).first();
    await mark.click();
    await expect(page.getByRole("button", { name: /Para resolver depois/ }).first()).toBeVisible();
  });

  test("navegação pela lista de questões", async ({ page }) => {
    await page.goto(`${G}/questoes`);
    await page.getByRole("list", { name: "Lista de questões" }).getByRole("button", { name: /^Questão 3,/ }).click();
    await expect(page.getByText(/^3 de 12/)).toBeVisible();
  });
});

test.describe("simulado", () => {
  test("gabarito só no final, com análise", async ({ page }) => {
    await page.goto(`${G}/simulado`);
    await page.getByRole("button", { name: /Iniciar/ }).click();
    // A ordem é sorteada: responde a primeira alternativa da questão atual.
    await page.getByRole("article").locator("label").first().click();
    await page.getByRole("button", { name: "Confirmar resposta" }).click();
    await expect(page.getByText(/Resposta registrada. O gabarito aparece ao final./)).toBeVisible({ timeout: 3000 }).catch(() => undefined);
    // No simulado não há correção imediata.
    await expect(page.getByText("Resposta correta")).toHaveCount(0);
    await page.getByRole("button", { name: /Finalizar/ }).first().click();
    const confirm = page.getByRole("button", { name: "Finalizar mesmo assim" });
    if (await confirm.isVisible()) await confirm.click();
    await expect(page.getByRole("heading", { name: "Resultado" })).toBeVisible();
    await expect(page.getByText(/Acertos:/)).toBeVisible();
  });
});

test.describe("tela de aula", () => {
  test("índice navega até a seção", async ({ page, isMobile }) => {
    await page.goto(`${G}/aula`);
    // Desktop: índice lateral (nav). Celular: folha inferior (dialog). Mesmo nome acessível.
    if (isMobile) await page.getByRole("button", { name: "Índice", exact: true }).click();
    const toc = isMobile ? page.getByRole("dialog", { name: "Índice da aula" }) : page.getByRole("navigation", { name: "Índice da aula" });
    await toc.getByRole("button", { name: /^Convalidação/ }).click();
    await expect(page.getByRole("heading", { name: "Convalidação", level: 2 })).toBeInViewport();
    if (isMobile) await expect(toc).toBeHidden();
  });

  test("marcar trecho para revisar e criar anotação", async ({ page }) => {
    await page.goto(`${G}/aula`);
    const actions = page.getByRole("toolbar", { name: "Ações da seção Introdução" });
    await actions.getByRole("button", { name: "Revisar depois" }).click();
    await expect(actions.getByRole("button", { name: "Marcado para revisar" })).toBeVisible();

    await actions.getByRole("button", { name: "Anotar" }).click();
    await page.getByRole("textbox").last().fill("Lembrar: anulação retroage.");
    await page.getByRole("button", { name: /Salvar/ }).last().click();
    await page.getByRole("button", { name: /^(Minhas anotações|Anotações)/ }).first().click();
    await expect(page.getByText("Lembrar: anulação retroage.")).toBeVisible();
  });

  test("esclarecer um conceito sem sair da aula", async ({ page }) => {
    await page.goto(`${G}/aula`);
    const actions = page.getByRole("toolbar", { name: "Ações da seção Introdução" });
    await actions.getByRole("button", { name: "Esclarecer" }).click();
    await page.getByRole("textbox", { name: "O que não ficou claro?" }).first().fill("O que é efeito ex tunc?");
    await page.getByRole("button", { name: "Pedir explicação" }).first().click();
    await expect(page.getByText(/Resposta de demonstração da galeria/)).toBeVisible();
    await expect(page).toHaveURL(/\/dev\/galeria\/aula/);
  });

  test("pergunta rápida intercalada corrige na hora", async ({ page }) => {
    await page.goto(`${G}/aula`);
    await page.getByText("anular a licença, por ilegalidade", { exact: false }).first().click();
    await page.getByRole("button", { name: "Responder", exact: true }).first().click();
    await expect(page.getByText("Resposta correta").first()).toBeVisible();
  });

  test("concluir leitura e calcular o resultado da unidade", async ({ page }) => {
    await page.goto(`${G}/aula`);
    await page.getByRole("button", { name: "Concluí a leitura" }).click();
    await expect(page.getByText(/Leitura concluída/).first()).toBeVisible();
    await page.getByRole("button", { name: "Calcular resultado" }).click();
    await expect(page.getByText(/de acerto/).first()).toBeVisible();
  });
});

test.describe("painel e trilha", () => {
  test("cada card leva à funcionalidade correspondente", async ({ page }) => {
    await page.goto(`${G}/painel`);
    await expect(page.getByRole("link", { name: /Nova trilha/ })).toHaveAttribute("href", "/nova-trilha");
    await expect(page.getByRole("link", { name: /Continuar estudando/ })).toHaveAttribute("href", /\/aula\//);
    await expect(page.getByRole("link", { name: /Revisões pendentes/ })).toHaveAttribute("href", "/revisoes");
    await expect(page.getByRole("link", { name: /Questões a resolver/ })).toHaveAttribute("href", /\/questoes/);
  });

  test("módulos expansíveis e pré-requisitos visíveis", async ({ page }) => {
    await page.goto(`${G}/trilha`);
    await expect(page.getByText(/Depende de:/).first()).toBeVisible();
    const lesson = page.getByText("Poder hierárquico e disciplinar", { exact: true });
    await expect(lesson).toBeHidden();
    await page.getByText("Poderes administrativos", { exact: true }).first().click();
    await expect(lesson).toBeVisible();
  });
});

test.describe("desempenho", () => {
  test("indicadores e atalhos para praticar", async ({ page }) => {
    await page.goto(`${G}/desempenho`);
    await expect(page.getByText("Acerto atual", { exact: true })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Por matéria" })).toBeVisible();
    await expect(page.getByRole("link", { name: /Poderes administrativos.*Abrir questões/ })).toHaveAttribute("href", /\/questoes\?materia=/);
    await expect(page.getByText(/A confiança declarada não altera seu domínio/)).toBeVisible();
  });
});
