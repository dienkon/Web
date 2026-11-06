import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = path.resolve('artifacts/lab-effects');
await mkdir(output, { recursive: true });
const report = { errors: [], shaderErrors: [], phases: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1480, height: 1000 } });
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && /WebGLProgram|shader|VALIDATE_STATUS/i.test(message.text())) report.shaderErrors.push(message.text());
  });
  await page.route('**/api/**', route => route.abort());
  await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6779'}/?vfx=1&seed=42`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.getByRole('combobox', { name: 'Bình đích VFX Studio', exact: true }).waitFor({ timeout: 90000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  const id = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { useQualityStore } = await import('/src/vfx/quality.ts');
    useQualityStore.getState().setPreference('medium');
    window.labAuditRoots = (await import('/node_modules/.vite/deps/@react-three_fiber.js'))._roots;
    store.setState({ vessels: {}, vesselIds: [], burners: {}, activeKinetics: {}, pendingReactions: {},
      inFlightPours: [], spills: {}, workbenchEscapedGas_g: {}, pouringChemical: null,
      isSimulationPaused: true, timeScale: 1, leftSidebarOpen: false, rightSidebarOpen: false });
    store.getState().addVessel('beaker');
    const id = Object.keys(store.getState().vessels)[0];
    store.getState().setVesselState(id, { position: [0, -0.135, 0], capacity_ml: 250, name: 'Effect audit' });
    return id;
  });
  await page.getByRole('combobox', { name: 'Bình đích VFX Studio', exact: true }).selectOption(id);
  await page.getByRole('button', { name: 'Bọt O₂ · thử Pause', exact: true }).click();
  await page.evaluate(async id => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    store.getState().seekStudioProgram(id, 1); store.getState().setSimulationPaused(true);
  }, id);
  const meshSnapshot = async name => page.evaluate(name => {
    let found;
    for (const root of window.labAuditRoots.values()) root.store.getState().scene.traverse(object => {
      if (object.name !== name) return;
      const count = object.count ?? 0, matrices = Array.from(object.instanceMatrix?.array ?? []).slice(0, count * 16);
      found = { visible: object.visible, count, matrices,
        colors: Array.from(object.instanceColor?.array ?? []).slice(0, count * 3),
        opacity: Array.from(object.geometry?.getAttribute('instanceOpacity')?.array ?? []).slice(0, count),
        materialColor: object.material?.color?.getHexString() };
    });
    return found;
  }, name);
  await page.waitForTimeout(500);
  const foam = await meshSnapshot(`finite-foam-${id}`);
  assert(foam?.visible && foam.count > 0, 'Retained foam must remain visible after chemistry retires');
  await page.waitForTimeout(700);
  const pausedFoam = await meshSnapshot(`finite-foam-${id}`);
  assert.deepEqual(pausedFoam.matrices, foam.matrices, 'Pause must freeze foam geometry');
  report.phases.push({ name: 'retained-foam-pause', visible: foam.visible, count: foam.count, frozen: true });
  await page.screenshot({ path: path.join(output, '01-retained-foam.png') });
  await page.evaluate(async id => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { PourController } = await import('/src/pour/controller/PourController.ts');
    PourController.beginPour({ mode: 'HAND_TILT', sourceId: id, targetId: null, assist: 'low' });
    PourController.setTilt(Math.PI / 6);
    store.getState().setSimulationPaused(false);
    for (let i = 0; i < 45; i++) PourController.tick(1 / 60, undefined, false, 1);
    store.getState().setSimulationPaused(true);
  }, id);
  await page.waitForTimeout(400);
  const tilted = await meshSnapshot(`finite-foam-${id}`);
  assert(tilted?.visible); assert.notDeepEqual(tilted.matrices, foam.matrices);
  await page.screenshot({ path: path.join(output, '02-tilted-foam.png') });
  report.phases.push({ name: 'tilted-foam', visible: tilted.visible });

  const sample = await page.evaluate(async id => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { supernatantColor } = await import('/src/science/supernatantAppearance.ts');
    const { PourController } = await import('/src/pour/controller/PourController.ts');
    await PourController.commitCurrentPour();
    store.getState().prepareStudioProgram('cuso4_naoh', undefined, id);
    store.getState().setSimulationPaused(true);
    const v = store.getState().vessels[id];
    return (supernatantColor(v.contents, v.volume_ml) || v.liquidColor).replace('#', '');
  }, id);
  await page.waitForTimeout(400);
  const replacement = await meshSnapshot(`liquid_volume_${id}`);
  assert.equal(replacement.materialColor, sample, 'A replaced specimen must display its new color while paused');
  report.phases.push({ name: 'paused-specimen-replacement', color: sample });
  await page.screenshot({ path: path.join(output, '03-paused-new-sample.png') });

  await page.evaluate(async () => {
    const { vfxBus } = await import('/src/vfx/bus.ts');
    for (const [x, color] of [[-0.35, '#ff0000'], [0.35, '#0000ff']])
      vfxBus.emit('sparks', { position: [x, 0.6, 0], count: 8, color, speed: 3 });
  });
  await page.waitForTimeout(300);
  const sparks = await meshSnapshot('reaction-event-sparks');
  assert(sparks?.visible && sparks.count > 0, 'An event must render actual spark particles');
  assert(sparks.colors.some((value, i) => i % 3 === 0 && value === 1));
  assert(sparks.colors.some((value, i) => i % 3 === 2 && value === 1));
  assert(sparks.opacity.every(value => value === 1));
  await page.screenshot({ path: path.join(output, '04-colored-sparks.png') });
  report.phases.push({ name: 'event-sparks', count: sparks.count, distinctColors: true, opacityUploaded: true });

  await page.getByRole('button', { name: 'Rắn khô · gặp axit', exact: true }).click();
  await page.waitForFunction(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    return store.getState().workbenchEscapedGas_g.CO2 > 0;
  }, undefined, { timeout: 20000 });
  const wet = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const s = store.getState();
    return { spills: Object.values(s.spills).map(p => ({ volume: p.volume_ml, mass: p.mass_g, contents: p.contents, gasRate: p.gasRate_mol_s })),
      escaped: s.workbenchEscapedGas_g };
  });
  assert.equal(wet.spills.length, 1, 'Dry carbonate and the contacting liquid must form one wet inventory');
  assert(wet.spills[0].gasRate > 0 && wet.escaped.CO2 > 0);
  report.phases.push({ name: 'dry-solid-wetting', ...wet });
  await page.screenshot({ path: path.join(output, '05-dry-solid-contact.png') });
  assert.deepEqual(report.errors, []); assert.deepEqual(report.shaderErrors, []);
} finally {
  await browser.close();
  await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
