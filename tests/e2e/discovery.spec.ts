import { test, expect } from '@playwright/test';

test('the primary domain, discovery resources and friend link are available', async ({ page, request }) => {
  await page.goto('/');
  await expect(page.locator('head title')).toHaveCount(1);
  await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://caustic.asmo.top/');
  await expect(page.locator('meta[property="og:image"]')).toHaveAttribute('content', 'https://caustic.asmo.top/social-preview.png');
  await expect(page.getByRole('navigation', { name: '友情链接' }).getByRole('link', { name: 'Toy2Game 在线玩具箱' })).toHaveAttribute('href', 'https://games.asmo.top/');
  const robots = await request.get('/robots.txt');
  expect(robots.headers()['content-type']).toContain('text/plain');
  expect(await robots.text()).toContain('Sitemap: https://caustic.asmo.top/sitemap.xml');
  const sitemap = await request.get('/sitemap.xml');
  expect(sitemap.headers()['content-type']).toContain('xml');
  expect(await sitemap.text()).toContain('<loc>https://caustic.asmo.top/optics.html</loc>');
  const llms = await request.get('/llms.txt');
  expect(await llms.text()).toContain('几何光学');
});

test.describe('without JavaScript', () => {
  test.use({ javaScriptEnabled: false });
  test('optics documentation remains readable and navigable on desktop and mobile', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByRole('heading', { name: '焦散透镜工作台', exact: true })).toBeVisible();
    await page.getByRole('link', { name: '焦散透镜与几何光学', exact: true }).click();
    await expect(page.getByRole('heading', { name: '焦散透镜与几何光学', exact: true })).toBeVisible();
    await expect(page.locator('link[rel=canonical]')).toHaveAttribute('href', 'https://caustic.asmo.top/optics.html');
    await expect(page.getByRole('cell', { name: /默认 1.5 m/ })).toBeVisible();
    expect(await page.locator('.guide-figure img').evaluate((image: HTMLImageElement) => image.naturalWidth)).toBe(1200);
    for (const width of [1280, 390, 320]) {
      await page.setViewportSize({ width, height: 900 });
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      await page.screenshot({ path: `test-results/optics-guide-${width}.png`, fullPage: true });
    }
    await page.getByRole('link', { name: '返回工作台', exact: true }).click();
    await expect(page.getByRole('heading', { name: '焦散透镜工作台', exact: true })).toBeVisible();
  });
});
