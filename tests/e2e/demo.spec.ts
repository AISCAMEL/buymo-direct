import { test, expect } from 'playwright/test';

test.describe('Demo pages', () => {
  test('/demo page loads with role switcher buttons', async ({ page }) => {
    await page.goto('/demo');
    await expect(page.getByRole('heading', { name: 'BUYMO C2C デモ' })).toBeVisible();
    // Three role links: 本部管理画面, 加盟店管理画面, 売主会員マイページ
    await expect(page.getByRole('link', { name: /本部管理画面/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /加盟店管理画面/ })).toBeVisible();
    await expect(page.getByRole('link', { name: /売主会員マイページ/ })).toBeVisible();
  });

  test('clicking 売主会員 navigates to /demo/seller', async ({ page }) => {
    await page.goto('/demo');
    await page.getByRole('link', { name: /売主会員マイページ/ }).click();
    await expect(page).toHaveURL('/demo/seller');
  });

  test('/demo/seller shows rank card with ポイント', async ({ page }) => {
    await page.goto('/demo/seller');
    // Rank card with 2,840pt and シルバー会員
    await expect(page.getByText('シルバー会員')).toBeVisible();
    await expect(page.getByText(/pt/)).toBeVisible();
    await expect(page.getByText('2,840')).toBeVisible();
  });

  test('/demo/seller tab switching to 出品管理 works', async ({ page }) => {
    await page.goto('/demo/seller');
    // Click the 出品管理 tab button
    await page.getByRole('button', { name: /出品管理/ }).click();
    // Tab content shows 出品管理 heading
    await expect(page.getByRole('heading', { name: '出品管理' })).toBeVisible();
  });

  test('/demo/admin shows 6 tabs including KYC', async ({ page }) => {
    await page.goto('/demo/admin');
    // Admin has tabs: ダッシュボード, 加盟店審査, 出品モデレーション, 取引監視, 本人確認審査, 通報
    const nav = page.locator('nav');
    const tabButtons = nav.getByRole('button');
    await expect(tabButtons).toHaveCount(6);
    // KYC tab
    await expect(nav.getByRole('button', { name: /本人確認審査/ })).toBeVisible();
  });

  test('/demo/admin dashboard shows stats cards', async ({ page }) => {
    await page.goto('/demo/admin');
    await expect(page.getByText('承認済み加盟店')).toBeVisible();
    await expect(page.getByText('公開中出品')).toBeVisible();
    await expect(page.getByText('累計GMV')).toBeVisible();
    await expect(page.getByText('要対応')).toBeVisible();
  });

  test('/demo/dealer shows dashboard with GMV stats', async ({ page }) => {
    await page.goto('/demo/dealer');
    // Dealer dashboard shows GMV and related stats
    await expect(page.getByText(/GMV|売上/)).toBeVisible();
  });

  test('/demo/dealer has multiple tabs including dashboard', async ({ page }) => {
    await page.goto('/demo/dealer');
    const nav = page.locator('nav').first();
    await expect(nav.getByRole('button', { name: /ダッシュボード/ })).toBeVisible();
    await expect(nav.getByRole('button', { name: /在庫管理|出品/ })).toBeVisible();
  });
});
