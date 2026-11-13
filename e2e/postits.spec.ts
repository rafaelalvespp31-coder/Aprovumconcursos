import { expect, test, type Page } from "@playwright/test";

/**
 * Post-its, barra de estudo e PDF de revisão na galeria (servidor em memória: nada é gravado).
 * A persistência real (RLS, versões, duplicidade) é verificada no banco e nos testes unitários.
 */
const URL = "/dev/galeria/aula";

async function abrirModulo(page: Page, n = 1) {
  await page.goto(URL);
  const btn = page.getByRole("navigation", { name: "Páginas da aula" }).getByRole("button", { name: `Módulo ${n}` });
  await btn.scrollIntoViewIfNeeded();
  await btn.click();
  await expect(page.locator(".ap-secao").first()).toBeVisible({ timeout: 15000 });
}

/** No celular a folha de post-its cobre a barra: fecha antes de usar outra ferramenta. */
async function fecharPainel(page: Page) {
  const fechar = page.getByRole("button", { name: "Fechar painel" });
  if (await fechar.isVisible().catch(() => false)) await fechar.click();
}

async function selecionar(page: Page, trecho: string) {
  await page.evaluate((t) => {
    const root = document.querySelector(".ap-secao")!;
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (w.nextNode()) {
      const n = w.currentNode as Text;
      const i = n.data.indexOf(t);
      if (i >= 0) {
        const r = document.createRange();
        r.setStart(n, i);
        r.setEnd(n, i + t.length);
        const s = window.getSelection()!;
        s.removeAllRanges();
        s.addRange(r);
        return;
      }
    }
    throw new Error("trecho não encontrado: " + t);
  }, trecho);
}

async function primeiroTrecho(page: Page): Promise<string> {
  return page.evaluate(() => {
    const p = document.querySelector(".ap-secao p");
    return (p?.textContent ?? "").trim().split(/\s+/).slice(0, 5).join(" ");
  });
}

