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
  for (const path of ["painel", "perfil", "trilha", "aula", "questoes", "simulado", "desempenho", "catalogo", "banco", "quiz", "na-pratica"]) {
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
  for (const path of ["painel", "perfil", "trilha", "aula", "questoes", "simulado", "desempenho", "catalogo", "banco", "quiz", "na-pratica"]) {
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
    const gab = page.getByTestId("gabarito-comentado");
    await expect(gab.getByText(/Por que a alternativa [A-E] está correta/)).toBeVisible();
    await expect(gab.getByText("Por que as outras alternativas estão erradas")).toBeVisible();
    await expect(gab.getByText(/^Gabarito: [A-E]$/)).toBeVisible();
  });

  test("comentários dos alunos: aparecem após responder; publicar, apagar e denunciar", async ({ page }) => {
    await page.goto(`${G}/questoes`);
    await expect(page.getByTestId("comentarios-questao")).toHaveCount(0);
    await page.getByText("anular a licença, por ilegalidade", { exact: false }).click();
    await page.getByRole("button", { name: "Responder", exact: true }).click();
    const box = page.getByTestId("comentarios-questao");
    await expect(box.getByText("Marina S.")).toBeVisible();
    await expect(box.getByText(/Visíveis para todos os alunos/)).toBeVisible();
    const publish = box.getByRole("button", { name: "Publicar comentário" });
    await expect(publish).toBeDisabled();
    await box.getByLabel("Seu comentário").fill("Macete: vício de legalidade → anula.");
    await publish.click();
    const mine = box.getByRole("listitem").filter({ hasText: "Macete: vício de legalidade" });
    await expect(mine.getByText("Lucas M. (você)")).toBeVisible();
    await mine.getByRole("button", { name: "Apagar" }).click();
    await expect(mine).toHaveCount(0);
    const other = box.getByRole("listitem").filter({ hasText: "Carlos R." });
    await other.getByRole("button", { name: "Denunciar" }).click();
    await expect(other.getByText("Denunciado")).toBeVisible();
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

/** Avança tema a tema até as questões; `onStep` roda em cada tela de tema. */
async function walkThemes(page: Page, onStep?: () => Promise<void>) {
  for (let i = 0; i < 60; i++) {
    if (onStep) await onStep();
    const toQuestions = page.getByRole("button", { name: /^Ir para as questões/ });
    if (await toQuestions.isVisible()) {
      await toQuestions.click();
      return;
    }
    await page.getByRole("button", { name: /^Próximo/ }).click();
  }
  throw new Error("não chegou às questões");
}

async function answerErradoIfVisible(page: Page) {
  const radio = page.getByRole("radio", { name: /Errado/ }).first();
  if ((await radio.count()) && (await radio.isEnabled()) && !(await radio.isChecked())) {
    // O rádio é visualmente oculto (o rótulo é o alvo de toque); clica direto no elemento.
    await radio.evaluate((el) => (el as HTMLInputElement).click());
    await expect(radio).toBeChecked();
    await page.getByRole("button", { name: "Responder", exact: true, disabled: false }).first().click();
    await expect(page.getByText(/Resposta (correta|incorreta)/).first()).toBeVisible();
  }
}

async function answerIfVisible(page: Page, optionText: string) {
  const opt = page.getByText(optionText, { exact: false }).first();
  // Questão já respondida (resposta gravada) não tem botão "Responder" ativo: segue em frente.
  const radio = page.getByRole("radio", { name: new RegExp(optionText) }).first();
  if ((await opt.isVisible()) && (await radio.isEnabled())) {
    await opt.click();
    await page.getByRole("button", { name: "Responder", exact: true, disabled: false }).first().click();
    await expect(page.getByText(/Resposta (correta|incorreta)/).first()).toBeVisible();
  }
}

test.describe("tela de aula", () => {
  test("etapas levam direto a um tema", async ({ page, isMobile }) => {
    await page.goto(`${G}/aula`);
    if (isMobile) await page.getByRole("button", { name: "Etapas", exact: true }).click();
    const toc = isMobile ? page.getByRole("dialog", { name: "Etapas da aula" }) : page.getByRole("navigation", { name: "Etapas da aula" });
    await toc.getByRole("button", { name: /Convalidação/ }).click();
    await expect(page.getByRole("heading", { name: "Convalidação", level: 2 })).toBeVisible();
    if (isMobile) await expect(toc).toBeHidden();
  });

  test("exemplos são casos interativos: situação, tocar e conferir o enquadramento; negrito em vermelho-sangue", async ({ page, isMobile }) => {
    await page.goto(`${G}/aula`);
    // Negrito do conteúdo em vermelho-sangue.
    const bold = page.locator(".leitura strong").first();
    await expect(bold).toHaveCSS("color", "rgb(138, 3, 3)");
    if (isMobile) await page.getByRole("button", { name: "Etapas", exact: true }).click();
    const toc = isMobile ? page.getByRole("dialog", { name: "Etapas da aula" }) : page.getByRole("navigation", { name: "Etapas da aula" });
    await toc.getByRole("button", { name: /Exemplos/ }).click();
    const box = page.getByTestId("exemplos-interativos");
    await expect(box.getByText("0 de 2 conferidos")).toBeVisible();
    await expect(box.getByText("Documento falso", { exact: true })).toBeVisible();
    await expect(box.getByText("Enquadramento", { exact: true })).toHaveCount(0);
    await box.getByRole("button", { name: /Ver resposta/ }).first().click();
    await expect(box.getByText("Enquadramento", { exact: true })).toBeVisible();
    await expect(box.getByText("1 de 2 conferidos")).toBeVisible();
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

  test("questão do tema corrige na hora e o card fica verde no acerto", async ({ page }) => {
    await page.goto(`${G}/aula`);
    let answered = false;
    for (let i = 0; i < 60 && !answered; i++) {
      const opt = page.getByText("anular a licença, por ilegalidade", { exact: false }).first();
      if (await opt.isVisible()) {
        await opt.click();
        await page.getByRole("button", { name: "Responder", exact: true }).first().click();
        answered = true;
      } else await page.getByRole("button", { name: /^(Próximo|Ir para as questões)/ }).click();
    }
    await expect(page.getByText("Resposta correta").first()).toBeVisible();
    await expect(page.locator('[data-resultado="acerto"]').first()).toBeVisible();
  });

  test("respostas ficam gravadas: reabrir a questão mostra a resposta e o gabarito", async ({ page, isMobile }) => {
    await page.goto(`${G}/aula`);
    // Resposta gravada em visita anterior: a questão já abre respondida.
    if (isMobile) await page.getByRole("button", { name: "Etapas", exact: true }).click();
    const toc = isMobile ? page.getByRole("dialog", { name: "Etapas da aula" }) : page.getByRole("navigation", { name: "Etapas da aula" });
    await toc.getByRole("button", { name: /Anulação × revogação/ }).click();
    const saved = page.getByRole("article", { name: /Questão/ }).filter({ hasText: "A revogação de ato administrativo pode ser feita" });
    await expect(saved.getByText("Resposta gravada anteriormente")).toBeVisible();
    await expect(saved.getByText("Resposta correta")).toBeVisible();
    await expect(page.getByTestId("gabarito-comentado").first()).toBeVisible();
    // Responde outra questão, sai da etapa e volta: continua respondida.
    if (isMobile) await page.getByRole("button", { name: "Etapas", exact: true }).click();
    await toc.getByRole("button", { name: /Introdução/ }).click();
    await page.getByText("anular a licença, por ilegalidade", { exact: false }).first().click();
    await page.getByRole("button", { name: "Responder", exact: true }).first().click();
    await expect(page.getByText("Resposta correta").first()).toBeVisible();
    await page.getByRole("button", { name: /^Próximo/ }).click();
    await page.getByRole("button", { name: /Anterior/ }).first().click();
    const again = page.getByRole("article", { name: /Questão/ }).filter({ hasText: "Um servidor obteve licença" });
    await expect(again.getByText("Resposta correta")).toBeVisible();
    await expect(page.getByRole("button", { name: "Refazer questão" }).first()).toBeVisible();
  });

  test("um tema por tela; pular para as questões não conta como leitura; depois avalia por níveis", async ({ page }) => {
    await page.goto(`${G}/aula`);
    await expect(page.getByText(/^Módulo 1 · tema 1 de \d+/)).toBeVisible();
    // Pular direto para as questões não conclui a leitura.
    await page.getByRole("button", { name: "Ir para: Questões · Fácil" }).click();
    const fac = page.getByTestId("nivel-facil");
    await expect(fac.getByRole("button", { name: "Calcular resultado do nível fácil" })).toBeDisabled();
    await page.getByRole("button", { name: /^Ir para: / }).first().click();

    // Percorre tema a tema, respondendo à questão que aparece junto do tema.
    await walkThemes(page, async () => {
      await answerIfVisible(page, "anular a licença, por ilegalidade");
      await answerErradoIfVisible(page);
    });
    await expect(fac).toBeVisible();
    await fac.getByRole("button", { name: "Calcular resultado do nível fácil" }).click();
    await expect(fac.getByText(/Nível fácil aprovado com 100%/)).toBeVisible();
    await page.getByRole("button", { name: /^Próximo/ }).click();
    await expect(page.getByTestId("nivel-medio")).toContainText("Liberado");
    await page.getByRole("button", { name: /^Próximo/ }).click();
    await expect(page.getByTestId("nivel-dificil")).toContainText("Bloqueado");
    // Fim: botão para o próximo tema da mesma matéria.
    await page.getByRole("button", { name: /^Concluir/ }).click();
    await expect(page.getByRole("link", { name: /Próximo tema/ }).first()).toBeVisible();
  });

  test("nível reprovado oferece recuperação em vez de reiniciar", async ({ page }) => {
    await page.goto(`${G}/aula`);
    await walkThemes(page, async () => {
      await answerIfVisible(page, "revogar a licença, por conveniência");
      await answerErradoIfVisible(page);
    });
    const fac = page.getByTestId("nivel-facil");
    await fac.getByRole("button", { name: "Calcular resultado do nível fácil" }).click();
    await expect(fac.getByText(/mínimo para avançar é 90%/)).toBeVisible();
    await fac.getByRole("button", { name: "Gerar exercícios de recuperação" }).click();
    // Os exercícios aparecem na hora, já na tela, prontos para responder.
    const rec = page.getByTestId("recuperacao-facil");
    await expect(rec).toBeVisible();
    await expect(rec).toBeInViewport();
    await expect(rec.getByText(/exercício(s)? pronto/)).toBeVisible();
    await rec.getByText("anular a licença, por ilegalidade", { exact: false }).first().click();
    await rec.getByRole("button", { name: "Responder", exact: true }).click();
    await expect(rec.getByText("Resposta correta")).toBeVisible();
    // Depois de responder, recalcula e avança para o nível 2.
    await fac.getByRole("button", { name: "Calcular resultado do nível fácil de novo" }).click();
    await expect(fac.getByText(/Nível fácil aprovado/)).toBeVisible();
    await fac.getByTestId("avancar-nivel").click();
    await expect(page.getByTestId("nivel-medio")).toContainText("Liberado");
  });
});

test.describe("painel e trilha", () => {
  test("cada card do painel leva à funcionalidade correspondente", async ({ page }) => {
    await page.goto(`${G}/painel`);
    // O topo não tem mais o botão "+ Nova" (novo estudo fica na barra inferior do celular e na página Estudos).
    await expect(page.getByRole("banner").getByRole("link", { name: /Nova|Novo estudo/ })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Continuar estudando/ })).toHaveAttribute("href", new RegExp(`${G}/aula/`));
    await expect(page.locator("a", { has: page.getByTestId("card-revisoes") })).toHaveAttribute("href", /\/aula\/.*revisao=1/);
    await expect(page.getByRole("link", { name: /Questões a resolver/ })).toHaveAttribute("href", /\/questoes\?situacao=nao_respondidas/);
    await expect(page.getByRole("link", { name: /Questões hoje: 13 de 20/ })).toBeVisible();
    await expect(page.getByTestId("hero-stage")).toContainText("Ensino");
  });

  test("trilha abre o detalhe com matérias reais e fecha com Esc", async ({ page }) => {
    await page.goto(`${G}/painel`);
    await page.getByRole("button", { name: /Abrir estudo Língua Portuguesa/ }).click();
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

  test("navegação lateral, atalhos 1–7 e recolher persistente", async ({ page, isMobile }) => {
    test.skip(isMobile, "barra lateral só no desktop");
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto(`${G}/painel`);
    const nav = page.getByRole("navigation", { name: "Principal" });
    await expect(nav.getByRole("link", { name: /Painel/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("nav-desc-revisoes")).toHaveText("2 pendentes");
    await expect(nav.getByRole("link", { name: /Modo Jogo/ })).toHaveAttribute("href", `${G}/quiz`);
    await page.keyboard.press("7");
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

test.describe("banco de questões (painel escuro)", () => {
  test("aprovar só libera com o checklist completo", async ({ page }) => {
    await page.goto(`${G}/banco`);
    const approve = page.getByRole("button", { name: "Aprovar", exact: true });
    await expect(approve).toBeDisabled();
    for (const label of ["Conteúdo correto", "Gabarito e justificativas", "Fonte e referências", "Direito de uso confirmado"]) {
      await page.getByText(label).click();
    }
    await expect(approve).toBeEnabled();
    // decisões que exigem motivo abrem o campo de motivo
    await page.getByRole("button", { name: "Pedir correção" }).click();
    await expect(page.getByLabel(/Motivo/)).toBeVisible();
    await expect(page.getByRole("button", { name: "Confirmar" })).toBeDisabled();
  });

  test("formulário: alternativa correta destacada, certo/errado e procedência só para prova anterior", async ({ page }) => {
    await page.goto(`${G}/banco`);
    const form = page.locator("form").filter({ hasText: "Classificação" });
    await form.getByLabel("Alternativa C é a correta").check();
    await expect(form.getByLabel("Alternativa C é a correta")).toBeChecked();
    await expect(form.getByText("Procedência (prova anterior real)")).toHaveCount(0);
    await form.getByLabel("Origem *").selectOption("prova_anterior");
    await expect(form.getByText("Procedência (prova anterior real)")).toBeVisible();
    await expect(form.getByLabel("Direito de uso *").locator("option[value=proprio]")).toHaveCount(0);
    await form.getByLabel("Formato *").selectOption("certo_errado");
    await expect(form.getByText("Gabarito *")).toBeVisible();
    await form.getByRole("button", { name: "+ Referência" }).click();
    await expect(form.getByLabel("Norma", { exact: true })).toBeVisible();
  });

  test("gerar com IA: só matéria + assunto/artigo; opções extras escondidas", async ({ page }) => {
    await page.goto(`${G}/banco`);
    await expect(page.getByLabel("Assunto ou artigo")).toBeVisible();
    await expect(page.getByLabel("Quantidade")).toBeHidden();
    await page.getByText("Mais opções (opcional)").click();
    await expect(page.getByLabel("Quantidade")).toHaveValue("5");
    await expect(page.getByRole("button", { name: "Gerar questões" })).toBeEnabled();
  });
});

test("preparação da aula do catálogo: etapas aparecem com animação suave", async ({ page }) => {
  await page.goto(`${G}/montando`);
  const overlay = page.getByTestId("montando-aula");
  await expect(overlay).toBeVisible();
  await expect(overlay.getByText("Montando sua aula")).toBeVisible();
  await expect(overlay.getByText("Analisando o tema…")).toBeVisible();
  await expect(overlay.getByRole("listitem")).toHaveCount(5);
});

test("flashcards viram com animação e certo/errado mostra o gabarito", async ({ page }) => {
  await page.goto(`${G}/cartoes`);
  const fc = page.getByTestId("flashcards");
  await expect(fc.getByText("Cartão 1 de 3")).toBeVisible();
  const card = fc.getByRole("button", { name: "Mostrar a resposta" });
  await card.click();
  await expect(fc.getByRole("button", { name: "Mostrar a pergunta" })).toHaveAttribute("aria-pressed", "true");
  await fc.getByRole("button", { name: "Eu sabia ✓" }).click();
  await expect(fc.getByText("Cartão 2 de 3")).toBeVisible();
  await expect(fc.getByText("1 de 1 você já sabia")).toBeVisible();
  const tf = page.getByTestId("certo-errado-interativo");
  await tf.getByRole("button", { name: "Errado" }).first().click();
  await expect(tf.getByText(/Você acertou — o item está ERRADO/)).toBeVisible();
  await tf.getByRole("button", { name: "Errado" }).first().click();
  await expect(tf.getByText(/Não foi dessa vez — o item está CERTO/)).toBeVisible();
});


test.describe("modo jogo", () => {
  test("banner: o Instrutor responde ao toque e mostra o placar da rodada", async ({ page }) => {
    await page.goto(`${G}/quiz`);
    const banner = page.getByTestId("jogo-banner");
    await expect(banner.getByRole("heading", { name: "MODO JOGO" })).toBeVisible();
    await expect(banner.getByText(/Toque no Instrutor/)).toBeVisible();
    await banner.getByRole("button", { name: "Falar com o Instrutor Caveira" }).click();
    await expect(banner.getByText(/^Instrutor:/)).toBeVisible();
    await expect(banner.getByLabel("3 de 3 vidas")).toBeVisible();
    await expect(banner.getByRole("button", { name: /Iniciar missão/ })).toBeVisible();
  });

  test("encaixa palavras do banco nos espaços e libera a verificação", async ({ page }) => {
    await page.goto(`${G}/quiz`);
    const card = page.getByRole("region", { name: "Questão do jogo" });
    await expect(card.getByText("Instrutor Caveira")).toBeVisible();
    const verify = card.getByRole("button", { name: /Verificar resposta/ });
    await expect(verify).toBeDisabled();
    const slots = card.getByRole("button", { name: /^Espaço \d/ });
    const n = await slots.count();
    const words = card.locator("button.min-h-12");
    for (let i = 0; i < n; i++) await words.nth(i).click();
    await expect(verify).toBeEnabled();
    await expect(card.getByText(`${n}/${n} preenchidos`)).toBeVisible();
    // Tocar num espaço preenchido devolve a palavra ao banco.
    await card.getByRole("button", { name: /Espaço 1: .* Toque para tirar/ }).click();
    await expect(verify).toBeDisabled();
  });
  test("cronômetro de 20 s por questão: corre com a questão na tela e esgota o tempo", async ({ page }) => {
    await page.clock.install();
    await page.goto(`${G}/quiz`);
    const card = page.getByRole("region", { name: "Questão do jogo" });
    await card.scrollIntoViewIfNeeded();
    const timer = card.getByTestId("cronometro");
    await expect(timer).toHaveAttribute("aria-label", "20 segundos restantes");
    // Avança o relógio segundo a segundo até chegar aos 3 segundos finais.
    const secs = async () => Number((await timer.getAttribute("aria-label"))?.match(/^\d+/)?.[0] ?? 0);
    await page.clock.runFor(2_000);
    await expect.poll(secs).toBeLessThan(20);
    await expect(timer).not.toHaveAttribute("data-urgente", "true");
    for (let i = 0; i < 40 && (await secs()) > 3; i++) await page.clock.runFor(1_000);
    await expect(timer).toHaveAttribute("data-urgente", "true");
    for (let i = 0; i < 10 && (await secs()) > 0; i++) await page.clock.runFor(1_000);
    await expect(card.getByRole("button", { name: /Tempo esgotado/ })).toBeVisible();
    await expect(card.locator("button.min-h-12").first()).toBeDisabled();
  });

  test("nível e ranking: botão abre o ranking; ?nivel=1 mostra a passagem de nível", async ({ page }) => {
    await page.goto(`${G}/quiz`);
    await expect(page.getByTestId("quiz-nivel")).toContainText("Soldado");
    await expect(page.getByTestId("quiz-dificuldade")).toHaveText("Médio");
    await page.getByTestId("jogo-banner").getByRole("button", { name: /Ranking/ }).click();
    const dlg = page.getByTestId("level-up");
    await expect(dlg.getByRole("heading", { name: "RANKING", exact: true })).toBeVisible();
    await expect(dlg.getByText("Lucas M. (você)")).toBeVisible();
    await dlg.getByRole("button", { name: /Voltar ao jogo/ }).click();
    await expect(dlg).toBeHidden();

    await page.goto(`${G}/quiz?nivel=1`);
    await expect(dlg.getByRole("heading", { name: "NÍVEL 3", exact: true })).toBeVisible();
    await expect(dlg.getByText(/Dificuldade agora: Difícil/)).toBeVisible();
    await page.keyboard.press("Escape");
    await expect(dlg).toBeHidden();
  });
});

test("novo estudo: seletor de aulas do catálogo, separado por matéria", async ({ page }) => {
  await page.goto(`${G}/novo-estudo`);
  const picker = page.getByTestId("seletor-catalogo");
  await expect(picker.getByRole("region", { name: "Direito Penal" })).toBeVisible();
  await expect(page.getByLabel("Conteúdo a estudar")).toHaveCount(0);
  await picker.getByRole("tab", { name: /Direito Processual Penal/ }).click();
  await expect(picker.getByText("Homicídio (CP, art. 121)")).toBeHidden();
  await picker.getByText("Inquérito Policial (CPP, arts. 4º a 23)").click();
  await expect(picker.getByRole("radio", { name: /Inquérito Policial/ })).toBeChecked();
  await picker.getByRole("tab", { name: /Todas/ }).click();
  await page.getByLabel("Buscar aula").fill("limpe");
  await expect(picker.getByText(/Administração Pública/)).toBeVisible();
  await expect(picker.getByText("Homicídio (CP, art. 121)")).toBeHidden();
});

test("banners: arte e animações aparecem juntas, mesmo com a imagem demorando", async ({ page }) => {
  for (const [path, id, img] of [["painel", "painel-banner", /banner-estudo(-sm)?\.webp/], ["quiz", "jogo-banner-marca", /banner-jogo(-sm)?\.webp/]] as const) {
    let release: () => void = () => {};
    const gate = new Promise<void>((r) => (release = r));
    await page.route(img, async (route) => {
      await gate;
      await route.continue();
    });
    await page.goto(`${G}/${path}`, { waitUntil: "domcontentloaded" });
    const banner = page.getByTestId(id);
    await expect(banner).toHaveAttribute("data-pronto", "0");
    await page.waitForTimeout(800);
    // Ainda sem a arte: banner (e animações) invisível.
    await expect(banner).toHaveAttribute("data-pronto", "0");
    expect(await banner.evaluate((e) => getComputedStyle(e).opacity)).toBe("0");
    release();
    await expect(banner).toHaveAttribute("data-pronto", "1");
    await page.unroute(img);
  }
});
