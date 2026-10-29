import { expect, test } from "@playwright/test";

/** Admin › Alunos (galeria, dados fictícios em memória). */
const URL = "/dev/galeria/alunos";

test.describe("admin: alunos e planos", () => {
  test("lista, busca e filtra por situação do plano", async ({ page }) => {
    await page.goto(URL);
    await expect(page.getByTestId("alunos-contagem")).toHaveText("4 de 4 alunos");
    await expect(page.getByTestId("aluno-linha").filter({ hasText: "Carla Dias" })).toContainText(/Pago · vence em 3 dias/);
    await expect(page.getByTestId("aluno-linha").filter({ hasText: "Diego Melo" })).toContainText("Expirado");
    await page.getByLabel("Buscar por nome ou e-mail").fill("bruno@");
    await expect(page.getByTestId("aluno-linha")).toHaveCount(1);
    await page.getByLabel("Buscar por nome ou e-mail").fill("");
    await page.getByLabel("Filtrar por plano").selectOption("vencendo");
    await expect(page.getByTestId("aluno-linha")).toHaveText([/Carla Dias/]);
    await page.getByLabel("Filtrar por plano").selectOption("gratuito");
    await expect(page.getByTestId("aluno-linha")).toHaveText([/Ana Souza/]);
  });

  test("marcar como PAGO (semestral) libera o plano e mostra o vencimento", async ({ page }) => {
    await page.goto(URL);
    const ana = page.getByTestId("aluno-linha").filter({ hasText: "Ana Souza" });
    await ana.getByTestId("gerenciar-aluno").click();
    const painel = page.getByTestId("painel-aluno");
    await painel.getByLabel("Semestral").check();
    await painel.getByLabel("Valor pago (opcional)").fill("149,90");
    await painel.getByTestId("marcar-pago").click();
    await expect(painel.getByTestId("aluno-aviso")).toContainText("Pagamento registrado. Plano vale até");
    await expect(ana).toContainText("Premium · Semestral");
    await expect(ana).toContainText("Pago · ativo");
    await expect(ana).toContainText("R$ 149,90");
  });

  test("mudar o plano pelo painel (volta ao gratuito)", async ({ page }) => {
    await page.goto(URL);
    const bruno = page.getByTestId("aluno-linha").filter({ hasText: "Bruno Lima" });
    await bruno.getByTestId("gerenciar-aluno").click();
    await page.getByTestId("mudar-plano-select").selectOption("free");
    await page.getByTestId("salvar-plano").click();
    await expect(page.getByTestId("aluno-aviso")).toHaveText("Plano atualizado.");
    await expect(bruno).toContainText("Gratuito");
  });

  test("senha nova: pede confirmação e mostra a senha uma vez", async ({ page }) => {
    await page.goto(URL);
    await page.getByTestId("aluno-linha").filter({ hasText: "Carla Dias" }).getByTestId("gerenciar-aluno").click();
    await page.getByTestId("refazer-senha").click();
    await page.getByTestId("confirmar-senha").click();
    await expect(page.getByTestId("senha-nova")).toHaveText(/^[A-Za-z0-9]{12}$/);
  });
});
