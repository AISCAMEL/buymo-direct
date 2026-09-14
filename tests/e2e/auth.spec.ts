import { test, expect } from 'playwright/test';

test.describe('Auth pages', () => {
  test('/login shows email and password form fields', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByLabel('メールアドレス')).toBeVisible();
    await expect(page.getByLabel('パスワード')).toBeVisible();
    await expect(page.getByRole('button', { name: 'ログイン' })).toBeVisible();
  });

  test('/login shows LINE and Google social login buttons', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('button', { name: /LINEでログイン/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Googleでログイン/ })).toBeVisible();
  });

  test('invalid login shows error message', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('メールアドレス').fill('invalid@example.com');
    await page.getByLabel('パスワード').fill('wrongpassword');
    await page.getByRole('button', { name: 'ログイン' }).click();
    // AuthForm renders the Supabase error in a red paragraph
    const errorMsg = page.locator('p.text-red-600, .text-red-600').first();
    await expect(errorMsg).toBeVisible({ timeout: 10000 });
  });

  test('/signup form shows required fields', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByLabel('メールアドレス')).toBeVisible();
    await expect(page.getByLabel('パスワード')).toBeVisible();
    await expect(page.getByLabel(/表示名/)).toBeVisible();
    await expect(page.getByRole('button', { name: '登録する' })).toBeVisible();
  });

  test('/signup enforces minimum password length via HTML validation', async ({ page }) => {
    await page.goto('/signup');
    // minLength={6} is set on the password input in AuthForm
    const passwordInput = page.getByLabel('パスワード');
    await expect(passwordInput).toHaveAttribute('minlength', '6');
    // Fill with too-short password and try to submit
    await page.getByLabel('メールアドレス').fill('test@example.com');
    await passwordInput.fill('abc');
    await page.getByRole('button', { name: '登録する' }).click();
    // Browser native validation prevents submission; input should be invalid
    const isValid = await passwordInput.evaluate(
      (el) => (el as HTMLInputElement).validity.valid,
    );
    expect(isValid).toBe(false);
  });

  test('/signup page has link back to login', async ({ page }) => {
    await page.goto('/signup');
    await expect(page.getByRole('link', { name: 'ログイン' })).toBeVisible();
  });

  test('/login page has link to signup', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByRole('link', { name: '新規登録' })).toBeVisible();
  });
});
