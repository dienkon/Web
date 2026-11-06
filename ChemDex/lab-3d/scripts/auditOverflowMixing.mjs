import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = path.resolve('artifacts/overflow-mixing');
await mkdir(output, { recursive: true });
const report = { errors: [], shaderErrors: [], phases: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1480, height: 1000 } });
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && /WebGLProgram|shader|VALIDATE_STATUS/i.test(m.text())) report.shaderErrors.push(m.text()); });
  await page.route('**/api/**', route => route.abort());
  await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6782'}/?vfx=1&seed=42`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  const target = page.getByRole('combobox', { name: 'Bình đích VFX Studio', exact: true });
  await target.waitFor({ timeout: 90000 }); await page.waitForSelector('canvas', { timeout: 60000 });
  const id = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { useQualityStore } = await import('/src/vfx/quality.ts');
    useQualityStore.getState().setPreference('medium');
    store.setState({ vessels: {}, vesselIds: [], burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {},
      spills: {}, inFlightPours: [], workbenchEscapedGas_g: {}, pouringChemical: null,
      isSimulationPaused: true, timeScale: 1, leftSidebarOpen: false, rightSidebarOpen: false, activeTool: 'none' });
    store.getState().addVessel('beaker');
    const id = Object.keys(store.getState().vessels)[0];
    store.getState().setVesselState(id, { position: [0, -0.135, 0], capacity_ml: 100, name: 'Overflow mixing audit' });
    return id;
  });
  await target.selectOption(id);
  await page.getByRole('button', { name: 'Pha màu · rót tràn', exact: true }).click();
  await page.evaluate(async () => (await import('/src/store/useAppStore.ts')).useAppStore.setState({ isSimulationPaused: true }));
  const color = await page.evaluate(async id => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const s = store.getState(), v = s.vessels[id];
    const outside = [...s.inFlightPours.map(p => p.sample), ...Object.values(s.spills)];
    const grams = (contents, formula) => contents.filter(c => c.formula === formula).reduce((sum, c) => sum + c.mass_g, 0);
    return { tankColor: v.liquidColor, outsideColors: outside.map(p => p.color), tank_ml: v.volume_ml,
      copperOutside_g: grams(outside.flatMap(p => p.contents ?? []), 'CuSO4'),
      permanganateOutside_g: grams(outside.flatMap(p => p.contents ?? []), 'KMnO4'),
      copperTank_g: grams(v.contents, 'CuSO4'), reaction: s.activeKinetics[id]?.reactionId,
      outside_ml: outside.reduce((sum, p) => sum + p.volume_ml, 0) };
  }, id);
  assert.equal(color.tank_ml, 100); assert(Math.abs(color.outside_ml - 30) < 1e-7);
  assert(color.copperOutside_g > 0 && color.permanganateOutside_g > 0, 'Overflow must contain both dyes');
  assert(color.outsideColors.every(c => c !== '#86198f'), 'Overflow must not be unchanged pure incoming permanganate');
  assert.equal(color.reaction, undefined, 'Physical mixing does not prove a chemical reaction');
  report.phases.push({ name: 'mixed-color-overflow', ...color });
  await page.screenshot({ path: path.join(output, '01-mixed-color-overflow.png') });
  await page.evaluate(async () => (await import('/src/store/useAppStore.ts')).useAppStore.setState({ isSimulationPaused: false }));
  await page.waitForFunction(async () => !(await import('/src/store/useAppStore.ts')).useAppStore.getState().inFlightPours.length,
    null, { timeout: 20000 });
  await page.getByRole('button', { name: 'Bình đầy · tràn kết tủa', exact: true }).click();
  await page.evaluate(async () => (await import('/src/store/useAppStore.ts')).useAppStore.setState({ isSimulationPaused: true }));
  const reactive = await page.evaluate(async id => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { occupiedLiquidVolume } = await import('/src/handling/solidOccupancy.ts');
    const s = store.getState(), outside = [...s.inFlightPours.map(p => p.sample), ...Object.values(s.spills)];
    const grams = formula => outside.flatMap(p => p.contents ?? []).filter(c => c.formula === formula).reduce((sum, c) => sum + c.mass_g, 0);
    return { tank_ml: s.vessels[id].volume_ml, occupied_ml: occupiedLiquidVolume(s.vessels[id]), copperOutside_g: grams('CuSO4'), hydroxideOutside_g: grams('NaOH'),
      productOutside_g: grams('Cu(OH)2'), reaction: s.activeKinetics[id]?.reactionId,
      outside_ml: outside.reduce((sum, p) => sum + p.volume_ml, 0),
      before: JSON.stringify({ vessels: s.vessels, spills: s.spills, inFlightPours: s.inFlightPours }) };
  }, id);
  report.phases.push({ name: 'reactive-snapshot', ...reactive, before: undefined });
  assert(reactive.tank_ml > 0 && reactive.occupied_ml <= 100 + 1e-6); assert(reactive.outside_ml >= 20 - 1e-7);
  assert(reactive.copperOutside_g > 0 && reactive.hydroxideOutside_g > 0);
  assert.match(reactive.reaction, /^cuso4_naoh/);
  await page.waitForTimeout(500);
  const frozen = await page.evaluate(async () => {
    const s = (await import('/src/store/useAppStore.ts')).useAppStore.getState();
    return JSON.stringify({ vessels: s.vessels, spills: s.spills, inFlightPours: s.inFlightPours });
  });
  assert.equal(frozen, reactive.before, 'Pause must freeze retained and overflowing inventories');
  delete reactive.before;
  report.phases.push({ name: 'reactive-full-tank-pause', ...reactive, frozen: true });
  await page.screenshot({ path: path.join(output, '02-reactive-overflow-pause.png') });
  await page.evaluate(async () => (await import('/src/store/useAppStore.ts')).useAppStore.setState({ isSimulationPaused: false }));
  await page.waitForFunction(async () => {
    const s = (await import('/src/store/useAppStore.ts')).useAppStore.getState();
    return Object.values(s.spills).some(p => p.contents?.some(c => c.formula === 'Cu(OH)2' && c.mass_g > 0));
  }, null, { timeout: 20000 });
  await page.waitForTimeout(500);
  const ground = await page.evaluate(async id => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    store.setState({ isSimulationPaused: true });
    const s = store.getState(), rows = Object.values(s.spills).flatMap(p => p.contents ?? []);
    return { product_g: rows.filter(c => c.formula === 'Cu(OH)2').reduce((sum, c) => sum + c.mass_g, 0),
      spillColors: Object.values(s.spills).map(p => p.color), tankHasPrecipitate: s.vessels[id].hasPrecipitate };
  }, id);
  assert(ground.product_g > 0 && ground.tankHasPrecipitate);
  report.phases.push({ name: 'effluent-precipitate-reaches-workbench', ...ground });
  await page.screenshot({ path: path.join(output, '03-reacted-effluent-on-bench.png') });
  assert.equal(report.errors.length, 0, report.errors.join('\n'));
  assert.equal(report.shaderErrors.length, 0, report.shaderErrors.join('\n'));
} finally {
  await browser.close();
  await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
