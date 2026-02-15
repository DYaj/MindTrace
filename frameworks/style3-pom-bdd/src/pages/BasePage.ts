import type { Page } from "@playwright/test";

export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string) {
    const baseUrl = (process.env.BASE_URL || "").trim();

    // If caller passes an absolute URL, keep it.
    if (path.startsWith("http://") || path.startsWith("https://")) {
      await this.page.goto(path);
      return;
    }

    // If path is relative ("/", "/login"), require BASE_URL.
    if (!baseUrl) {
      throw new Error(
        "BASE_URL is not set. Please set BASE_URL in the repo root .env (or run setup.sh)."
      );
    }

    const full = path.startsWith("/") ? new URL(path, baseUrl).toString() : new URL(`/${path}`, baseUrl).toString();
    await this.page.goto(full);
  }
}
