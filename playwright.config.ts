import { defineConfig } from "@playwright/test"

export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 30000,
  fullyParallel: false,
  workers: 1,
  use: { baseURL: "http://127.0.0.1:1425", channel: "msedge", viewport: { width: 1440, height: 900 }, screenshot: "only-on-failure", trace: "retain-on-failure" },
  webServer: { command: "npm run dev -- --host 127.0.0.1 --port 1425", url: "http://127.0.0.1:1425", reuseExistingServer: !process.env.CI },
})
