import { defineConfig, devices } from "@playwright/test";

/**
 * E2E. Por padrão sobe `next start` local (após `next build`).
 * - Testes públicos rodam sempre.
 * - Testes autenticados exigem E2E_EMAIL/E2E_PASSWORD de uma conta de teste num
 *   Supabase de homologação; sem isso, são PULADOS (nunca dados como aprovados).
 * Navegador: use PW_CHROMIUM_PATH para apontar um Chromium já instalado.
 */
const baseURL = process.env.E2E_BASE_URL ?? "http://localhost:3100";
const executablePath = process.env.PW_CHROMIUM_PATH;

export default defineConfig({
  testDir: "e2e",
  timeout: 30_000,
  retries: 0,
  reporter: [["list"]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    launchOptions: executablePath ? { executablePath } : undefined,
  },
  projects: [
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: executablePath ? { executablePath } : undefined } },
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: executablePath ? { executablePath } : undefined } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: "npx next start -p 3100",
        url: baseURL,
        reuseExistingServer: true,
        timeout: 60_000,
        // Galeria de design com dados de exemplo: habilitada só no servidor de teste.
        env: { ENABLE_DESIGN_GALLERY: "1" },
      },
});
