import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  testMatch: ["**/*.spec.ts", "**/*.test.ts"],
  reporter: [["json", { outputFile: "playwright-report.json" }]],
  use: {
    headless: true
  }
});
