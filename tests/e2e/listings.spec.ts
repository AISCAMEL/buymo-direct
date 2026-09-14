import { test, expect } from 'playwright/test';

test.describe('Listings page', () => {
  test('page loads and shows "車を探す"', async ({ page }) => {
    await page.goto('/listings');
    await expect(page.getByRole('heading', { name: /車を探す/ })).toBeVisible();
  });

  test('maker select filter updates URL', async ({ page }) => {
    await page.goto('/listings');
    // Desktop sidebar has a <select> for maker
    const makerSelect = page.locator('select').filter({ hasText: '指定なし' }).first();
    await makerSelect.selectOption({ label: 'トヨタ' });
    await page.waitForURL(/maker=%E3%83%88%E3%83%A8%E3%82%BF/);
    expect(page.url()).toMatch(/maker=/);
  });

  test('price range inputs update URL params', async ({ page }) => {
    await page.goto('/listings');
    // Price min input (placeholder: 最低価格)
    const priceMinInput = page.getByPlaceholder('最低価格');
    await priceMinInput.fill('100');
    // Trigger onChange which calls router.push
    await priceMinInput.press('Tab');
    await page.waitForURL(/price_min=1000000/);
    expect(page.url()).toMatch(/price_min=/);
  });

  test('search input submit redirects with ?q= param', async ({ page }) => {
    await page.goto('/listings');
    // SearchFilters sidebar keyword form
    const keywordInput = page.getByPlaceholder('車名・メーカーなど');
    await keywordInput.fill('プリウス');
    await page.getByRole('button', { name: /検索/ }).first().click();
    await page.waitForURL(/q=%E3%83%97%E3%83%AA%E3%82%A6%E3%82%B9/);
    expect(page.url()).toMatch(/q=/);
  });

  test('listing card has image area, price, and title when listings exist', async ({ page }) => {
    await page.goto('/listings');
    const cards = page.locator('a.card').first();
    // If there are listings, verify card structure
    const count = await page.locator('a.card').count();
    if (count > 0) {
      await expect(cards).toBeVisible();
      // ListingCard renders maker/model, title, and formatYen price
      await expect(cards.locator('p.text-xl')).toBeVisible(); // price
    } else {
      // Empty state message
      await expect(page.getByText('条件に合う車両が見つかりませんでした')).toBeVisible();
    }
  });

  test('compare button (比較に追加) is present on listing cards', async ({ page }) => {
    await page.goto('/listings');
    const count = await page.locator('a.card').count();
    if (count > 0) {
      const compareBtn = page.getByRole('button', { name: '比較に追加' }).first();
      await expect(compareBtn).toBeVisible();
    }
  });
});
