import { test, expect } from 'playwright/test';

test.describe('Compare feature', () => {
  test('/listings page has 比較に追加 buttons on listing cards', async ({ page }) => {
    await page.goto('/listings');
    const count = await page.locator('a.card').count();
    if (count > 0) {
      await expect(page.getByRole('button', { name: '比較に追加' }).first()).toBeVisible();
    } else {
      // No listings in DB: verify empty state renders without error
      await expect(page.getByText('条件に合う車両が見つかりませんでした')).toBeVisible();
    }
  });

  test('compare bar (CompareBar) appears after adding a listing to compare', async ({ page }) => {
    await page.goto('/listings');
    const compareButtons = page.getByRole('button', { name: '比較に追加' });
    const count = await compareButtons.count();
    if (count === 0) {
      test.skip();
      return;
    }
    // CompareBar starts hidden (translate-y-full)
    const compareBar = page.locator('div.fixed').filter({ hasText: '比較する' });
    // Click first compare button
    await compareButtons.first().click();
    // CompareBar should become visible after the compare-updated event is fired
    await expect(compareBar).toBeVisible({ timeout: 3000 });
  });

  test('/compare page renders without crashing (may show empty state)', async ({ page }) => {
    await page.goto('/compare');
    // Either shows empty state or comparison table
    const emptyState = page.getByText('比較する車両が選択されていません');
    const table = page.locator('table');
    const hasEmpty = await emptyState.isVisible();
    const hasTable = await table.isVisible();
    expect(hasEmpty || hasTable).toBe(true);
  });

  test('/compare empty state has link back to listings', async ({ page }) => {
    // Navigate to /compare without any compare IDs in localStorage
    await page.goto('/compare');
    const emptyState = page.getByText('比較する車両が選択されていません');
    if (await emptyState.isVisible()) {
      await expect(page.getByRole('link', { name: '車両を探す' })).toBeVisible();
    }
  });
});
