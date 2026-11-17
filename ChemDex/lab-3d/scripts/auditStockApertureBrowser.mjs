import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve(process.env.LAB_APERTURE_OUTPUT ?? 'artifacts/stock-aperture');
mkdirSync(output, { recursive: true });
const report = { assertions: {}, errors: [] };
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
page.setDefaultTimeout(60000);
page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
await page.routeWebSocket('**', route => {
  const server = route.connectToServer();
  server.onMessage(message => {
    let type; try { type = JSON.parse(String(message)).type; } catch { /* Other traffic. */ }
    if (type !== 'update' && type !== 'full-reload') route.send(message);
  });
});
await page.addInitScript(() => {
  performance.setResourceTimingBufferSize(12000);
  localStorage.setItem('chemlab_vfx_quality_preference', 'low');
});
async function fixture(type, amount, chemical, tilt = 0) {
  await page.evaluate(({ type, amount, chemical, tilt }) => {
    const a = window.__aperture, app = a.app;
    app.getState().clearPour();
    const v = { id: 'aperture-receiver', name: 'Bình kiểm tra miệng', type, capacity_ml: 100, position: [0, -.135, 0],
      rotationY: 0, rotationZ: tilt, isLocked: false, contents: [], substances: [], mass_g: 0, volume_ml: 0, volume: 0,
      temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false };
    a.contacts = [];
    a.deliveries = [];
    app.setState({ vessels: { [v.id]: v }, vesselIds: [v.id], isSimulationPaused: true, timeScale: 1,
      pouringChemical: null, selectedVesselId: v.id, activeKinetics: {}, pendingReactions: {},
      dissolvingSubstances: {}, spills: {}, inFlightPours: [], moveMode: false, draggingVesselId: null });
    app.getState().triggerPour(chemical, v.id, amount);
    a.id = v.id;
  }, { type, amount, chemical, tilt });
  await page.waitForFunction(() => window.__aperture.root.getState().internal.subscribers.some(item =>
    item.ref.current.toString().includes('solidDose.current')));
}
async function step(count) {
  await page.evaluate(async count => {
    const a = window.__aperture, root = a.root.getState();
    const callback = root.internal.subscribers.find(item => item.ref.current.toString().includes('solidDose.current'))?.ref.current;
    if (!callback) throw new Error('Mounted stock animation callback missing');
    a.app.setState({ isSimulationPaused: false });
    for (let i = 0; i < count; i++) { callback(a.root.getState(), 1 / 60); await Promise.resolve(); }
    await Promise.all(a.deliveries);
    a.app.setState({ isSimulationPaused: true }); root.invalidate();
  }, count);
  await page.waitForTimeout(150);
}
try {
  await page.goto(process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767', { waitUntil: 'domcontentloaded', timeout: 90000 });
  await page.locator('#manual-lab canvas').waitFor();
  await page.evaluate(async () => {
    const loaded = pattern => performance.getEntriesByType('resource').map(entry => entry.name).findLast(name => pattern.test(name));
    const { useAppStore: app } = await import(loaded(/\/useAppStore\.ts(?:\?|$)/));
    const { _roots } = await import(loaded(/@react-three_fiber\.js(?:\?|$)/));
    const three = await import(loaded(/\/three\.js(?:\?|$)/));
    let mounted;
    for (let i = 0; i < 300 && !mounted; i++) {
      mounted = _roots.get(document.querySelector('#manual-lab canvas'));
      if (!mounted) await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (!mounted) throw new Error('Manual scene did not mount');
    app.getState().resetWorkbench();
    app.setState({ language: 'vi', isSimulationPaused: true, leftSidebarOpen: false, rightSidebarOpen: false,
      burners: {}, burnerIds: [], activeTool: 'none', isPouring: false, isMixing: false });
    const advance = app.getState().advancePourContact;
    window.__aperture = { app, root: mounted.store, three, contacts: [], deliveries: [] };
    app.setState({ advancePourContact: (id, fraction, pieces) => {
      window.__aperture.contacts.push({ fraction, pieces: structuredClone(pieces ?? []) });
      const pending = advance(id, fraction, pieces);
      window.__aperture.deliveries.push(pending); return pending;
    } });
  });
  await fixture('volumetric_flask', .1, 'Fe');
  await step(20);
  report.solidFlight = await page.evaluate(() => {
    const a = window.__aperture, mesh = a.root.getState().scene.getObjectByName('solid-dose-airborne');
    const matrix = new a.three.Matrix4(), positions = [];
    for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix);
      if (matrix.elements[0] || matrix.elements[5] || matrix.elements[10])
        positions.push(new a.three.Vector3().setFromMatrixPosition(matrix).toArray());
    }
    return { positions, visible: mesh.visible, mass_g: a.app.getState().vessels[a.id].mass_g };
  });
  report.assertions.solidHasRealAirborneStage = report.solidFlight.visible && report.solidFlight.positions.length > 0 && report.solidFlight.mass_g === 0;
  await page.screenshot({ path: resolve(output, '01-narrow-mouth-solid-flight.png') });
  await step(200);
  await page.waitForFunction(() => !window.__aperture.app.getState().stockDosePending);
  report.solidArrivals = await page.evaluate(() => {
    const a = window.__aperture, s = a.app.getState();
    return { contacts: a.contacts, mass_g: s.vessels[a.id].mass_g, completed: !s.pouringChemical };
  });
  report.assertions.solidArrivesOnceWithAllFinitePoses = report.solidArrivals.contacts.flatMap(item => item.pieces).length === 28
    && Math.abs(report.solidArrivals.mass_g - .1) < 1e-8 && report.solidArrivals.completed;
  await fixture('flask', .12, 'H2O', .5);
  await step(49);
  report.tiltedDrop = await page.evaluate(() => {
    const a = window.__aperture, scene = a.root.getState().scene;
    const drop = scene.getObjectByName('stock-dropper-drop'), tip = scene.getObjectByName('stock-dropper-outlet');
    scene.updateMatrixWorld(true);
    return { position: drop.getWorldPosition(new a.three.Vector3()).toArray(), visible: drop.visible,
      tip: tip.localToWorld(new a.three.Vector3(0, -.125, 0)).toArray(), mass_g: a.app.getState().vessels[a.id].mass_g };
  });
  report.assertions.tiltedDropLeavesActualOutlet = report.tiltedDrop.visible && report.tiltedDrop.mass_g === 0
    && Math.abs(report.tiltedDrop.position[0] - report.tiltedDrop.tip[0]) < 1e-6
    && Math.abs(report.tiltedDrop.position[2] - report.tiltedDrop.tip[2]) < 1e-6
    && Math.abs(report.tiltedDrop.tip[0]) > .1;
  await page.screenshot({ path: resolve(output, '02-tilted-mouth-microdrop.png') });
  await step(230);
  await page.waitForFunction(() => !window.__aperture.app.getState().stockDosePending);
  report.assertions.tiltedDoseConservesVolume = await page.evaluate(() => {
    const a = window.__aperture, s = a.app.getState();
    return Math.abs(s.vessels[a.id].volume_ml - .12) < 1e-7 && Math.abs(s.vessels[a.id].mass_g - .12) < 1e-7;
  });
  report.assertions.invalidApparatusAndLargeSolidRejected = await page.evaluate(() => {
    const a = window.__aperture, s = a.app.getState(), v = s.vessels[a.id];
    s.clearPour();
    a.app.setState({ vessels: { [a.id]: { ...v, type: 'tongs', rotationZ: 0 } } });
    s.triggerPour('H2O', a.id, .12); const apparatus = !a.app.getState().pouringChemical;
    a.app.setState({ vessels: { [a.id]: { ...v, type: 'test_tube', rotationZ: 0, capacity_ml: 10 } } });
    s.triggerPour('Na', a.id, 2);
    return apparatus && !a.app.getState().pouringChemical;
  });
  report.assertions.noRuntimeErrors = report.errors.length === 0;
  assert.ok(Object.values(report.assertions).every(Boolean), JSON.stringify(report.assertions));
  console.log(JSON.stringify(report.assertions, null, 2));
} finally {
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
