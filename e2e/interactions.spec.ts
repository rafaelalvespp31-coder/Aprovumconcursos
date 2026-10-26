import { readFileSync } from "node:fs";
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
  for (const path of ["painel", "perfil", "trilhas", "trilha", "aula", "questoes", "questoes/cadernos", "questoes/cadernos/novo", "questoes/cadernos/11111111-1111-4111-8111-111111111111", "pratica-aulas", "desempenho", "catalogo", "banco", "quiz", "na-pratica"]) {
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
  for (const path of ["painel", "perfil", "trilhas", "trilha", "aula", "questoes", "questoes/cadernos", "questoes/cadernos/novo", "questoes/cadernos/11111111-1111-4111-8111-111111111111", "pratica-aulas", "desempenho", "catalogo", "banco", "quiz", "na-pratica"]) {
    test(path, async ({ page }) => {
      await page.goto(`${G}/${path}`);
      await noHorizontalScroll(page);
    });
  }
});

test.describe("modo de questões", () => {
  test("seleciona, responde e explica cada alternativa", async ({ page }) => {
    await page.goto(`${G}/pratica-aulas`);
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
    await page.goto(`${G}/pratica-aulas`);
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
    await page.goto(`${G}/pratica-aulas`);
    await page.locator("body").click({ position: { x: 5, y: 5 } });
    await page.keyboard.press("a");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Resposta incorreta")).toBeVisible();
    await page.keyboard.press("j");
    await expect(page.getByText(/^2 de 12/)).toBeVisible();
  });

  test("marcar para resolver depois alterna o estado", async ({ page }) => {
    await page.goto(`${G}/pratica-aulas`);
    const mark = page.getByRole("button", { name: /Resolver depois/ }).first();
    await mark.click();
    await expect(page.getByRole("button", { name: /Para resolver depois/ }).first()).toBeVisible();
  });

  test("navegação pela lista de questões", async ({ page }) => {
    await page.goto(`${G}/pratica-aulas`);
    await page.getByRole("list", { name: "Lista de questões" }).getByRole("button", { name: /^Questão 3,/ }).click();
    await expect(page.getByText(/^3 de 12/)).toBeVisible();
  });
});

