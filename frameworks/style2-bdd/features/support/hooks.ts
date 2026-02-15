import { Before, After } from "@cucumber/cucumber";
import { chromium, Browser, BrowserContext, Page } from "@playwright/test";
import { BASE_URL } from "./env";
import { MindTraceWorld } from "./world";

Before(async function (this: MindTraceWorld) {
  const browser: Browser = await chromium.launch();
  const context: BrowserContext = await browser.newContext();
  const page: Page = await context.newPage();

  this.browser = browser;
  this.context = context;
  this.page = page;

  // Always navigate to user-provided BASE_URL (supports full path like /practice-test-login/)
  await this.page.goto(BASE_URL, { waitUntil: "load" });
});

After(async function (this: MindTraceWorld) {
  try {
    await this.page?.close();
  } catch {}
  try {
    await this.context?.close();
  } catch {}
  try {
    await this.browser?.close();
  } catch {}
});
