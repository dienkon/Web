import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const output = resolve('artifacts/salt-crystal-lifecycle');
await mkdir(output, { recursive: true });
const report = { errors: [], shaderErrors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
  await page.routeWebSocket('**', () => {});
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /shader|WebGLProgram|VALIDATE_STATUS/i.test(message.text())) report.shaderErrors.push(message.text()); });
  await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6778'}/scripts/fixtures/appearance.html`);
  await page.waitForFunction(() => window.appearanceReady);
  report.ids = await page.evaluate(async () => {
    const load = path => import(performance.getEntriesByType('resource').find(r => new URL(r.name).pathname === path)?.name ?? path);
    const { partitionSodiumChloride } = await load('/src/engine/sodiumChloridePhase.ts');
    const { physicalEffectsRuntime } = await load('/src/simulation/core/PhysicalEffectsRuntime.ts');
    const { SimulationEngine } = await load('/src/simulation/core/SimulationEngine.ts');
    const samples = window.renderSpecimens([
      { formula: 'NaCl', mode: 'product', grams: 0 },
      { formula: 'NaCl', mode: 'product', grams: 0 },
      { formula: 'PbI2', mode: 'product', formation: 'CRYSTAL_PLATE', grams: 0.05 },
    ]).vessels;
    const store = window.specimenStore;
    for (const [index, salt] of [8, 11].entries()) {
      const v = samples[index];
      const contents = [{ formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / 18.015 },
        { formula: 'NaCl', phase: 'aq', mass_g: salt, moles: salt / 58.44 }];
      store.getState().setVesselState(v.id, { contents, mass_g: 30 + salt, hasPrecipitate: false,
        precipitateAmount_g: 0, precipitateSubstance: undefined });
    }
    const step = () => {
      for (const v of samples.slice(0, 2)) {
        const next = partitionSodiumChloride(store.getState().vessels[v.id], 0.1);
        if (next) store.getState().setVesselState(v.id, next);
      }
      physicalEffectsRuntime.advance(0.1, false, 1);
    };
    const snapshot = () => samples.slice(0, 2).map(v => {
      const vessel = store.getState().vessels[v.id], system = SimulationEngine.findManager(v.id)?.precipitationSystems.get('NaCl');
      return { id: v.id, solid_g: vessel.contents.filter(r => r.formula === 'NaCl' && r.phase === 's').reduce((s, r) => s + r.mass_g, 0),
        total_g: vessel.contents.reduce((s, r) => s + r.mass_g, 0), represented_g: system?.representedMass_g ?? 0,
        density: system?.profile.particleDensity_g_cm3, morphology: system?.profile.morphology };
    });
    window.saltAudit = { store, samples, snapshot, step };
    return samples.map(v => v.id);
  });
  await page.waitForFunction(ids => ids.every(id => window.specimenScene?.getObjectByName(`physical_sim_${id}`)), report.ids);
  report.growth = await page.evaluate(() => {
    for (let i = 0; i < 60; i++) window.saltAudit.step();
    return window.saltAudit.snapshot();
  });
  assert.equal(report.growth[0].solid_g, 0);
  assert(report.growth[1].solid_g > 0);
  assert.equal(report.growth[1].density, 2.16);
  assert.equal(report.growth[1].morphology, 'crystalline');
  assert(Math.abs(report.growth[1].solid_g - report.growth[1].represented_g) < 1e-10);
  await page.waitForFunction(id => {
    const object = window.specimenScene?.getObjectByName(`physical_precipitate_${id}_NaCl`);
    return object?.isInstancedMesh && object.count > 0 && object.geometry.type === 'BoxGeometry';
  }, report.growth[1].id);
  await page.waitForTimeout(500);
  await page.screenshot({ path: resolve(output, '01-clear-salt-cubes-lead-plates.png') });
  await page.evaluate(async () => {
    const load = path => import(performance.getEntriesByType('resource').find(r => new URL(r.name).pathname === path)?.name ?? path);
    const { _roots } = await load('/node_modules/.vite/deps/@react-three_fiber.js');
    const camera = [..._roots.values()][0].store.getState().camera;
    camera.zoom = 310; camera.position.set(0, 5, 8); camera.lookAt(0, 0, -2.7); camera.updateProjectionMatrix();
  });
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(output, '01-salt-cubes-close.png') });
  report.dilution = await page.evaluate(() => {
    const { store, samples, step, snapshot } = window.saltAudit, v = store.getState().vessels[samples[1].id];
    store.getState().setVesselState(v.id, { volume_ml: 40, volume: 0.8, mass_g: 51,
      contents: v.contents.map(row => row.formula === 'H2O' ? { ...row, mass_g: 40, moles: 40 / 18.015 } : row) });
    for (let i = 0; i < 60; i++) step();
    return snapshot();
  });
  assert(report.dilution[1].solid_g < report.growth[1].solid_g);
  assert(Math.abs(report.dilution[1].total_g - 51) < 1e-10);
  assert(Math.abs(report.dilution[1].represented_g - report.dilution[1].solid_g) < 1e-10);
  await page.screenshot({ path: resolve(output, '02-salt-redissolving.png') });
  assert.equal(report.errors.length + report.shaderErrors.length, 0, JSON.stringify(report));
} finally {
  await browser.close();
  await writeFile(resolve(output, 'audit.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
