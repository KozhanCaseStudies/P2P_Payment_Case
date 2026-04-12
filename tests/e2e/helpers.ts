import { Page } from '@playwright/test';

export const SENDER_UID = 'playwright-test-sender';
export const RECIPIENT_UID = 'playwright-test-recipient';
export const SENDER_EMAIL = 'playwright-sender@payrequest.test';
export const RECIPIENT_EMAIL = 'playwright-recipient@payrequest.test';

/**
 * Navigate to /test-login and wait for redirect to the given path.
 * Firebase auth state is stored in IndexedDB — this page signs in
 * with a custom token so the session is valid for all subsequent requests.
 *
 * Redirect directly to the target page to avoid a second navigation
 * (which would require Firebase to re-read IndexedDB state).
 */
export async function signInAs(
  page: Page,
  uid: string = SENDER_UID,
  redirectTo: string = '/dashboard'
) {
  await page.goto(`/test-login?uid=${uid}&redirect=${encodeURIComponent(redirectTo)}`);
  await page.waitForURL(`**${redirectTo}`, { timeout: 20_000 });
}
