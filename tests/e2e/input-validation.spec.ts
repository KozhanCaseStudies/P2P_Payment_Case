import { test, expect } from '@playwright/test';
import { signInAs, RECIPIENT_EMAIL } from './helpers';

test.describe('Amount input validation on Send page', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, undefined, '/send');
    // Wait for the amount input to confirm the page is fully loaded
    await page.getByPlaceholder('0.00').waitFor({ state: 'visible', timeout: 20_000 });
  });

  test('rejects non-numeric characters', async ({ page }) => {
    const input = page.getByPlaceholder('0.00');
    await input.fill('abc');
    await expect(input).toHaveValue('');
  });

  test('rejects letters mixed with numbers', async ({ page }) => {
    const input = page.getByPlaceholder('0.00');
    await input.fill('12abc34');
    await expect(input).toHaveValue('1234');
  });

  test('allows only one decimal point', async ({ page }) => {
    const input = page.getByPlaceholder('0.00');
    await input.fill('1.2.3');
    await expect(input).toHaveValue('1.23');
  });

  test('limits to 2 decimal places', async ({ page }) => {
    const input = page.getByPlaceholder('0.00');
    await input.fill('1.999');
    await expect(input).toHaveValue('1.99');
  });

  test('formats to 2dp on blur', async ({ page }) => {
    const input = page.getByPlaceholder('0.00');
    await input.fill('5');
    await input.blur();
    await expect(input).toHaveValue('5.00');
  });

  test('strips leading zeros', async ({ page }) => {
    const input = page.getByPlaceholder('0.00');
    await input.fill('007');
    await expect(input).toHaveValue('7');
  });

  test('shows error when amount is zero', async ({ page }) => {
    await page.getByPlaceholder('email@example.com or +14155552671').fill(RECIPIENT_EMAIL);
    await page.getByRole('button', { name: /send/i }).click();
    await expect(page.getByText('Amount must be greater than $0.00')).toBeVisible();
  });

  test('shows error when recipient is empty', async ({ page }) => {
    await page.getByRole('button', { name: /send/i }).click();
    await expect(page.getByText('Please enter an email or phone number')).toBeVisible();
  });

  test('shows error for invalid recipient format', async ({ page }) => {
    await page.getByPlaceholder('email@example.com or +14155552671').fill('notanemail');
    await page.getByRole('button', { name: /send/i }).click();
    await expect(page.getByText(/valid email/i)).toBeVisible();
  });
});

test.describe('Amount input validation on Request page', () => {
  test.beforeEach(async ({ page }) => {
    await signInAs(page, undefined, '/request/new');
    await page.getByPlaceholder('0.00').waitFor({ state: 'visible', timeout: 20_000 });
  });

  test('rejects non-numeric characters', async ({ page }) => {
    const input = page.getByPlaceholder('0.00');
    await input.fill('$$$');
    await expect(input).toHaveValue('');
  });

  test('limits to 2 decimal places', async ({ page }) => {
    const input = page.getByPlaceholder('0.00');
    await input.fill('9.999');
    await expect(input).toHaveValue('9.99');
  });
});