test.describe("menu Questões: cadernos", () => {
  test("abas, menu do caderno (fixar, renomear, excluir) e criar", async ({ page }) => {
    await page.goto(`${G}/questoes`);
    const card = page.getByTestId("cadernos-card");
    await expect(card.getByTestId("caderno")).toHaveCount(5);
    await card.getByRole("tab", { name: /Atalhos/ }).click();
    await expect(card.getByTestId("caderno")).toHaveCount(2);
    await card.getByRole("tab", { name: "Recentes" }).click();
    const first = card.getByTestId("caderno").first();
    await expect(first).toContainText("AGENTE DE APOIO MP ES");
    // Renomear
    await first.getByRole("button", { name: /Mais opções/ }).click();
    await page.getByRole("menuitem", { name: "Renomear" }).click();
    await first.getByLabel("Novo nome do caderno").fill("Meu caderno MPES");
    await first.getByRole("button", { name: "Salvar" }).click();
    await expect(card.getByText("Meu caderno MPES")).toBeVisible();
    // Fixar/tirar dos atalhos
    const crm = card.getByTestId("caderno").filter({ hasText: "Crm" });
    await crm.getByRole("button", { name: /Mais opções/ }).click();
    await page.getByRole("menuitem", { name: "Fixar nos atalhos" }).click();
    await expect(card.getByRole("tab", { name: "Atalhos (3)" })).toBeVisible();
    // Excluir (com confirmação dentro da linha, sem diálogo do navegador)
    await crm.getByRole("button", { name: /Mais opções/ }).click();
    await page.getByRole("menuitem", { name: "Excluir" }).click();
    await crm.getByRole("button", { name: "Excluir" }).click();
    await expect(card.getByTestId("caderno").filter({ hasText: "Crm" })).toHaveCount(0);
    // Escape fecha o menu
    await first.getByRole("button", { name: /Mais opções/ }).click();
    await page.keyboard.press("Escape");
    await expect(page.getByRole("menu")).toHaveCount(0);
    await card.getByRole("link", { name: /Criar novo caderno/ }).click();
    await expect(page).toHaveURL(/\/questoes\/cadernos\/novo$/);
  });

  test("avisos: setas e pontos trocam o aviso", async ({ page }) => {
    await page.goto(`${G}/questoes`);
    const av = page.getByTestId("avisos-card");
    await expect(av.getByText("1 de 3")).toBeVisible();
    await av.getByRole("button", { name: "Próximo aviso" }).last().click();
    await expect(av.getByText("2 de 3")).toBeVisible();
    await av.getByRole("button", { name: /^Aviso 3:/ }).click();
    await expect(av.getByText("3 de 3")).toBeVisible();
    await av.getByRole("button", { name: "Aviso anterior" }).click();
    await expect(av.getByText("2 de 3")).toBeVisible();
  });

  test("investida: troca de ano e modo mensal", async ({ page }) => {
    await page.goto(`${G}/questoes`);
    const inv = page.getByTestId("investida-card");
    const year = new Date().getFullYear();
    await expect(inv.getByText(String(year), { exact: true })).toBeVisible();
    await inv.getByRole("link", { name: `Ano ${year - 1}` }).click();
    await expect(inv.getByText(String(year - 1), { exact: true })).toBeVisible();
    await inv.getByRole("combobox").selectOption("mensal");
    await expect(inv.getByRole("grid")).toBeVisible();
    await expect(page).toHaveURL(/exibir=mensal/);
  });

  test("novo caderno: matéria, assunto, banca, dificuldade, abas e criação", async ({ page }) => {
    await page.goto(`${G}/questoes/cadernos/novo`);
    const n = page.getByTestId("contagem-filtro");
    await expect(n).toContainText("6 questões encontradas");
    await expect(page.getByText(/para visualizar as questões/)).toBeVisible();
    // matéria inteira + assunto de outra matéria (OU)
    await page.getByRole("button", { name: "Direito Penal", exact: true }).click();
    await expect(n).toContainText("2 questões");
    await page.getByRole("button", { name: "Ver assuntos de Direito Administrativo" }).click();
    await page.getByText("Anulação e revogação").click();
    await expect(n).toContainText("3 questões");
    await expect(page.getByText("2 selecionadas")).toBeVisible();
    // banca (E com a matéria)
    await page.getByRole("button", { name: /^Banca:/ }).click();
    await page.getByRole("group", { name: "Banca" }).getByText("FGV", { exact: true }).click();
    await expect(n).toContainText("1 questão encontrada");
    await page.getByRole("button", { name: "Banca", exact: true }).click(); // voltar
    // chips: remover a banca devolve a contagem
    await page.getByRole("button", { name: "Remover filtro FGV" }).click();
    await expect(n).toContainText("3 questões");
    // dificuldade
    await page.getByRole("button", { name: /Dificuldade/ }).click();
    await page.getByRole("group", { name: "Dificuldade" }).getByText("Extrema").click();
    await expect(n).toContainText("1 questão encontrada");
    await page.getByRole("button", { name: /Dificuldade/ }).click();
    // filtros ainda sem cadastro aparecem desativados
    await expect(page.getByRole("button", { name: "Região: Em breve" })).toBeDisabled();
    // abas: minhas (já respondidas) e favoritas
    await page.getByRole("button", { name: "Limpar" }).first().click();
    await page.getByRole("tab", { name: "Minhas questões" }).click();
    await expect(n).toContainText("2 questões");
    await page.getByRole("tab", { name: "Questões favoritas" }).click();
    await expect(n).toContainText("1 questão encontrada");
    await page.getByRole("switch", { name: "Mostrar o enunciado completo" }).uncheck();
    await page.getByRole("button", { name: "Buscar questões" }).click();
    await expect(page).toHaveURL(/\/questoes\/cadernos\/11111111-/);
  });

  test("resolver caderno: escolhe, confirma, mostra gabarito comentado e navega", async ({ page }) => {
    await page.goto(`${G}/questoes/cadernos/11111111-1111-4111-8111-111111111111`);
    const confirmar = page.getByRole("button", { name: "Confirmar resposta", exact: true });
    await expect(confirmar).toBeDisabled();
    // antes de confirmar: sem gabarito, sem cores de acerto/erro
    await expect(page.getByTestId("gabarito-comentado")).toHaveCount(0);
    await page.getByRole("radio", { name: /anular a licença, por ilegalidade/ }).click();
    await expect(page.getByRole("radio", { name: /anular a licença/ })).toHaveAttribute("aria-checked", "true");
    await expect(page.getByText("Resposta correta")).toHaveCount(0);
    await confirmar.click();
    await expect(page.getByText("Resposta correta")).toBeVisible();
    await expect(page.getByTestId("gabarito-comentado")).toBeVisible();
    await expect(page.getByTestId("tempo-card")).toContainText(/Corretas\s*1/);
    await expect(page.getByTestId("tempo-card")).toContainText(/Erradas\s*0/);
    // depois de confirmar, a resposta fica travada
    await expect(page.getByRole("radio", { name: /revogar a licença/ })).toBeDisabled();
    await page.getByRole("button", { name: "Próxima questão" }).click();
    await expect(page.getByText("Questão 2 de 3")).toBeVisible();
    await page.keyboard.press("e");
    await page.keyboard.press("Enter");
    await expect(page.getByText("Resposta incorreta")).toBeVisible();
    await page.getByRole("list", { name: "Lista de questões do caderno" }).getByRole("button", { name: /^Questão 1, respondida \(acertou\)/ }).click();
    await expect(page.getByText("Questão 1 de 3")).toBeVisible();
    await expect(page.getByText("Resposta correta")).toBeVisible();
  });

  test("riscar alternativas: clique duplo risca e restaura; riscada não confirma", async ({ page, isMobile }) => {
    await page.goto(`${G}/questoes/cadernos/11111111-1111-4111-8111-111111111111`);
    const alt = page.getByRole("radio", { name: /revogar a licença/ });
    const confirmar = page.getByRole("button", { name: "Confirmar resposta", exact: true });
    // escolhe e depois risca a própria escolhida: a escolha é limpa e não dá para confirmar
    await alt.click();
    await expect(alt).toHaveAttribute("aria-checked", "true");
    if (isMobile) {
      await alt.tap();
      await alt.tap();
    } else {
      await alt.dblclick();
    }
    await expect(alt).toHaveAttribute("data-riscada", "1");
    await expect(alt).toHaveAttribute("aria-checked", "false");
    await expect(confirmar).toBeDisabled();
    // riscada não é escolhida com clique simples
    await alt.click({ force: true });
    await page.waitForTimeout(400);
    await expect(alt).toHaveAttribute("aria-checked", "false");
    // o duplo clique não seleciona por engano
    await expect(page.getByTestId("alternativas").getByRole("radio", { checked: true })).toHaveCount(0);
    // restaura com o botão (alternativa acessível ao toque duplo)
    await page.getByRole("button", { name: "Restaurar a alternativa A" }).click();
    await expect(alt).toHaveAttribute("data-riscada", "0");
    await alt.click();
    await expect(alt).toHaveAttribute("aria-checked", "true");
    await expect(confirmar).toBeEnabled();
    // riscar outra alternativa mantém a escolha
    await page.getByRole("button", { name: "Riscar a alternativa C" }).click();
    await expect(page.getByRole("radio", { name: /convalidar/ })).toHaveAttribute("data-riscada", "1");
    await expect(alt).toHaveAttribute("aria-checked", "true");
    // o risco é só visual e não revela gabarito
    await expect(page.getByTestId("gabarito-comentado")).toHaveCount(0);
  });

  test("caderno: faixa da questão, favoritar, enunciado, anotação, relatar erro e tempo", async ({ page }) => {
    await page.goto(`${G}/questoes/cadernos/66666666-6666-4666-8666-666666666666`);
    const faixa = page.getByTestId("faixa-questao");
    await expect(faixa).toContainText("Matéria");
    await expect(faixa).toContainText("Direito Administrativo");
    await expect(faixa).toContainText("Anulação e revogação");
    const fav = page.getByRole("button", { name: /Favorit/ });
    await expect(fav).toHaveAttribute("aria-pressed", "true");
    await fav.click();
    await expect(fav).toHaveAttribute("aria-pressed", "false");
    // enunciado resumido → completo pelo menu da questão
    await expect(page.getByTestId("enunciado")).toHaveClass(/line-clamp-3/);
    await page.getByRole("button", { name: "Mais opções da questão" }).click();
    await page.getByRole("menuitemcheckbox", { name: "Mostrar enunciado completo" }).click();
    await expect(page.getByTestId("enunciado")).not.toHaveClass(/line-clamp-3/);
    // explicação só depois de confirmar
    await expect(page.getByRole("button", { name: "Explicação" })).toBeDisabled();
    // anotação
    await page.getByRole("button", { name: /^Anotação/ }).click();
    await page.getByLabel("Sua anotação (só você vê)").fill("Vício de legalidade → anula.");
    await page.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Anotação salva.")).toBeVisible();
    // relatar erro
    await page.getByRole("button", { name: "Mais opções da questão" }).click();
    await page.getByRole("menuitem", { name: "Relatar erro na questão" }).click();
    const enviar = page.getByRole("button", { name: "Enviar" });
    await expect(enviar).toBeDisabled();
    await page.getByLabel("O que está errado nesta questão?").fill("O gabarito parece diferente do oficial.");
    await enviar.click();
    await expect(page.getByText("Obrigado! A equipe vai revisar a questão.")).toBeVisible();
    // tempo de estudo corre e pausa
    const tempo = page.getByTestId("tempo");
    await expect(tempo).not.toHaveText("00:00:00", { timeout: 4000 });
    await page.getByRole("button", { name: "Pausar o tempo" }).click();
    const parado = await tempo.textContent();
    await page.waitForTimeout(1500);
    await expect(tempo).toHaveText(parado!);
    await expect(page.getByRole("button", { name: "Retomar o tempo" })).toBeVisible();
  });

  test("caderno sem questões publicadas mostra o estado vazio", async ({ page }) => {
    await page.goto(`${G}/questoes/cadernos/44444444-4444-4444-8444-444444444444`);
    await expect(page.getByText("Ainda não há questões publicadas para este caderno")).toBeVisible();
  });
});

