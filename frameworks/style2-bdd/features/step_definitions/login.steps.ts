import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';

Given('I am on the login page', async function () {
  await this.page.goto('/login');
});

When('I enter username {string}', async function (username: string) {
  await this.page.fill('[data-testid="username"]', username);
});

When('I enter password {string}', async function (password: string) {
  await this.page.fill('[data-testid="password"]', password);
});

When('I click the login button', async function () {
  await this.page.click('[data-testid="login-button"]');
});

Then('I should see the dashboard', async function () {
  await expect(this.page).toHaveURL(/dashboard/);
});

Then('I should see my username displayed', async function () {
  await expect(this.page.locator('[data-testid="username-display"]')).toBeVisible();
});

Then('I should see an error message {string}', async function (message: string) {
  await expect(this.page.locator('.error-message')).toContainText(message);
});
