import { test, expect } from '@playwright/test';
import fs from 'node:fs';

const manifest = JSON.parse(fs.readFileSync('data/manifest.json', 'utf8'));

test('all 118 reviewed profiles render with isotope and source sections', async ({ page }) => {
  test.setTimeout(180000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/?element=H');
  await expect(page.locator('#detail-hero h2')).toBeVisible();
  const result = await page.evaluate(async symbols => {
    const failures = [];
    for (const symbol of symbols) {
      window.interlinkElement(symbol);
      const article = document.querySelector('#article-content');
      if (!article.querySelector('.isotope-table tbody tr')) failures.push(`${symbol}: isotope table`);
      if (!article.querySelector('#sec-sources a')) failures.push(`${symbol}: sources`);
      if (!article.querySelector('#sec-overview .element-prose-list li')) failures.push(`${symbol}: overview`);
      if (/Nhóm \?|undefined|\[object Object\]/.test(article.textContent)) failures.push(`${symbol}: invalid text`);
      await new Promise(resolve => requestAnimationFrame(resolve));
    }
    return failures;
  }, manifest.map(row => row.symbol));
  expect(result).toEqual([]);
  expect(errors).toEqual([]);
});

test('mineral loads on demand, preserves its poster and has usable controls', async ({ page }) => {
  await page.goto('/?element=Fe');
  const model = page.locator('[id^="model-shell-Fe"]');
  await model.scrollIntoViewIfNeeded();
  await expect(model.locator('.mineral-poster')).toHaveJSProperty('naturalWidth', 640);
  await model.getByRole('button', { name: /Nhấn để xem mô hình 3D/ }).click();
  await expect(page.locator('[id^="model-status-Fe"]')).toHaveAttribute('data-state', 'ready');
  await expect(model.locator('canvas')).toBeVisible();
  await page.getByRole('button', { name: 'Tạm dừng xoay', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tự động xoay', exact: true })).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Góc nhìn ban đầu', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Tải mô hình GLB', exact: true })).toHaveAttribute('href', /hematite\.glb$/);
});

test('unmeasured heavy-element phases and formal equations are labelled', async ({ page }) => {
  await page.goto('/?element=Og');
  await expect(page.locator('#sec-general')).toContainText('Chưa xác định thực nghiệm');
  await expect(page.locator('#sec-reactions')).toContainText('Sơ đồ hình thức / dự đoán');
  await expect(page.locator('#sec-reactions')).toContainText('⁴⁸Ca');
  await expect(page.locator('#sec-reactions')).not.toContainText('²⁴⁸Ca');
  await page.locator('#sec-reactions').scrollIntoViewIfNeeded();
  await expect(page.locator('#sec-reactions')).toHaveCSS('opacity', '1');
  await expect(page.locator('[id^="model-shell-"]')).toHaveCount(0);
  await expect(page.locator('#crystal-widget canvas')).toHaveCount(0);
});

test('reviewed element profiles keep equations and isotope tables inside mobile viewport', async ({ page }) => {
  await page.setViewportSize({ width: 360, height: 800 });
  for (const symbol of ['H', 'Fe', 'La', 'Og']) {
    await page.goto(`/?element=${symbol}`);
    await expect(page.locator('#sec-general')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
    const overflows = await page.locator('#article-content').evaluate(root => [...root.querySelectorAll('.equation-latex,.isotope-table-wrap')].filter(node => node.getBoundingClientRect().right > innerWidth + 1).length);
    expect(overflows, symbol).toBe(0);
    const formulaWrapping = await page.locator('.equation-side').evaluateAll(nodes => nodes.some(node => getComputedStyle(node).whiteSpace !== 'nowrap' || node.clientHeight > 60));
    expect(formulaWrapping, symbol).toBe(false);
  }
});