test.describe("barra de estudo e post-its", () => {
  test("barra com as quatro ferramentas, dicas e estados", async ({ page }) => {
    await page.goto(URL);
    const dock = page.getByTestId("st-dock");
    await expect(dock).toBeVisible();
    for (const id of ["st-postit", "st-explicar", "st-pdf", "st-mentor"]) await expect(page.getByTestId(id)).toBeVisible();
    await expect(page.getByTestId("st-postit")).toHaveAttribute("aria-label", "Post-it de revisão");
    await page.getByTestId("st-pdf").click();
    await expect(page.getByTestId("st-painel-pdf")).toBeVisible();
    await expect(page.getByTestId("st-gerar-pdf")).toBeDisabled();
    await page.keyboard.press("Escape");
    await expect(page.getByTestId("st-painel-pdf")).toHaveCount(0);
  });

  test("trecho em tabela guarda linhas e colunas (estrutura) no post-it", async ({ page }) => {
    await abrirModulo(page);
    // Insere uma tabela real no texto da aula (só no navegador) e seleciona as células.
    await page.evaluate(() => {
      const sec = document.querySelector(".ap-secao")!;
      const t = document.createElement("table");
      t.innerHTML = "<thead><tr><th>Quadro</th><th>Regra</th></tr></thead><tbody><tr><td>Alfa</td><td>Primeira regra</td></tr><tr><td>Beta</td><td>Segunda regra</td></tr></tbody>";
      sec.querySelector("p")!.after(t);
      const r = document.createRange();
      r.selectNodeContents(t);
      const s = window.getSelection()!;
      s.removeAllRanges();
      s.addRange(r);
    });
    await page.getByTestId("postit-botao").click();
    const card = page.getByTestId("postit-card").first();
    await expect(card.getByTestId("postit-tabela")).toBeVisible();
    await expect(card.getByTestId("postit-tabela").locator("tr")).toHaveCount(3);
    await expect(card.getByTestId("postit-tabela").locator("th")).toHaveCount(2);
    await expect(card.getByTestId("postit-tabela").locator("td").nth(3)).toHaveText("Segunda regra");
  });

  test("criar, anotar, ir ao trecho, excluir com confirmação", async ({ page }) => {
    await abrirModulo(page);
    const trecho = await primeiroTrecho(page);
    await selecionar(page, trecho);
    await page.getByTestId("postit-botao").click();
    const card = page.getByTestId("postit-card").first();
    await expect(card).toBeVisible();
    await expect(card.getByTestId("postit-trecho")).toContainText(trecho.split(" ")[0]!);
    await card.getByTestId("postit-nota").fill("Cai muito em prova");
    await expect(card.getByTestId("postit-estado")).toContainText("Salvo", { timeout: 4000 });
    await card.getByTestId("postit-excluir").click();
    await expect(card).toBeVisible();
    await card.getByRole("button", { name: "Manter" }).click();
    await expect(card.getByTestId("postit-excluir-sim")).toHaveCount(0);
    await card.getByTestId("postit-excluir").click();
    await card.getByTestId("postit-excluir-sim").click();
    await expect(page.getByTestId("postit-card")).toHaveCount(0);
    await expect(page.getByTestId("st-aviso")).toContainText("O texto da aula não mudou");
  });

  test("trecho repetido não duplica; PDF gera versões e reaproveita quando nada muda", async ({ page }) => {
    await abrirModulo(page);
    const trecho = await primeiroTrecho(page);
    await selecionar(page, trecho);
    await page.getByTestId("st-postit").click();
    await fecharPainel(page);
    await expect(page.locator(".st-badge")).toHaveText("1");
    await selecionar(page, trecho);
    await page.getByTestId("st-postit").click();
    await expect(page.getByTestId("st-aviso")).toContainText("já tem um post-it");
    await fecharPainel(page);
    await expect(page.locator(".st-badge")).toHaveText("1");
    await page.getByTestId("st-pdf").click();
    await page.getByTestId("st-gerar-pdf").click();
    await expect(page.getByTestId("st-versoes")).toContainText("v1");
    await page.getByTestId("st-gerar-pdf").click();
    await expect(page.getByTestId("st-aviso")).toContainText("Nada mudou");
    await expect(page.getByTestId("st-versoes").locator("li")).toHaveCount(1);
    await page.addStyleTag({ content: ".mentor-flut{display:none!important}" });
    // Excluir a versão: pede confirmação (um toque arma, o segundo exclui).
    await page.getByTestId("st-pdf-excluir").click();
    await expect(page.getByTestId("st-versoes").locator("li")).toHaveCount(1);
    await page.getByTestId("st-pdf-excluir").click();
    await expect(page.getByTestId("st-versoes")).toHaveCount(0);
    await expect(page.getByTestId("st-aviso")).toContainText("PDF excluído");
  });

  test("tocar na barra e selecionar cola o post-it ao lado da folha", async ({ page, isMobile }) => {
    await abrirModulo(page);
    await page.getByTestId("st-postit").click();
    await expect(page.getByTestId("st-dica")).toBeVisible();
    await selecionar(page, await primeiroTrecho(page));
    await expect(page.getByTestId("postit-card")).toBeVisible();
    await expect(page.getByTestId("st-dica")).toHaveCount(0);
    if (!isMobile) {
      // selinho na margem da folha, fora do texto
      await page.keyboard.press("Escape");
      const aba = page.getByTestId("postit-aba");
      await expect(aba).toBeVisible();
      const [a, t] = await Promise.all([aba.boundingBox(), page.locator(".ap-secao").first().boundingBox()]);
      expect(a!.x).toBeGreaterThanOrEqual(t!.x + t!.width - 2);
    }
  });

  test("a explicação do trecho acompanha o post-it (antes ou depois de criá-lo)", async ({ page }) => {
    await abrirModulo(page);
    const trecho = await primeiroTrecho(page);
    await selecionar(page, trecho);
    await expect(page.getByTestId("explicar-botao")).toBeVisible();
    await page.getByTestId("st-explicar").click();
    await expect(page.getByTestId("explicar-resposta")).toContainText("Explicação de exemplo");
    await page.getByTestId("st-postit").click();
    await expect(page.getByTestId("postit-explicacao")).toContainText("Explicação de exemplo");
  });

  test("seleção em duas seções é recusada", async ({ page }) => {
    await abrirModulo(page);
    await page.evaluate(() => {
      const secs = document.querySelectorAll(".ap-secao");
      if (secs.length < 2) throw new Error("precisa de 2 seções visíveis");
      const a = secs[0]!.querySelector("p")!.firstChild!;
      const b = secs[1]!.querySelector("p")!.firstChild!;
      const r = document.createRange();
      r.setStart(a, 0);
      r.setEnd(b, 3);
      const s = window.getSelection()!;
      s.removeAllRanges();
      s.addRange(r);
    });
    await page.getByTestId("st-postit").click();
    await expect(page.getByTestId("st-aviso")).toContainText("única seção");
  });

  test("Explicar na barra reaproveita a explicação existente", async ({ page }) => {
    await abrirModulo(page);
    await selecionar(page, await primeiroTrecho(page));
    await expect(page.getByTestId("explicar-botao")).toBeVisible();
    await page.getByTestId("st-explicar").click();
    await expect(page.getByTestId("explicar-resposta")).toContainText("Explicação de exemplo");
  });

  test("Mentor abre só a orbe animada, sem cartão, e não sai da aula", async ({ page }) => {
    let body: { study?: { lessonId?: string; lesson?: string } } = {};
    await page.route("**/api/mentor/voz", async (route) => {
      const req = route.request();
      if (req.method() === "POST") {
        body = req.postDataJSON();
        return route.fulfill({ status: 403, json: { error: "x", code: "plan_limit" } });
      }
      return route.fulfill({ json: { status: { available: true, limit: 180, left: 180 } } });
    });
    await page.context().grantPermissions(["microphone"]).catch(() => {});
    await page.goto(URL);
    // Na galeria o Mentor global não some como na aula real (/aula/…); aqui só tiramos do caminho.
    await page.addStyleTag({ content: ".mentor-flut{display:none!important}" });
    await page.getByTestId("st-mentor").click();
    await expect(page.getByTestId("mentor-orb-solo")).toBeVisible();
    await expect(page.getByTestId("mentor-orb-solo")).toContainText(/mentor|conectando/i);
    await expect(page.getByTestId("st-painel-mentor")).toHaveCount(0);
    await expect(page.getByTestId("voz-iniciar")).toHaveCount(0);
    await expect(page).toHaveURL(/\/dev\/galeria\/aula/);
    await expect.poll(() => body.study?.lessonId ?? "", { timeout: 4000 }).toMatch(/[0-9a-f-]{36}|^$/);
    // Sem microfone real na galeria a sessão falha: tocar na orbe tenta de novo (nunca abre cartão).
    await page.getByTestId("mentor-orb-solo").locator("button").click();
    await expect(page.getByTestId("st-painel-mentor")).toHaveCount(0);
    await expect(page.getByTestId("mentor-orb-solo")).toBeVisible();
  });
});
