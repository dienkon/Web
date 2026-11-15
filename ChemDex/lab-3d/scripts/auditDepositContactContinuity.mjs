import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const output = 'artifacts/deposit-contact-continuity';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.routeWebSocket('**/*', socket => socket.close());
await context.route('**/api/**', route => route.abort());
await context.addInitScript(() => {
  performance.setResourceTimingBufferSize(5000);
  localStorage.setItem('chemlab_vfx_quality_preference', 'low');
});
const page = await context.newPage();
const report = { errors: [], shaderErrors: [], checks: [] };
page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
page.on('console', message => {
  if (message.type() === 'error' && /shader|webgl|THREE/i.test(message.text())) report.shaderErrors.push(message.text());
});
try {
  await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6778', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  await page.waitForTimeout(2000);
  const chemistry = await page.evaluate(async () => {
    const resource = path => performance.getEntriesByType('resource').map(entry => entry.name).find(name => name.includes(path)) ?? path;
    const { useAppStore: app } = await import(resource('/src/store/useAppStore.ts'));
    const { useToolDockStore } = await import(resource('/src/handling/toolDockState.ts'));
    useToolDockStore.setState({ positions: { burette: [-8, 0, -3], balance: [8, 0, -3] }, deployed: {}, dragging: null });
    const { _roots } = await import(resource('/@react-three_fiber.js'));
    const root = [..._roots.values()].find(entry => entry.store.getState().gl.domElement === document.querySelector('canvas')).store;
    const { computeMolarMass: mm, applyProgramToLedger } = await import(resource('/src/engine/ledger.ts'));
    const { getProgramById } = await import(resource('/src/vfx/programs/library/index.ts'));
    const { stockContainer, stockGroup, stockCarrierCoatings } = await import(resource('/src/physical/stockAdapter.ts'));
    const { StockWorld } = await import(resource('/src/physical/StockWorld.ts'));
    const { stepWorkbenchSpills } = await import(resource('/src/engine/spillChemistry.ts'));
    const { stockWetContact } = await import(resource('/src/physical/stockWetContact.ts'));
    const { calculateSpillRadius } = await import(resource('/src/science/overflowPhysics.ts'));
    const { LAB_GEOMETRY } = await import(resource('/src/core/labGeometry.ts'));
    const { geometryVolume } = await import(resource('/src/science/stockSolidGeometry.ts'));
    const { solidSceneVolume } = await import(resource('/src/science/vesselDimensions.ts'));
    const { attachedMetalForCarrier, DEPOSIT_DENSITY_G_ML } = await import(resource('/src/science/metalSurfaceAppearance.ts'));
    const three = await import(resource('/three.js'));
    const row = (formula, moles, phase) => ({ formula, moles, mass_g: moles * mm(formula), phase });
    let vessel = { id: 'layered-nail', name: 'Cu then Ag on Fe', type: 'beaker', capacity_ml: 100, position: [-2, 0, 1],
      rotationY: 0, isLocked: false, temperature_c: 25, ph: 7, volume_ml: 60, volume: .6,
      hasGas: false, hasPrecipitate: false, isBoiling: false, liquidColor: '#f8fafc',
      contents: [row('H2O', 60 / mm('H2O'), 'l'), row('Fe (nail)', 1 / mm('Fe'), 's'), row('CuSO4', .0015, 'aq')] };
    const refresh = sample => ({ ...sample, mass_g: sample.contents.reduce((sum, entry) => sum + entry.mass_g, 0),
      substances: [...new Set(sample.contents.map(entry => entry.formula))] });
    vessel = refresh(vessel);
    const world = await StockWorld.create();
    try {
      world.sync({ containers: [stockContainer(vessel, false)], contacts: [], spills: [] });
      for (let i = 0; i < 240; i++) world.advance(1 / 120, false);
      vessel.stockMotion = { tick: 240, grains: world.snapshot().grains.map(grain => grain.pose) };
      vessel = { ...vessel, ...applyProgramToLedger(getProgramById('fe_cuso4'), vessel, 1, { deferThermal: true }) };
      vessel = refresh({ ...vessel, contents: [...vessel.contents, row('AgNO3', .0002, 'aq')] });
      vessel = { ...vessel, ...applyProgramToLedger(getProgramById('cu_agno3'), vessel, 1, { deferThermal: true }) };
      world.sync({ containers: [stockContainer(vessel, false)], contacts: [], spills: [] });
      for (let i = 0; i < 240; i++) world.advance(1 / 120, false);
      vessel.stockMotion = { tick: 480, grains: world.snapshot().grains.map(grain => grain.pose) };
    } finally { world.free(); }
    const layers = vessel.contents.filter(entry => entry.depositSubstrate);

    const floor = LAB_GEOMETRY.tableTop_scene, group = stockGroup('Fe (nail)', .1);
    let grain = { id: 'puddle-nail', position: [2, floor + .6, 1], volume_ml: 0, mass_g: .1,
      contents: [row('Fe (nail)', .1 / mm('Fe'), 's')], substances: ['Fe (nail)'], radius: .12,
      color: '#777', temperature_c: 25, isHazard: false, timestamp: 0,
      stockMotion: { id: 'puddle-carrier', vesselId: 'outside', formula: 'Fe (nail)', mass_g: .1,
        scale_m: Math.cbrt(.1 / 1000 / group.density_kg_m3 / group.unitVolume),
        position_m: [2 * .035, (floor + .6) * .035, .035],
        rotation: new three.Quaternion().setFromEuler(new three.Euler(1.4, .2, .3)).toArray(),
        velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], powder: false, sleeping: false } };
    const spilledWorld = await StockWorld.create();
    const syncGrain = sample => {
      const input = stockGroup(sample.stockMotion.formula, sample.stockMotion.mass_g);
      input.carrierCoatings = stockCarrierCoatings({ ...sample, stockMotion: { tick: 0, grains: [sample.stockMotion] } }, input.formula);
      spilledWorld.sync({ containers: [], contacts: [], spills: [{ ...sample.stockMotion, group: input }] });
    };
    let spills, firstContact;
    try {
      syncGrain(grain);
      for (let i = 0; i < 240; i++) spilledWorld.advance(1 / 120, false);
      grain = { ...grain, stockMotion: { ...grain.stockMotion, ...spilledWorld.snapshot().grains[0].pose } };
      grain.position = grain.stockMotion.position_m.map(value => value / .035);
      const pool = refresh({ id: 'copper-puddle', position: [2, floor, 1], volume_ml: 10,
        radius: calculateSpillRadius(10), contents: [row('H2O', 10 / mm('H2O'), 'l'), row('CuSO4', .1 / mm('CuSO4'), 'aq')],
        color: '#65b7dd', temperature_c: 25, isHazard: false, timestamp: 0 });
      firstContact = stockWetContact(grain, pool);
      spills = { [pool.id]: pool, [grain.id]: grain };
      for (let i = 0; i < 40; i++) {
        spills = stepWorkbenchSpills(spills, .05).spills;
        const current = spills[grain.id];
        if (!current?.stockMotion) throw Error('Puddle fixture unexpectedly exhausted its iron support');
        syncGrain(current);
        const pose = spilledWorld.advance(.05, false).grains[0].pose;
        spills[grain.id] = { ...current, stockMotion: { ...current.stockMotion, ...pose }, position: pose.position_m.map(value => value / .035) };
      }
    } finally { spilledWorld.free(); }
    const finalGrain = spills[grain.id], finalPool = spills['copper-puddle'];
    const sample = { ...finalGrain, stockMotion: { tick: 0, grains: [finalGrain.stockMotion] } };
    const result = { vessel: { mass_g: vessel.mass_g, layers, carriers: vessel.stockMotion.grains.map(pose => ({ id: pose.id,
      formula: pose.formula, ...attachedMetalForCarrier(vessel, pose.id) })) },
      puddle: { firstContact, grain: finalGrain, pool: finalPool, attached: attachedMetalForCarrier(sample, finalGrain.stockMotion.id) } };
    app.setState({ vessels: { [vessel.id]: vessel }, vesselIds: [vessel.id], spills, burners: {}, burnerIds: [],
      activeKinetics: {}, pendingReactions: {}, inFlightPours: [], isSimulationPaused: true,
      leftSidebarOpen: false, rightSidebarOpen: false, selectedVesselId: null });
    root.getState().internal.subscribe({ current: ({ camera }) => {
      camera.position.set(0, 3.5, 9); camera.lookAt(0, -.3, 1); camera.updateMatrixWorld();
    } }, 0, root);
    window.depositContinuity = { app, root, three, geometryVolume, solidSceneVolume, densities: DEPOSIT_DENSITY_G_ML,
      vesselId: vessel.id, spillCarrierId: finalGrain.stockMotion.id };
    return result;
  });
  assert.ok(chemistry.vessel.layers.some(row => row.formula === 'Ag' && row.depositCarrierId && !row.depositReleased));
  assert.ok(chemistry.puddle.firstContact.fraction > 0);
  assert.ok(chemistry.puddle.attached.mass_g > 0);
  assert.ok(chemistry.puddle.grain.contents.some(row => row.formula === 'Cu' && row.depositCarrierId && !row.depositReleased));
  assert.ok(!chemistry.puddle.pool.contents.some(row => row.formula === 'Cu' && row.mass_g > 1e-12));
  report.checks.push({ kind: 'chemistry', ...chemistry });
  const readMeshes = () => page.evaluate(() => {
    const a = window.depositContinuity, records = [];
    a.root.getState().scene.traverse(mesh => {
      if (!mesh.userData?.metalDeposit || !mesh.count) return;
      const matrix = new a.three.Matrix4(); let volume = 0;
      for (let i = 0; i < mesh.count; i++) {
        mesh.getMatrixAt(i, matrix); volume += a.geometryVolume(mesh.geometry) * matrix.determinant();
      }
      const data = mesh.userData.metalDeposit;
      const ml = data.mass_g / a.densities[data.product];
      const escaped = data.carrierIds.includes(a.spillCarrierId);
      const expected = escaped ? ml * 1e-6 / .035 ** 3 : a.solidSceneVolume(a.app.getState().vessels[a.vesselId], ml);
      records.push({ name: mesh.name, ...data, count: mesh.count, volume, expected, escaped });
    });
    return records;
  });
  // Product discovery mounts each layer on a render frame; its instance data is
  // populated on a later frame. Wait for that observable result, including on
  // software WebGL, instead of assuming a wall-clock delay contains both frames.
  const waitForCoatings = expected => page.waitForFunction(count => {
    let populated = 0, mounted = 0;
    window.depositContinuity.root.getState().scene.traverse(mesh => {
      if (mesh.name.startsWith('stock_coating_')) mounted++;
      if (mesh.userData?.metalDeposit && mesh.count > 0) populated++;
    });
    return count === 0 ? mounted === 0 : populated === count;
  }, expected, { timeout: 30000 });
  await waitForCoatings(3);
  const before = await readMeshes();
  report.scene = await page.evaluate(() => {
    const a = window.depositContinuity, state = a.app.getState(), meshes = [];
    a.root.getState().scene.traverse(mesh => { if (mesh.name) meshes.push({ name: mesh.name, count: mesh.count,
      metalDeposit: mesh.userData?.metalDeposit }); });
    return { vesselIds: state.vesselIds, vessels: Object.keys(state.vessels), spills: Object.keys(state.spills), meshes,
      stores: performance.getEntriesByType('resource').map(entry => entry.name).filter(url => url.includes('/src/store/useAppStore.ts')) };
  });
  assert.equal(before.length, 3, 'Two vessel coatings and one puddle coating must render');
  for (const mesh of before) assert.ok(Math.abs(mesh.volume / mesh.expected - 1) < 3e-6);
  report.checks.push({ kind: 'rendered', meshes: before });
  await page.screenshot({ path: `${output}/01-layered-and-puddle.png` });
  // Force an actual renderer unmount and JSON restore, not merely a React prop update.
  await page.evaluate(() => {
    const a = window.depositContinuity, state = a.app.getState();
    a.saved = JSON.stringify({ vessels: state.vessels, vesselIds: state.vesselIds, spills: state.spills });
    a.app.setState({ vessels: {}, vesselIds: [], spills: {} });
  });
  await waitForCoatings(0);
  await page.evaluate(() => window.depositContinuity.app.setState(JSON.parse(window.depositContinuity.saved)));
  await waitForCoatings(3);
  const restored = await readMeshes();
  assert.equal(restored.length, before.length);
  for (const mesh of restored) {
    const original = before.find(previous => previous.name === mesh.name && previous.escaped === mesh.escaped);
    assert.ok(original); assert.equal(mesh.mass_g, original.mass_g);
    assert.deepEqual(mesh.carrierIds, original.carrierIds);
    assert.ok(Math.abs(mesh.volume / mesh.expected - 1) < 3e-6);
  }
  report.checks.push({ kind: 'json-restore', meshes: restored });
  await page.screenshot({ path: `${output}/02-restored-coatings.png` });
  assert.deepEqual(report.errors, []); assert.deepEqual(report.shaderErrors, []);
  console.log(JSON.stringify({ checks: report.checks.map(check => check.kind), errors: report.errors,
    attachedPuddleMetal_g: chemistry.puddle.attached.mass_g, layers: chemistry.vessel.layers }));
} catch (error) {
  report.failure = error.stack ?? String(error);
  await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await browser.close();
  writeFileSync(`${output}/audit.json`, JSON.stringify(report, null, 2));
}
