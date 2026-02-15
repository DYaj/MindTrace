import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class DashboardPage extends BasePage {
  private readonly selectors = {
    welcomeMessage: '[data-testid="welcome-message"]',
    userProfile: '[data-testid="user-profile"]',
    navigationMenu: '[data-testid="nav-menu"]',
    logoutButton: '[data-testid="logout-button"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async isDisplayed() {
    return await this.getLocator(this.selectors.welcomeMessage).isVisible();
  }

  async getWelcomeMessage() {
    return await this.getLocator(this.selectors.welcomeMessage).textContent();
  }

  async clickLogout() {
    await this.clickElement(this.selectors.logoutButton);
  }

  async navigateTo(section: string) {
    await this.page.click(\`[data-testid="nav-\${section}"]\`);
  }
}
