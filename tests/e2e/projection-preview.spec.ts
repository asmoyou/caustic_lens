import { test, expect } from '@playwright/test';

test('projection appears automatically on the 3D screen and follows distance changes', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await expect(page.locator('.brand img')).toBeVisible();
  expect(await page.locator('.brand img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(64);
  await page.screenshot({ path: 'test-results/studio-empty.png', fullPage: true });
  await page.getByRole('button', { name: '载入示例图案' }).click();
  await page.getByRole('button', { name: '生成透镜', exact: true }).click();
  const viewport = page.getByTestId('viewport');
  await expect(viewport).toHaveAttribute('data-projection-ready', 'true', { timeout: 90_000 });
  await expect(page.locator('.projection-result')).toHaveCount(1);
  await page.screenshot({ path: 'test-results/optical-desktop.png', fullPage: true, animations: 'disabled' });

  await page.getByRole('radiogroup', { name: '预览模式' }).getByText('投影', { exact: true }).click();
  await expect(viewport).toHaveAttribute('data-mode', 'projection');
  const canvas = viewport.locator('canvas');
  const pixelStats = async () => canvas.evaluate((element: HTMLCanvasElement) => {
    const ctx = document.createElement('canvas').getContext('2d')!;
    ctx.canvas.width = ctx.canvas.height = 100;
    ctx.drawImage(element, 0, 0, 100, 100);
    const pixels = ctx.getImageData(0, 0, 100, 100).data;
    let white = 0, black = 0, tinted = 0;
    for (let i = 0; i < pixels.length; i += 4) {
      if (pixels[i] > 100 && pixels[i + 1] > 100 && pixels[i + 2] > 100) white++;
      if (pixels[i] < 20 && pixels[i + 1] < 20 && pixels[i + 2] < 20) black++;
      if (Math.max(pixels[i], pixels[i + 1], pixels[i + 2]) - Math.min(pixels[i], pixels[i + 1], pixels[i + 2]) > 15) tinted++;
    }
    return { white, black, tinted };
  });
  await expect.poll(async () => (await pixelStats()).white).toBeGreaterThan(300);
  expect((await pixelStats()).black).toBeGreaterThan(4000);
  expect((await pixelStats()).tinted).toBeLessThan(20);
  await page.screenshot({ path: 'test-results/projection-front.png', fullPage: true, animations: 'disabled' });
  const previous = await page.locator('.projection-result img').getAttribute('src');
  const distance = page.getByRole('spinbutton', { name: '实时投影距离 (mm)', exact: true });
  await distance.fill('1500');
  await distance.press('Tab');
  await expect(page.locator('.result-details')).toContainText('1500 mm');
  await expect(viewport).toHaveAttribute('data-projection-ready', 'true');
  expect(await page.locator('.projection-result img').getAttribute('src')).not.toBe(previous);

  await page.getByRole('radiogroup', { name: '预览模式' }).getByText('模型', { exact: true }).click();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: 'test-results/transparent-lens.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('radiogroup', { name: '预览模式' }).getByText('光路', { exact: true }).click();
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: 'test-results/optical-mobile.png', fullPage: true, animations: 'disabled' });
  await page.getByRole('radiogroup', { name: '预览模式' }).getByText('投影', { exact: true }).click();
  await expect.poll(async () => (await pixelStats()).white).toBeGreaterThan(300);
  await page.screenshot({ path: 'test-results/projection-mobile.png', fullPage: true, animations: 'disabled' });
  expect(errors).toEqual([]);
});

test('parameters can regenerate the model without switching back to the upload tab', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '载入示例图案' }).click();
  await page.getByRole('tab', { name: /参数/ }).click();
  await page.getByRole('spinbutton', { name: '算法焦距 (m)' }).fill('2.5');
  await page.getByRole('spinbutton', { name: '算法焦距 (m)' }).press('Tab');
  await page.getByRole('button', { name: /应用参数并生成/ }).click();
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-projection-ready', 'true', { timeout: 90_000 });
  await expect(page.getByRole('button', { name: '导出模型', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: '导出模型', exact: true }).click();
  await expect(page.getByRole('heading', { name: '导出模型' })).toBeVisible();
});
