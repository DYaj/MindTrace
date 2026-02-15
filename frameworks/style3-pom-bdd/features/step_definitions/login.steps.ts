import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import type { MindTraceWorld } from '../support/world';

Given('I am on the login page', async function (this: MindTraceWorld) {
  // hooks.ts already navigates to BASE_URL, so just assert we're here
  await expect(this.page).toHaveURL(/practicetestautomation\.com\/practice-test-login/);
});

When('I login with username {string} and password {string}', async function (this: MindTraceWorld, username: string, password: string) {
  await this.page.locator('#username').fill(username);
  await this.page.locator('#password').fill(password);
  await this.page.locator('#submit').click();
});

Then('I should see the logged in success page', async function (this: MindTraceWorld) {
  await expect(this.page.locator('h1')).toContainText('Logged In Successfully');
});
