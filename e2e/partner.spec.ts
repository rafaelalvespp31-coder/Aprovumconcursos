import { expect, test } from "@playwright/test";

/** APROVUM BUSINESS (painel do sócio) e GESTÃO DO SÓCIO ADMIN — galeria com dados de exemplo. */
test.describe("APROVUM BUSINESS", () => {
  test("com todas as permissões mostra as quatro seções e os indicadores", async ({ page }) => {
    await page.goto("/dev/business");
    await expect(page.getByText("APROVUM BUSINESS — PARTNER DASHBOARD")).toBeVisible();
    for (const id of ["visao-geral", "crescimento", "comercial", "desempenho"]) await expect(page.locator(`section#${id}`)).toBeVisible();
    await expect(page.getByTestId("kpi-total")).toContainText("1.842");
    await expect(page.getByTestId("kpi-faturamento")).toContainText("R$");
    await expect(page.getByTestId("lista-pagantes")).toContainText("b•••@exemplo.com");
  });

  test("permissão desativada: o indicador some (sem zero no lugar)", async ({ page }) => {
    await page.goto("/dev/business?perfil=geral");
    await expect(page.locator("section#visao-geral")).toBeVisible();
    await expect(page.locator("section#comercial")).toHaveCount(0);
    await expect(page.getByTestId("kpi-pagantes")).toHaveCount(0);
    await expect(page.getByTestId("kpi-faturamento")).toHaveCount(0);
    await expect(page.getByText(/R\$/)).toHaveCount(0);
    await expect(page.getByRole("navigation", { name: "Seções" }).getByRole("link")).toHaveText(["Visão geral", "Crescimento", "Desempenho"]);
  });

  test("conversão e lista não aparecem sem a permissão de pagantes; histórico sem valores sem faturamento", async ({ page }) => {
    await page.goto("/dev/business?perfil=conversao_sem_pagantes");
    await expect(page.getByTestId("kpi-conversao")).toHaveCount(0);
    await expect(page.getByTestId("lista-pagantes")).toHaveCount(0);
    const hist = page.getByTestId("historico-pagamentos");
    await expect(hist).toBeVisible();
    await expect(hist.getByRole("columnheader", { name: "Valor" })).toHaveCount(0);
    await expect(hist).not.toContainText("R$");
  });

  test("sem nenhuma permissão e acesso desativado", async ({ page }) => {
    await page.goto("/dev/business?perfil=nenhum");
    await expect(page.getByTestId("business-sem-permissoes")).toBeVisible();
    await expect(page.locator(".bz-kpi")).toHaveCount(0);
    await page.goto("/dev/business?perfil=desativado");
    await expect(page.getByTestId("business-desativado")).toContainText("Acesso desativado");
  });

  test("filtro de período, agrupamento e dica do gráfico", async ({ page }) => {
    await page.goto("/dev/business");
    await page.getByRole("link", { name: "90 dias" }).click();
    await expect(page).toHaveURL(/periodo=90/);
    await expect(page.locator("#crescimento")).toContainText("Período: 90 dias.");
    await page.getByRole("tab", { name: "Mensal" }).click();
    await expect(page.getByRole("tab", { name: "Mensal" })).toHaveAttribute("aria-selected", "true");
    const chart = page.locator("#crescimento .bz-grafico svg").first();
    await chart.scrollIntoViewIfNeeded();
    const box = (await chart.boundingBox())!;
    await page.mouse.move(box.x + box.width * 0.6, box.y + box.height * 0.6);
    await expect(page.locator("#crescimento .bz-dica").first()).toBeVisible();
    await expect(page.getByTestId("comparacao-periodos")).toContainText("período anterior");
  });

  test("sem rolagem horizontal", async ({ page }) => {
    await page.goto("/dev/business");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});

test.describe("admin: gestão do sócio", () => {
  test("cria sócio, mostra a senha uma vez, libera permissões e registra na auditoria", async ({ page }) => {
    await page.goto("/dev/galeria/socio");
    const form = page.getByTestId("socio-criar");
    await form.getByLabel("Nome do sócio").fill("Paulo Reis");
    await form.getByLabel("E-mail de login").fill("paulo@exemplo.com");
    await page.getByTestId("socio-criar-botao").click();
    await expect(page.getByTestId("socio-senha")).toHaveText(/^[A-Za-z0-9]{12}$/);
    const card = page.getByTestId("socio-card").filter({ hasText: "Paulo Reis" });
    await expect(card.getByTestId("socio-salvar")).toBeDisabled();
    await card.getByTestId("perm-visualizar_faturamento").check();
    await card.getByTestId("socio-salvar").click();
    await expect(page.getByTestId("socio-auditoria")).toContainText("liberou: Faturamento");
  });

  test("desativar e reativar o acesso", async ({ page }) => {
    await page.goto("/dev/galeria/socio");
    const card = page.getByTestId("socio-card").filter({ hasText: "Marina Couto" });
    await expect(card.getByTestId("socio-status")).toHaveText("Ativo");
    await card.getByTestId("socio-alternar").click();
    await expect(page.getByTestId("socio-card").filter({ hasText: "Marina Couto" }).getByTestId("socio-status")).toHaveText("Desativado");
    await expect(page.getByTestId("socio-auditoria")).toContainText("Acesso desativado");
  });
});