/** Abre um card pela barra dos nove cards (a aula mostra um card por vez). */
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
    // Os cards "Minhas matérias" e "Atividades recentes" foram removidos do painel.
    await expect(page.getByTestId("atividades-recentes")).toHaveCount(0);
    await expect(page.getByTestId("minhas-materias")).toHaveCount(0);
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
    const nav = page.getByRole("navigation", { name: "Principal", exact: true });
    await expect(nav.getByRole("link", { name: /Painel/ })).toHaveAttribute("aria-current", "page");
    await expect(page.getByTestId("nav-desc-revisoes")).toHaveText("2 pendentes");
    await expect(nav.getByRole("link", { name: /Modo Jogo/ })).toHaveAttribute("href", `${G}/quiz`);
    await page.keyboard.press("7");
    await expect(page).toHaveURL(new RegExp(`${G}/perfil`));
    await expect(page.getByTestId("nivel")).toHaveText("Nível 5");
    await page.getByRole("button", { name: "Recolher", exact: true }).click();
    await page.reload();
    await expect(page.getByRole("button", { name: "Expandir barra lateral" })).toBeVisible();
    await page.getByRole("button", { name: "Expandir barra lateral" }).click();
    await expect(page.getByRole("button", { name: "Recolher", exact: true })).toBeVisible();
  });

  test("atalhos numéricos não navegam nas telas com questões", async ({ page, isMobile }) => {
    test.skip(isMobile, "teclado físico");
    await page.goto(`${G}/pratica-aulas`);
    await page.keyboard.press("6");
    await expect(page).toHaveURL(new RegExp(`${G}/pratica-aulas`));
    await page.goto(`${G}/questoes/cadernos/11111111-1111-4111-8111-111111111111`);
    await page.keyboard.press("2");
    await expect(page).toHaveURL(/\/questoes\/cadernos\/11111111-/);
  });

  test("menu inferior: sete opções na ordem, rota ativa e navegação real (celular)", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 800 });
    await page.goto(`${G}/painel`);
    const bar = page.getByTestId("menu-inferior");
    const links = bar.getByRole("link");
    await expect(links).toHaveCount(7);
    const names = ["Painel", "Estudos", "Modo Jogo", "Questões", "Revisões", "Evolução (desempenho)", "Novo estudo"];
    for (const [k, n] of names.entries()) await expect(links.nth(k)).toHaveAccessibleName(n);
    await expect(bar.locator(".bn-txt")).toHaveText(["Painel", "Estudos", "Jogo", "Questões", "Revisões", "Evolução", "Novo"]);
    await expect(bar.getByRole("link", { name: "Painel" })).toHaveAttribute("aria-current", "page");
    await bar.getByRole("link", { name: "Evolução (desempenho)" }).click();
    await expect(page).toHaveURL(new RegExp(`${G}/desempenho`));
    await expect(bar.getByRole("link", { name: "Evolução (desempenho)" })).toHaveAttribute("aria-current", "page");
    await bar.getByRole("link", { name: "Questões" }).click();
    await expect(page).toHaveURL(new RegExp(`${G}/questoes$`));
    await expect(bar.getByRole("link", { name: "Questões" })).toHaveAttribute("aria-current", "page");
    // subpáginas mantêm a seção ativa
    await page.goto(`${G}/questoes/cadernos/novo`);
    await expect(bar.getByRole("link", { name: "Questões" })).toHaveAttribute("aria-current", "page");
    await expect(bar.getByRole("link", { name: "Novo estudo" })).toHaveAttribute("href", `${G}/nova-trilha`);
    // fixo no rodapé, sem rolagem lateral e acima da área segura
    const box = await bar.boundingBox();
    expect(box!.y + box!.height).toBeLessThanOrEqual(800);
    expect(box!.y + box!.height).toBeGreaterThan(740);
    await noHorizontalScroll(page);
  });

  test("menu inferior no computador: centralizado no conteúdo e navegável pelo teclado", async ({ page, isMobile }) => {
    test.skip(isMobile, "teclado físico");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${G}/painel`);
    const bar = page.getByTestId("menu-inferior");
    await expect(bar).toBeVisible();
    await bar.getByRole("link", { name: "Painel" }).focus();
    await page.keyboard.press("ArrowRight");
    await expect(bar.getByRole("link", { name: "Estudos" })).toBeFocused();
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(bar.getByRole("link", { name: "Novo estudo" })).toBeFocused();
    await page.keyboard.press("Home");
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(new RegExp(`${G}/painel`));
    await page.keyboard.press("End");
    await expect(bar.getByRole("link", { name: "Novo estudo" })).toBeFocused();
  });

  test("menu inferior no computador: compacto e recolhível como o menu lateral", async ({ page, isMobile }) => {
    test.skip(isMobile, "só no computador");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${G}/painel`);
    const bar = page.getByTestId("menu-inferior");
    const h = await bar.evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeLessThanOrEqual(90);
    await page.getByTestId("recolher-menu-inferior").click();
    await expect(bar).toBeHidden();
    await page.reload();
    await expect(page.getByTestId("menu-inferior")).toBeHidden();
    await page.getByTestId("abrir-menu-inferior").click();
    await expect(page.getByTestId("menu-inferior")).toBeVisible();
  });

  test("perfil mostra conquistas com regras e progresso", async ({ page }) => {
    await page.goto(`${G}/perfil`);
    await expect(page.getByTestId("conquistas-total")).toContainText("/8");
    await expect(page.getByText("Atirador de elite")).toBeVisible();
    await expect(page.getByText("74% de acerto (meta: 80%)")).toBeVisible();
    await expect(page.getByText(/XP/)).toHaveCount(0);
  });
});

