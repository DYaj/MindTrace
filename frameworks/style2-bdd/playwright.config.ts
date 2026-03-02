import { defineConfig } from "@playwright/test";
import path from "path";

export default defineConfig({
  testDir: path.join(__dirname, "tests"),
  reporter: [["json", { outputFile: path.join(__dirname, "playwright-report.json") }]],
});
