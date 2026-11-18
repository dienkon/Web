import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium } from '@playwright/test';
import { prepareLabAuditSession } from './fixtures/labAuditSession.mjs';

const origin = process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767';
const output = resolve(process.env.LAB_PRODUCTION_OUTPUT ?? 'artifacts/standalone-production');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const report = { errors: [], assets: [], manual: false, automatic: false, paused: false };

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
  page.setDefaultTimeout(60000);
  await prepareLabAuditSession(page);
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /shader|webgl|module script/i.test(message.text())) report.errors.push(message.text());
  });
  page.on('response', response => {
    if (new URL(response.url()).origin !== origin || !response.url().includes('/assets/')) return;
    const contentType = response.headers()['content-type'] ?? '';
    if (!response.ok() || contentType.includes('text/html')) {
      report.assets.push({ status: response.status(), contentType, url: response.url() });
    }
  });
  const missing = await page.request.get(`${origin}/lab/assets/nonexistent-module.js`);
  assert.equal(missing.status(), 404);
  await page.goto(`${origin}/lab/`, { waitUntil: 'domcontentloaded' });
  await page.locator('#manual-lab canvas').waitFor();
  report.manual = true;

  await page.getByRole('tab', { name: 'Tự động', exact: true }).click();
  await page.getByRole('button', { name: 'Hiện danh mục tự động', exact: true }).click();
  await page.locator('[data-tour-reaction="cuso4_naoh"]').click();
  await page.locator('#automatic-lab canvas').waitFor();
  await page.waitForFunction(() => Number(document.querySelector('[data-auto-program="cuso4_naoh"]')
    ?.getAttribute('data-auto-elapsed')) > 0.25);
  report.automatic = true;

  await page.getByRole('button', { name: 'Tạm dừng tự động' }).click();
  const playback = page.locator('[data-auto-paused="true"][data-auto-elapsed]');
  await playback.waitFor();
  const simulatedTime = await playback.getAttribute('data-auto-elapsed');
  await page.waitForTimeout(400);
  report.paused = await playback.getAttribute('data-auto-elapsed') === simulatedTime;
  assert.ok(report.paused);
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.assets, []);
  await page.screenshot({ path: resolve(output, 'automatic-paused.png') });
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.failure = String(error);
  throw error;
} finally {
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
