import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = path.resolve('artifacts/spill-thermal');
await mkdir(output, { recursive: true });
const report = { errors: [], shaderErrors: [], phases: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1480, height: 1000 } });
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => {
    if (m.type() === 'error' && /WebGLProgram|shader|VALIDATE_STATUS/i.test(m.text())) report.shaderErrors.push(m.text());
  });
  await page.route('**/api/**', r => r.abort());
  await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6784'}/?vfx=1&seed=42`,
    { waitUntil: 'domcontentloaded', timeout: 120000 });
  const target = page.getByRole('combobox', { name: 'Bình đích VFX Studio', exact: true });
  await target.waitFor({ timeout: 90000 }); await page.waitForSelector('canvas', { timeout: 60000 });
  const id = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    (await import('/src/vfx/quality.ts')).useQualityStore.getState().setPreference('medium');
    store.setState({ vessels: {}, vesselIds: [], burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {},
      spills: {}, inFlightPours: [], workbenchEscapedGas_g: {}, wasteMass_g: 0, wasteContents: [], pouringChemical: null,
      isSimulationPaused: true, timeScale: 0.25, leftSidebarOpen: false, rightSidebarOpen: false, activeTool: 'none' });
    store.getState().addVessel('beaker');
    const id = Object.keys(store.getState().vessels)[0];
    store.getState().setVesselState(id, { position: [0, -0.135, 0], capacity_ml: 100, name: 'Spill thermal audit' });
    return id;
  });
  await target.selectOption(id);
  await page.evaluate(async () => {
    const source = await (await fetch('/src/components/three/WorkbenchSpills.tsx')).text();
    const fiberURL = source.match(/from\s+["']([^"']*@react-three_fiber[^"']*)["']/)?.[1];
    if (!fiberURL) throw new Error('Cannot find the installed renderer module');
    const { _roots } = await import(fiberURL);
    window.__spillAuditScene = _roots.get(document.querySelector('canvas')).store.getState().scene;
  });
  await page.getByRole('button', { name: 'Vũng nóng · phản ứng/sôi', exact: true }).click();
  await page.waitForFunction(async () => (await import('/src/store/useAppStore.ts')).useAppStore.getState().workbenchEscapedGas_g.H2O > 0,
    null, { timeout: 20000 });
  await page.waitForFunction(() => {
    let live = false;
    window.__spillAuditScene.traverse(o => { if (o.name.startsWith('water-vapor:spill_') && o.visible && o.count > 0) live = true; });
    return live;
  }, null, { timeout: 20000 });
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  const paused = await page.evaluate(async () => {
    const s = (await import('/src/store/useAppStore.ts')).useAppStore.getState(), pools = Object.values(s.spills);
    return { snapshot: JSON.stringify({ spills: s.spills, gases: s.workbenchEscapedGas_g }),
      atmosphereWater_g: s.workbenchEscapedGas_g.H2O, mass_g: pools.reduce((n, p) => n + p.mass_g, 0),
      precipitate_g: pools.flatMap(p => p.contents ?? []).filter(c => c.formula === 'Cu(OH)2').reduce((n, c) => n + c.mass_g, 0),
      heat_J: pools.reduce((n, p) => n + (p.reactionHeat_J ?? 0), 0),
      vaporEnthalpy_J: pools.reduce((n, p) => n + (p.thermalVaporEnthalpy_J ?? 0), 0),
      temperatures_c: pools.map(p => p.temperature_c), vaporRates_g_s: pools.map(p => p.vaporRate_g_s),
      limits: pools.map(p => p.chemistryLimit ?? null) };
  });
  const vaporMeshes = await page.evaluate(() => {
    const meshes = [];
    window.__spillAuditScene.traverse(o => {
      if (o.name.startsWith('water-vapor:spill_')) meshes.push({ name: o.name, visible: o.visible, instances: o.count });
    });
    return meshes;
  });
  assert(vaporMeshes.some(m => m.visible && m.instances > 0), 'Actual spill mist instances must reach the renderer');
  assert(paused.precipitate_g > 0 && paused.atmosphereWater_g > 0);
  assert(paused.vaporEnthalpy_J > 0 && paused.heat_J > 0);
  assert(Math.abs(paused.mass_g + paused.atmosphereWater_g - 30) < 1e-7);
  assert(paused.limits.every(l => l === null));
  const readout = page.getByLabel('Phản ứng trên bàn', { exact: true });
  await readout.scrollIntoViewIfNeeded();
  assert.match(await readout.innerText(), /H₂O thoát vào khí quyển/);
  await page.screenshot({ path: path.join(output, '01-hot-precipitation-boiling.png') });
  await page.waitForTimeout(500);
  const held = await page.evaluate(async () => {
    const s = (await import('/src/store/useAppStore.ts')).useAppStore.getState();
    return JSON.stringify({ spills: s.spills, gases: s.workbenchEscapedGas_g });
  });
  assert.equal(held, paused.snapshot);
  report.phases.push({ name: 'hot-precipitation-crosses-boiling-and-pauses', ...paused, snapshot: undefined, vaporMeshes, pauseVerified: true });
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await page.waitForTimeout(400);
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await page.screenshot({ path: path.join(output, '02-resumed-reaction.png') });
  const cleaned = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const before = store.getState().workbenchEscapedGas_g.H2O;
    store.getState().cleanSpills();
    return { atmosphereBefore_g: before, atmosphereAfter_g: store.getState().workbenchEscapedGas_g.H2O,
      waste_g: store.getState().wasteMass_g, spills: Object.keys(store.getState().spills).length };
  });
  assert.equal(cleaned.spills, 0); assert.equal(cleaned.atmosphereBefore_g, cleaned.atmosphereAfter_g);
  assert(Math.abs(cleaned.waste_g + cleaned.atmosphereAfter_g - 30) < 1e-7);
  report.phases.push({ name: 'cleanup-preserves-atmosphere-and-liquid-mass', ...cleaned });
  await page.screenshot({ path: path.join(output, '03-cleanup-keeps-water-in-atmosphere.png') });
  assert.equal(report.errors.length, 0, report.errors.join('\n'));
  assert.equal(report.shaderErrors.length, 0, report.shaderErrors.join('\n'));
} finally {
  await browser.close();
  await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
