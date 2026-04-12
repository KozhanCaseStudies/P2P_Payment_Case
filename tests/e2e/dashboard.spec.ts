import { test, expect } from '@playwright/test';
import { signInAs } from './helpers';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page);
    // Wait for balance card to render (auth resolved)
    await page.locator('.font-numeric').first().waitFor({ state: 'visible', timeout: 20_000 });
  });

  test('shows wallet balance', async ({ page }) => {
    await expect(page.getByText('$200.00')).toBeVisible();
  });

  test('shows Send and Request action tiles', async ({ page }) => {
    await expect(page.locator('a[href="/send"]')).toBeVisible();
    await expect(page.locator('a[href="/request/new"]')).toBeVisible();
  });

  test('navigates to send page', async ({ page }) => {
    await page.locator('a[href="/send"]').first().click();
    await page.waitForURL('**/send', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/send/);
  });

  test('navigates to request page', async ({ page }) => {
    await page.locator('a[href="/request/new"]').first().click();
    await page.waitForURL('**/request/new', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/request\/new/);
  });
});
