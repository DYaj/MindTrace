import { Given, When, Then } from '@cucumber/cucumber';
import { expect } from '@playwright/test';
import { LoginPage } from '../../src/pages/LoginPage';
import { DashboardPage } from '../../src/pages/DashboardPage';

Given('I am on the login page', async function () {
  this.loginPage = new LoginPage(this.page);
  await this.loginPage.goto();
});

When('I enter username {string}', async function (username: string) {
  await this.loginPage.enterUsername(username);
});

When('I enter password {string}', async function (password: string) {
  await this.loginPage.enterPassword(password);
});

When('I click the login button', async function () {
  await this.loginPage.clickLoginButton();
});

Then('I should see the dashboard', async function () {
  this.dashboardPage = new DashboardPage(this.page);
  const isDisplayed = await this.dashboardPage.isDisplayed();
  expect(isDisplayed).toBeTruthy();
});

Then('I should see my username displayed', async function () {
  const welcomeMessage = await this.dashboardPage.getWelcomeMessage();
  expect(welcomeMessage).toBeTruthy();
});

Then('I should see an error message {string}', async function (message: string) {
  const errorMessage = await this.loginPage.getErrorMessage();
  expect(errorMessage).toContain(message);
});
