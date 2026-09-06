import { test, expect } from '@playwright/test';

test('generation can be cancelled and restarted without stale results', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '载入示例图案' }).click();
  await expect(page.locator('.file-meta')).toContainText('sample-target.png');
  await page.getByRole('button', { name: '生成透镜', exact: true }).click();
  await page.getByRole('button', { name: '取消计算', exact: true }).click();
  await expect(page.locator('.generation-progress')).toContainText('已取消');
  await page.getByRole('button', { name: '生成透镜', exact: true }).click();
  await expect(page.getByRole('button', { name: '重新计算', exact: true })).toBeVisible({ timeout: 90_000 });
  await expect(page.locator('.generation-progress')).toContainText('计算完成');
  await page.getByRole('button', { name: '移除图像' }).click();
  await expect(page.getByRole('button', { name: '载入示例图案' })).toBeVisible();
});
