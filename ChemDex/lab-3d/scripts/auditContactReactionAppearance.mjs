import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const origin = process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6777';
const output = 'artifacts/contact-reaction-appearance'; mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
const errors = [];
page.on('pageerror', e => errors.push(e.stack ?? e.message));
page.on('console', m => { if (m.type() === 'error' && /shader|webgl|THREE/i.test(m.text())) errors.push(m.text()); });
async function start(name, id) {
  await page.getByRole('button', { name, exact: true }).first().click();
  await page.waitForFunction(id => window.__contactExperiment?.program.id === id, id);
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(p => p.name).find(s => /@react-three_fiber\.js/.test(s));
    const { _roots } = await import(url); window.__contactRoot = _roots.get(document.querySelector('canvas')).store;
  });
}
async function advance(predicate) {
  await page.evaluate(predicate => {
    const e = window.__contactExperiment, done = new Function('e', `return (${predicate})`); e.paused = false; e.speed = 1;
    for (let i = 0; i < 12000 && !done(e) && !e.error; i++) e.tick(1 / 60);
    e.paused = true; window.__contactRoot.getState().invalidate();
    if (!done(e)) throw new Error(`${predicate}: ${e.phase} ${e.error ?? ''}`);
  }, predicate);
  await page.waitForTimeout(300);
}
async function smoke() {
  return page.evaluate(() => {
    const e = window.__contactExperiment, p = [...e.clouds.clouds.values()].flatMap(c => c.system.particles);
    return { elapsed: e.elapsed, count: p.length, interior: p.filter(p => !p.released).length,
      exterior: p.filter(p => p.released).length, maxY: Math.max(...p.map(p => p.y)),
      maxAge: Math.max(...p.map(p => p.age)), maxSize: Math.max(...p.map(p => p.size)),
      accepted_mol: [...e.clouds.clouds.values()].reduce((n, c) => n + c.acceptedExhaust_mol, 0),
      floorOpacity: window.__contactRoot.getState().scene.getObjectByName('auto_sediment_bed').material.opacity,
      ledger_g: e.sample.contents.filter(c => c.formula === 'NH4Cl').reduce((n, c) => n + c.mass_g, 0) };
  });
}
try {
  await page.goto(`${origin}/?mode=auto`, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const resource = re => performance.getEntriesByType('resource').map(p => p.name).find(s => re.test(s));
    const { AutoExperiment } = await import(resource(/\/AutoExperiment\.ts(\?|$)/)), tick = AutoExperiment.prototype.tick;
    AutoExperiment.prototype.tick = function (dt) { window.__contactExperiment = this; return tick.call(this, dt); };
    const { LiquidAppearanceField } = await import(resource(/\/LiquidAppearanceField\.ts(\?|$)/)), step = LiquidAppearanceField.prototype.advance;
    LiquidAppearanceField.prototype.advance = function (dt, input) {
      if (input.color === '#6b1598' || this === window.__manualAppearance) window.__manualAppearance = this;
      return step.call(this, dt, input);
    };
  });
  await start('CuSO4 + NaOH', 'cuso4_naoh');
  await advance("e.phase === 'dose' && e.donors[e.donorIndex]?.row.formula === 'CuSO4' && e.donors[e.donorIndex].fraction > 0.2");
  await page.getByRole('button', { name: 'Góc mặt dịch' }).click(); await page.waitForTimeout(900);
  const color = await page.evaluate(() => {
    const e = window.__contactExperiment, f = e.appearance, p = e.sample.recentPourContact.point;
    const x = (Math.max(-0.8, Math.min(0.8, p[0] / f.radius)) + 1) / 2, z = (p[2] / f.radius + 1) / 2;
    return { near: f.sample(x, 0.95, z, 0), far: f.sample(x < 0.5 ? 0.92 : 0.08, 0.95, 0.5, 0), contact: p, radius: f.radius, revision: f.revision };
  });
  assert.ok(color.near < color.far - 0.025, JSON.stringify(color));
  await page.screenshot({ path: `${output}/auto-contact-color.png` });
  await advance("e.phase === 'dose' && e.donors[e.donorIndex]?.row.formula === 'NaOH' && e.donors[e.donorIndex].fraction > 0.2");
  await page.screenshot({ path: `${output}/auto-local-product.png` });
  const paused = await page.evaluate(() => ({ elapsed: window.__contactExperiment.elapsed, revision: window.__contactExperiment.appearance.revision }));
  await page.waitForTimeout(400);
  assert.deepEqual(await page.evaluate(() => ({ elapsed: window.__contactExperiment.elapsed, revision: window.__contactExperiment.appearance.revision })), paused);

  await start('NH3 + HCl', 'nh3_hcl');
  await advance('[...e.clouds.clouds.values()].reduce((n,c) => n + c.system.particles.length, 0) >= 3');
  const early = await smoke(); assert.equal(early.exterior, 0); assert.ok(early.maxY < 2.04);
  await page.screenshot({ path: `${output}/smoke-starts-inside.png` });
  await advance(`e.elapsed > ${early.elapsed + 1.15}`);
  const dense = await smoke(); assert.ok(dense.count > early.count); assert.equal(dense.exterior, 0);
  assert.ok(early.floorOpacity < 0.05); assert.ok(dense.floorOpacity > early.floorOpacity && dense.floorOpacity < 0.3);
  await page.screenshot({ path: `${output}/smoke-grows-inside.png` });
  await advance(`e.elapsed > ${early.elapsed + 4}`);
  const vented = await smoke(); assert.ok(vented.exterior > 0); assert.ok(vented.interior > 0);
  await page.screenshot({ path: `${output}/smoke-through-vent.png` });

  // The manual shader is checked independently of chemistry: a controlled
  // optical endpoint change exercises local bleaching in the actual material.
  await page.getByRole('tab', { name: 'Thao tác', exact: true }).click();
  const id = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(p => p.name).find(s => /\/useAppStore\.ts(\?|$)/.test(s));
    const { useAppStore } = await import(url); window.__contactApp = useAppStore;
    const id = useAppStore.getState().prepareStudioProgram('cuso4_naoh');
    useAppStore.getState().setVesselState(id, { studioProgramId: undefined, liquidColor: '#6b1598',
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / 18.015 }, { formula: 'KMnO4', phase: 'aq', mass_g: 0.01, moles: 0.01 / 158.034 }],
      substances: ['H2O', 'KMnO4'], volume_ml: 30, volume: 0.3, mass_g: 30.01, hasPrecipitate: false, turbidity: 0,
      precipitateAmount_g: 0, hasGas: false, recentPourContact: undefined });
    useAppStore.getState().openVesselInfo(id); useAppStore.getState().setSimulationPaused(false); return id;
  });
  await page.waitForFunction(() => !!window.__manualAppearance);
  await page.evaluate(id => {
    const f = window.__manualAppearance;
    window.__contactApp.getState().setVesselState(id, { liquidColor: '#f8fafc', recentPourContact: {
      point: [-f.radius * 0.55, f.baseY + f.depth, 0], remaining_s: 2, expiresAt_ms: 0, color: '#f8fafc' } });
  }, id);
  await page.waitForFunction(() => { const f = window.__manualAppearance; return f.sample(0.22, 0.95, 0.5, 1) > f.sample(0.85, 0.95, 0.5, 1) + 0.4; });
  await page.evaluate(() => window.__contactApp.getState().setSimulationPaused(true));
  await page.waitForTimeout(300);
  const bleach = await page.evaluate(() => { const f = window.__manualAppearance; return { near: f.sample(0.22, 0.95, 0.5, 1), far: f.sample(0.85, 0.95, 0.5, 1) }; });
  await page.screenshot({ path: `${output}/manual-local-bleaching.png` });
  assert.deepEqual(errors, []);
  const report = { color, early, dense, vented, bleach, pausedAppearanceFrozen: true, errors };
  writeFileSync(`${output}/browser.json`, JSON.stringify(report, null, 2) + '\n'); console.log(report);
} catch (error) { await page.screenshot({ path: `${output}/failure.png` }).catch(() => {}); console.error({ errors }); throw error; }
finally { await browser.close(); }
