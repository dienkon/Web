import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const output = resolve(process.env.LAB_PIPETTE_OUTPUT ?? 'artifacts/pipette-presentation/final');
mkdirSync(output, { recursive: true });
const sourceFiles = ['src/handling/pipettePresentation.ts', 'src/handling/instrumentState.ts',
  'src/handling/instrumentOperations.ts', 'src/store/useAppStore.ts', 'src/components/three/interactions/InteractivePipette.tsx'];
const fingerprints = () => Object.fromEntries(sourceFiles.map(file => [file, createHash('sha256').update(readFileSync(resolve(file))).digest('hex')]));
const report = { errors: [], assertions: {}, sourceBefore: fingerprints() };
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.routeWebSocket('**', route => {
  const server = route.connectToServer();
  server.onMessage(message => {
    let type; try { type = JSON.parse(String(message)).type; } catch { /* Worker/socket traffic. */ }
    if (type !== 'update' && type !== 'full-reload') route.send(message);
  });
});
await page.addInitScript(() => { performance.setResourceTimingBufferSize(12000); localStorage.setItem('chemlab_vfx_quality_preference', 'low'); });
page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error' && /shader|webgl|THREE/i.test(message.text())) report.errors.push(message.text()); });
const distance = (a, b) => Math.hypot(...a.map((value, axis) => value - b[axis]));

