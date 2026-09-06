import { test, expect } from '@playwright/test';

test('static previews stop drawing while rotation and camera changes remain responsive', async ({ page }) => {
  await page.addInitScript(() => {
    const counters = globalThis as typeof globalThis & { webglDrawCalls: number };
    counters.webglDrawCalls = 0;
    for (const prototype of [WebGLRenderingContext.prototype, WebGL2RenderingContext.prototype]) {
      for (const method of ['drawArrays', 'drawElements'] as const) {
        const original = prototype[method];
        Object.defineProperty(prototype, method, { configurable: true, writable: true,
          value: function (...args: unknown[]) {
            counters.webglDrawCalls++;
            return Reflect.apply(original, this, args);
          } });
      }
    }
  });
  await page.goto('/');
  await page.getByRole('button', { name: '载入示例图案' }).click();
  await page.getByRole('button', { name: '生成透镜', exact: true }).click();
  await expect(page.getByTestId('viewport')).toHaveAttribute('data-projection-ready', 'true', { timeout: 90_000 });
  const drawCalls = () => page.evaluate(() => (globalThis as typeof globalThis & { webglDrawCalls: number }).webglDrawCalls);
  await expect.poll(drawCalls).toBeGreaterThan(0);
  const isIdle = async () => {
    const before = await drawCalls();
    await page.waitForTimeout(500);
    return await drawCalls() === before;
  };
  await expect.poll(isIdle).toBe(true);
  const beforeRotation = await drawCalls();
  await page.getByRole('button', { name: '自动旋转', exact: true }).click();
  await expect.poll(drawCalls).toBeGreaterThan(beforeRotation);
  await page.getByRole('button', { name: '重置视角', exact: true }).click();
  await expect(page.getByRole('button', { name: '自动旋转', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await expect.poll(isIdle).toBe(true);
  const beforeModeChange = await drawCalls();
  await page.getByRole('radiogroup', { name: '预览模式' }).getByText('投影', { exact: true }).click();
  await expect.poll(drawCalls).toBeGreaterThan(beforeModeChange);
  await expect.poll(isIdle).toBe(true);
});
