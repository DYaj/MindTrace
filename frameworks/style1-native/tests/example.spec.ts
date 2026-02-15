import { test, expect } from '@playwright/test';

test.describe('Practice Test Automation - Login', () => {
  test('can login successfully', async ({ page }) => {
    // With baseURL set, this resolves to:
    // https://practicetestautomation.com/practice-test-login/
    await page.goto('/practice-test-login/');

    const username = process.env.TEST_USERNAME || 'student';
    const password = process.env.TEST_PASSWORD || 'Password123';

    await page.locator('input#username').fill(username);
    await page.locator('input#password').fill(password);
    await page.locator('button#submit').click();

    await expect(page).toHaveURL(/.*practicetestautomation\.com\/logged-in-successfully\/?/);
    await expect(page.getByRole('heading', { name: /Logged In Successfully/i })).toBeVisible();
    await expect(page.getByText(/Congratulations|successfully logged in/i)).toBeVisible();
  });
});
