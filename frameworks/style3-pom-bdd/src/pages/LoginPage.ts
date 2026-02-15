import { Page, expect } from "@playwright/test";

export class LoginPage {
  private page: Page;
  private usernameInput = "#username";
  private passwordInput = "#password";
  private submitButton = "#submit";

  constructor(page: Page) {
    this.page = page;
  }

  async goto(baseUrl: string) {
    await this.page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  }

  async login(username: string, password: string) {
    await this.page.locator(this.usernameInput).fill(username);
    await this.page.locator(this.passwordInput).fill(password);
    await this.page.locator(this.submitButton).click();
  }

  async assertOnPage() {
    await expect(this.page.locator(this.usernameInput)).toBeVisible();
  }
}
