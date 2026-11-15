import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const output = process.env.LAB_SHARED_SOLID_OUTPUT ?? 'artifacts/shared-solid-visuals';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const report = { mode: 'controlled renderer fixtures; canonical chemistry is not advanced', errors: [], checks: [] };
async function drawPaused() {
  for (let i = 0; i < 4; i++) {
    await page.evaluate(() => window.sharedSolidAudit.root.getState().invalidate());
    await page.waitForTimeout(70);
  }
}
await page.routeWebSocket('**', route => {
  const server = route.connectToServer();
  server.onMessage(message => {
    let type; try { type = JSON.parse(String(message)).type; } catch { /* Ordinary socket payload. */ }
    if (type !== 'update' && type !== 'full-reload') route.send(message);
  });
});
page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error' && /shader|webgl|THREE/i.test(message.text())) report.errors.push(message.text()); });
await page.addInitScript(() => { performance.setResourceTimingBufferSize(12000); localStorage.setItem('chemlab_vfx_quality_preference', 'low'); });
try {
  await page.goto(process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767', { waitUntil: 'domcontentloaded' });
  await page.locator('#manual-lab canvas').waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const loaded = pattern => performance.getEntriesByType('resource').map(e => e.name).findLast(n => pattern.test(n));
    const { useAppStore } = await import(loaded(/\/src\/store\/useAppStore\.ts(?:\?|$)/));
    useAppStore.getState().setSimulationPaused(true);
    window.sharedSolidAudit = { manual: useAppStore, before: JSON.stringify(useAppStore.getState().vessels), loaded };
  });
  await page.getByRole('tab', { name: 'Tự động', exact: true }).click();
  await page.getByRole('button', { name: 'Hiện danh mục tự động', exact: true }).waitFor({ timeout: 60000 });
  const sodiumTitle = await page.evaluate(async () => {
    const a = window.sharedSolidAudit;
    const { AutoExperiment, AUTO_EXPERIMENTS } = await import(a.loaded(/\/AutoExperiment\.ts(?:\?|$)/));
    const tick = AutoExperiment.prototype.tick;
    AutoExperiment.prototype.tick = function(delta) { a.experiment = this; return tick.call(this, delta); };
    return AUTO_EXPERIMENTS.find(entry => entry.id === 'na_h2o').title;
  });
  await page.getByRole('button', { name: 'Hiện danh mục tự động', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động', exact: true }).fill(sodiumTitle);
  await page.getByRole('button', { name: new RegExp(`^${sodiumTitle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`) }).last().click();
  await page.waitForFunction(() => window.sharedSolidAudit.experiment?.program.id === 'na_h2o');
  await page.evaluate(async () => {
    const a = window.sharedSolidAudit, e = a.experiment;
    const { _roots } = await import(a.loaded(/\/@react-three_fiber\.js(?:\?|$)/));
    a.root = [..._roots.values()].find(r => r.store.getState().gl?.domElement.closest('#automatic-lab')).store;
    e.paused = true;
    e.phase = 'observe'; e.phaseTime = 2;
    e.sample = { ...e.sample, contents: [
      { formula: 'Na', phase: 's', mass_g: 0.02, moles: 0.02 / 22.99, initialMass_g: 0.1, initialMoles: 0.1 / 22.99 },
      { formula: 'H2O', phase: 'l', mass_g: 20, moles: 20 / 18.015 },
      { formula: 'Phenolphthalein', phase: 'aq', mass_g: 0.0001, moles: 0.0001 / 318.32 }],
      substances: ['Na', 'H2O', 'Phenolphthalein'], mass_g: 20.0201, volume_ml: 20, volume: 0.08,
      temperature_c: 90, hydrogenCombustion: { model: 'open_exhaust_diffusion_flame', sourceHydrogen_g: 0.003,
        burnedHydrogen_g: 0.002, unburnedHydrogen_g: 0.001, oxygenConsumed_g: 0.016, waterVaporProduced_g: 0.018,
        releasedHeat_J: 240, heatToEnvironment_J: 240, power_W: 75, oxygenSupply_mol_s: 0.01, burning: true } };
    e.baseline = { ...e.sample, contents: [{ ...e.sample.contents[0], mass_g: 0.1, moles: 0.1 / 22.99 }, ...e.sample.contents.slice(1)] };
    e.progress = 0.8;
    e.kinetics = { reactionId: 'na_h2o', progress: 0.8, duration: 8, hasGas: true, hasPrecipitate: false, vesselId: e.sample.id,
      initialVesselBaseline: e.baseline, initialLiquidColor: '#fff', targetLiquidColor: '#fff', startTime: 0 };
    a.root.getState().invalidate();
  });
  await drawPaused();
  const sodium = await page.evaluate(() => {
    const a = window.sharedSolidAudit, scene = a.root.getState().scene, node = scene.getObjectByName('sodium-contact-auto_receiver');
    const pellet = scene.getObjectByName('sodium-metal'), flame = scene.getObjectByName('sodium-hydrogen-flame');
    return { sharedSodium: !!node, scale: pellet?.scale.toArray(), position: pellet?.position.toArray(),
      roughness: pellet?.material.roughness, flameVisible: flame?.visible,
      alternativeStock: !!scene.getObjectByName('auto_stock_Na'), liquid: !!scene.getObjectByName('liquid_volume_auto_receiver') };
  });
  assert(sodium.sharedSodium && sodium.liquid); assert.equal(sodium.alternativeStock, false);
  assert(sodium.roughness < 0.28); assert.equal(sodium.flameVisible, true);
  assert(sodium.scale[0] > 0 && sodium.scale[0] < 1);
  await page.screenshot({ path: `${output}/inherited-sodium-melt.png` });
  report.checks.push({ case: 'inherited-sodium-melt-and-combustion-projection', sodium });

  await page.evaluate(() => {
    const a = window.sharedSolidAudit, e = a.experiment, base = e.sample;
    e.sample = { ...base, temperature_c: 25, contents: [
      { formula: 'Fe (nail)', phase: 's', mass_g: 1, moles: 1 / 55.845 },
      { formula: 'Cu', phase: 's', mass_g: 0.1, moles: 0.1 / 63.546, depositSubstrate: 'Fe',
        depositCarrierFormula: 'Fe', depositCarrierId: 'iron-host', depositionReactionId: 'fe_cuso4' },
      { formula: 'CuSO4', phase: 'aq', mass_g: 0.0798, moles: 0.0005 },
      { formula: 'H2O', phase: 'l', mass_g: 20, moles: 20 / 18.015 }],
      substances: ['Fe (nail)', 'Cu', 'CuSO4', 'H2O'], mass_g: 21.1798, volume_ml: 20, volume: 0.08,
      stockMotion: { tick: 1, grains: [{ id: 'iron-host', formula: 'Fe (nail)', mass_g: 1, scale_m: 0.003,
        position_m: [0, 0.02415, 0], rotation: [0, 0, 0, 1], velocity_m_s: [0, 0, 0],
        angularVelocity_rad_s: [0, 0, 0], sleeping: true, contacting: true, powder: false }] } };
    a.root.getState().invalidate();
  });
  await drawPaused();
  const coating = await page.evaluate(async () => {
    const a = window.sharedSolidAudit, scene = a.root.getState().scene, mesh = scene.getObjectByName('stock_coating_Fe (nail)_Cu');
    const { Matrix4, Vector3 } = await import(a.loaded(/\/three\.js(?:\?|$)/));
    const stock = scene.getObjectByName('stock_solid_auto_receiver_Fe (nail)'), matrix = new Matrix4();
    stock?.getMatrixAt(0, matrix);
    const center = new Vector3().setFromMatrixPosition(matrix).toArray();
    stock?.updateWorldMatrix(true, false);
    const world = stock?.localToWorld(new Vector3(...center)).multiplyScalar(0.035).toArray();
    const authoritative = a.experiment.sample.stockMotion.grains[0].position_m;
    return { exists: !!mesh, count: mesh?.count ?? 0, mass: mesh?.userData.metalDeposit?.mass_g ?? 0,
      carrierIds: mesh?.userData.metalDeposit?.carrierIds ?? [], center, world, authoritative,
      duplicatedCopperStock: !!scene.getObjectByName('auto_stock_Cu') };
  });
  assert(coating.exists && coating.count > 0 && coating.mass > 0);
  assert.deepEqual(coating.carrierIds, ['iron-host']); assert.equal(coating.duplicatedCopperStock, false);
  report.checks.push({ case: 'shared-finite-carrier-coating', coating });
  assert(coating.world.every((coordinate, axis) => Math.abs(coordinate - coating.authoritative[axis]) < 1e-7),
    'An SI stock pose must remain aligned with the automatic receiver body');
  await page.screenshot({ path: `${output}/shared-stock-coating.png` });

  await page.evaluate(() => {
    const a = window.sharedSolidAudit, e = a.experiment;
    e.sample = { ...e.sample, contents: [
      { formula: 'H2O', phase: 's', mass_g: 5, moles: 5 / 18.015 },
      { formula: 'H2O', phase: 'l', mass_g: 20, moles: 20 / 18.015 }],
      substances: ['H2O'], mass_g: 25, volume_ml: 20, temperature_c: 0, foam_ml: 10,
      hydrogenCombustion: undefined, wallCondensation: { inner_g: 0.01, outer_g: 0.01,
        innerWall_c: 0, outerWall_c: 0, dewPoint_c: 15, ambientCollected_g: 0.01,
        ambientReleased_g: 0, returned_g: 0, drainedOutside_g: 0, heatRejected_J: 0, heatTransferredToSample_J: 0,
        innerBeads: [{ mass_g: 0.01, y: 0.4, theta: 0.2, sliding: false }],
        outerBeads: [{ mass_g: 0.01, y: -0.3, theta: 2, sliding: false }] } };
    e.progress = 1; e.kinetics = undefined; e.contactKinetics = undefined;
    a.root.getState().invalidate();
  });
  await drawPaused();
  const ice = await page.evaluate(() => {
    const a = window.sharedSolidAudit, scene = a.root.getState().scene, node = scene.getObjectByName('water-ice');
    const foam = scene.getObjectByName('finite-foam-auto_receiver');
    let beads;
    scene.traverse(o => { if (o.isInstancedMesh && o.instanceMatrix.count === 96 && o.count === 2 && o.material?.ior === 1.333) beads = o; });
    return { ice: !!node, iceScale: node?.scale.toArray(), foam: !!foam, foamVisible: foam?.visible,
      beadCount: beads?.count, manualUnchanged: JSON.stringify(a.manual.getState().vessels) === a.before };
  });
  assert(ice.ice && ice.foam && ice.foamVisible); assert.equal(ice.beadCount, 2); assert(ice.manualUnchanged);
  await page.screenshot({ path: `${output}/inherited-ice-foam-wall.png` });
  report.checks.push({ case: 'inherited-ice-finite-foam-wall-beads', ice });
  const paused = await page.evaluate(() => {
    const a = window.sharedSolidAudit, foam = a.root.getState().scene.getObjectByName('finite-foam-auto_receiver');
    return { elapsed: a.experiment.elapsed, matrices: [...foam.instanceMatrix.array] };
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => window.sharedSolidAudit.root.getState().invalidate());
  await page.waitForTimeout(150);
  const pausedAfter = await page.evaluate(() => {
    const a = window.sharedSolidAudit, foam = a.root.getState().scene.getObjectByName('finite-foam-auto_receiver');
    return { elapsed: a.experiment.elapsed, matrices: [...foam.instanceMatrix.array] };
  });
  assert.deepEqual(pausedAfter, paused);
  assert.deepEqual(report.errors, []); report.passed = true;
  console.log(JSON.stringify({ passed: true, checks: report.checks.map(c => c.case), errors: report.errors }));
} catch (error) {
  report.failure = String(error);
  await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  throw error;
} finally {
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2)); await browser.close();
}
