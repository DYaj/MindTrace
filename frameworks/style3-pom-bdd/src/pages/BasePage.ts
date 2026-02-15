import { Page, Locator } from '@playwright/test';

export class BasePage {
  protected page: Page;

  constructor(page: Page) {
    this.page = page;
  }

  async goto(path: string = '') {
    await this.page.goto(path);
  }

  async waitForPageLoad() {
    await this.page.waitForLoadState('networkidle');
  }

  protected getLocator(selector: string): Locator {
    return this.page.locator(selector);
  }

  protected async clickElement(selector: string) {
    await this.getLocator(selector).click();
  }

  protected async fillInput(selector: string, value: string) {
    await this.getLocator(selector).fill(value);
  }
}
