import { test, expect } from '@playwright/test';
import { pathToFileURL } from 'node:url';

test('report preview and offline export share the current brand, projection and print layout', async ({ page, context }, testInfo) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto('/');
  await page.getByRole('button', { name: '载入示例图案' }).click();
  await page.getByRole('button', { name: '生成透镜', exact: true }).click();
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-projection-ready', 'true', { timeout: 90_000 });
  await page.getByRole('radiogroup', { name: '光源类型' }).getByText('点光源', { exact: true }).click();
  await expect(page.locator('.result-details')).toContainText('点光源');
  await expect(page.locator('.projection-result img')).toBeVisible();
  const projectionImage = await page.locator('.projection-result img').getAttribute('src');
  await page.getByRole('button', { name: '设计报告', exact: true }).click();
  const reportFrame = page.frameLocator('iframe[title="设计报告预览"]');
  await expect(reportFrame.getByRole('heading', { name: '焦散透镜设计报告', exact: true })).toBeVisible();
  await expect(reportFrame.locator('.parameter-grid > div').filter({ hasText: '算法焦距' })).toContainText('1.50');
  await expect(reportFrame.locator('.parameter-grid > div').filter({ hasText: '仿真光源' })).toContainText('理想点光源');
  await expect(reportFrame.getByRole('img', { name: '焦散投影（受光面）', exact: true })).toHaveAttribute('src', projectionImage!);
  await expect(page.getByRole('button', { name: '打印报告', exact: true })).toBeEnabled();
  await page.screenshot({ path: 'test-results/report-dialog-desktop.png', fullPage: true, animations: 'disabled' });

  const projectName = '焦散透镜点光源验证记录与加工参数'.repeat(3).slice(0, 50);
  await page.getByRole('textbox', { name: '项目名称' }).fill(projectName);
  await expect(reportFrame.locator('.report-project')).toHaveText(projectName);
  await expect(page.getByRole('button', { name: '打印报告', exact: true })).toBeEnabled();
  await page.locator('iframe[title="设计报告预览"]').evaluate((iframe: HTMLIFrameElement) => {
    iframe.contentWindow!.print = () => { iframe.dataset.printTitle = iframe.contentDocument!.title; };
  });
  await page.getByRole('button', { name: '打印报告', exact: true }).click();
  await expect(page.locator('iframe[title="设计报告预览"]')).toHaveAttribute('data-print-title', `焦散透镜设计报告 - ${projectName}`);
  for (const width of [390, 320]) {
    await page.setViewportSize({ width, height: 844 });
    await expect.poll(async () => {
      const box = await page.getByRole('dialog', { name: '设计报告', exact: true }).boundingBox();
      return !!box && box.x >= 0 && box.x + box.width <= width + 0.5 && box.height <= 844;
    }).toBe(true);
    expect(await reportFrame.locator('html').evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true);
    await page.screenshot({ path: `test-results/report-dialog-${width}.png`, fullPage: true, animations: 'disabled' });
  }

  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: /下载 HTML 报告/ }).click();
  const path = testInfo.outputPath('design-report.html');
  await (await download).saveAs(path);
  const previewText = await reportFrame.locator('.report-page').textContent();
  await page.reload();
  await context.setOffline(true);
  await page.goto(pathToFileURL(path).href);
  await expect(page.locator('.report-project')).toHaveText(projectName);
  expect(await page.locator('.report-page').textContent()).toBe(previewText);
  expect(await page.locator('.report-brand img').evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(64);
  expect(await page.getByRole('img', { name: '源图像', exact: true }).evaluate((img: HTMLImageElement) => img.naturalWidth)).toBe(512);
  await expect(page.getByRole('img', { name: '焦散投影（受光面）', exact: true })).toHaveAttribute('src', projectionImage!);
  await expect(page.locator('script')).toHaveCount(0);
  for (const width of [1200, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `test-results/report-export-${width}.png`, fullPage: true });
  }
  await page.setViewportSize({ width: 900, height: 1100 });
  await page.emulateMedia({ media: 'print' });
  await expect(page.locator('.report-header')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
  await page.screenshot({ path: 'test-results/report-print.png', fullPage: true });
  await page.pdf({ path: testInfo.outputPath('design-report.pdf'), format: 'A4', printBackground: true });
});
