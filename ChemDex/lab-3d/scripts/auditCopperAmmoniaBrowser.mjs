import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const origin = process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6779';
const output = 'artifacts/copper-ammonia/browser';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
const errors = [];
page.on('pageerror', e => errors.push(e.stack ?? e.message));
try {
  await page.goto(`${origin}/?mode=auto`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(r => r.name).find(n => /\/AutoExperiment\.ts(\?|$)/.test(n));
    const { AutoExperiment } = await import(url);
    const tick = AutoExperiment.prototype.tick;
    AutoExperiment.prototype.tick = function (dt) { window.__copperAudit = this; return tick.call(this, dt); };
  });
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).fill('CuSO4');
  await page.getByRole('button', { name: /^CuSO4 \+ NH3/ }).first().click();
  await page.waitForFunction(() => window.__copperAudit?.program.id === 'cuso4_nh3');
  await page.getByTestId('auto-timeline').getByText('Kết tủa', { exact: true }).waitFor();
  await page.evaluate(async () => {
    await window.__copperAudit.stocks.initialize();
    const url = performance.getEntriesByType('resource').map(r => r.name).find(n => /@react-three_fiber\.js/.test(n));
    const { _roots } = await import(url);
    window.__copperCanvas = _roots.get(document.querySelector('canvas')).store;
  });
  await page.getByRole('button', { name: 'Góc cận cảnh' }).click();
  const gel = await page.evaluate(() => {
    const e = window.__copperAudit; e.paused = true;
    for (let i = 0; i < 4000 && !((e.sample.precipitateAmount_g ?? 0) > 0.015 && e.phase === 'dose'); i++) {
      e.paused = false; e.tick(1 / 60); e.paused = true;
      if (e.error) throw new Error(e.error);
    }
    window.__copperCanvas.getState().invalidate();
    return { phase: e.phase, gel_g: e.sample.precipitateAmount_g ?? 0, color: e.sample.liquidColor, mass_g: e.sample.mass_g };
  });
  assert.ok(gel.gel_g > 0.015); assert.equal(gel.phase, 'dose');
  await page.waitForTimeout(600);
  await page.screenshot({ path: `${output}/gel-during-dose.png` });
  const clear = await page.evaluate(() => {
    const e = window.__copperAudit;
    for (let i = 0; i < 6000 && !['complete', 'error'].includes(e.phase); i++) {
      e.paused = false; e.tick(1 / 60); e.paused = true;
    }
    window.__copperCanvas.getState().invalidate();
    return { phase: e.phase, error: e.error, gel_g: e.sample.precipitateAmount_g ?? 0,
      color: e.sample.liquidColor, contents: e.sample.contents.map(c => ({ formula: c.formula, phase: c.phase, moles: c.moles })) };
  });
  assert.equal(clear.phase, 'complete'); assert.equal(clear.error, null); assert.ok(clear.gel_g < 1e-7);
  assert.ok(clear.contents.some(c => c.formula === '[Cu(NH3)4]SO4'));
  assert.notEqual(clear.color, gel.color);
  await page.waitForTimeout(600);
  const autoModel = page.getByTestId('auto-timeline').locator('[data-copper-speciation]');
  await autoModel.locator('summary').click();
  await autoModel.locator('[data-copper-species="mixed-2"]').waitFor({ state: 'visible' });
  const autoSpeciation = await autoModel.evaluate(el => ({ sum: Number(el.dataset.fractionSum),
    fractions: Object.fromEntries([...el.querySelectorAll('[data-copper-species]')].map(r => [r.dataset.copperSpecies, Number(r.dataset.fraction)])) }));
  assert.ok(Math.abs(autoSpeciation.sum - 1) < 1e-9);
  assert.ok(autoSpeciation.fractions['mixed-3'] > 0.01);
  await page.screenshot({ path: `${output}/clear-after-excess-ammonia.png` });

  // Inspect the same finite specimen in the independent manual workspace.
  // This browser has an isolated store; restore it after the read-only check.
  const manualSample = await page.evaluate(() => structuredClone(window.__copperAudit.sample));
  await page.getByRole('tab', { name: 'Thao tác', exact: true }).click();
  await page.locator('#manual-lab canvas').waitFor({ state: 'visible', timeout: 60000 });
  await page.evaluate(async specimen => {
    const url = performance.getEntriesByType('resource').map(r => r.name).find(n => /\/useAppStore\.ts(\?|$)/.test(n));
    const { useAppStore } = await import(url);
    window.__copperStore = useAppStore; window.__copperManualBefore = useAppStore.getState();
    const sample = specimen; sample.id = 'manual_copper_probe';
    useAppStore.setState({ vessels: { [sample.id]: sample }, vesselIds: [sample.id], selectedVesselId: sample.id,
      activeKinetics: {}, pendingReactions: {}, lastMixResult: null, isSimulationPaused: true,
      isPresentationMode: false, rightSidebarOpen: true });
  }, manualSample);
  const manualModel = page.locator('#manual-lab [data-copper-speciation]');
  await manualModel.locator('summary').click({ timeout: 60000 });
  await manualModel.locator('[data-copper-species="mixed-2"]').waitFor({ state: 'visible' });
  const manualSpeciation = await manualModel.evaluate(el => ({ sum: Number(el.dataset.fractionSum),
    fractions: Object.fromEntries([...el.querySelectorAll('[data-copper-species]')].map(r => [r.dataset.copperSpecies, Number(r.dataset.fraction)])) }));
  for (const key of Object.keys(autoSpeciation.fractions))
    assert.ok(Math.abs(autoSpeciation.fractions[key] - manualSpeciation.fractions[key]) < 1e-9, key);
  await page.screenshot({ path: `${output}/manual-speciation.png` });
  await page.evaluate(() => window.__copperStore.setState(window.__copperManualBefore, true));
  assert.deepEqual(errors, []);
  const report = { gelDuringDose: gel, clearAfterExcessAmmonia: clear, autoSpeciation, manualSpeciation,
    errors, browser: 'Chromium + SwiftShader',
    renderingInspected: true, experimentalTimingValidated: false };
  writeFileSync(`${output}/audit.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(report);
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  console.error({ url: page.url(), errors });
  throw error;
} finally { await browser.close(); }
