import { expect, test, type Page } from "@playwright/test";

/**
 * Post-its, barra de estudo e PDF de revisão na galeria (servidor em memória: nada é gravado).
 * A persistência real (RLS, versões, duplicidade) é verificada no banco e nos testes unitários.
 */
const URL = "/dev/galeria/aula";

async function abrirModulo(page: Page, n = 1) {
  await page.goto(URL);
  await page.getByRole("navigation", { name: "Páginas da aula" }).getByRole("button", { name: `Módulo ${n}` }).click();
  await expect(page.locator(".ap-secao").first()).toBeVisible();
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

  test("Mentor abre direto no painel de voz, sem sair da aula", async ({ page }) => {
    await page.route("**/api/mentor/voz", (route) =>
      route.fulfill({ json: { status: { available: false, reason: "plano", limit: 180, left: 0 } } }),
    );
    await page.goto(URL);
    await page.getByTestId("st-mentor").click();
    await expect(page.getByTestId("st-painel-mentor")).toBeVisible();
    await expect(page).toHaveURL(/\/dev\/galeria\/aula/);
    await page.getByRole("button", { name: "Fechar painel" }).click();
    await expect(page.getByTestId("st-dock")).toBeVisible();
  });
});
