import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { prepareLabAuditSession } from './fixtures/labAuditSession.mjs';

const origin = process.env.LAB_POSTFX_ORIGIN ?? 'http://127.0.0.1:6792';
const vendorUrl = /\/assets\/vendor-postfx-[^/]+\.js$/;
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

async function openLowQualityBench(page) {
  await prepareLabAuditSession(page);
  await page.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'low'));
  await page.goto(origin + '/lab/');
  await expect(page.locator('#manual-lab canvas')).toBeVisible({ timeout: 60000 });
  await page.getByLabel('Hiệu năng và chất lượng đồ họa').click();
  const quality = page.getByLabel('Chất lượng đồ họa', { exact: true });
  await expect(quality).toHaveValue('low');
  return quality;
}

try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 760 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /WebGLProgram|shader|VALIDATE_STATUS/i.test(message.text())) {
      errors.push(message.text());
    }
  });
  await page.addInitScript(() => {
    window.compiledSmaa = false;
    const original = WebGL2RenderingContext.prototype.shaderSource;
    WebGL2RenderingContext.prototype.shaderSource = function (shader, source) {
      if (source.includes('#define MAX_SEARCH_STEPS_INT')) window.compiledSmaa = true;
      return original.call(this, shader, source);
    };
  });
  const quality = await openLowQualityBench(page);
  const initial = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter(entry => /\/assets\/[^/]+\.js$/.test(entry.name)).map(entry => new URL(entry.name).pathname));
  assert.ok(!initial.some(name => /vendor-postfx|PostFXComposer/.test(name)));
  const requested = page.waitForResponse(response => vendorUrl.test(response.url()) && response.ok());
  await quality.selectOption('medium');
  await requested;
  await page.waitForFunction(() => window.compiledSmaa, undefined, { timeout: 60000 });
  await quality.selectOption('low');
  await page.getByRole('button', { name: 'Tạm dừng phản ứng', exact: true }).click();
  await expect(page.getByRole('button', { name: 'Tiếp tục phản ứng', exact: true })).toBeEnabled();
  assert.deepEqual(errors, []);
  await page.close();

  const offlinePage = await browser.newPage({ viewport: { width: 1080, height: 760 } });
  const offlineErrors = [];
  offlinePage.on('pageerror', error => offlineErrors.push(error.message));
  await offlinePage.route(vendorUrl, route => route.abort());
  const offlineQuality = await openLowQualityBench(offlinePage);
  const blocked = offlinePage.waitForEvent('requestfailed', { predicate: request => vendorUrl.test(request.url()) });
  await offlineQuality.selectOption('medium');
  await blocked;
  await expect(offlinePage.locator('#manual-lab canvas')).toBeVisible();
  await offlinePage.getByRole('button', { name: 'Tạm dừng phản ứng', exact: true }).click();
  await expect(offlinePage.getByRole('button', { name: 'Tiếp tục phản ứng', exact: true })).toBeEnabled();
  assert.deepEqual(offlineErrors, []);
  console.log(JSON.stringify({ initial, postFxDeferred: true, mediumCompiledSmaa: true,
    returnedToLow: true, optionalDownloadFailureKeepsWorkbench: true, errors }));
} finally {
  await browser.close();
}
