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
  await expect(page.locator('[data-testid="viewport"] canvas')).toBeVisible();
  await page.getByRole('button', { name: '移除图像' }).click();
  await expect(page.getByRole('button', { name: '载入示例图案' })).toBeVisible();
});

test('desktop and mobile expose a visible, interactive model and a downloadable projection', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: '载入示例图案' }).click();
  await page.getByRole('button', { name: '生成透镜', exact: true }).click();
  await expect(page.getByRole('button', { name: '重新计算', exact: true })).toBeVisible({ timeout: 90_000 });
  const canvas = page.locator('[data-testid="viewport"] canvas');
  await expect(canvas).toBeVisible();
  const pixels = async () => canvas.evaluate((element: HTMLCanvasElement) => {
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.canvas.width = ctx.canvas.height = 64;
    ctx.drawImage(element, 0, 0, 64, 64);
    const values = ctx.getImageData(0, 0, 64, 64).data;
    return Array.from(values);
  });
  await expect.poll(async () => new Set(await pixels()).size).toBeGreaterThan(30);
  const initial = await pixels();
  await page.getByRole('button', { name: '自动旋转', exact: true }).click();
  await expect.poll(async () => JSON.stringify(await pixels()) !== JSON.stringify(initial)).toBe(true);
  await page.getByRole('button', { name: '重置视角', exact: true }).click();
  await page.getByRole('button', { name: '渲染投影', exact: true }).click();
  await expect(page.locator('.projection-result img')).toBeVisible({ timeout: 60_000 });
  const imagePixels = await page.locator('.projection-result img').evaluate((img: HTMLImageElement) => {
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.canvas.width = ctx.canvas.height = 256;
    ctx.drawImage(img, 0, 0, 256, 256);
    return Array.from(ctx.getImageData(0, 0, 256, 256).data).filter((_, i) => i % 4 !== 3).some(value => value > 20);
  });
  expect(imagePixels).toBe(true);
  await page.screenshot({ path: 'test-results/desktop-workspace.png', fullPage: true });
  const download = page.waitForEvent('download');
  await page.getByRole('link', { name: '下载投影' }).click();
  expect((await download).suggestedFilename()).toMatch(/\.png$/);
  for (const width of [768, 390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect(page.getByRole('navigation', { name: '项目工具' })).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await expect.poll(async () => new Set(await pixels()).size).toBeGreaterThan(30);
    await page.getByRole('navigation').getByRole('button', { name: /参数/ }).click();
    await expect(page.getByRole('dialog')).toBeVisible();
    await page.screenshot({ path: `test-results/mobile-controls-${width}.png`, fullPage: true });
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await page.screenshot({ path: `test-results/mobile-workspace-${width}.png`, fullPage: true });
  }
  expect(errors).toEqual([]);
});
