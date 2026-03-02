import { Before, After } from "@cucumber/cucumber";
import { chromium, Browser, Page } from "@playwright/test";
import { MindTraceWorld } from "./world";
import { getMindTraceContractContext } from "./contractContext";

const BASE_URL =
  process.env.BASE_URL || "https://practicetestautomation.com/practice-test-login/";

let browser: Browser;

Before(async function (this: MindTraceWorld) {
  // ------------------------------------------------------------
  // MindTrace Contract Context smoke check (non-fatal)
  // ------------------------------------------------------------
  try {
    const ctx = getMindTraceContractContext();
    if (!ctx.ok) {
      console.log("[mindtrace][style2-bdd] contract context not available:", ctx.warnings, ctx.notes ?? []);
    } else {
      console.log("[mindtrace][style2-bdd] contractDir:", ctx.contractDir);
    }
  } catch {
    // ignore (must never fail the run)
  }

  browser = await chromium.launch();
  const context = await browser.newContext();
  const page: Page = await context.newPage();

  this.page = page;

  await page.goto(BASE_URL, { waitUntil: "load" });
});

After(async function (this: MindTraceWorld) {
  try {
    await this.page?.close();
  } catch {
    // ignore
  }
  try {
    await browser?.close();
  } catch {
    // ignore
  }
});
