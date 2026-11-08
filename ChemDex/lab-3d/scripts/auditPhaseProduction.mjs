import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(process.env.FOAM_ICE_OUTPUT ?? 'artifacts/foam-ice');
await mkdir(output, { recursive: true });
const report = { method: 'Production bundle, native toolbar/checkbox/palette clicks. No dev imports or simulation API injection. Checks boot, ice creation, persistence and console errors; numerical mesh validation is in auditFoamIce.', errors: [], consoleErrors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'low'));
  await context.route('**/api/**', route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.stack ?? e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
  await page.goto(process.env.PHASE_PRODUCTION_ORIGIN ?? 'http://127.0.0.1:6774', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.getByRole('button', { name: 'Vật lí', exact: true }).click();
  await page.getByRole('checkbox', { name: /Bật va chạm/ }).check();
  await page.getByRole('dialog').getByRole('button', { name: /Băng nước/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: 'Đóng', exact: true }).click();
  await page.waitForFunction(() => {
    const raw = localStorage.getItem('chemlab_physical_state_v4');
    const saved = raw && JSON.parse(raw);
    return saved && Object.values(saved.vessels ?? {}).some(v => v.contents?.some(c => c.formula === 'H2O' && c.phase === 's' && c.mass_g > 0));
  }, undefined, { timeout: 30000 });
  report.savedIce = await page.evaluate(() => {
    const saved = JSON.parse(localStorage.getItem('chemlab_physical_state_v4'));
    return Object.values(saved.vessels).filter(v => v.contents?.some(c => c.formula === 'H2O' && c.phase === 's')).map(v => ({
      name: v.name, ice_g: v.contents.filter(c => c.formula === 'H2O' && c.phase === 's').reduce((sum, c) => sum + c.mass_g, 0),
      liquid_ml: v.volume_ml, temperature_c: v.temperature_c }));
  });
  await page.screenshot({ path: resolve(output, 'production-ice.png') });
  report.pass = report.errors.length === 0 && report.consoleErrors.length === 0 && report.savedIce.length > 0;
  await context.close();
} finally { await browser.close(); await writeFile(resolve(output, 'production-audit.json'), JSON.stringify(report, null, 2)); }
if (!report.pass) throw new Error(JSON.stringify(report));
console.log(JSON.stringify(report));
