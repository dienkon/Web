import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import assert from 'node:assert/strict';

const origin = process.env.ASSET_BROWSER_ORIGIN ?? 'http://127.0.0.1:6774';
const output = new URL('../artifacts/asset-browser/', import.meta.url);
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { checked: [], errors: [], consoleErrors: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  await page.route('**/favicon.ico', route => route.fulfill({ status: 204 }));
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
  await page.goto(`${origin}/?view=assets`, { waitUntil: 'networkidle', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 90000 });
  await page.waitForFunction(() => {
    const d = [...document.querySelectorAll('.ab-description dl>div')].find(e => e.textContent.includes('Số mesh'));
    return d && Number(d.querySelector('dd').textContent) > 0;
  }, null, { timeout: 60000 });
  const canvasHandle = await page.locator('canvas').elementHandle();
  const persisted = await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('chemlab_'))));
  await page.screenshot({ path: new URL('desktop.png', output).pathname.replace(/^\/(\w:)/, '$1') });
  const assets = await page.locator('.ab-asset-item').evaluateAll(items => items.map(item => ({ id: item.dataset.assetId, name: item.querySelector('strong').textContent })));
  const cases = assets;
  for (const asset of process.env.ASSET_BROWSER_FROM ? cases.slice(cases.findIndex(a => a.id === process.env.ASSET_BROWSER_FROM)) : cases) {
    await page.locator(`[data-asset-id="${asset.id}"]`).click();
    await page.waitForFunction(() => {
      const d = [...document.querySelectorAll('.ab-description dl>div')].find(e => e.textContent.includes('Số mesh'));
      return d && Number(d.querySelector('dd').textContent) > 0;
    }, null, { timeout: 30000 });
    report.checked.push(asset.id);
    console.log('Rendered', asset.id);
    if (['thermometer', 'chemical-10', 'chemical-12', 'chemical-25'].includes(asset.id)) {
      await page.screenshot({ path: new URL(`${asset.id}.png`, output).pathname.replace(/^\/(\w:)/, '$1') });
    }
    assert.equal(await page.locator('canvas').evaluate((current, original) => current === original, canvasHandle), true, 'Canvas should survive asset changes');
  }
  await page.getByRole('textbox', { name: 'Tìm asset' }).fill('binh tam giac');
  assert.equal(await page.locator('.ab-asset-item').count(), 1);
  await page.locator('.ab-asset-item').click();
  await page.getByRole('button', { name: 'Trên', exact: true }).click();
  await page.getByRole('button', { name: 'Khám phá cận cảnh' }).click();
  await page.getByRole('checkbox', { name: 'Khung lưới mô hình' }).check();
  await page.getByRole('checkbox', { name: 'Khung lưới mô hình' }).uncheck();
  await page.getByRole('button', { name: 'Chi tiết cao', exact: true }).click();
  await page.getByRole('button', { name: 'Mượt mà', exact: true }).click();
  await page.getByRole('button', { name: 'Hướng dẫn điều khiển', exact: true }).click();
  assert.equal(await page.getByRole('dialog').count(), 1);
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('dialog').count(), 0);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Chụp ảnh PNG', exact: true }).click();
  const download = await downloadPromise;
  assert.match(download.suggestedFilename(), /chemdex-flask\.png/);
  await page.getByRole('textbox', { name: 'Tìm asset' }).fill('no-model-here-987');
  assert.equal(await page.getByText('Chưa tìm thấy mô hình').count(), 1);
  await page.getByRole('button', { name: 'Hiện tất cả', exact: true }).click();
  assert.equal(await page.locator('.ab-asset-item').count(), assets.length);
  assert.deepEqual(await page.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k.startsWith('chemlab_')))), persisted);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: 'Phối cảnh', exact: true }).click();
  await page.waitForTimeout(1500);
  await page.screenshot({ path: new URL('mobile.png', output).pathname.replace(/^\/(\w:)/, '$1') });
  await page.getByRole('button', { name: 'Thư viện', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm asset' }).fill('coc mo');
  await page.locator('.ab-asset-item').click();
  await page.waitForTimeout(1500);
  assert.equal(await page.locator('.ab-catalog').isVisible(), false);
  await page.getByRole('button', { name: 'Chi tiết', exact: true }).click();
  assert.equal(await page.locator('.ab-details').isVisible(), true);
  await page.screenshot({ path: new URL('mobile-details.png', output).pathname.replace(/^\/(\w:)/, '$1') });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.consoleErrors, []);
} finally {
  await writeFile(new URL('report.json', output), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
