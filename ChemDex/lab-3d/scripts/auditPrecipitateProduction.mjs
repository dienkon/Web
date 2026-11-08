import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('artifacts/precipitate-stress/production'); await mkdir(output, { recursive: true });
const fixture = await readFile(resolve('artifacts/precipitate-stress/fixture.json'), 'utf8');
const report = { errors: [], consoleErrors: [], cases: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 430, height: 932 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
    await context.addInitScript(record => {
      localStorage.setItem('chemlab_physical_state_v4', record); localStorage.setItem('chemlab_vfx_quality_preference', 'low');
      window.productionContextLosses = 0; document.addEventListener('webglcontextlost', () => window.productionContextLosses++, true);
    }, fixture);
    await context.route('**/api/**', route => route.abort());
    const page = await context.newPage(); page.on('pageerror', e => report.errors.push(e.stack ?? e.message));
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
    await page.goto(`${process.env.PRODUCTION_ORIGIN ?? 'http://127.0.0.1:6774'}/?vfx=1`, { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas'); await page.locator('button[title="Precipitate Crystal & Colloid Morphology"]').click();
    const sample = page.getByRole('button', { name: 'Xem mẫu đang có', exact: true }).first();
    for (let i = 0; i < 20; i++) await sample.click();
    const checkbox = page.getByRole('checkbox', { name: 'Phóng đại cụm keo để quan sát' }); await checkbox.uncheck(); await checkbox.check();
    await page.waitForTimeout(1500);
    const losses = await page.evaluate(() => window.productionContextLosses);
    if (losses) throw new Error(`Production WebGL context loss: ${losses}`);
    await page.screenshot({ path: resolve(output, mobile ? 'mobile.png' : 'desktop.png') });
    report.cases.push({ mobile, previewClicks: 20, losses, canvas: await page.locator('canvas').count() });
    await context.close();
  }
} finally { await browser.close(); await writeFile(resolve(output, 'browser-audit.json'), JSON.stringify(report, null, 2)); }
if (report.errors.length || report.consoleErrors.length) throw new Error(JSON.stringify(report));
console.log(JSON.stringify(report));
