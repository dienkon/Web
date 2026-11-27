import assert from 'node:assert/strict';
import { chromium, expect } from '@playwright/test';
import { prepareLabAuditSession } from './fixtures/labAuditSession.mjs';

const origin = process.env.LAB_LIBRARY_ORIGIN ?? 'http://127.0.0.1:6792';
const libraryChunk = /\/assets\/data-reaction-library-[^/]+\.js$/;
const browser = await chromium.launch({ channel: 'chrome', headless: true,
  args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });

try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 850 } });
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await prepareLabAuditSession(page);
  await page.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'low'));
  await page.goto(origin + '/lab/', { waitUntil: 'domcontentloaded' });
  await expect(page.locator('#manual-lab canvas')).toBeVisible({ timeout: 60000 });
  const initialChunks = await page.evaluate(() => performance.getEntriesByType('resource')
    .filter(entry => /\/assets\/[^/]+\.js$/.test(entry.name))
    .map(entry => new URL(entry.name).pathname.split('/').pop()));
  assert.ok(!initialChunks.some(name => name.startsWith('data-reaction-library-')));

  const catalog = page.locator('#lab-left-panel');
  const toggle = page.getByRole('button', { name: 'Kho hóa chất và dụng cụ', exact: true });
  if (await toggle.getAttribute('aria-expanded') === 'false') await toggle.click();
  const downloaded = page.waitForResponse(response => libraryChunk.test(response.url()) && response.ok(), { timeout: 60000 });
  await catalog.getByRole('button', { name: 'Bài học', exact: true }).click();
  const response = await downloaded;
  await expect(catalog.getByRole('heading', { name: /^Thư viện phản ứng THPT · \d+ mục$/ })).toBeVisible({ timeout: 60000 });
  const search = catalog.getByLabel('Tìm phản ứng', { exact: true });
  await search.fill('HCl + NaOH');
  await catalog.getByRole('button', { name: /^HCl \+ NaOH/ }).first().click();
  await expect(catalog.getByRole('button', { name: '← Danh mục', exact: true })).toBeVisible();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ initialChunks, deferredLibrary: new URL(response.url()).pathname.split('/').pop(),
    searchAndEntryOpened: true, runtimeErrors: errors }));
} finally {
  await browser.close();
}