async function startAndHold(amount) {
  await page.evaluate(amount => {
    const a = window.pipetteAudit, s = a.app.getState();
    a.instrument.getState().clearPipettePresentations();
    s.setPipetteSample({ volume_ml: amount, mass_g: amount, temperature_c: 25, color: '#b91c1c',
      contents: [{ formula: 'H2O', phase: 'l', mass_g: amount, moles: amount / 18.015 }], substances: ['H2O'] });
    s.setSelectedVesselId('receiverA'); s.setActiveTool('pipette'); s.setSimulationPaused(false);
    a.result = a.operations.dispensePipette(amount, 'receiverA');
  }, amount);
  await page.waitForFunction(() => {
    const a = window.pipetteAudit, receipt = a.instrument.getState().pipettePresentations[0];
    if (!receipt) return false;
    const active = receipt.elapsed_s > receipt.position_s && receipt.elapsed_s < receipt.position_s + receipt.transfer_s;
    if (!active) return false;
    if (receipt.drops.length) {
      const t = receipt.elapsed_s - receipt.position_s;
      if (!receipt.drops.some(drop => t >= drop.release_s && t < drop.release_s + drop.flight.flightTime)) return false;
    }
    a.app.getState().setSimulationPaused(true); return true;
  }, undefined, { polling: 'raf', timeout: 60000 });
  await page.waitForTimeout(250);
  return page.evaluate(() => window.pipetteAudit.capture());
}

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
    if (!mounted) throw new Error('Manual renderer did not mount');
    const root = mounted.store.getState();
    app.getState().resetWorkbench();
    const vessel = (id, x) => ({ id, name: id, type: 'beaker', capacity_ml: 100, position: [x, -.135, 0],
      rotationY: 0, isLocked: false, mass_g: 0, volume_ml: 0, volume: 0, temperature_c: 25, ph: 7,
      hasGas: false, hasPrecipitate: false, isBoiling: false, contents: [], substances: [] });
    app.setState({ vessels: { receiverA: vessel('receiverA', -1), receiverB: vessel('receiverB', 2) },
      vesselIds: ['receiverA', 'receiverB'], selectedVesselId: 'receiverA', activeTool: 'pipette',
      activeKinetics: {}, pendingReactions: {}, burners: {}, burnerIds: [], spills: {}, inFlightPours: [],
      isSimulationPaused: false, moveMode: false, timeScale: .1, leftSidebarOpen: false, rightSidebarOpen: false });
    root.internal.subscribe({ current: ({ camera }) => { camera.position.set(1, 2.7, 7); camera.lookAt(.3, -.15, 0); camera.updateMatrixWorld(); } }, 0, mounted.store);
    window.pipetteAudit = { app, instrument, operations, root, three, capture: () => {
      const s = app.getState(), scene = root.scene; scene.updateMatrixWorld(true);
      const tool = scene.getObjectByName('tool-pipette'), jet = scene.getObjectByName('pipette-stream-jet');
      const effect = scene.getObjectByName('pipette-stream'), drops = scene.getObjectByName('pipette-transfer-drops');
      const outlet = scene.getObjectByName('tool-pipette-outlet'), column = scene.getObjectByName('pipette-liquid-column');
      const receipt = instrument.getState().pipettePresentations[0];
      const matrix = new three.Matrix4(), point = new three.Vector3(), scale = new three.Vector3(), rotation = new three.Quaternion();
      const drawnDrops = [];
      if (drops) for (let i = 0; i < 4; i++) {
        drops.getMatrixAt(i, matrix); matrix.decompose(point, rotation, scale);
        if (scale.x > 0) drawnDrops.push({ position: point.applyMatrix4(drops.matrixWorld).toArray(), radius: scale.x });
      }
      return { result: window.pipetteAudit.result, receipt: receipt && structuredClone(receipt),
        queueLength: instrument.getState().pipettePresentations.length, sample: s.pipetteSample,
        selected: s.selectedVesselId, activeTool: s.activeTool, paused: s.isSimulationPaused,
        A: s.vessels.receiverA && { volume_ml: s.vessels.receiverA.volume_ml, mass_g: s.vessels.receiverA.mass_g },
        B: s.vessels.receiverB && { volume_ml: s.vessels.receiverB.volume_ml, mass_g: s.vessels.receiverB.mass_g },
        effectVisible: !!effect?.visible, jetVisible: !!jet?.visible, color: jet?.material.color.getHexString(),
        dropsVisible: !!drops?.visible, dropColor: drops?.material.color.getHexString(), drawnDrops,
        jetEnds: jet ? [-.5, .5].map(y => jet.localToWorld(new three.Vector3(0, y, 0)).toArray()) : [],
        outlet: outlet?.localToWorld(new three.Vector3(0, -.175, 0)).toArray(),
        toolMatrix: tool?.matrixWorld.toArray(), dropMatrices: drops && [...drops.instanceMatrix.array],
        column: { visible: column?.visible, color: column?.material.color.getHexString(), scale: column?.scale.toArray() },
        userData: tool?.userData.pipetteReceipt };
    } };
  });

  report.stream = await startAndHold(1);
  const stream = report.stream;
  report.assertions.fullDispenseKeepsAcceptedColor = stream.result.ok && stream.sample === null
    && stream.effectVisible && stream.jetVisible && stream.color === 'b91c1c';
  report.assertions.actualStreamEndpoints = stream.jetEnds.some(end => distance(end, stream.receipt.outlet) < 1e-3)
    && stream.jetEnds.some(end => distance(end, stream.receipt.surface) < 1e-3)
    && distance(stream.outlet, stream.receipt.outlet) < 1e-5;
  await page.evaluate(() => { const s = window.pipetteAudit.app.getState(); s.setSelectedVesselId('receiverB'); s.setActiveTool('thermometer'); });
  await page.waitForTimeout(750);
  report.retargeted = await page.evaluate(() => window.pipetteAudit.capture());
  const retargeted = report.retargeted;
  report.assertions.selectionAndToolCannotRetargetAcceptedTransfer = retargeted.selected === 'receiverB' && retargeted.activeTool === 'thermometer'
    && retargeted.userData.targetId === 'receiverA' && retargeted.A.volume_ml > .999 && retargeted.B.volume_ml === 0
    && JSON.stringify(retargeted.jetEnds) === JSON.stringify(stream.jetEnds)
    && JSON.stringify(retargeted.toolMatrix) === JSON.stringify(stream.toolMatrix) && retargeted.color === 'b91c1c';
  report.assertions.pauseFreezesReceiptAndPose = retargeted.receipt.elapsed_s === stream.receipt.elapsed_s
    && JSON.stringify(retargeted.dropMatrices) === JSON.stringify(stream.dropMatrices);
  await page.screenshot({ path: resolve(output, '01-accepted-stream-remains-on-A.png') });

  report.microdose = await startAndHold(.12);
  const micro = report.microdose;
  report.assertions.microdoseUsesFiniteDiscreteDrops = !micro.jetVisible && micro.drawnDrops.length > 0
    && micro.receipt.drops.length === 3 && Math.abs(micro.receipt.drops.reduce((sum, drop) => sum + drop.volume_ml, 0) - .12) < 1e-12
    && Math.abs(micro.receipt.drops[2].volume_ml - .02) < 1e-12 && micro.dropColor === 'b91c1c';
  await page.screenshot({ path: resolve(output, '02-finite-red-microdrops.png') });
  await page.evaluate(() => window.pipetteAudit.app.getState().resetWorkbench());
  await page.waitForTimeout(250);
  report.reset = await page.evaluate(() => window.pipetteAudit.capture());
  report.assertions.resetClearsStaleReceiptAndEffect = report.reset.queueLength === 0 && !report.reset.effectVisible
    && report.reset.sample === null;
  await page.screenshot({ path: resolve(output, '03-reset-clears-old-transfer.png') });
  report.assertions.noRuntimeErrors = report.errors.length === 0;
  report.sourceAfter = fingerprints();
  report.assertions.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  report.generatedAt = new Date().toISOString();
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  assert.ok(Object.values(report.assertions).every(Boolean), 'Pipette presentation assertions');
  console.log(JSON.stringify({ assertions: report.assertions, output }, null, 2));
} catch (error) {
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify({ error: String(error), ...report }, null, 2) + '\n');
  await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  throw error;
} finally { await browser.close(); }
