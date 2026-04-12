import { test, expect } from '@playwright/test';
import { signInAs, RECIPIENT_EMAIL } from './helpers';

test.describe('Request Money flow', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, undefined, '/request/new');
    await page.getByPlaceholder('0.00').waitFor({ state: 'visible', timeout: 20_000 });
  });

  test('cannot request from yourself', async ({ page }) => {
    await page.getByPlaceholder('email@example.com or +14155552671').fill('playwright-sender@payrequest.test');
    await page.getByPlaceholder('0.00').fill('20');
    await page.getByRole('button', { name: /send request/i }).click();
    await expect(page.getByText(/can't request money from yourself/i)).toBeVisible();
  });

  test('note character counter updates', async ({ page }) => {
    await page.getByPlaceholder("What's this for?").fill('Hello world');
    await expect(page.getByText('11/280')).toBeVisible();
  });

  test('note limited to 280 characters', async ({ page }) => {
    const noteInput = page.getByPlaceholder("What's this for?");
    await noteInput.fill('a'.repeat(300));
    const value = await noteInput.inputValue();
    expect(value.length).toBeLessThanOrEqual(280);
  });

  test('successful request redirects to dashboard', async ({ page }) => {
    await page.getByPlaceholder('email@example.com or +14155552671').fill(RECIPIENT_EMAIL);
    await page.getByPlaceholder('0.00').fill('15');
    await page.getByRole('button', { name: /send request/i }).click();
    await page.waitForURL('**/dashboard', { timeout: 15_000 });
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('invalid amount shows validation error', async ({ page }) => {
    await page.getByPlaceholder('email@example.com or +14155552671').fill(RECIPIENT_EMAIL);
    await page.getByRole('button', { name: /send request/i }).click();
    await expect(page.getByText('Amount must be greater than $0.00')).toBeVisible();
  });
});
