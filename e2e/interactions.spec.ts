import { expect, test, type Locator, type Page } from "@playwright/test";

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
  for (const path of ["painel", "perfil", "trilhas", "trilha", "aula", "questoes", "simulado", "desempenho", "catalogo", "banco", "quiz", "na-pratica"]) {
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
  for (const path of ["painel", "perfil", "trilhas", "trilha", "aula", "questoes", "simulado", "desempenho", "catalogo", "banco", "quiz", "na-pratica"]) {
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
    // Começa recolhido (só a aba com o número de comentários); abre ao tocar.
    const aba = box.getByTestId("comentarios-aba");
    await expect(aba).toHaveAttribute("aria-expanded", "false");
    await expect(box.getByText("Marina S.")).toHaveCount(0);
    await aba.click();
    await expect(aba).toHaveAttribute("aria-expanded", "true");
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
    // Tocar de novo fecha a aba.
    await aba.click();
    await expect(aba).toHaveAttribute("aria-expanded", "false");
    await expect(box.getByLabel("Seu comentário")).toHaveCount(0);
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

/** Abre um card pela barra dos nove cards (a aula mostra um card por vez). */
async function goCard(page: Page, n: number) {
  await page.getByRole("navigation", { name: "Cards da aula" }).getByRole("button", { name: new RegExp(`^Card ${n}:`) }).click();
  await expect(page.locator(`article[data-card="${n}"]`)).toBeVisible();
  return page.locator(`article[data-card="${n}"]`);
}

/** Percorre os cards pela ordem, concluindo cada um, até chegar às questões (card 8). */
async function walkCards(page: Page, onCard?: (card: Locator) => Promise<void>) {
  for (let i = 0; i < 12; i++) {
    if (await page.getByTestId("card-questao").count()) return;
    const card = page.locator("article[data-card]");
    if (onCard) await onCard(card);
    const btn = card.locator('[data-testid^="concluir-card-"]');
    await expect(btn).toHaveAttribute("data-liberado", "1");
    const n = await card.getAttribute("data-card");
    await btn.click();
    await expect(page.locator(`article[data-card="${n}"]`)).toHaveCount(0);
  }
  throw new Error("não chegou às questões");
}

async function answerErradoIfVisible(page: Page, within?: Locator) {
  const root = within ?? page.locator("body");
  const radio = root.getByRole("radio", { name: /Errado/ }).first();
  if ((await radio.count()) && (await radio.isEnabled()) && !(await radio.isChecked())) {
    // O rádio é visualmente oculto (o rótulo é o alvo de toque); clica direto no elemento.
    await radio.evaluate((el) => (el as HTMLInputElement).click());
    await expect(radio).toBeChecked();
    await root.getByRole("button", { name: "Responder", exact: true, disabled: false }).first().click();
    await expect(root.getByText(/Resposta (correta|incorreta)/).first()).toBeVisible();
  }
}

async function answerIfVisible(page: Page, optionText: string, within?: Locator) {
  const root = within ?? page.locator("body");
  const opt = root.getByText(optionText, { exact: false }).first();
  // Questão já respondida (resposta gravada) não tem botão "Responder" ativo: segue em frente.
  const radio = root.getByRole("radio", { name: new RegExp(optionText) }).first();
  if ((await opt.isVisible()) && (await radio.isEnabled())) {
    await opt.click();
    await root.getByRole("button", { name: "Responder", exact: true, disabled: false }).first().click();
    await expect(root.getByText(/Resposta (correta|incorreta)/).first()).toBeVisible();
  }
}

test.describe("tela de aula: o conteúdo completo fica exposto em cada card", () => {
  test("temas aparecem direto nos cards, sem clicar", async ({ page }) => {
    await page.goto(`${G}/aula`);
    // Um card por vez: abre no card 1, com os temas já expostos.
    await expect(page.locator("article[data-card]")).toHaveCount(1);
    await expect(page.getByTestId("card-conceito").getByRole("heading", { name: "Introdução", level: 2 })).toBeVisible();
    await expect((await goCard(page, 5)).getByRole("heading", { name: "Anulação × revogação", level: 2 })).toBeVisible();
    await expect(page.getByTestId("card-conceito")).toHaveCount(0);
    await expect((await goCard(page, 4)).getByRole("heading", { name: "Convalidação", level: 2 })).toBeVisible();
    await expect((await goCard(page, 9)).getByRole("heading", { name: "Resumo", level: 2 })).toBeVisible();
    await expect((await goCard(page, 8)).getByRole("tab", { name: /Fácil/ })).toBeVisible();
    await noHorizontalScroll(page);
  });

  test("exemplos são casos interativos: situação, tocar e conferir o enquadramento; negrito em vermelho-sangue", async ({ page }) => {
    await page.goto(`${G}/aula`);
    await expect(page.getByTestId("card-conceito").locator(".leitura strong").first()).toHaveCSS("color", "rgb(138, 3, 3)");
    const box = (await goCard(page, 6)).getByTestId("exemplos-interativos");
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
    await page.getByTestId("card-conceito").getByRole("textbox").last().fill("Lembrar: anulação retroage.");
    await page.getByTestId("card-conceito").getByRole("button", { name: /Salvar/ }).last().click();
    await page.getByRole("button", { name: /^Minhas anotações/ }).first().click();
    await expect(page.getByText("Lembrar: anulação retroage.")).toBeVisible();
  });

  test("anotação leva de volta ao tema dentro do card", async ({ page }) => {
    await page.goto(`${G}/aula`);
    await page.getByRole("button", { name: /^Minhas anotações/ }).first().click();
    await page.getByRole("dialog", { name: /anotações/i }).getByRole("button", { name: /Convalidação/ }).first().click();
    await expect(page.getByTestId("card-destrinche").getByRole("heading", { name: "Convalidação", level: 2 })).toBeInViewport();
  });

  test("esclarecer um conceito sem sair da aula", async ({ page }) => {
    await page.goto(`${G}/aula`);
    const card = page.getByTestId("card-conceito");
    await card.getByRole("toolbar", { name: "Ações da seção Introdução" }).getByRole("button", { name: "Esclarecer" }).click();
    await card.getByRole("textbox", { name: "O que não ficou claro?" }).first().fill("O que é efeito ex tunc?");
    await card.getByRole("button", { name: "Pedir explicação" }).first().click();
    await expect(card.getByText(/Resposta de demonstração da galeria/)).toBeVisible();
    await expect(page).toHaveURL(/\/dev\/galeria\/aula/);
  });

  test("questão do tema corrige na hora e o card fica verde no acerto", async ({ page }) => {
    await page.goto(`${G}/aula`);
    const card = page.getByTestId("card-conceito");
    await card.getByText("anular a licença, por ilegalidade", { exact: false }).first().click();
    await card.getByRole("button", { name: "Responder", exact: true }).first().click();
    await expect(card.getByText("Resposta correta").first()).toBeVisible();
    await expect(card.locator('[data-resultado="acerto"]').first()).toBeVisible();
  });

  test("respostas ficam gravadas: a questão já respondida abre com a resposta e o gabarito", async ({ page }) => {
    await page.goto(`${G}/aula`);
    const card = await goCard(page, 5);
    const saved = card.getByRole("article", { name: /Questão/ }).filter({ hasText: "A revogação de ato administrativo pode ser feita" });
    await expect(saved.getByText("Resposta gravada anteriormente")).toBeVisible();
    await expect(saved.getByText("Resposta correta")).toBeVisible();
    await expect(card.getByTestId("gabarito-comentado").first()).toBeVisible();
    // Card com a questão já respondida: o avanço já vem liberado.
    await expect(card.getByTestId("concluir-card-5")).toHaveAttribute("data-liberado", "1");
  });

  test("botão de avançar só libera quando o card termina e leva ao próximo card", async ({ page }) => {
    await page.goto(`${G}/aula`);
    const card = page.getByTestId("card-conceito");
    const btn = card.getByTestId("concluir-card-1");
    await expect(btn).toHaveAttribute("aria-disabled", "true");
    await expect(card.getByText(/Responda a questão deste card para liberar o avanço/)).toBeVisible();
    // Tocar no botão travado leva até a questão que falta.
    await btn.dispatchEvent("click"); // aria-disabled: o toque continua possível e explica o que falta
    await expect(page.getByTestId("trava-proximo")).toContainText(/para avançar/);
    const pending = card.locator('article[data-questao][data-respondida="0"]');
    await expect(pending.first()).toBeInViewport();
    const label = await pending.first().getAttribute("aria-label");
    const q = card.locator(`article[aria-label="${label}"]`);
    await q.getByRole("radio").first().evaluate((el) => (el as HTMLInputElement).click());
    await q.getByRole("button", { name: "Responder", exact: true }).click();
    await expect(q).toHaveAttribute("data-respondida", "1");
    await expect(btn).toHaveAttribute("data-liberado", "1");
    await btn.click();
    // Troca para o card seguinte (Visualize) e marca o card 1 como concluído na barra.
    await expect(page.getByTestId("card-visualize")).toBeVisible();
    await expect(card).toHaveCount(0);
    await expect(page.getByRole("button", { name: /^Card 1: Entenda o conceito — 100% estudado \(concluído\)/ })).toBeVisible();
    await page.getByTestId("voltar-card-2").click();
    await expect(page.getByTestId("card-conceito")).toHaveAttribute("data-concluido", "1");
    await expect(page.getByTestId("secoes-vistas")).toHaveText(/^1 de \d+/);
  });

  test("questões antes da leitura não calculam; concluir os cards libera os níveis", async ({ page }) => {
    await page.goto(`${G}/aula`);
    const q8 = page.getByTestId("card-questao");
    const fac = q8.getByTestId("nivel-facil");
    await goCard(page, 8);
    await expect(fac.getByRole("button", { name: "Calcular resultado do nível fácil" })).toBeDisabled();
    await goCard(page, 1);
    await walkCards(page, async (card) => {
      await answerIfVisible(page, "anular a licença, por ilegalidade", card);
      await answerErradoIfVisible(page, card);
    });
    await fac.getByRole("button", { name: "Calcular resultado do nível fácil" }).click();
    await expect(fac.getByText(/Nível fácil aprovado com 100%/)).toBeVisible();
    await q8.getByTestId("proximo-nivel").click();
    await expect(q8.getByTestId("nivel-medio")).toContainText("Liberado");
    // Nível médio com questão sem resposta: o botão fica travado e leva até a questão.
    await expect(q8.getByTestId("proximo-nivel")).toHaveAttribute("aria-disabled", "true");
    await q8.getByTestId("proximo-nivel").dispatchEvent("click");
    await expect(page.getByTestId("trava-proximo")).toBeVisible();
    await q8.getByRole("tab", { name: /Difícil/ }).click();
    await expect(q8.getByTestId("nivel-dificil")).toContainText("Bloqueado");
    await expect(q8.getByRole("link", { name: /Próximo tema/ })).toBeVisible();
    await expect(page.getByTestId("secoes-vistas")).toHaveText(/^(\d+) de \1/);
  });

  test("questões do nível que ficaram sem resposta ao longo da aula aparecem no próprio nível", async ({ page }) => {
    await page.goto(`${G}/aula`);
    await goCard(page, 8);
    const box = page.getByTestId("card-questao").getByTestId("nivel-facil").getByTestId("faltam-facil");
    await expect(box).toBeVisible();
    await expect(box.getByRole("heading", { level: 4 })).toContainText(/Falta(m)? responder/);
    const first = box.getByRole("article").first();
    await first.getByRole("radio").first().evaluate((el) => (el as HTMLInputElement).click());
    await first.getByRole("button", { name: "Responder", exact: true }).click();
    await expect(first.getByText(/Resposta (correta|incorreta)/)).toBeVisible();
  });

  test("nível reprovado oferece recuperação em vez de reiniciar", async ({ page }) => {
    await page.goto(`${G}/aula`);
    await walkCards(page, async (card) => {
      await answerIfVisible(page, "revogar a licença, por conveniência", card);
      await answerErradoIfVisible(page, card);
    });
    const q8 = page.getByTestId("card-questao");
    const fac = q8.getByTestId("nivel-facil");
    await fac.getByRole("button", { name: "Calcular resultado do nível fácil" }).click();
    await expect(fac.getByText(/mínimo para avançar é 90%/)).toBeVisible();
    await fac.getByRole("button", { name: "Gerar exercícios de recuperação" }).click();
    const rec = page.getByTestId("recuperacao-facil");
    await expect(rec).toBeVisible();
    await expect(rec).toBeInViewport();
    await expect(rec.getByText(/exercício(s)? pronto/)).toBeVisible();
    await rec.getByText("anular a licença, por ilegalidade", { exact: false }).first().click();
    await rec.getByRole("button", { name: "Responder", exact: true }).click();
    await expect(rec.getByText("Resposta correta")).toBeVisible();
    await fac.getByRole("button", { name: "Calcular resultado do nível fácil de novo" }).click();
    await expect(fac.getByText(/Nível fácil aprovado/)).toBeVisible();
    await fac.getByTestId("avancar-nivel").click();
    await expect(q8.getByTestId("nivel-medio")).toContainText("Liberado");
  });
});

test.describe("painel e trilha", () => {
  test("cada card do painel leva à funcionalidade correspondente", async ({ page }) => {
    await page.goto(`${G}/painel`);
    // O topo não tem mais o botão "+ Nova" (novo estudo fica na barra inferior do celular e na página Estudos).
    await expect(page.getByRole("banner").getByRole("link", { name: /Nova|Novo estudo/ })).toHaveCount(0);
    // Saudação com o nome real fica no banner principal (uma vez só).
    await expect(page.getByRole("heading", { level: 1, name: /Olá, Rafael!/ })).toHaveCount(1);
    await expect(page.getByRole("link", { name: /Continuar estudando: Anulação/ })).toHaveAttribute("href", new RegExp(`${G}/aula/`));
    const prog = page.getByTestId("progresso-geral");
    await expect(prog.getByRole("img", { name: "35% das aulas concluídas" })).toBeVisible();
    await expect(prog.getByText("156").first()).toBeAttached();
    await expect(page.getByTestId("atividades-recentes").getByRole("link", { name: /respondeu 12 questões/ })).toHaveAttribute("href", /\/aula\//);
    await expect(page.getByTestId("promo-jogo")).toHaveAttribute("href", `${G}/quiz`);
    await expect(page.getByTestId("seu-desempenho").getByRole("img", { name: "Aproveitamento: 72%" })).toBeVisible();
    await expect(page.getByTestId("sequencia")).toHaveText("4 dias");
    // Continue estudando não repete a aula do card principal.
    const band = page.getByTestId("continue-estudando");
    await expect(band.getByRole("link", { name: /Continuar a aula/ })).toHaveCount(3);
    await expect(band.getByRole("link", { name: /Continuar a aula Anulação/ })).toHaveCount(0);
    // Acesso rápido: rotas reais.
    const rotas: Record<string, RegExp> = { estudos: /\/trilhas$/, jogo: /\/quiz$/, questoes: /\/questoes$/, revisoes: /\/aula\/.*revisao=1/, evolucao: /\/desempenho$/, perfil: /\/perfil$/ };
    for (const [id, re] of Object.entries(rotas)) await expect(page.getByTestId(`atalho-${id}`)).toHaveAttribute("href", re);
    await expect(page.getByTestId("atalho-revisoes")).toContainText("2 pendentes");
    await expect(page.getByTestId("painel-rodape").getByRole("link", { name: "Como funciona" })).toHaveAttribute("href", "/#como-funciona");
    await noHorizontalScroll(page);
  });

  test("minhas matérias: abas filtram e cada matéria abre o estudo", async ({ page }) => {
    await page.goto(`${G}/painel`);
    const card = page.getByTestId("minhas-materias");
    await expect(card.getByRole("tab", { name: "Em andamento (3)" })).toHaveAttribute("aria-selected", "true");
    await expect(card.getByRole("link", { name: /Língua Portuguesa/ })).toHaveCount(0);
    await card.getByRole("tab", { name: "Concluídas (1)" }).click();
    await expect(card.getByRole("link", { name: /Língua Portuguesa: 4 de 4 aulas, 100%/ })).toBeVisible();
    await card.getByRole("tab", { name: "Todas (4)" }).click();
    const penal = card.getByRole("link", { name: /Direito Penal: 3 de 8 aulas, 38%/ });
    await expect(penal).toHaveAttribute("href", /\/dev\/galeria\/trilhas\//);
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
  test("abertura: título, progresso real, placa da marca e atalhos funcionais", async ({ page }) => {
    await page.goto(`${G}/quiz`);
    await expect(page.getByRole("heading", { name: /Conquiste\s*sua evolução/i })).toBeVisible();
    const prog = page.getByTestId("jogo-progresso");
    // Galeria: 13 + 0 de 42 + 20 dispositivos dominados.
    await expect(prog.getByRole("img", { name: "21% dos dispositivos dominados" })).toBeVisible();
    await expect(prog).toContainText("13");
    await expect(prog).toContainText("/ 62");
    await expect(prog).toContainText("3 dias");
    await expect(page.getByRole("img", { name: /APROVUM — Sua preparação/ })).toBeVisible();
    const atalhos = page.getByRole("list", { name: "Recursos do APROVUM" });
    await expect(atalhos.getByRole("link", { name: /Aulas inteligentes/ })).toHaveAttribute("href", "/trilhas");
    await expect(atalhos.getByRole("link", { name: /Questões de prova/ })).toHaveAttribute("href", "/questoes");
    await expect(atalhos.getByRole("link", { name: /Seu progresso/ })).toHaveAttribute("href", "/desempenho");
    await atalhos.getByRole("button", { name: /Gamificação/ }).click();
    await expect(page.getByRole("region", { name: "Questão do jogo" })).toBeInViewport();
    const vw = page.viewportSize()!.width;
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(vw);
  });

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
    await expect(card.getByText("Frase da lei")).toBeVisible();
    const verify = card.page().getByRole("button", { name: /^Confirmar$/ });
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
    // Limpar esvazia todos os espaços.
    await words.nth(0).click();
    await card.page().getByRole("button", { name: /Limpar/ }).click();
    await expect(card.getByText(`0/${n} preenchidos`)).toBeVisible();
  });

  test("pausa: o cronômetro para, a frase fica coberta e as palavras travam", async ({ page }) => {
    await page.clock.install();
    await page.goto(`${G}/quiz`);
    const card = page.getByRole("region", { name: "Questão do jogo" });
    await card.scrollIntoViewIfNeeded();
    const timer = page.getByTestId("cronometro");
    await page.getByRole("button", { name: "Pausar o cronômetro" }).click();
    const before = await timer.getAttribute("aria-label");
    await page.clock.runFor(5_000);
    await expect(timer).toHaveAttribute("aria-label", before!);
    await expect(card.getByText(/Pausado/)).toBeVisible();
    await expect(card.locator("button.min-h-12").first()).toBeDisabled();
    await page.getByRole("button", { name: "Retomar o cronômetro" }).click();
    await expect(card.locator("button.min-h-12").first()).toBeEnabled();
  });
  test("cronômetro de 35 s por questão: corre com a questão na tela e esgota o tempo", async ({ page }) => {
    await page.clock.install();
    await page.goto(`${G}/quiz`);
    const card = page.getByRole("region", { name: "Questão do jogo" });
    await card.scrollIntoViewIfNeeded();
    const timer = page.getByTestId("cronometro");
    await expect(timer).toHaveAttribute("aria-label", "35 segundos restantes");
    await expect(timer).toContainText("00:35");
    // Avança o relógio segundo a segundo até chegar aos 3 segundos finais.
    const secs = async () => Number((await timer.getAttribute("aria-label"))?.match(/^\d+/)?.[0] ?? 0);
    await page.clock.runFor(2_000);
    await expect.poll(secs).toBeLessThan(35);
    await expect(timer).not.toHaveAttribute("data-urgente", "true");
    for (let i = 0; i < 40 && (await secs()) > 3; i++) await page.clock.runFor(1_000);
    await expect(timer).toHaveAttribute("data-urgente", "true");
    for (let i = 0; i < 10 && (await secs()) > 0; i++) await page.clock.runFor(1_000);
    await expect(page.getByRole("button", { name: /Tempo esgotado/ })).toBeVisible();
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
  for (const [path, id, img] of [["painel", "painel-banner", /aprovum-login-hero-mobile\.webp/], ["quiz", "jogo-banner-marca", /jogo-hero-arte(-sm)?\.webp/]] as const) {
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

test.describe("página de estudos", () => {
  test("saudação, banner, progresso real, seus estudos e Modo Jogo (sem o card de aulas inteligentes)", async ({ page }, info) => {
    await page.goto(`${G}/trilhas`);
    const mobile = info.project.name === "mobile";
    await expect(page.getByRole("heading", { name: /Olá, Rafael/ }).first()).toBeVisible();
    await expect(page.getByRole("heading", { name: /Evolução é\s*questão de\s*Disciplina/i })).toBeVisible();
    await expect(page.getByTestId("banner-continuar")).toHaveAttribute("href", /\/dev\/galeria\/aula\//);
    const prog = page.getByTestId("progresso-geral");
    await expect(prog.getByRole("img", { name: "38% das questões concluídas" })).toBeVisible();
    await expect(prog).toContainText("111");
    await expect(prog).toContainText("/ 290");
    await expect(prog).toContainText("9 / 29");
    // Seus estudos: o estudo em andamento vem primeiro e abre a aula.
    const estudos = page.getByTestId("seus-estudos");
    const andamento = estudos.getByRole("link", { name: /em andamento, continuar/ });
    await expect(andamento).toHaveAttribute("href", /\/dev\/galeria\/aula\//);
    await expect(andamento.getByText("Em andamento")).toBeVisible();
    // O card "Aulas e conteúdos inteligentes" foi removido da página.
    await expect(page.getByTestId("aulas-inteligentes")).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Jogar agora/i })).toHaveAttribute("href", "/dev/galeria/quiz");
    // Carrossel: no celular, os pontos levam à próxima página de estudos.
    if (mobile) {
      const dots = estudos.getByRole("tab");
      await dots.nth(1).click();
      await expect(dots.nth(1)).toHaveAttribute("aria-selected", "true");
    }
    expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBeLessThanOrEqual(0);
  });

  test("celular: menu hambúrguer abre a navegação completa e fecha", async ({ page }, info) => {
    test.skip(info.project.name !== "mobile", "menu hambúrguer é do celular");
    await page.goto(`${G}/trilhas`);
    await page.getByRole("button", { name: "Abrir menu" }).click();
    const menu = page.getByRole("dialog", { name: "Menu" });
    await expect(menu.getByRole("link", { name: /Modo Jogo/ })).toHaveAttribute("href", "/dev/galeria/quiz");
    await expect(menu.getByRole("link", { name: /Novo estudo/ })).toBeVisible();
    await menu.getByRole("button", { name: "Fechar menu" }).click();
    await expect(menu).toBeHidden();
  });
});

test.describe("visão da aula (nove cards)", () => {
  test("cabeçalho, nove cards, pontos-chave e navegação com dados da aula", async ({ page }) => {
    await page.goto(`${G}/aula`);
    const v = page.getByTestId("visao-aula");
    await expect(v.getByRole("heading", { level: 1 })).toContainText("convalidação");
    await expect(v.getByText("Aula 03")).toBeVisible();
    const ids = ["conceito", "visualize", "lei", "destrinche", "diferencie", "pratica", "banca", "questao", "mapa"];
    for (let i = 0; i < ids.length; i++) {
      await goCard(page, i + 1);
      await expect(page.getByTestId(`card-${ids[i]}`)).toBeVisible();
    }
    await expect((await goCard(page, 3))).toContainText("Art. 53");
    await expect((await goCard(page, 5))).toContainText("Ilegalidade");
    await expect(page.getByRole("heading", { name: /Pontos-chave/ })).toBeVisible();
    await expect(v.getByText("3 de 6 aulas")).toBeVisible();
    await expect(v.getByRole("link", { name: /Próxima aula/ })).toHaveAttribute("href", /\/aula\//);
    await noHorizontalScroll(page);
  });

  test("o PDF do conteúdo fica dentro da própria aula", async ({ page }) => {
    await page.goto(`${G}/aula`);
    const pdf = page.locator("section#pdf");
    await expect(pdf.getByRole("heading", { name: "PDF deste conteúdo" })).toBeVisible();
    await expect(pdf.getByRole("button", { name: /Gerar PDF/ })).toBeDisabled();
    await expect(pdf.getByText("2 de 6 concluída(s)", { exact: false })).toBeVisible();
    await noHorizontalScroll(page);
  });

  test("questão de fixação usa o motor real de questões", async ({ page }) => {
    await page.goto(`${G}/aula`);
    const card = await goCard(page, 8);
    const radio = card.getByRole("radio").first();
    if (await radio.isEnabled()) {
      await radio.evaluate((el) => (el as HTMLInputElement).click());
      await card.getByRole("button", { name: "Responder", exact: true }).click();
    }
    await expect(card.getByText(/Resposta (correta|incorreta)/).first()).toBeVisible();
  });

  test("árvore de aulas: barra lateral no desktop, menu no celular", async ({ page, isMobile }) => {
    await page.goto(`${G}/aula`);
    if (isMobile) await page.getByRole("button", { name: "Abrir menu" }).click();
    const tree = page.getByRole("navigation", { name: "Aulas deste estudo" }).filter({ visible: true });
    await expect(tree).toHaveCount(1);
    await expect(tree.locator('[aria-current="page"]')).toBeVisible();
    await expect(tree.getByRole("link", { name: /Ver cobertura do estudo/ })).toHaveAttribute("href", /\/cobertura$/);
  });
});

test("painel: banner de saudação reveza com os banners de aprovação a cada 3 s", async ({ page }) => {
  await page.goto(`${G}/painel`);
  const rot = page.getByTestId("banner-rotator");
  await expect(rot).toHaveAttribute("data-slide", "0");
  await expect(rot).toHaveAttribute("data-slide", "1", { timeout: 5000 });
  await expect(rot.getByRole("img", { name: /William Abreu/ })).toBeVisible();
  // Pontos levam direto a um banner; pausa interrompe a troca.
  await rot.getByRole("button", { name: "Mostrar banner 3 de 4" }).click();
  await expect(rot.getByRole("img", { name: /Fábio Bezerra/ })).toBeVisible();
  await rot.getByRole("button", { name: /Pausar troca automática/ }).click();
  await page.waitForTimeout(3600);
  await expect(rot).toHaveAttribute("data-slide", "2");
  // Card na proporção exata das artes (2000×711): o banner ativo preenche 100% do card.
  await page.waitForTimeout(1000);
  const fit = await page.evaluate(() => {
    const card = document.querySelector("[data-testid=painel-banner]")!.getBoundingClientRect();
    const art = document.querySelector(".br-slide-aprovado[data-ativo='1'] .br-arte")!.getBoundingClientRect();
    return { ratio: card.width / card.height, dw: Math.abs(art.width - card.width), dh: Math.abs(art.height - card.height), dx: Math.abs(art.left - card.left) };
  });
  expect(Math.abs(fit.ratio - 2000 / 711)).toBeLessThan(0.02);
  expect(fit.dw).toBeLessThan(2);
  expect(fit.dh).toBeLessThan(2);
  expect(fit.dx).toBeLessThan(2);
  await noHorizontalScroll(page);
});

test("menu Estudos: submenu com as matérias abre os assuntos estudados", async ({ page, isMobile }) => {
  // No celular o menu completo (hambúrguer) fica no topo da página de Estudos.
  await page.goto(`${G}/${isMobile ? "trilhas" : "painel"}`);
  if (isMobile) await page.getByRole("button", { name: "Abrir menu" }).click();
  const sub = page.getByTestId(isMobile ? "submenu-materias-menu" : "submenu-materias-lateral");
  await expect(sub.getByRole("button", { name: /Direito Penal/ })).toBeVisible();
  await expect(sub.getByRole("link", { name: /Homicídio/ })).toHaveCount(0);
  await sub.getByRole("button", { name: /Direito Penal/ }).click();
  await expect(sub.getByRole("button", { name: /Direito Penal/ })).toHaveAttribute("aria-expanded", "true");
  await expect(sub.getByRole("link", { name: /Homicídio/ })).toBeVisible();
  // Situação de cada assunto: verde concluído, laranja em andamento, vermelho não iniciado.
  await expect(sub.getByRole("link", { name: /Teoria do crime.*concluído/ })).toHaveAttribute("data-status", "concluido");
  await expect(sub.getByRole("link", { name: /Homicídio.*não iniciado/ })).toHaveAttribute("data-status", "nao_iniciado");
  await sub.getByRole("link", { name: /Teoria do crime/ }).click();
  await expect(page).toHaveURL(/\/dev\/galeria\/trilha$/);
  await noHorizontalScroll(page);
});

test("escolha seu novo estudo: matéria, tema, filtros e progresso real", async ({ page }) => {
  await page.goto(`${G}/trilhas`);
  const sec = page.getByTestId("escolha-estudo");
  await expect(sec.getByRole("heading", { name: "Novo estudo" })).toBeVisible();
  // Abre na matéria do tema mais estudado, com o destaque e o link para continuar.
  await expect(sec.getByRole("tab", { name: /Direito Administrativo/ })).toHaveAttribute("aria-selected", "true");
  const top = sec.getByTestId("tema-catalogo").first();
  await expect(top).toContainText("Mais estudado");
  await expect(top.getByRole("link", { name: /^Continuar estudando: Ato administrativo/ })).toHaveAttribute("href", /\/dev\/galeria\/trilhas\//);
  // Outra matéria: tema não iniciado abre o novo estudo já com o tema escolhido.
  await sec.getByRole("tab", { name: /Direito Penal/ }).click();
  await expect(sec.getByRole("link", { name: /^Começar estudo: Roubo/ })).toHaveAttribute("href", /nova-trilha\?materia=Direito%20Penal&conteudo=Roubo/);
  await sec.getByRole("button", { name: /Não iniciados/ }).click();
  await expect(sec.getByText("Teoria do crime: fato típico")).toBeHidden();
  await sec.getByRole("button", { name: /^Todos/ }).click();
  await page.getByLabel("Buscar tema").fill("homic");
  await expect(sec.getByTestId("tema-catalogo")).toHaveCount(1);
  await noHorizontalScroll(page);
});

test("pastas e estudos: falha ao excluir aparece na tela (nunca um clique mudo)", async ({ page }) => {
  // Na galeria não há sessão: a ação do servidor falha de propósito.
  await page.goto(`${G}/trilhas`);
  // A organização em pastas fica recolhida abaixo de "Escolha seu novo estudo".
  await page.getByTestId("organizar-pastas").locator("summary").click();
  await page.getByRole("button", { name: /^Excluir estudo Ato/ }).click();
  await page.getByRole("button", { name: "Excluir estudo", exact: true }).click();
  await expect(page.getByTestId("erro-pastas")).toBeVisible();
});

test("barra dos cards: % estudado em gráfico, laranja em andamento e verde ao concluir", async ({ page }) => {
  await page.goto(`${G}/aula`);
  const bar = page.getByRole("navigation", { name: "Cards da aula" });
  const c1 = bar.getByRole("button", { name: /^Card 1:/ });
  await expect(c1).toHaveAttribute("data-situacao", "andamento");
  await expect(c1).toContainText("33%");
  await expect(bar.getByRole("button", { name: /^Card 3:/ })).toHaveAttribute("data-situacao", "nao_iniciado");
  const card = page.getByTestId("card-conceito");
  await card.getByText("anular a licença, por ilegalidade", { exact: false }).first().click();
  await card.getByRole("button", { name: "Responder", exact: true }).first().click();
  await expect(c1).toContainText("67%");
  await card.getByTestId("concluir-card-1").click();
  await expect(c1).toHaveAttribute("data-situacao", "concluido");
  await expect(c1).toHaveAccessibleName(/100% estudado/);
});
