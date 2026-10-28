import { expect, test, type Page } from "@playwright/test";

/**
 * Caderno de erros (janela editável) na galeria: organizado por matéria › tema › assunto,
 * barra de formatação, salvar, restaurar e aviso de alterações não salvas. Nada é gravado de fato.
 */
const URL = "/dev/galeria/questoes/cadernos/11111111-1111-4111-8111-111111111111?retomar=1";

async function open(page: Page) {
  await page.goto(URL);
  await page.getByTestId("abrir-caderno-erros").click();
  const modal = page.getByRole("dialog", { name: "Caderno de erros" });
  await expect(modal.getByTestId("erro-item")).toHaveCount(4);
  return modal;
}

test.describe("caderno de erros", () => {
  test("abre organizado por matéria, tema e assunto — sem enunciado nem gabarito", async ({ page }) => {
    const modal = await open(page);
    await expect(modal.locator(".ce-materia-titulo")).toHaveText(["Direito Administrativo", "Direito Penal"]);
    await expect(modal.locator(".ce-assunto-titulo")).toHaveText(["Furto", "Roubo"]);
    await expect(modal.getByRole("toolbar", { name: "Formatação do texto" })).toBeVisible();
    await expect(modal).not.toContainText(/Gabarito|Resposta correta|Resposta incorreta/);
    // Sem PDF.
    await expect(page.getByRole("link", { name: /PDF/ })).toHaveCount(0);
  });

  test("editar com negrito e cor, salvar e reabrir: a edição continua lá", async ({ page }) => {
    const modal = await open(page);
    const ed = modal.getByRole("textbox").first();
    await ed.click();
    await page.keyboard.press("End");
    await page.keyboard.type(" Minha observação");
    await page.keyboard.down("Shift");
    for (let k = 0; k < "observação".length; k++) await page.keyboard.press("ArrowLeft");
    await page.keyboard.up("Shift");
    await modal.getByRole("button", { name: "Negrito" }).click();
    await modal.getByRole("button", { name: "Cor do texto" }).click();
    await modal.getByRole("button", { name: "Texto vermelho" }).click();
    await expect(modal.getByTestId("caderno-erros-status")).toContainText("1 alteração não salva");
    await expect(modal.getByText("Não salvo")).toBeVisible();
    await modal.getByTestId("caderno-erros-salvar").click();
    await expect(modal.getByTestId("caderno-erros-status")).toContainText("Tudo salvo");
    await expect(modal.getByText("Editado por você")).toBeVisible();
    await modal.getByRole("button", { name: "Fechar", exact: true }).click();
    await expect(modal).toBeHidden();

    await page.getByTestId("abrir-caderno-erros").click();
    const again = page.getByRole("dialog", { name: "Caderno de erros" });
    const first = again.getByRole("textbox").first();
    await expect(first).toContainText("Minha observação");
    const html = await first.innerHTML();
    expect(html).toMatch(/<b>|font-weight/);
    expect(html).toMatch(/color: (rgb\(229, 9, 20\)|#e50914)/i);
    // Restaurar original e salvar: volta o texto do comentário.
    await again.getByRole("button", { name: "Restaurar original" }).click();
    await again.getByTestId("caderno-erros-salvar").click();
    await expect(again.getByTestId("caderno-erros-status")).toContainText("Tudo salvo");
    await expect(again.getByRole("textbox").first()).not.toContainText("Minha observação");
  });

  test("fechar com alteração pendente pergunta antes; Esc também", async ({ page }) => {
    const modal = await open(page);
    await modal.getByRole("textbox").nth(1).click();
    await page.keyboard.type(" x");
    await page.keyboard.press("Escape");
    await expect(modal.getByText("Você tem alterações não salvas.")).toBeVisible();
    await modal.getByRole("button", { name: "Salvar e fechar" }).click();
    await expect(modal).toBeHidden();
  });

  test("colar HTML com script não injeta nada", async ({ page }) => {
    const modal = await open(page);
    const ed = modal.getByRole("textbox").first();
    await ed.click();
    await ed.evaluate((el) => {
      const dt = new DataTransfer();
      dt.setData("text/html", '<b>colado</b><img src=x onerror="window.__xss=1"><script>window.__xss=1</script>');
      el.dispatchEvent(new ClipboardEvent("paste", { clipboardData: dt, bubbles: true, cancelable: true }));
    });
    await expect(ed).toContainText("colado");
    expect(await ed.innerHTML()).not.toMatch(/img|script|onerror/);
    expect(await page.evaluate(() => (window as unknown as { __xss?: number }).__xss)).toBeUndefined();
  });

  test("cabe na tela do celular sem rolagem lateral", async ({ page }) => {
    const modal = await open(page);
    const box = (await modal.boundingBox())!;
    const vp = page.viewportSize()!;
    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(vp.width + 0.5);
    expect(box.y + box.height).toBeLessThanOrEqual(vp.height + 0.5);
    expect(await modal.evaluate((el) => el.scrollWidth - el.clientWidth)).toBeLessThanOrEqual(0);
  });
});