test.describe("catálogo: catalogar aula colando texto", () => {
  test("o texto da aula vira módulos, seções e questões na prévia", async ({ page }) => {
    await page.goto(`${G}/catalogo`);
    const up = page.getByTestId("upload-aula");
    await up.getByRole("radio", { name: "Completo", exact: true }).click();
    await expect(up.getByRole("button", { name: "Copiar comando para o ChatGPT" })).toBeVisible();
    await up.getByLabel("2. Cole aqui a resposta completa do ChatGPT (aula e questões)").fill("```text\n" + readFileSync("public/modelos/modelo-aula.txt", "utf8") + "\n```");
    await up.getByRole("button", { name: "3. Conferir aula" }).click();
    const pv = up.locator("section[aria-labelledby=previa]");
    await expect(pv.getByRole("heading", { name: "Furto (art. 155 do CP)" })).toBeVisible();
    await expect(pv.getByText("Direito Penal · CP, art. 155", { exact: false })).toBeVisible();
    await expect(pv.getByText("Pronto para salvar")).toBeVisible();
    await expect(pv.getByText("1. Base do tema", { exact: true })).toBeVisible();
    await expect(pv.getByText("2. Aprofundamento", { exact: true })).toBeVisible();
    await expect(pv.getByText("Onde a banca tenta te pegar")).toBeVisible();
    await expect(pv.getByText("Fácil: 2", { exact: true })).toBeVisible();
    await expect(up.getByRole("button", { name: "4. Salvar como rascunho" })).toBeEnabled();
    // Mudou o texto depois de conferir: precisa conferir de novo.
    await up.getByLabel("2. Cole aqui a resposta completa do ChatGPT (aula e questões)").press("End");
    await up.getByLabel("2. Cole aqui a resposta completa do ChatGPT (aula e questões)").pressSequentially(" ");
    await expect(up.getByRole("button", { name: "4. Salvar como rascunho" })).toBeDisabled();
  });

  test("um campo por padrão; resposta grande pode ser colada em 2 partes e vira uma aula só", async ({ page }) => {
    await page.goto(`${G}/catalogo`);
    const up = page.getByTestId("upload-aula");
    await expect(up.getByRole("radio", { name: "Compacto (recomendado)" })).toHaveAttribute("aria-checked", "true");
    await expect(up.getByRole("textbox")).toHaveCount(1);
    await up.getByTestId("colar-em-2-partes").click();
    await expect(up.getByRole("textbox")).toHaveCount(2);
    const full = readFileSync("public/modelos/modelo-aula.txt", "utf8");
    const cut = full.indexOf("=== QUESTÕES: FÁCIL ===");
    await up.getByLabel("2. Cole aqui a parte 1 da resposta").fill(full.slice(0, cut));
    await up.getByLabel("Cole aqui a parte 2 da resposta (continuação ou questões)").fill("```\n" + full.slice(cut) + "\n```");
    await up.getByRole("button", { name: "3. Conferir aula" }).click();
    await expect(up.locator("section[aria-labelledby=previa]").getByText("Fácil: 2", { exact: true })).toBeVisible();
    // Comando completo em 2 partes já abre com os dois campos.
    await up.getByRole("radio", { name: "Completo em 2 partes" }).click();
    await expect(up.getByRole("button", { name: "Copiar parte 2" })).toBeVisible();
    await expect(up.getByRole("textbox")).toHaveCount(2);
  });

  test("texto fora do formato aponta os erros e não deixa salvar", async ({ page }) => {
    await page.goto(`${G}/catalogo`);
    const up = page.getByTestId("upload-aula");
    await up.getByRole("radio", { name: "Completo", exact: true }).click();
    await up.getByLabel("2. Cole aqui a resposta completa do ChatGPT (aula e questões)").fill("=== AULA ===\nTítulo: Teste\nMatéria: Astronomia\n");
    await up.getByRole("button", { name: "3. Conferir aula" }).click();
    await expect(up.getByText(/Não reconheci a matéria “Astronomia”/)).toBeVisible();
    await expect(up.getByRole("button", { name: "4. Salvar como rascunho" })).toBeDisabled();
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

  test("cadastrar questões: lê o texto colado, mostra a lista e cadastra", async ({ page }) => {
    await page.goto(`${G}/banco`);
    const up = page.getByTestId("upload-questoes");
    await up.getByLabel("2. Cole aqui as questões").fill(readFileSync("public/modelos/modelo-questoes.txt", "utf8"));
    await up.getByRole("button", { name: "3. Conferir questões" }).click();
    await expect(up.getByText("2 questão(ões) no texto · 2 nova(s)")).toBeVisible();
    await expect(up.getByText("Pronto para cadastrar")).toBeVisible();
    await expect(up.getByRole("cell", { name: /Crimes contra a vida › Homicídio/ })).toBeVisible();
    await expect(up.getByRole("cell", { name: "Errado", exact: true })).toBeVisible();
    await up.getByRole("button", { name: "Cadastrar e publicar 2 questão(ões)" }).click();
    await expect(up.getByText(/já aparecem para os alunos/)).toBeVisible();
  });

  test("cadastrar questões: texto fora do formato mostra os erros e não deixa cadastrar", async ({ page }) => {
    await page.goto(`${G}/banco`);
    const up = page.getByTestId("upload-questoes");
    await up.getByLabel("2. Cole aqui as questões").fill("=== PADRÃO ===\nMatéria: Astronomia\n=== QUESTÕES ===\n--- QUESTÃO ---\nEnunciado: Uma questão qualquer de teste.\nGabarito: Certo\nTipo: certo ou errado\n");
    await up.getByRole("button", { name: "3. Conferir questões" }).click();
    await expect(up.getByText(/a matéria “Astronomia” não existe/)).toBeVisible();
    await expect(up.getByRole("button", { name: /Cadastrar/ })).toBeDisabled();
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

test("painel: banner de saudação reveza com os banners de aprovação a cada 3 s", async ({ page }) => {
  await page.goto(`${G}/painel`);
  const rot = page.getByTestId("banner-rotator");
  await expect(rot).toHaveAttribute("data-slide", "0");
  await expect(rot).toHaveAttribute("data-slide", "1", { timeout: 5000 });
  await expect(rot.getByRole("img", { name: /William Abreu/ })).toBeVisible();
  // Pontos levam direto a um banner; pausa interrompe a troca.
  await rot.getByRole("button", { name: "Mostrar banner 5 de 5" }).click();
  await expect(rot.getByRole("img", { name: /Sd Lacerda/ })).toBeVisible();
  await rot.getByRole("button", { name: "Mostrar banner 3 de 5" }).click();
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

test("escolha seu novo estudo (menu Novo): matéria, tema, filtros e progresso real", async ({ page }) => {
  // Fica na página do novo estudo, não na de Estudos.
  await page.goto(`${G}/trilhas`);
  await expect(page.getByTestId("escolha-estudo")).toHaveCount(0);
  await page.goto(`${G}/novo-estudo`);
  const sec = page.getByTestId("escolha-estudo");
  await expect(sec.getByRole("heading", { name: "Novo estudo" })).toBeVisible();
  // Abre na matéria do tema mais estudado, com o destaque e o link para continuar.
  await expect(sec.getByRole("tab", { name: /Direito Administrativo/ })).toHaveAttribute("aria-selected", "true");
  const top = sec.getByTestId("tema-catalogo").first();
  await expect(top).toContainText("Mais estudado");
  await expect(top.getByRole("link", { name: /^Continuar estudando: Ato administrativo/ })).toHaveAttribute("href", /\/dev\/galeria\/trilhas\//);
  // Sem o formulário "Montar meu estudo": começar pede só a banca, numa janela.
  await expect(page.getByText("Montar meu estudo")).toHaveCount(0);
  await sec.getByRole("tab", { name: /Direito Penal/ }).click();
  await sec.getByRole("button", { name: /^Começar estudo: Roubo/ }).click();
  const dlg = page.getByTestId("comecar-estudo");
  await expect(dlg.getByRole("heading", { name: "Roubo (CP, art. 157)" })).toBeVisible();
  await dlg.getByRole("button", { name: "Criar estudo" }).click();
  await expect(dlg.getByRole("alert")).toContainText("Selecione a banca");
  await dlg.getByLabel("Banca de referência").selectOption("outra");
  await expect(dlg.getByLabel("Nome da banca")).toBeVisible();
  await dlg.getByRole("button", { name: "Cancelar" }).click();
  await expect(dlg).toBeHidden();
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
  await page.getByRole("button", { name: /^Excluir estudo Ato/ }).click();
  await page.getByRole("button", { name: "Excluir estudo", exact: true }).click();
  await expect(page.getByTestId("erro-pastas")).toBeVisible();
});

test.describe("aula em formato apostila (igual ao PDF), dividida em módulos", () => {
  const pages = (page: Page) => page.getByRole("navigation", { name: "Páginas da aula" });
  /** Conclui os três módulos da aula de exemplo (as questões só abrem depois da teoria). */
  const finishTheory = async (page: Page) => {
    await page.getByTestId("comecar-aula").click();
    for (const n of [1, 2, 3]) await page.getByTestId(`concluir-modulo-${n}`).click();
    await expect(page.getByRole("heading", { name: /Nível (Fácil|Médio|Difícil)/, level: 2 })).toBeVisible();
  };

  test("início: banner compacto da matéria, resumo do estudo e sumário; começar abre o Módulo 1", async ({ page }) => {
    await page.goto(`${G}/aula`);
    const capa = page.getByRole("region", { name: "Capa" });
    await expect(capa.getByRole("heading", { level: 1 })).toHaveText("Anulação, revogação e convalidação");
    const h = await capa.locator(".ap-banner-arte").evaluate((el) => el.getBoundingClientRect().height);
    expect(h).toBeLessThanOrEqual(230);
    await expect(capa.getByText("FGV")).toBeVisible();
    await expect(page.getByText("módulos concluídos")).toBeVisible();
    const sum = page.getByRole("navigation", { name: "Sumário da aula" });
    await expect(sum.getByRole("button", { name: /Conceito e texto legal/ })).toBeVisible();
    await expect(sum.getByRole("button", { name: /Convalidação e tribunais/ })).toBeVisible();
    await expect(pages(page).getByRole("button")).toHaveCount(6);
    await noHorizontalScroll(page);
    await page.getByTestId("comecar-aula").click();
    await expect(page.getByText("Módulo 1 de 3")).toBeVisible();
    await expect(page.getByText("Distinguir as formas de extinção")).toBeVisible();
    await noHorizontalScroll(page);
  });

  test("um módulo por página: caixas, tabelas, texto legal, negrito vermelho e marca de não verificado", async ({ page }) => {
    await page.goto(`${G}/aula`);
    await page.getByTestId("comecar-aula").click();
    await expect(page.getByRole("heading", { name: "Introdução", level: 3 })).toBeVisible();
    await expect(page.locator(".ap-callout").filter({ hasText: "Na prática:" })).toBeVisible();
    await expect(page.locator(".ap-lei")).toContainText("Art. 53");
    await expect(page.locator(".ap-md strong").first()).toHaveCSS("color", "rgb(138, 3, 3)");
    // Só o módulo aberto aparece (nada de rolagem infinita).
    await expect(page.getByRole("heading", { name: "Convalidação", level: 3 })).toHaveCount(0);
    await page.getByTestId("concluir-modulo-1").click();
    await expect(page.getByRole("heading", { name: "Introdução", level: 3 })).toHaveCount(0);
    const th = page.locator(".ap-tabela thead th").first();
    await expect(th).toHaveCSS("background-color", "rgb(10, 10, 10)");
    await page.getByTestId("concluir-modulo-2").click();
    await expect(page.getByRole("heading", { name: /Entendimento dos tribunais/, level: 3 })).toContainText("[não verificado]");
    await expect(page.locator(".ap-pendente")).toContainText("Súmula 473");
    await noHorizontalScroll(page);
  });

  test("só avança de módulo depois de concluir o módulo pendente", async ({ page }) => {
    await page.goto(`${G}/aula`);
    const m3 = pages(page).getByRole("button", { name: "Módulo 3" });
    await expect(m3).toHaveAttribute("aria-disabled", "true");
    await m3.dispatchEvent("click");
    await expect(page.getByTestId("trava-modulo")).toContainText("Conclua o Módulo 1");
    await expect(page.getByText("Módulo 3 de 3")).toHaveCount(0);
    await pages(page).getByRole("button", { name: "Questões" }).dispatchEvent("click");
    await expect(page.getByRole("heading", { name: "Nível Fácil", level: 2 })).toHaveCount(0);
    await page.getByTestId("comecar-aula").click();
    await page.getByTestId("concluir-modulo-1").click();
    await expect(pages(page).getByRole("button", { name: "Módulo 2" })).not.toHaveAttribute("aria-disabled", "true");
    await expect(m3).toHaveAttribute("aria-disabled", "true");
  });

  test("concluir os módulos em sequência registra a leitura e leva às questões", async ({ page }) => {
    await page.goto(`${G}/aula`);
    await page.getByTestId("comecar-aula").click();
    await page.getByTestId("concluir-modulo-1").click();
    await expect(page.getByText("Módulo 2 de 3")).toBeVisible();
    await expect(pages(page).getByRole("button", { name: "Módulo 1" })).toHaveAttribute("data-concluida", "1");
    await page.getByTestId("concluir-modulo-2").click();
    await page.getByTestId("concluir-modulo-3").click();
    await expect(page.getByRole("heading", { name: "Nível Fácil", level: 2 })).toBeVisible();
    await pages(page).getByRole("button", { name: "Início" }).click();
    await expect(page.getByText("3/3")).toBeVisible();
  });

  test("questão em card interativo: escolhe, responde, mostra ACERTOU, comentário por alternativa e o comentário geral", async ({ page }) => {
    await page.goto(`${G}/aula`);
    await finishTheory(page);
    const q1 = page.getByRole("article", { name: "Questão 1" });
    await q1.getByText("anular a licença, por ilegalidade", { exact: false }).click();
    await q1.getByRole("button", { name: "Responder", exact: true }).click();
    await expect(q1.getByText("ACERTOU")).toBeVisible();
    await expect(q1.getByText(/CORRETA · SUA RESPOSTA/)).toBeVisible();
    await expect(q1.getByTestId("gabarito-comentado")).toBeVisible();
    // Resposta gravada em outra visita: abre com o quadro Gabarito × Sua resposta.
    const q2 = page.getByRole("article", { name: "Questão 2" });
    await expect(q2.getByRole("cell", { name: "ERRADO" }).first()).toBeVisible();
    await expect(q2.getByText("ACERTOU")).toBeVisible();
  });

  test("ao responder todas do nível, o fácil é aprovado sozinho e o médio é liberado", async ({ page }) => {
    await page.goto(`${G}/aula`);
    await finishTheory(page);
    const q1 = page.getByRole("article", { name: "Questão 1" });
    await q1.getByText("anular a licença, por ilegalidade", { exact: false }).click();
    await q1.getByRole("button", { name: "Responder", exact: true }).click();
    const fac = page.getByTestId("nivel-facil");
    // Respondeu todas do nível: o resultado sai sozinho, sem tocar em "Calcular".
    await expect(fac.getByText(/Nível fácil aprovado com 100%/)).toBeVisible();
    await page.getByTestId("proximo-nivel").click();
    await expect(page.getByTestId("nivel-medio")).toContainText("Liberado");
  });

  test("nível reprovado oferece recuperação em vez de reiniciar", async ({ page }) => {
    await page.goto(`${G}/aula`);
    await finishTheory(page);
    const q1 = page.getByRole("article", { name: "Questão 1" });
    await q1.getByText("revogar a licença, por conveniência", { exact: false }).click();
    await q1.getByRole("button", { name: "Responder", exact: true }).click();
    await expect(q1.getByText("ERROU")).toBeVisible();
    const fac = page.getByTestId("nivel-facil");
    await expect(fac.getByText(/mínimo para avançar é 90%/)).toBeVisible();
    await fac.getByRole("button", { name: "Gerar exercícios de recuperação" }).click();
    await expect(page.getByTestId("recuperacao-facil")).toBeVisible();
  });

  test("anotar, marcar para revisar, esclarecer e voltar ao tema pela anotação", async ({ page }) => {
    await page.goto(`${G}/aula`);
    await page.getByTestId("comecar-aula").click();
    const actions = page.getByRole("toolbar", { name: "Ações da seção Introdução" });
    await actions.getByRole("button", { name: "Revisar depois" }).click();
    await expect(actions.getByRole("button", { name: "Marcado para revisar" })).toBeVisible();
    await actions.getByRole("button", { name: "Esclarecer" }).click();
    await page.getByRole("textbox", { name: "O que não ficou claro?" }).fill("O que é efeito ex tunc?");
    await page.getByRole("button", { name: "Pedir explicação" }).click();
    await expect(page.getByText(/Resposta de demonstração da galeria/)).toBeVisible();
    for (const n of [1, 2]) await page.getByTestId(`concluir-modulo-${n}`).click();
    await pages(page).getByRole("button", { name: "Início" }).click();
    await page.getByRole("button", { name: /Minhas anotações/ }).click();
    await page.getByRole("dialog", { name: /anotações/i }).getByRole("button", { name: /Convalidação/ }).first().click();
    await expect(page.getByText("Módulo 3 de 3")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Convalidação", level: 3 })).toBeInViewport();
  });

  test("revisão e fontes: pontos de revisão, referências, conteúdo e o PDF", async ({ page }) => {
    await page.goto(`${G}/aula`);
    await pages(page).getByRole("button", { name: /Revisão e fontes/ }).click();
    await expect(page.getByRole("cell", { name: "STF, Súmula 473", exact: false })).toBeVisible();
    await expect(page.getByRole("cell", { name: "Não verificada" })).toBeVisible();
    await expect(page.locator("section#pdf").getByRole("heading", { name: "PDF deste conteúdo" })).toBeVisible();
    await noHorizontalScroll(page);
  });

  test("árvore de aulas: barra lateral no desktop, menu no celular", async ({ page, isMobile }) => {
    await page.goto(`${G}/aula`);
    if (isMobile) await page.getByRole("button", { name: "Abrir menu" }).click();
    const tree = page.getByRole("navigation", { name: "Aulas deste estudo" }).filter({ visible: true });
    await expect(tree).toHaveCount(1);
    await expect(tree.locator('[aria-current="page"]')).toBeVisible();
  });
});
