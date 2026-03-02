import { test, expect } from "@playwright/test";
import path from "path";
import { existsSync } from "fs";
import { spawnSync } from "child_process";

/**
 * Style2 (Playwright-BDD via cucumber-js):
 * Run @cucumber/cucumber using the LOCAL binary inside this framework folder.
 *
 * This avoids `npx` auto-installing the placeholder `cucumber-js@1.0.0` package
 * when MindTrace runs from repo root.
 */
test("style2-bdd: cucumber-js features", async () => {
  const frameworkRoot = path.resolve(__dirname, ".."); // frameworks/style2-bdd
  const cucumberBin = path.join(
    frameworkRoot,
    "node_modules",
    "@cucumber",
    "cucumber",
    "bin",
    "cucumber.js"
  );

  // fail clearly if deps not installed for style2
  expect(existsSync(cucumberBin)).toBeTruthy();

  // run cucumber from frameworkRoot so it uses its package.json, tsconfig, support files, etc.
  const result = spawnSync(
    process.execPath,
    [
      cucumberBin,
      "--require-module",
      "ts-node/register",
      "--require",
      "features/**/*.ts",
      "features/**/*.feature",
    ],
    {
      cwd: frameworkRoot,
      env: {
        ...process.env,
        // keep logs consistent / avoid noisy colors in CI
        FORCE_COLOR: "0",
      },
      encoding: "utf-8",
    }
  );

  if (result.stdout) process.stdout.write(result.stdout);
  if (result.stderr) process.stderr.write(result.stderr);

  // cucumber success must equal passing Playwright spec
  expect(result.status ?? 1).toBe(0);
});
