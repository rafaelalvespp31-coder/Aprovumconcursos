import { expect, test } from "@playwright/test";

/** Painel: banner das aprovações + card do avatar + "Solicitar meu avatar" (galeria). */
const URL = "/dev/galeria/painel";

test.describe("painel (avatar)", () => {
  test("banner no topo e só o card do avatar (sem editor e sem os cards antigos)", async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByTestId("painel-banner")).toBeVisible();
    await expect(page.getByTestId("painel-avatar")).toBeVisible();
    await expect(page.getByTestId("avatar-info")).toContainText("Rafael Silva");
    await expect(page.getByTestId("avatar-xp")).toHaveText("1.250");
    await expect(page.getByTestId("avatar-ranking")).toHaveText(/#12\.487/);
    await expect(page.getByText(/PERSONALIZE SEU/)).toHaveCount(0);
    await expect(page.getByText(/Seu progresso|Acesso rápido|Seu desempenho/)).toHaveCount(0);
  });

  test("personagem respira, pisca e mexe a cabeça (arte oficial animada)", async ({ page }) => {
    test.setTimeout(90_000);
    await page.goto(URL);
    const palco = page.getByTestId("avatar-palco");
    await expect(palco).toHaveAttribute("data-mode", "arte-2d");
    await expect(palco).toHaveAttribute("data-ready", "true");
    const read = () => palco.evaluate((c) => ({ breath: Number(c.dataset.breath), blinks: Number(c.dataset.blinks), head: Number(c.dataset.head) }));
    const samples = [];
    for (let i = 0; i < 8; i++) {
      samples.push(await read());
      await page.waitForTimeout(900);
    }
    const breaths = samples.map((s) => s.breath);
    expect(Math.max(...breaths) - Math.min(...breaths)).toBeGreaterThan(0.2);
    expect(new Set(samples.map((s) => s.head.toFixed(3))).size).toBeGreaterThan(3);
    expect(samples.at(-1)!.blinks).toBeGreaterThanOrEqual(1);
  });

  test("Solicitar meu avatar: foto de corpo inteiro e aviso de iluminação", async ({ page }) => {
    await page.goto(URL);
    await page.getByTestId("avatar-solicitar-botao").click();
    await expect(page.getByTestId("avatar-obs-iluminacao")).toContainText("bem iluminado");
    await expect(page.getByTestId("avatar-enviar-foto")).toBeDisabled();
    // imagem 1x1 PNG válida
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    await page.getByTestId("avatar-foto").setInputFiles({ name: "corpo.png", mimeType: "image/png", buffer: png });
    await page.getByTestId("avatar-enviar-foto").click();
    await expect(page.getByTestId("avatar-solicitacao-status")).toContainText("Foto recebida");
    await expect(page.getByTestId("avatar-solicitar-botao")).toHaveText(/Enviar outra foto/);
  });

  test("trocar para feminino mostra o aviso de produção", async ({ page }) => {
    await page.goto(URL);
    await page.getByTestId("avatar-genero-f").click();
    await expect(page.getByTestId("avatar-palco-producao")).toContainText("Personagem 3D em produção");
  });
});
