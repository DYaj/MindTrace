import { setWorldConstructor, World, IWorldOptions } from "@cucumber/cucumber";
import type { Browser, BrowserContext, Page } from "@playwright/test";
import { BASE_URL } from "./env";

export class MindTraceWorld extends World {
  browser!: Browser;
  context!: BrowserContext;
  page!: Page;
  baseUrl: string = BASE_URL;

  constructor(options: IWorldOptions) {
    super(options);
  }
}

setWorldConstructor(MindTraceWorld);
