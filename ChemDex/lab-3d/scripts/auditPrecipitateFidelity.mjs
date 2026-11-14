import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const output = resolve('artifacts/precipitate-fidelity');
await mkdir(output, { recursive: true });
const report = { errors: [], shaderErrors: [], specimens: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.routeWebSocket('**', () => {});
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /shader|WebGLProgram|VALIDATE_STATUS/i.test(m.text())) report.shaderErrors.push(m.text()); });
  await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6778'}/scripts/fixtures/appearance.html`);
  await page.waitForFunction(() => window.appearanceReady);
  const ids = await page.evaluate(() => window.renderSpecimens(['AgCl', 'Cu(OH)2', 'Fe(OH)3', 'BaSO4', 'PbI2', 'CaCO3']
    .map(formula => ({ formula, mode: 'product', grams: 0.05 }))).vessels.map(v => v.id));
  await page.waitForFunction(ids => ids.every(id => window.specimenScene?.getObjectByName(`physical_sim_${id}`)), ids);
  report.specimens = await page.evaluate(async ids => {
    const module = path => import(performance.getEntriesByType('resource').find(r => new URL(r.name).pathname === path)?.name ?? path);
    const { physicalEffectsRuntime: runtime } = await module('/src/simulation/core/PhysicalEffectsRuntime.ts');
    const { SimulationEngine: engine } = await module('/src/simulation/core/SimulationEngine.ts');
    window.precipitateAudit = { engine, runtime, ids };
    for (let i = 0; i < 180; i++) runtime.advance(1 / 60, false, 1);
    const before = ids.map(id => engine.findManager(id).precipitationSystem.particles.map(p => [p.x, p.y, p.z]));
    for (let i = 0; i < 60; i++) runtime.advance(1 / 60, false, 1);
    return ids.map((id, i) => {
      const system = engine.findManager(id).precipitationSystem;
      return { id, formula: system.profile.id, count: system.particles.length, mass: system.representedMass_g,
        time: system.integratedTime_s, bed: system.sedimentBed.amount_g,
        moves: system.particles.some((p, j) => before[i][j] && [p.x, p.y, p.z].some((v, k) => v !== before[i][j][k])),
        finite: system.particles.every(p => [p.x, p.y, p.z, p.radius].every(Number.isFinite)) };
    });
  }, ids);
  for (const s of report.specimens) {
    assert(s.count > 0 && s.moves && s.finite, `${s.formula}: particles must keep moving`);
    assert(Math.abs(s.mass - 0.05) < 1e-9, `${s.formula}: preserve solid mass`);
  }
  await page.waitForTimeout(1200);
  await page.screenshot({ path: resolve(output, '01-six-suspensions.png') });
  const motion = await page.evaluate(async () => {
    const { engine, runtime, ids } = window.precipitateAudit, store = window.specimenStore;
    const id = ids[2], manager = engine.findManager(id), before = JSON.stringify(manager.precipitationSystem.particles);
    runtime.advance(0.1, true, 1);
    const paused = before === JSON.stringify(manager.precipitationSystem.particles);
    store.getState().setVesselState(id, { stirringIntensity: 0.8 });
    return { paused };
  });
  assert(motion.paused);
  await page.waitForTimeout(200);
  await page.evaluate(() => { for (let i = 0; i < 60; i++) window.precipitateAudit.runtime.advance(1 / 60, false, 1); });
  const stirring = await page.evaluate(() => window.precipitateAudit.engine.findManager(window.precipitateAudit.ids[2]).vortex.angularSpeed_rad_s);
  assert(stirring > 0, 'Stirring must drive the suspension carrier');
  await page.waitForTimeout(800);
  await page.screenshot({ path: resolve(output, '02-stirred-suspension.png') });
  await page.evaluate(() => {
    const { ids } = window.precipitateAudit, store = window.specimenStore;
    for (const id of ids) {
      const v = store.getState().vessels[id];
      store.getState().setVesselState(id, { contents: v.contents.filter(c => c.phase !== 's'), hasPrecipitate: false,
        precipitateSubstance: undefined, precipitateAmount_g: 0, turbidity: 0 });
    }
  });
  await page.waitForTimeout(200);
  await page.evaluate(() => window.precipitateAudit.runtime.advance(0.1, false, 1));
  await page.waitForTimeout(500);
  const dissolved = await page.evaluate(() => window.precipitateAudit.ids.every(id =>
    window.precipitateAudit.engine.findManager(id).precipitationSystems.size === 0));
  assert(dissolved, 'Dissolution removes every live particle system');
  report.motion = { ...motion, stirring, dissolved };
  await page.screenshot({ path: resolve(output, '03-dissolved.png') });
  assert.equal(report.errors.length + report.shaderErrors.length, 0, JSON.stringify(report));
} finally {
  await browser.close();
  await writeFile(resolve(output, 'audit.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
