import { test, expect } from '@playwright/test';
import { signInAs, RECIPIENT_EMAIL } from './helpers';

test.describe('Send Money flow', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, undefined, '/send');
    await page.getByPlaceholder('0.00').waitFor({ state: 'visible', timeout: 20_000 });
  });

  test('shows current balance', async ({ page }) => {
    await expect(page.getByText('$200.00')).toBeVisible();
  });

  test('shows insufficient funds warning when amount exceeds balance', async ({ page }) => {
    await page.getByPlaceholder('0.00').fill('500');
    await expect(page.getByText(/insufficient balance/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /send/i })).toBeDisabled();
  });

  test('button label updates with amount', async ({ page }) => {
    await page.getByPlaceholder('0.00').fill('10');
    await expect(page.getByRole('button', { name: /send \$10\.00/i })).toBeVisible();
  });

  test('cannot send to yourself', async ({ page }) => {
    await page.getByPlaceholder('email@example.com or +14155552671').fill('playwright-sender@payrequest.test');
    await page.getByPlaceholder('0.00').fill('10');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(page.getByText(/can't send money to yourself/i)).toBeVisible();
  });

  test('successful transfer shows animation and redirects', async ({ page }) => {
    await page.getByPlaceholder('email@example.com or +14155552671').fill(RECIPIENT_EMAIL);
    await page.getByPlaceholder('0.00').fill('5');
    await page.getByRole('button', { name: /send/i }).click();

    // Sending animation should appear
    await expect(page.getByText(/sending/i)).toBeVisible({ timeout: 10_000 });

    // Redirect to dashboard after success
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
