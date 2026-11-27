import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import assert from 'node:assert/strict';

const output = 'artifacts/vortex-chemical-contact';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
await context.routeWebSocket('**/*', socket => socket.close());
await context.route('**/api/**', route => route.abort());
await context.addInitScript(() => { performance.setResourceTimingBufferSize(5000); localStorage.setItem('chemlab_vfx_quality_preference', 'low'); });
const page = await context.newPage(), report = { errors: [], shaderErrors: [], checks: [] };
page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error' && /shader|webgl|THREE/i.test(message.text())) report.shaderErrors.push(message.text()); });
try {
  await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6778', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas'); await page.waitForTimeout(2000);
  await page.evaluate(async () => {
    const resource = path => performance.getEntriesByType('resource').map(entry => entry.name).find(name => name.includes(path)) ?? path;
    const { useAppStore: app } = await import(resource('/src/store/useAppStore.ts'));
    const { useToolDockStore } = await import(resource('/src/handling/toolDockState.ts'));
    useToolDockStore.setState({ positions: { burette: [-8, 0, -3], balance: [8, 0, -3] }, deployed: {}, dragging: null });
    const { _roots } = await import(resource('/@react-three_fiber.js'));
    const root = [..._roots.values()].find(entry => entry.store.getState().gl.domElement === document.querySelector('canvas')).store;
    const { SimulationEngine } = await import(resource('/src/simulation/core/SimulationEngine.ts'));
    const motion = await import(resource('/src/science/vesselLiquidMotion.ts'));
    const { vortexHeight } = await import(resource('/src/science/liquidVortex.ts'));
    const { stockLiquidContactFraction, stockPointInAqueousLiquid, partitionDryStock } = await import(resource('/src/physical/stockLiquidContact.ts'));
    const { stockContainer } = await import(resource('/src/physical/stockAdapter.ts'));
    const { stockFluidAt } = await import(resource('/src/physical/stockFluidMotion.ts'));
    const { vesselLocalToWorld } = await import(resource('/src/science/vesselScale.ts'));
    const { applyProgramToLedger, computeMolarMass: mm } = await import(resource('/src/engine/ledger.ts'));
    const { getProgramById } = await import(resource('/src/vfx/programs/library/index.ts'));
    const three = await import(resource('/three.js'));
    const vessel = { id: 'vortex-contact', name: 'Vortex contact', type: 'beaker', capacity_ml: 100, position: [0, 0, 0],
      rotationY: 0, isLocked: true, temperature_c: 25, ph: 7, mass_g: 30, volume_ml: 30, volume: .3,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / mm('H2O') }], substances: ['H2O'],
      hasGas: false, hasPrecipitate: false, isBoiling: false, liquidColor: '#f8fafc', stirringIntensity: 1 };
    app.setState({ vessels: { [vessel.id]: vessel }, vesselIds: [vessel.id], spills: {}, burners: {}, burnerIds: [],
      activeKinetics: {}, pendingReactions: {}, inFlightPours: [], dissolvingSubstances: {}, timeScale: 1,
      isSimulationPaused: false, selectedVesselId: vessel.id, activeTool: 'stirring_rod',
      leftSidebarOpen: false, rightSidebarOpen: false });
    root.getState().internal.subscribe({ current: ({ camera }) => { camera.position.set(0, 3.8, 6); camera.lookAt(0, -.1, 0); camera.updateMatrixWorld(); } }, 0, root);
    window.vortexContact = { app, root, SimulationEngine, ...motion, vortexHeight, stockLiquidContactFraction,
      stockPointInAqueousLiquid, partitionDryStock, stockContainer, stockFluidAt, vesselLocalToWorld,
      applyProgramToLedger, mm, getProgramById, three, id: vessel.id };
    window.vortexContact.readSurface = () => {
      const { scene, gl } = root.getState(), current = app.getState().vessels[vessel.id];
      const cap = scene.getObjectByName(`liquid_surface_${vessel.id}`);
      const body = scene.getObjectByName(`liquid_volume_${vessel.id}`);
      const uniform = mesh => {
        const program = gl.properties.get(mesh.material).currentProgram;
        const location = program?.getUniforms().map.uVortex;
        return location ? Array.from(gl.getContext().getUniform(program.program, location.addr)) : null;
      };
      if (!cap || !body) return null;
      cap.updateWorldMatrix(true, false);
      return { surface: motion.vesselVortexSurface(current), capUniform: uniform(cap), bodyUniform: uniform(body),
        capNormal: new three.Vector3(0, 0, 1).transformDirection(cap.matrixWorld).toArray(),
        clippingNormal: body.material.clippingPlanes[0].normal.toArray() };
    };
  });
  await page.waitForFunction(() => (window.vortexContact.app.getState().vessels[window.vortexContact.id].liquidMotion?.angularSpeed_rad_s ?? 0) > 35,
    undefined, { timeout: 60000 });
  // Let the accepted chemistry frame reach the renderer before freezing both.
  await page.waitForTimeout(400);
  await page.evaluate(() => window.vortexContact.app.setState({ isSimulationPaused: true }));
  await page.waitForTimeout(150);
  const contact = await page.evaluate(() => {
    const a = window.vortexContact, original = a.app.getState().vessels[a.id], surface = a.vesselVortexSurface(original);
    const rendered = a.SimulationEngine.findManager(a.id)?.vortex.surface;
    if (!surface || !rendered) throw Error('Accepted and rendered vortex must exist');
    const cases = [];
    for (const [name, x] of [['dry-center', 0], ['wet-rim', surface.radius * .88]]) {
      const curveY = a.vortexHeight(x, 0, surface), y = (surface.meanLevel + curveY) / 2;
      const mass_g = .00001, scale_m = Math.cbrt(mass_g / 7.14 * 1e-6);
      const point = new a.three.Vector3(x, y, 0), position_m = a.vesselLocalToWorld(original, point.toArray()).map(n => n * .035);
      const grain = { id: name, formula: 'Zn', mass_g, scale_m, position_m, rotation: [0, 0, 0, 1],
        velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], sleeping: false, powder: false };
      const contents = [...original.contents, { formula: 'HCl', phase: 'aq', moles: .01, mass_g: .01 * a.mm('HCl') },
        { formula: 'Zn', phase: 's', moles: mass_g / a.mm('Zn'), mass_g }];
      const vessel = { ...original, contents, mass_g: contents.reduce((sum, row) => sum + row.mass_g, 0),
        substances: contents.map(row => row.formula), stockMotion: { tick: 1, grains: [grain] } };
      const fraction = a.stockLiquidContactFraction(vessel, 'Zn');
      const depth_m = a.stockFluidAt(position_m, a.stockContainer(vessel, false).fluid).depth_m;
      const next = a.applyProgramToLedger(a.getProgramById('zn_hcl'), vessel, .5, { deferThermal: true });
      cases.push({ name, x, y, flatY: surface.meanLevel, curveY, fraction, depth_m,
        pointWet: a.stockPointInAqueousLiquid(vessel)(point),
        protectedZn_g: a.partitionDryStock(vessel).inertContents.filter(row => row.formula === 'Zn').reduce((sum, row) => sum + row.mass_g, 0),
        beforeZn_g: mass_g, afterZn_g: next.contents.filter(row => row.formula === 'Zn').reduce((sum, row) => sum + row.mass_g, 0),
        hydrogen_g: next.escapedGas_g?.H2 ?? 0 });
    }
    return { accepted: original.liquidMotion, surface, rendered, cases };
  });
  const center = contact.cases[0], rim = contact.cases[1];
  assert.equal(center.fraction, 0); assert.ok(center.depth_m < 0); assert.equal(center.pointWet, false);
  assert.equal(center.afterZn_g, center.beforeZn_g); assert.equal(center.hydrogen_g, 0);
  assert.equal(rim.fraction, 1); assert.ok(rim.depth_m > 0); assert.equal(rim.pointWet, true);
  assert.ok(rim.afterZn_g < rim.beforeZn_g); assert.ok(rim.hydrogen_g > 0);
  assert.ok(Math.abs(contact.surface.angularSpeed_rad_s - contact.rendered.angularSpeed_rad_s) < 1e-8);
  report.checks.push({ kind: 'same-wet-boundary', ...contact });
  const checkSurface = async kind => {
    const ready = await page.waitForFunction(() => {
      const surface = window.vortexContact.readSurface();
      return surface?.capUniform && surface.bodyUniform ? surface : false;
    }, undefined, { timeout: 15000 });
    const result = await ready.jsonValue();
    await ready.dispose();
    for (const values of [result.capUniform, result.bodyUniform]) {
      assert.ok(values, 'Read the compiled GPU uniform');
      assert.ok(Math.abs(values[1] - result.surface.amplitude) < 1e-6);
      assert.ok(Math.abs(values[2] - result.surface.offset) < 1e-6);
      assert.ok(Math.abs(values[3] - result.surface.angularSpeed_rad_s) < 1e-5);
    }
    assert.ok(Math.abs(result.capNormal[1] - 1) < 1e-8);
    assert.ok(Math.abs(result.clippingNormal[1] + 1) < 1e-8);
    report.checks.push({ kind, ...result });
  };
  await checkSurface('paused-gpu-surface');
  await page.screenshot({ path: `${output}/01-accepted-vortex.png` });
  const frozen = await page.evaluate(() => JSON.stringify(window.vortexContact.app.getState().vessels[window.vortexContact.id].liquidMotion));
  await page.waitForTimeout(400);
  assert.equal(await page.evaluate(() => JSON.stringify(window.vortexContact.app.getState().vessels[window.vortexContact.id].liquidMotion)), frozen);
  report.checks.push({ kind: 'pause', motion: JSON.parse(frozen) });
  await page.evaluate(() => {
    const a = window.vortexContact;
    a.saved = JSON.stringify(a.app.getState().vessels[a.id]);
    a.app.setState({ vessels: {}, vesselIds: [], activeTool: 'none', stirringVesselId: null });
  });
  await page.waitForTimeout(300);
  await page.evaluate(() => { const a = window.vortexContact, v = JSON.parse(a.saved); a.app.setState({ vessels: { [a.id]: v }, vesselIds: [a.id] }); });
  await page.waitForTimeout(500);
  assert.equal(await page.evaluate(() => JSON.stringify(window.vortexContact.app.getState().vessels[window.vortexContact.id].liquidMotion)), frozen);
  await checkSurface('restored-gpu-surface');
  await page.evaluate(() => window.vortexContact.app.setState({ isSimulationPaused: false }));
  for (let i = 0; i < 8; i++) {
    await page.evaluate(x => {
      const a = window.vortexContact, current = a.app.getState().vessels[a.id];
      a.app.setState({ vessels: { [a.id]: { ...current, position: [x, 0, 0] } } });
    }, i % 2 ? -.3 : .3);
    await page.waitForTimeout(40);
    await checkSurface(`moving-gpu-surface-${i}`);
  }
  await page.waitForFunction(previous => {
    const a = window.vortexContact, speed = a.app.getState().vessels[a.id].liquidMotion?.angularSpeed_rad_s;
    return speed !== undefined && speed < previous * .8;
  }, contact.surface.angularSpeed_rad_s, { timeout: 45000 });
  await page.evaluate(() => window.vortexContact.app.setState({ isSimulationPaused: true }));
  const decayed = await page.evaluate(() => window.vortexContact.app.getState().vessels[window.vortexContact.id].liquidMotion);
  assert.ok(decayed.angularSpeed_rad_s >= 0 && decayed.angularSpeed_rad_s < contact.surface.angularSpeed_rad_s);
  report.checks.push({ kind: 'json-restore-and-spin-down', motion: decayed });
  await page.screenshot({ path: `${output}/02-restored-spin-down.png` });
  assert.deepEqual(report.errors, []); assert.deepEqual(report.shaderErrors, []);
  console.log(JSON.stringify({ checks: report.checks.map(check => check.kind), cases: contact.cases, errors: report.errors }));
} catch (error) {
  report.failure = error.stack ?? String(error);
  await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  throw error;
} finally {
  await browser.close();
  writeFileSync(`${output}/audit.json`, JSON.stringify(report, null, 2));
}
