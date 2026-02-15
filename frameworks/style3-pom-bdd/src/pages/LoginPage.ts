import { Page } from '@playwright/test';
import { BasePage } from './BasePage';

export class LoginPage extends BasePage {
  private readonly selectors = {
    usernameInput: '[data-testid="username"]',
    passwordInput: '[data-testid="password"]',
    loginButton: '[data-testid="login-button"]',
    errorMessage: '.error-message',
    forgotPasswordLink: '[data-testid="forgot-password"]',
  };

  constructor(page: Page) {
    super(page);
  }

  async goto() {
    await super.goto('/login');
  }

  async login(username: string, password: string) {
    await this.fillInput(this.selectors.usernameInput, username);
    await this.fillInput(this.selectors.passwordInput, password);
    await this.clickElement(this.selectors.loginButton);
  }

  async enterUsername(username: string) {
    await this.fillInput(this.selectors.usernameInput, username);
  }

  async enterPassword(password: string) {
    await this.fillInput(this.selectors.passwordInput, password);
  }

  async clickLoginButton() {
    await this.clickElement(this.selectors.loginButton);
  }

  async getErrorMessage() {
    return await this.getLocator(this.selectors.errorMessage).textContent();
  }

  async isErrorMessageVisible() {
    return await this.getLocator(this.selectors.errorMessage).isVisible();
  }

  async clickForgotPassword() {
    await this.clickElement(this.selectors.forgotPasswordLink);
  }
}
