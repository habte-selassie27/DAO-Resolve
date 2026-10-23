import { defineConfig, devices } from "@playwright/test";

const real = process.env.E2E_REAL === "1";
const port = real ? 4175 : 4174;

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: real ? 150000 : 45000,
  expect: { timeout: 15000 },
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${port}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH } }
      : {}),
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: `VITE_MOCK=${real ? "0" : "1"} npm run dev -- --port ${port} --host 127.0.0.1`,
    url: `http://127.0.0.1:${port}`,
    reuseExistingServer: false,
    timeout: 60000,
  },
});
