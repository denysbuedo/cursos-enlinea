import { defineConfig, devices } from "@playwright/test";

const PORT = process.env.PORT || "3000";
const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || `http://127.0.0.1:${PORT}`;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: BASE_URL,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },
  webServer: process.env.PLAYWRIGHT_START_SERVER === "1"
    ? {
        command: `node node_modules/next/dist/bin/next dev --hostname 127.0.0.1 --port ${PORT}`,
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
        gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
        env: {
          NEXT_PUBLIC_APP_URL: BASE_URL,
          DATABASE_URL:
            process.env.DATABASE_URL ||
            "postgresql://aprendizaje_app:AprendizajeLocal_2026@localhost:5432/aprendizaje_digital?schema=public",
          JWT_SECRET:
            process.env.JWT_SECRET ||
            "playwright-jwt-secret-minimum-32-characters",
          JWT_REFRESH_SECRET:
            process.env.JWT_REFRESH_SECRET ||
            "playwright-refresh-secret-minimum-32-characters",
        },
      }
    : undefined,
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"], channel: "chrome" },
    },
  ],
});
