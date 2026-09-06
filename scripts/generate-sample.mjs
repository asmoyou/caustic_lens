import { chromium } from '@playwright/test';
import { writeFile } from 'node:fs/promises';

const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage();
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas');
    canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#101414';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 28;
    ctx.beginPath();
    ctx.arc(256, 256, 156, 0, Math.PI * 2);
    ctx.stroke();
    ctx.font = 'bold 210px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#ffffff';
    ctx.fillText('C', 256, 270);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  await writeFile(new URL('../public/sample-target.png', import.meta.url), Buffer.from(png, 'base64'));
} finally { await browser.close(); }
