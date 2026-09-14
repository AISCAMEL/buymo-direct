import { test, expect } from 'playwright/test';

test.describe('Home page', () => {
  test('loads and has hero heading', async ({ page }) => {
    await page.goto('/');
    // h1 contains the main C2C marketplace pitch
    await expect(page.locator('h1').first()).toContainText('業者なし');
  });

  test('stats bar is visible with listing count', async ({ page }) => {
    await page.goto('/');
    // Stats bar is the navy-500 section with 出品台数, 累計成約件数, etc.
    const statsBar = page.locator('section').filter({ hasText: '出品台数' });
    await expect(statsBar).toBeVisible();
    await expect(statsBar.getByText('累計成約件数')).toBeVisible();
  });

  test('navigation link to listings works', async ({ page }) => {
    await page.goto('/');
    const listingsLink = page.getByRole('link', { name: /車を探す/ }).first();
    await expect(listingsLink).toBeVisible();
    await listingsLink.click();
    await expect(page).toHaveURL(/\/listings/);
  });

  test('navigation link to login is accessible', async ({ page }) => {
    await page.goto('/');
    // Header should have a login link (rendered by the layout Header component)
    await expect(page.getByRole('link', { name: /ログイン/ }).first()).toBeVisible();
  });

  test('search form exists on home page', async ({ page }) => {
    await page.goto('/');
    const form = page.locator('form[action="/listings"]');
    await expect(form).toBeVisible();
    await expect(form.locator('input[name="q"]')).toBeVisible();
    await expect(form.getByRole('button', { name: /検索/ })).toBeVisible();
  });

  test('footer has privacy and terms links', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: 'プライバシーポリシー' })).toBeVisible();
    await expect(footer.getByRole('link', { name: '利用規約' })).toBeVisible();
    await expect(footer.getByRole('link', { name: '特定商取引法' })).toBeVisible();
  });

  test('footer links to listings and sell pages', async ({ page }) => {
    await page.goto('/');
    const footer = page.locator('footer');
    await expect(footer.getByRole('link', { name: '出品する' })).toBeVisible();
    const listingsLink = footer.getByRole('link', { name: '車を探す' });
    await expect(listingsLink).toBeVisible();
    await expect(listingsLink).toHaveAttribute('href', '/listings');
  });
});
