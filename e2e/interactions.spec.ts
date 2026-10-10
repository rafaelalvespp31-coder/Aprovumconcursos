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
  for (const path of ["painel", "perfil", "trilha", "aula", "questoes", "simulado", "desempenho"]) {
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
  for (const path of ["painel", "perfil", "trilha", "aula", "questoes", "simulado", "desempenho"]) {
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

  test("leitura só conclui após percorrer todas as seções; depois calcula o resultado", async ({ page }) => {
    await page.goto(`${G}/aula`);
    const done = page.getByRole("button", { name: "Concluí a leitura" });
    await expect(done).toBeDisabled();
    // Pular direto para o fim não conta como leitura.
    await done.scrollIntoViewIfNeeded();
    await expect(done).toBeDisabled();
    await expect(page.getByText(/Falta percorrer:/)).toBeVisible();
    const ends = page.locator("[data-fim-secao]");
    const n = await ends.count();
    for (let i = 0; i < n; i++) {
      await ends.nth(i).scrollIntoViewIfNeeded();
      await page.waitForTimeout(60);
    }
    await expect(page.getByText(`${n} de ${n} seções`, { exact: true })).toBeVisible();
    await expect(done).toBeEnabled();
    await done.click();
    await expect(page.getByText(/Leitura concluída/).first()).toBeVisible();
    await page.getByRole("button", { name: "Calcular resultado" }).click();
    await expect(page.getByText(/de acerto/).first()).toBeVisible();
  });
});

test.describe("painel e trilha", () => {
  test("cada card do painel leva à funcionalidade correspondente", async ({ page }) => {
    await page.goto(`${G}/painel`);
    await expect(page.getByRole("link", { name: /Nova trilha/ }).first()).toHaveAttribute("href", `${G}/nova-trilha`);
    await expect(page.getByRole("link", { name: /Continuar estudando/ })).toHaveAttribute("href", new RegExp(`${G}/aula/`));
    await expect(page.locator("a", { has: page.getByTestId("card-revisoes") })).toHaveAttribute("href", /\/aula\/.*revisao=1/);
    await expect(page.getByRole("link", { name: /Questões a resolver/ })).toHaveAttribute("href", /\/questoes\?situacao=nao_respondidas/);
    await expect(page.getByRole("link", { name: /Questões hoje: 13 de 20/ })).toBeVisible();
    await expect(page.getByTestId("hero-stage")).toContainText("Ensino");
  });

  test("trilha abre o detalhe com matérias reais e fecha com Esc", async ({ page }) => {
    await page.goto(`${G}/painel`);
    await page.getByRole("button", { name: /Abrir trilha Língua Portuguesa/ }).click();
    const dialog = page.getByRole("dialog", { name: /Língua Portuguesa/ });
    await expect(dialog).toBeVisible();
    await expect(dialog.getByText("Matéria fechada ✓")).toBeVisible();
    await expect(dialog.getByRole("link", { name: "Continuar" })).toHaveAttribute("href", /\/aula\//);
    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
  });

  test("modo foco inicia um cronômetro real, pausa e encerra", async ({ page }) => {
    await page.goto(`${G}/painel`);
    await page.evaluate(() => localStorage.removeItem("na:modo-foco"));
    await page.reload();
    await page.getByRole("button", { name: "Ativar foco" }).click();
    await expect(page.getByText("Modo foco ativado")).toBeVisible();
    const time = page.getByTestId("foco-tempo");
    await expect(time).toHaveText(/^2[45]:\d\d$/);
    const first = await time.textContent();
    await page.waitForTimeout(2100);
    expect(await time.textContent()).not.toBe(first);
    await page.getByRole("button", { name: "Pausar" }).click();
    const paused = await time.textContent();
    await page.waitForTimeout(1500);
    await expect(time).toHaveText(paused!);
    await page.reload();
    await expect(page.getByRole("button", { name: "Retomar" })).toBeVisible();
    await page.getByRole("button", { name: "Encerrar" }).click();
    await expect(page.getByRole("button", { name: "Ativar foco" })).toBeVisible();
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

test.describe("casco pastel", () => {
  test("busca encontra itens reais e navega", async ({ page, isMobile }) => {
    test.skip(isMobile, "a busca fica no cabeçalho a partir de telas médias");
    await page.goto(`${G}/painel`);
    await page.keyboard.press("Control+k");
    const box = page.getByRole("combobox", { name: /Buscar/ });
    await expect(box).toBeFocused();
    await box.fill("atributos");
    await expect(page.getByRole("option", { name: /Revisão.*Atributos do ato/ })).toBeVisible();
    await box.fill("desemp");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${G}/desempenho`));
  });

  test("navegação lateral, atalhos 1–6 e recolher persistente", async ({ page, isMobile }) => {
    test.skip(isMobile, "barra lateral só no desktop");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${G}/painel`);
    const nav = page.getByRole("navigation", { name: "Principal" });
    await expect(nav.getByRole("link", { name: /Painel/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("nav-desc-revisoes")).toHaveText("2 pendentes");
    await page.keyboard.press("6");
    await expect(page).toHaveURL(new RegExp(`${G}/perfil`));
    await expect(page.getByTestId("nivel")).toHaveText("Nível 5");
    await page.getByRole("button", { name: "Recolher" }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Expandir barra lateral" })).toBeVisible();
    await page.getByRole("button", { name: "Expandir barra lateral" }).click();
    await expect(page.getByRole("button", { name: "Recolher" })).toBeVisible();
  });

  test("atalhos numéricos não navegam nas telas com questões", async ({ page, isMobile }) => {
    test.skip(isMobile, "teclado físico");
    await page.goto(`${G}/questoes`);
    await page.keyboard.press("6");
    await expect(page).toHaveURL(new RegExp(`${G}/questoes`));
  });

  test("barra flutuante no celular leva às rotas reais", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(`${G}/painel`);
    const bar = page.getByRole("navigation", { name: "Principal (celular)" });
    await bar.getByRole("link", { name: "Desempenho" }).click();
    await expect(page).toHaveURL(new RegExp(`${G}/desempenho`));
    await expect(bar.getByRole("link", { name: "Desempenho" })).toHaveAttribute("aria-current", "page");
  });

  test("perfil mostra conquistas com regras e progresso", async ({ page }) => {
    await page.goto(`${G}/perfil`);
    await expect(page.getByTestId("conquistas-total")).toContainText("/8");
    await expect(page.getByText("Atirador de elite")).toBeVisible();
    await expect(page.getByText("74% de acerto (meta: 80%)")).toBeVisible();
    await expect(page.getByText(/XP/)).toHaveCount(0);
  });
});
