import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const output = 'artifacts/landolt-clock/browser'; mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
const errors = []; page.on('pageerror', e => errors.push(e.stack ?? e.message));
try {
  await page.goto(`${process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6779'}/?mode=auto`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(r => r.name).find(n => /\/AutoExperiment\.ts(\?|$)/.test(n));
    const { AutoExperiment } = await import(url), tick = AutoExperiment.prototype.tick;
    AutoExperiment.prototype.tick = function(dt) { window.__landoltAudit = this; return tick.call(this, dt); };
  });
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).fill('KIO3');
  await page.getByRole('button', { name: /KIO3/ }).first().click();
  await page.waitForFunction(() => window.__landoltAudit?.program.id === 'iodine_clock');
  await page.evaluate(async () => { await window.__landoltAudit.stocks.initialize(); window.__landoltAudit.paused = true; });
  const early = await page.evaluate(() => {
    const e = window.__landoltAudit;
    for (let i = 0; i < 3000 && !((e.sample.contents.some(c => c.formula === 'KIO3' || c.formula === 'IO3(-)'))
      && !e.sample.contents.some(c => c.formula === 'NaHSO3' || c.formula === 'HSO3(-)')); i++) {
      e.paused = false; e.tick(1 / 60); e.paused = true;
    }
    return { phase: e.phase, elapsed_s: e.elapsed, color: e.sample.liquidColor };
  });
  assert.equal(early.color, '#f8fafc');
  await page.waitForTimeout(400); await page.screenshot({ path: `${output}/before-reductant-contact.png` });
  const final = await page.evaluate(() => {
    const e = window.__landoltAudit;
    for (let i = 0; i < 14400 && !['complete', 'error'].includes(e.phase); i++) {
      e.paused = false; e.tick(1 / 60); e.paused = true;
    }
    return { phase: e.phase, error: e.error, color: e.sample.liquidColor, specimen: structuredClone(e.sample),
      readout: e.reactionReadout };
  });
  assert.equal(final.error, null); assert.equal(final.phase, 'complete'); assert.equal(final.color, '#0f172a');
  assert.equal(final.readout.label, 'I₂ quy đổi');
  const auto = page.getByTestId('auto-timeline').locator('[data-landolt-clock]');
  await auto.locator('summary').click();
  const quantities = el => Object.fromEntries([...el.querySelectorAll('[data-landolt-species]')]
    .map(r => [r.dataset.landoltSpecies, Number(r.dataset.moles)]));
  const autoQuantities = await auto.evaluate(quantities);
  assert.ok(autoQuantities.iodine > 0); assert.ok(autoQuantities.sulfite < 1e-8);
  await page.screenshot({ path: `${output}/after-iodine-accumulation.png` });
  await page.getByRole('tab', { name: 'Thao tác', exact: true }).click();
  await page.locator('#manual-lab canvas').waitFor({ state: 'visible', timeout: 60000 });
  await page.evaluate(async specimen => {
    const url = performance.getEntriesByType('resource').map(r => r.name).find(n => /\/useAppStore\.ts(\?|$)/.test(n));
    const { useAppStore } = await import(url); window.__landoltStore = useAppStore;
    window.__landoltBefore = useAppStore.getState(); specimen.id = 'manual_landolt_probe';
    useAppStore.setState({ vessels: { [specimen.id]: specimen }, vesselIds: [specimen.id], selectedVesselId: specimen.id,
      activeKinetics: {}, pendingReactions: {}, lastMixResult: null, isSimulationPaused: true, isPresentationMode: false, rightSidebarOpen: true });
  }, final.specimen);
  const manual = page.locator('#manual-lab [data-landolt-clock]'); await manual.locator('summary').click();
  const manualQuantities = await manual.evaluate(quantities);
  assert.deepEqual(manualQuantities, autoQuantities);
  await page.screenshot({ path: `${output}/manual-quantities.png` });
  await page.evaluate(() => window.__landoltStore.setState(window.__landoltBefore, true));
  assert.deepEqual(errors, []);
  const report = { checkedAt: new Date().toISOString(), early, final: { phase: final.phase, error: final.error,
    color: final.color, readout: final.readout }, autoQuantities, manualQuantities, errors,
    browser: 'Chromium + SwiftShader', experimentalClockTimesValidated: false };
  writeFileSync(`${output}/audit.json`, JSON.stringify(report, null, 2) + '\n'); console.log(report);
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png` }).catch(() => {}); console.error({ url: page.url(), errors }); throw error;
} finally { await browser.close(); }
