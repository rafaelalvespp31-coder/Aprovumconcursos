import { expect, test } from "@playwright/test";

/** Painel (Home de operações): avatar no centro, cards de gamificação e "Solicitar meu avatar" (galeria). */
const URL = "/dev/galeria/painel";

test.describe("painel (avatar)", () => {
  test("operador, missões, disciplina, desempenho, conquistas, ranking e concursos ao redor do avatar", async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByTestId("painel-avatar")).toBeVisible();
    await expect(page.getByTestId("operador-nome")).toHaveText("Rafael Alves");
    await expect(page.getByTestId("operador-nivel")).toHaveText("1");
    await expect(page.getByTestId("avatar-xp")).toHaveText("1.000");
    await expect(page.getByTestId("avatar-ranking")).toContainText("#3");
    await expect(page.getByTestId("missao-estudar")).toHaveAttribute("data-done", "true");
    await expect(page.getByTestId("missao-revisar")).toContainText("6/15");
    await expect(page.getByTestId("xp-hoje")).toContainText("200 XP");
    await expect(page.getByTestId("streak-atual")).toHaveText("12");
    await expect(page.getByTestId("retomar-missao")).toHaveAttribute("href", /\/aula\//);
    await expect(page.getByTestId("perf-taxa")).toHaveText("82%");
    await expect(page.getByTestId("conquista-primeiro_combate")).toHaveAttribute("data-unlocked", "true");
    await expect(page.getByTestId("conquista-caveira_elite")).toHaveAttribute("data-unlocked", "false");
    await expect(page.getByTestId("contagem-regressiva")).toBeVisible();
    // Banner das aprovações volta, no fim da página (abaixo dos concursos).
    const banner = page.getByTestId("painel-banner");
    await expect(banner).toBeVisible();
    const [conc, ban] = await Promise.all([page.getByTestId("home-operacao").boundingBox(), banner.boundingBox()]);
    expect(ban!.y).toBeGreaterThan(conc!.y + conc!.height - 2);
    // Sem rolagem horizontal.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  });

  test("aluno sem histórico: estados vazios, nada inventado", async ({ page }) => {
    await page.goto(`${URL}?dados=vazio`);
    await expect(page.getByTestId("avatar-xp")).toHaveText("0");
    await expect(page.getByTestId("avatar-ranking")).toContainText("Em formação");
    await expect(page.getByTestId("seu-desempenho")).toContainText("Ainda não existem dados suficientes para gerar sua análise.");
    await expect(page.getByTestId("comecar-missao")).toBeVisible();
    await expect(page.getByTestId("proximos-concursos")).toContainText("Nenhum concurso cadastrado");
    await expect(page.getByTestId("contagem-regressiva")).toHaveCount(0);
    await expect(page.locator('[data-unlocked="true"]')).toHaveCount(0);
  });

  test("LEVEL UP aparece e fecha", async ({ page }) => {
    await page.goto(`${URL}?levelup=1`);
    await expect(page.getByTestId("level-up")).toContainText("LEVEL UP");
    await page.getByRole("button", { name: "Continuar" }).click();
    await expect(page.getByTestId("level-up")).toHaveCount(0);
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
    await page.getByTestId("solicitar-avatar").click();
    await expect(page.getByTestId("avatar-obs-iluminacao")).toContainText("bem iluminado");
    await expect(page.getByTestId("avatar-enviar-foto")).toBeDisabled();
    // imagem 1x1 PNG válida
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
    await page.getByTestId("avatar-foto").setInputFiles({ name: "corpo.png", mimeType: "image/png", buffer: png });
    await page.getByTestId("avatar-enviar-foto").click();
    await expect(page.getByTestId("avatar-solicitacao-status")).toContainText("Foto recebida");
    await expect(page.getByTestId("avatar-solicitar-botao")).toHaveText(/Enviar outra foto/);
  });

  test("sem botões de gênero; patente no card (Aluno → Recruta → Policial)", async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByTestId("avatar-genero-m")).toHaveCount(0);
    await expect(page.getByTestId("avatar-patente")).toHaveText("ALUNO");
    await page.goto(`${URL}?nivel=12`);
    await expect(page.getByTestId("avatar-patente")).toHaveText("RECRUTA");
    await page.goto(`${URL}?nivel=27`);
    await expect(page.getByTestId("avatar-patente")).toHaveText("POLICIAL");
  });

  test("avatar feminino (definido no cadastro) também é a arte oficial animada", async ({ page }) => {
    await page.goto(`${URL}?genero=f`);
    const palco = page.getByTestId("avatar-palco");
    await expect(palco).toHaveAttribute("data-mode", "arte-2d");
    await expect(palco).toHaveAttribute("data-ready", "true");
  });
});

test("cadastro pede o gênero que define o avatar", async ({ page }) => {
  await page.goto("/cadastro");
  const g = page.getByTestId("cadastro-genero");
  await expect(g.getByLabel("Masculino")).toBeVisible();
  await expect(g.getByLabel("Feminino")).toBeVisible();
});

test("equipe anexa a arte do aluno: recorte do fundo, olhos marcados e avatar animado com a nova arte", async ({ page }) => {
  test.setTimeout(90_000);
  await page.goto("/dev/galeria/avatar-personalizado");
  await page.getByTestId("avatar-arte-arquivo").setInputFiles("tests/fixtures/avatar-arte-fundo-liso.jpg");
  const head = page.getByTestId("avatar-arte-cabeca");
  await expect(head).toBeVisible({ timeout: 30_000 });
  const box = (await head.boundingBox())!;
  // Olhos da arte feminina (coordenadas da arte recortada, parte de cima = 24% da altura).
  await head.click({ position: { x: box.width * 0.4215, y: box.height * (0.0862 / 0.24) } });
  await head.click({ position: { x: box.width * 0.5432, y: box.height * (0.0862 / 0.24) } });
  await page.getByRole("button", { name: "Salvar como avatar do aluno" }).click();
  await expect(page.getByRole("status")).toContainText("Avatar do aluno atualizado", { timeout: 30_000 });
  const palco = page.getByTestId("demo-palco-personalizado").getByTestId("avatar-palco");
  await expect(palco).toHaveAttribute("data-ready", "true", { timeout: 20_000 });
  await expect(palco).toHaveAttribute("data-mode", "arte-2d");
  // Respira e pisca com a arte nova.
  const b1 = Number(await palco.getAttribute("data-breath"));
  await expect.poll(async () => Number(await palco.getAttribute("data-breath")), { timeout: 8_000 }).not.toBe(b1);
  await expect.poll(async () => Number(await palco.getAttribute("data-blinks")), { timeout: 15_000 }).toBeGreaterThan(0);
});
