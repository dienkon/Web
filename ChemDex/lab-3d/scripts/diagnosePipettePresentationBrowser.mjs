import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve('artifacts/pipette-presentation/diagnosis');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.routeWebSocket('**', route => {
  const server = route.connectToServer();
  server.onMessage(message => {
    let type; try { type = JSON.parse(String(message)).type; } catch { /* Worker/socket traffic. */ }
    if (type !== 'update' && type !== 'full-reload') route.send(message);
  });
});
await page.addInitScript(() => { performance.setResourceTimingBufferSize(10000); localStorage.setItem('chemlab_vfx_quality_preference', 'low'); });
const report = { errors: [] };
page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
try {
  await page.goto(process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767', { waitUntil: 'domcontentloaded' });
  await page.locator('#manual-lab canvas').waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const loaded = pattern => performance.getEntriesByType('resource').map(r => r.name).findLast(name => pattern.test(name));
    const { useAppStore: app } = await import(loaded(/\/useAppStore\.ts(?:\?|$)/));
    const { useInstrumentStore: instrument } = await import(loaded(/\/instrumentState\.ts(?:\?|$)/));
    const { _roots } = await import(loaded(/@react-three_fiber\.js(?:\?|$)/));
    const three = await import(loaded(/\/three\.js(?:\?|$)/));
    const operations = await import(loaded(/\/instrumentOperations\.ts(?:\?|$)/));
    let mounted;
    for (let i = 0; i < 400; i++) {
      mounted = _roots.get(document.querySelector('#manual-lab canvas'));
      if (mounted?.store.getState().internal.active && mounted.store.getState().internal.subscribers.length) break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    if (!mounted) throw new Error('Manual canvas did not mount');
    const root = mounted.store.getState();
    app.getState().resetWorkbench();
    const vessel = (id, x) => ({ id, name: id, type: 'beaker', capacity_ml: 100, position: [x, -.135, 0],
      rotationY: 0, isLocked: false, mass_g: 0, volume_ml: 0, volume: 0, temperature_c: 25, ph: 7,
      hasGas: false, hasPrecipitate: false, isBoiling: false, contents: [], substances: [] });
    app.setState({ vessels: { receiverA: vessel('receiverA', -1), receiverB: vessel('receiverB', 2) },
      vesselIds: ['receiverA', 'receiverB'], selectedVesselId: 'receiverA', activeTool: 'pipette',
      activeKinetics: {}, pendingReactions: {}, burners: {}, burnerIds: [], spills: {}, inFlightPours: [],
      isSimulationPaused: false, moveMode: false, timeScale: .1, leftSidebarOpen: false, rightSidebarOpen: false });
    app.getState().setPipetteSample({ volume_ml: 1, mass_g: 1, temperature_c: 25, color: '#b91c1c',
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 1, moles: 1 / 18.015 }], substances: ['H2O'] });
    root.internal.subscribe({ current: ({ camera }) => { camera.position.set(1, 2.7, 7); camera.lookAt(.3, -.15, 0); camera.updateMatrixWorld(); } }, 0, mounted.store);
    window.pipetteDiagnosis = { app, instrument, operations, root, three, capture: () => {
      const state = app.getState(), scene = root.scene; scene.updateMatrixWorld(true);
      const jet = scene.getObjectByName('pipette-stream-jet'), stream = scene.getObjectByName('pipette-stream');
      const tipNode = scene.getObjectByName('tool-pipette-outlet');
      return { selected: state.selectedVesselId, activeTool: state.activeTool, paused: state.isSimulationPaused,
        A: { mass_g: state.vessels.receiverA.mass_g, volume_ml: state.vessels.receiverA.volume_ml,
          evaporated_g: state.vessels.receiverA.evaporated_ml ?? 0 },
        B: { mass_g: state.vessels.receiverB.mass_g, volume_ml: state.vessels.receiverB.volume_ml },
        sample: state.pipetteSample, pulse: instrument.getState().pipettePulse,
        streamVisible: stream?.visible, streamColor: jet?.material.color.getHexString(),
        tip: tipNode?.localToWorld(new three.Vector3(0, -.175, 0)).toArray(),
        jetEnds: jet ? [-.5, .5].map(y => jet.localToWorld(new three.Vector3(0, y, 0)).toArray()) : [] };
    } };
  });
  await page.waitForTimeout(1800);
  report.dispenseResult = await page.evaluate(() => window.pipetteDiagnosis.operations.dispensePipette(1, 'receiverA'));
  await page.waitForFunction(() => {
    const a = window.pipetteDiagnosis;
    if (a.root.scene.getObjectByName('pipette-stream')?.visible) { a.app.getState().setSimulationPaused(true); return true; }
    return false;
  }, undefined, { polling: 'raf', timeout: 10000 });
  await page.waitForTimeout(200);
  report.beforeRetarget = await page.evaluate(() => window.pipetteDiagnosis.capture());
  await page.screenshot({ path: resolve(output, '01-full-dispense-to-A.png') });
  await page.evaluate(() => {
    const state = window.pipetteDiagnosis.app.getState(); state.setSelectedVesselId('receiverB'); state.setActiveTool('thermometer');
  });
  await page.waitForTimeout(800);
  report.afterRetarget = await page.evaluate(() => window.pipetteDiagnosis.capture());
  await page.screenshot({ path: resolve(output, '02-pulse-incorrectly-targets-B.png') });
  assert.ok(report.dispenseResult.ok);
  assert.ok(Math.abs(report.afterRetarget.A.volume_ml + report.afterRetarget.A.evaporated_g - 1) < 1e-8);
  assert.equal(report.afterRetarget.B.volume_ml, 0);
  assert.equal(report.beforeRetarget.sample, null);
  assert.equal(report.beforeRetarget.streamColor, '38bdf8');
  assert.equal(report.afterRetarget.streamVisible, true);
  assert.ok(report.afterRetarget.jetEnds.some(end => Math.abs(end[0] - 2) < 1e-8));
  assert.deepEqual(report.errors, []);
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  report.failure = String(error);
  report.current = await page.evaluate(() => window.pipetteDiagnosis?.capture()).catch(() => undefined);
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify(report, null, 2) + '\n');
  await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  throw error;
} finally { await browser.close(); }
