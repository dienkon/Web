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
    try { await page.waitForFunction(() => {
      const snapshot = window.physicsAuditStore.getState().snapshot;
      return snapshot?.experiments?.length === 6 && snapshot.experiments.every(e => e.time_s > 0.25);
    }, undefined, { timeout: 30000 }); } catch (error) {
      const diagnostic = await page.evaluate(async () => {
        const s = window.physicsAuditStore.getState(), app = (await import('/src/store/useAppStore.ts')).useAppStore.getState();
        return { enabled: s.enabled, status: s.status, error: s.error, requested: s.experiments.map(e => e.id),
          actual: s.snapshot?.experiments?.map(e => ({ id: e.id, time_s: e.time_s })), tick: s.snapshot?.tick, paused: app.isSimulationPaused };
      });
      console.log(JSON.stringify({ fixtureDiagnostic: diagnostic })); report.errors.push(JSON.stringify(diagnostic)); throw error;
    }
    const measured = await page.evaluate(() => window.physicsAuditStore.getState().snapshot.experiments.map(e => ({ kind: e.kind, values: e.values })));
    for (const e of measured) if (!Object.values(e.values).every(Number.isFinite)) throw new Error(`Non-finite measurement ${e.kind}`);
    report.checks.push({ viewport, experiments: measured, pass: true });
    await page.screenshot({ path: resolve(output, `physics-${viewport.width}.png`) });
    const saved = await page.evaluate(async () => {
      const { useAppStore: app } = await import('/src/store/useAppStore.ts');
      const { debounceSaveLocalState } = await import('/src/store/persistence.ts');
      const s = app.getState();
      debounceSaveLocalState(s.vessels, s.burners, { inFlightPours: s.inFlightPours, spills: s.spills,
        wasteMass_g: s.wasteMass_g, wasteContents: s.wasteContents, workbenchEscapedGas_g: s.workbenchEscapedGas_g, pipetteSample: s.pipetteSample });
      return { objects: window.physicsAuditStore.getState().expansions.length, tick: window.physicsAuditStore.getState().snapshot.tick };
    });
    await page.waitForFunction(minTick => {
      const raw = localStorage.getItem('chemlab_physical_state_v4');
      const physical = raw && JSON.parse(raw).materials?.physics;
      return physical?.expansions.length === 5 && physical.tick >= minTick && physical.experiments?.length === 6;
    }, saved.tick, { timeout: 15000 });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.evaluate(async () => { window.physicsAuditStore = (await import('/src/physical/usePhysicsStore.ts')).usePhysicsStore; });
    try { await page.waitForFunction(() => {
      const s = window.physicsAuditStore.getState();
      return s.enabled && s.status === 'running' && s.snapshot?.objects.length >= 8 && s.snapshot?.experiments?.length === 6;
    }, undefined, { timeout: 30000 }); } catch (error) {
      const diagnostic = await page.evaluate(async () => {
        const s = window.physicsAuditStore.getState(), saved = JSON.parse(localStorage.getItem('chemlab_physical_state_v4'));
        const { isReferenceExperiment } = await import('/src/physical/ReferenceExperiments.ts');
        return { enabled: s.enabled, status: s.status, error: s.error, expansions: s.expansions.length,
          objects: s.snapshot?.objects.length, experiments: s.snapshot?.experiments?.length,
          savedEnabled: saved?.materials?.physics?.enabled, savedExperiments: saved?.materials?.physics?.experiments?.map(e => ({ kind: e.kind, valid: isReferenceExperiment(e) })),
          savedExpansionCount: saved?.materials?.physics?.expansions?.length };
      });
      console.log(JSON.stringify({ diagnostic })); report.errors.push(JSON.stringify(diagnostic)); throw error;
    }
    const restored = await page.evaluate(() => ({ objects: window.physicsAuditStore.getState().expansions.length,
      tick: window.physicsAuditStore.getState().snapshot.tick }));
    if (restored.objects !== saved.objects || restored.tick < saved.tick) throw new Error('Physics save/reload lost objects or time');
    report.checks.push({ viewport, saved, restored, pass: true });
    report.viewports.push(viewport);
    await context.close();
  }
} finally { await browser.close(); await writeFile(resolve(output, 'browser-audit.json'), JSON.stringify(report, null, 2)); }
if (report.errors.length) throw new Error(report.errors.join('\n'));
console.log(JSON.stringify(report));
