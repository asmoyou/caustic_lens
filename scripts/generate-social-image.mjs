import { chromium } from '@playwright/test';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
  await page.goto(process.env.PREVIEW_URL ?? 'http://127.0.0.1:5173/');
  await page.getByRole('button', { name: '载入示例图案' }).waitFor();
  await page.addStyleTag({ content: `
    .app-header { height: 70px; }
    .workspace-main { padding: 18px 24px 0; }
    .workspace-heading { margin-bottom: 16px; }
    .viewer-section { height: 450px; }
    .model-metrics, .projection-results, .workspace-footer, .iteration-images { display: none; }
    .control-sidebar { padding-top: 14px; height: 560px; }
    .source-preview { max-height: 185px; }
    .source-preview .ant-image { max-height: 185px; }
  ` });
  await page.getByRole('button', { name: '载入示例图案' }).click();
  await page.getByRole('button', { name: '生成透镜', exact: true }).click();
  await page.locator('[data-projection-ready=true]').waitFor({ timeout: 90_000 });
  await page.getByRole('radiogroup', { name: '预览模式' }).getByText('投影', { exact: true }).click();
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await page.screenshot({ path: 'public/social-preview.png', animations: 'disabled' });
} finally { await browser.close(); }
