import { defineConfig, devices } from "@playwright/test";

const baseURL =
  process.env.TEST_BASE_URL ||
  process.env.BASE_URL ||
  process.env.PLAYWRIGHT_BASE_URL ||
  "http://localhost:3000";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: 0,
  use: {
    baseURL,
    trace: "on-first-retry",
    video: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
