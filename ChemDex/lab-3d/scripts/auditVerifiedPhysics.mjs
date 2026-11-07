import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const output = resolve(process.env.PHYSICAL_AUDIT_OUTPUT ?? 'artifacts/verified-physics');
await mkdir(output, { recursive: true });
const report = { errors: [], checks: [], viewports: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const context = await browser.newContext({ viewport, isMobile: viewport.width < 500, hasTouch: viewport.width < 500 });
    await context.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'low'));
    await context.route('**/api/**', route => route.abort());
    const page = await context.newPage();
    page.on('pageerror', e => report.errors.push(e.message));
    await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('canvas', { timeout: 60000 });
    await page.getByRole('button', { name: 'Vật lí', exact: true }).click();
    await page.getByRole('checkbox', { name: /Bật va chạm/ }).check();
    await page.evaluate(async () => { window.physicsAuditStore = (await import('/src/physical/usePhysicsStore.ts')).usePhysicsStore; });
    await page.waitForFunction(() => window.physicsAuditStore.getState().status === 'running'
      && window.physicsAuditStore.getState().snapshot?.objects.length > 0, undefined, { timeout: 60000 });
    const before = await page.evaluate(async () => {
      const { useAppStore: app } = await import('/src/store/useAppStore.ts');
      const s = window.physicsAuditStore.getState(); app.getState().setSimulationPaused(true);
      return { tick: s.snapshot.tick, bodies: s.snapshot.objects.length, status: s.status };
    });
    await page.waitForTimeout(500);
    const frozen = await page.evaluate(() => window.physicsAuditStore.getState().snapshot.tick);
    await page.waitForTimeout(250);
    const after = await page.evaluate(() => window.physicsAuditStore.getState().snapshot.tick);
    if (after !== frozen) throw new Error('Physics advanced while paused');
    report.checks.push({ viewport, before, pauseTick: after, pass: after === frozen });
    for (const name of ['Lực kế', 'Cảm biến áp suất', 'Bóng hút pipet', 'Bể điều nhiệt', 'Bình thu khí chia độ']) {
      await page.getByRole('dialog').getByRole('button', { name: new RegExp(name) }).click();
    }
    await page.getByRole('button', { name: 'Đo vận tốc lắng', exact: true }).click();
    await page.evaluate(async () => (await import('/src/store/useAppStore.ts')).useAppStore.getState().setSimulationPaused(false));
    await page.waitForFunction(() => {
      const snapshot = window.physicsAuditStore.getState().snapshot;
      return snapshot?.experiments?.length === 6 && snapshot.experiments.every(e => e.time_s > 0.25);
    }, undefined, { timeout: 60000 });
    const measured = await page.evaluate(() => window.physicsAuditStore.getState().snapshot.experiments.map(e => ({ kind: e.kind, values: e.values })));
    for (const e of measured) if (!Object.values(e.values).every(Number.isFinite)) throw new Error(`Non-finite measurement ${e.kind}`);
    report.checks.push({ viewport, experiments: measured, pass: true });
    await page.screenshot({ path: resolve(output, `physics-${viewport.width}.png`) });
    report.viewports.push(viewport);
    await context.close();
  }
} finally { await browser.close(); await writeFile(resolve(output, 'browser-audit.json'), JSON.stringify(report, null, 2)); }
if (report.errors.length) throw new Error(report.errors.join('\n'));
console.log(JSON.stringify(report));
