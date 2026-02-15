import { Page, expect } from "@playwright/test";

export class DashboardPage {
  private page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async assertLoggedIn() {
    await expect(this.page.locator("h1")).toContainText("Logged In Successfully");
  }
}
