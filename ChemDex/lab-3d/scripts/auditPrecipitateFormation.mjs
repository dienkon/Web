import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import assert from 'node:assert/strict';

const output = resolve('artifacts/precipitate-formation');
await mkdir(output, { recursive: true });
const report = { errors: [], shaderErrors: [], specimens: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.routeWebSocket('**', () => {});
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && /shader|WebGLProgram|VALIDATE_STATUS/i.test(message.text())) report.shaderErrors.push(message.text()); });
  await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6778'}/scripts/fixtures/appearance.html`);
  await page.waitForFunction(() => window.appearanceReady);
  const ids = await page.evaluate(() => window.renderSpecimens([
    { formula: 'PbI2', formation: 'FINE_POWDER' }, { formula: 'PbI2', formation: 'CRYSTAL_PLATE' },
    { formula: 'PbI2', formation: 'FINE_POWDER + CRYSTAL_PLATE' },
    { formula: 'PbCl2', formation: 'FINE_POWDER' }, { formula: 'PbCl2', formation: 'CRYSTAL_NEEDLE' },
    { formula: 'PbCl2', formation: 'FINE_POWDER + CRYSTAL_NEEDLE' },
  ].map(spec => ({ ...spec, mode: 'product', grams: 0.05 }))).vessels.map(v => v.id));
  await page.waitForFunction(ids => ids.every(id => window.specimenScene?.getObjectByName(`physical_sim_${id}`)), ids);
  await page.evaluate(ids => {
    const store = window.specimenStore;
    for (const [index, formation] of [[2, 'CRYSTAL_PLATE'], [5, 'CRYSTAL_NEEDLE']]) {
      const v = store.getState().vessels[ids[index]], old = v.contents.find(c => c.phase === 's');
      store.getState().setVesselState(v.id, { contents: [...v.contents.filter(c => c.phase !== 's'),
        { ...old, mass_g: 0.025, moles: old.moles / 2, precipitateFormation: 'FINE_POWDER' },
        { ...old, mass_g: 0.025, moles: old.moles / 2, precipitateFormation: formation }] });
    }
  }, ids);
  await page.waitForTimeout(300);
  report.specimens = await page.evaluate(async ids => {
    const module = path => import(performance.getEntriesByType('resource').find(r => new URL(r.name).pathname === path)?.name ?? path);
    const { physicalEffectsRuntime: runtime } = await module('/src/simulation/core/PhysicalEffectsRuntime.ts');
    const { SimulationEngine: engine } = await module('/src/simulation/core/SimulationEngine.ts');
    const { useQualityStore: quality } = await module('/src/vfx/quality.ts');
    window.formationAudit = { runtime, engine, quality, ids };
    for (let i = 0; i < 24; i++) runtime.advance(1 / 60, false, 1);
    return ids.map(id => ({ id, systems: [...engine.findManager(id).precipitationSystems].map(([key, s]) => ({
      key, morphology: s.profile.morphology, mass_g: s.representedMass_g, suspended: s.particles.length,
      bed_g: s.sedimentBed.amount_g, minRadius_m: Math.min(...s.particles.map(p => p.physicalRadius_m)),
      maxRadius_m: Math.max(...s.particles.map(p => p.physicalRadius_m)),
    })) }));
  }, ids);
  assert.deepEqual(report.specimens.map(v => v.systems.length), [1, 1, 2, 1, 1, 2]);
  for (const v of report.specimens) assert(Math.abs(v.systems.reduce((sum, s) => sum + s.mass_g, 0) - 0.05) < 1e-12);
  await page.waitForTimeout(700);
  report.meshes = await page.evaluate(ids => ids.map(id => {
    const meshes = [];
    window.specimenScene.traverse(object => {
      if (object.isInstancedMesh && object.name.startsWith(`physical_precipitate_${id}_`)) meshes.push({
        name: object.name, visible: object.visible, count: object.count,
        vertices: object.geometry.getAttribute('position').count, roughness: object.material.roughness,
      });
    });
    return { id, meshes };
  }), ids);
  assert.deepEqual(report.meshes.map(v => v.meshes.length), [1, 1, 2, 1, 1, 2]);
  for (const index of [2, 5]) assert(new Set(report.meshes[index].meshes.map(m => m.vertices)).size === 2, 'Both formations require distinct geometry');
  await page.screenshot({ path: resolve(output, '01-mixed-formation.png') });
  report.paused = await page.evaluate(() => {
    const { runtime, engine, ids, quality } = window.formationAudit;
    const snapshot = () => JSON.stringify(ids.map(id => [...engine.findManager(id).precipitationSystems].map(([key, s]) => ({ key,
      particles: s.particles, bed: s.sedimentBed.amount_g, time: s.integratedTime_s }))));
    const before = snapshot(); runtime.advance(0.1, true, 1);
    window.specimenStore.setState({ isSimulationPaused: true });
    quality.getState().setPreference('low');
    window.formationAudit.snapshot = snapshot; window.formationAudit.before = before;
    return snapshot() === before;
  });
  await page.waitForTimeout(500);
  report.qualityKeepsPhysics = await page.evaluate(() => window.formationAudit.snapshot() === window.formationAudit.before);
  assert(report.paused && report.qualityKeepsPhysics);
  assert.equal(report.errors.length + report.shaderErrors.length, 0, JSON.stringify(report));
} finally {
  await browser.close();
  await writeFile(resolve(output, 'audit.json'), JSON.stringify(report, null, 2));
}
console.log(JSON.stringify(report));
