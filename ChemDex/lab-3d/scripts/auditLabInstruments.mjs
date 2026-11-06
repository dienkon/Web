import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const output = path.resolve('artifacts/lab-instruments');
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
  await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6780'}/?vfx=1&seed=42`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.getByRole('combobox', { name: 'Bình đích VFX Studio', exact: true }).waitFor({ timeout: 90000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  const id = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { useQualityStore } = await import('/src/vfx/quality.ts');
    useQualityStore.getState().setPreference('medium');
    window.labInstrumentRoots = (await import('/node_modules/.vite/deps/@react-three_fiber.js'))._roots;
    store.setState({ vessels: {}, vesselIds: [], selectedVesselId: null, burners: {}, activeKinetics: {}, pendingReactions: {},
      dissolvingSubstances: {}, inFlightPours: [], spills: {}, workbenchEscapedGas_g: {}, pouringChemical: null,
      isSimulationPaused: true, timeScale: 1, leftSidebarOpen: false, rightSidebarOpen: false, moveMode: false, activeTool: 'none' });
    store.getState().addVessel('beaker');
    return Object.keys(store.getState().vessels)[0];
  });
  await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    store.setState({ selectedVesselId: null });
  });
  assert.match(await page.getByRole('button', { name: 'Sample temperature', exact: true }).innerText(), /—/);
  assert.match(await page.getByRole('button', { name: 'Sample pH', exact: true }).innerText(), /---/);
  assert.match(await page.getByRole('button', { name: 'Sample gross mass', exact: true }).innerText(), /—/);
  report.phases.push({ name: 'no-selection', unavailableReadings: true });

  const setSample = async kind => page.evaluate(async ({ id, kind }) => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { computeMolarMass } = await import('/src/engine/ledger.ts');
    const { sampleMeasurement } = await import('/src/science/sampleMeasurement.ts');
    const row = (formula, mass_g, phase) => ({ formula, mass_g, phase, moles: mass_g / computeMolarMass(formula) });
    const contents = kind === 'oil' ? [row('C6H14', 33, 'l')]
      : kind === 'copper' ? [row('CuSO4', 0.798045, 'aq'), row('H2O', 49.201955, 'l')]
        : kind === 'dry' ? [] : [row('H2O', 50, 'l')];
    store.getState().setVesselState(id, { position: [-1, -0.135, 0], capacity_ml: 100, name: 'Instrument audit',
      volume_ml: kind === 'dry' ? 0 : 50, volume: kind === 'dry' ? 0 : 0.5,
      mass_g: contents.reduce((sum, c) => sum + c.mass_g, 0), contents, substances: contents.map(c => c.formula),
      escapedGas_g: {}, evaporated_ml: 0, waterVaporReleased_g: 0, wallCondensation: undefined,
      liquidColor: kind === 'copper' ? '#3aa7e6' : '#f8fafc', ph: 7, phModel: undefined, phReferenceTemperature_c: undefined,
      isSealed: kind === 'sealed', isShattered: false, temperature_c: kind === 'hot' ? 65 : 25 });
    store.setState({ selectedVesselId: id, activeTool: 'ph_meter', isSimulationPaused: true });
    return sampleMeasurement(store.getState().vessels[id]);
  }, { id, kind });
  const object = async name => page.evaluate(async name => {
    const { Vector3 } = await import('/node_modules/.vite/deps/three.js');
    let data = null;
    for (const root of window.labInstrumentRoots.values()) root.store.getState().scene.traverse(o => {
      if (o.name === name) data = { text: o.text, visible: o.visible, position: o.getWorldPosition(new Vector3()).toArray(),
        matrix: o.matrixWorld.toArray(), scale: o.scale.toArray() };
    });
    return data;
  }, name);

  const copper = await setSample('copper');
  assert(copper.ph > 0 && copper.ph < 7);
  await page.waitForTimeout(1000);
  assert.match(await page.getByRole('button', { name: 'Sample pH', exact: true }).innerText(), new RegExp(copper.ph.toFixed(2).replace('.', '\\.')));
  const probe = await object('tool-ph_meter'), lcd = await object('ph-probe-reading');
  assert.equal(lcd.text, `pH ${copper.ph.toFixed(2)}`);
  assert(Math.abs(probe.position[1] - 0.68 - copper.phPoint[1]) < 0.01, 'The actual pH bulb must be inside the liquid');
  await page.screenshot({ path: path.join(output, '01-copper-ph.png') });
  report.phases.push({ name: 'fresh-copper-while-paused', ph: copper.ph, lcd: lcd.text, immersed: true });
  for (const kind of ['oil', 'dry', 'sealed']) {
    await setSample(kind); await page.waitForTimeout(300);
    assert.match(await page.getByRole('button', { name: 'Sample pH', exact: true }).innerText(), /---/);
    assert.equal((await object('ph-probe-reading')).text, 'pH ---');
    report.phases.push({ name: `${kind}-has-no-ph`, unavailableReadings: true });
  }

  const hot = await setSample('hot');
  await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    store.setState({ activeTool: 'thermometer' });
  });
  await page.waitForTimeout(1000);
  const thermometer = await object('tool-thermometer'), beforeTemp = await object('thermometer-probe-reading');
  assert(Math.abs(thermometer.position[1] - 0.75 - hot.thermometerPoint[1]) < 0.01);
  await page.waitForTimeout(400);
  assert.equal((await object('thermometer-probe-reading')).text, beforeTemp.text, 'A paused immersed thermometer must not keep heating');
  report.phases.push({ name: 'thermometer-immersion-pause', immersed: true, frozen: true });

  await setSample('water');
  await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { positionInstrument } = await import('/src/handling/instrumentOperations.ts');
    positionInstrument('burette', [-1, 0, 0]);
    store.getState().updateBurette({ reagentFormula: 'HCl', concentration_M: 0.1, currentVolume_ml: 10, flowRate_ml_s: 1, isDispensing: true });
    store.setState({ activeTool: 'burette', timeScale: 4 });
  });
  await page.waitForTimeout(700);
  const pausedBurette = await page.evaluate(async () => (await import('/src/store/useAppStore.ts')).useAppStore.getState().burette.currentVolume_ml);
  assert.equal(pausedBurette, 10, 'Opening the valve while paused must not remove matter');
  const ripple = await object('burette-stream-ripple'), pausedJet = await object('burette-stream-jet');
  assert(ripple && Math.abs(ripple.position[0] + 1) < 1e-6, 'Moved burette stream must align with the receiver in world coordinates');
  await page.waitForTimeout(400);
  assert.deepEqual((await object('burette-stream-jet')).matrix, pausedJet.matrix, 'Pause freezes the jet');
  await page.screenshot({ path: path.join(output, '02-burette-pause-alignment.png') });
  await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { simulationFrameDt } = await import('/src/core/clock.ts');
    window.labBuretteSimDt = 0;
    const root = [...window.labInstrumentRoots.values()][0];
    window.labBuretteUnsubscribe = root.store.getState().internal.subscribe({ current: (_, delta) => {
      window.labBuretteSimDt += simulationFrameDt(delta, store.getState());
    } }, -1000, root.store);
    store.setState({ isSimulationPaused: false });
  });
  await page.waitForTimeout(1000);
  const receipt = await page.evaluate(async id => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    store.setState({ isSimulationPaused: true }); window.labBuretteUnsubscribe();
    const s = store.getState(), v = s.vessels[id], moved = 10 - s.burette.currentVolume_ml;
    return { moved_ml: moved, simulationSeconds: window.labBuretteSimDt, receiver_ml: v.volume_ml,
      inventoryMass_g: v.contents.reduce((sum, c) => sum + c.mass_g, 0), vesselMass_g: v.mass_g,
      evaporated_ml: v.evaporated_ml ?? 0, releasedWater_g: v.waterVaporReleased_g ?? 0,
      wallWater_g: (v.wallCondensation?.inner_g ?? 0) + (v.wallCondensation?.outer_g ?? 0),
      validHistory: s.titrationHistory.filter(p => p.vesselId === id).every(p => Number.isFinite(p.ph)) };
  }, id);
  report.phases.push({ name: 'burette-receipt', ...receipt });
  assert(receipt.moved_ml > 0);
  assert(Math.abs(receipt.moved_ml - receipt.simulationSeconds) <= 0.15, '4x flow must follow the accepted simulation frame time');
  assert(Math.abs(receipt.receiver_ml + receipt.evaporated_ml - 50 - receipt.moved_ml) < 1e-8);
  assert(Math.abs(receipt.vesselMass_g + receipt.releasedWater_g + receipt.wallWater_g - 50 - receipt.moved_ml) < 1e-8);
  assert(Math.abs(receipt.inventoryMass_g - receipt.vesselMass_g) < 1e-8, 'The delivered dose must include solvent');
  assert(receipt.validHistory);
  report.phases.push({ name: 'burette-clock-inventory-world-frame', paused: true, aligned: true,
    moved_ml: receipt.moved_ml, simulationSeconds: receipt.simulationSeconds, massBalanced: true });

  const shock = await page.evaluate(async id => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { dispensePipette } = await import('/src/handling/instrumentOperations.ts');
    store.getState().setVesselState(id, { volume_ml: 0, volume: 0, mass_g: 0, contents: [], substances: [], temperature_c: 210, wallCondensation: undefined });
    store.getState().setPipetteSample({ volume_ml: 2, mass_g: 2, temperature_c: 25, color: '#f8fafc', substances: ['H2O'],
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 2, moles: 2 / 18.015 }] });
    const result = dispensePipette(1);
    return { ok: result.ok, shattered: store.getState().vessels[id].isShattered,
      spill_g: Object.values(store.getState().spills).reduce((sum, p) => sum + p.mass_g, 0), remainder_g: store.getState().pipetteSample.mass_g };
  }, id);
  assert(shock.ok && shock.shattered); assert.equal(shock.spill_g, 1); assert.equal(shock.remainder_g, 1);
  await page.waitForTimeout(300);
  assert.match(await page.getByRole('button', { name: 'Sample pH', exact: true }).innerText(), /---/);
  await page.screenshot({ path: path.join(output, '03-contact-breakage.png') });
  report.phases.push({ name: 'pipette-hot-glass-breakage', ...shock });
  await page.getByRole('combobox', { name: 'Bình đích VFX Studio', exact: true }).selectOption(id);
  await page.getByRole('button', { name: 'Thay bình đã vỡ', exact: true }).click();
  const replacementId = await page.getByRole('combobox', { name: 'Bình đích VFX Studio', exact: true }).inputValue();
  await page.getByRole('button', { name: 'Kính nóng · nước lạnh', exact: true }).click();
  await page.waitForFunction(async id => (await import('/src/store/useAppStore.ts')).useAppStore.getState().vessels[id]?.isShattered,
    replacementId, { timeout: 10000 });
  report.phases.push({ name: 'studio-hot-glass-quick-button', shattered: true });
  assert.equal(report.errors.length, 0, report.errors.join('\n'));
  assert.equal(report.shaderErrors.length, 0, report.shaderErrors.join('\n'));
} finally {
  await browser.close();
  await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
