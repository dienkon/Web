import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { prepareLabAuditSession } from './fixtures/labAuditSession.mjs';

const output = resolve(process.env.LAB_BURETTE_OUTPUT ?? 'artifacts/burette-delivery');
mkdirSync(output, { recursive: true });
const files = ['src/handling/burettePresentation.ts', 'src/handling/buretteTarget.ts', 'src/handling/burettePlacement.ts', 'src/handling/instrumentState.ts',
  'src/handling/instrumentOperations.ts', 'src/handling/toolDock.ts', 'src/store/persistence.ts', 'src/store/useAppStore.ts',
  'src/components/TitrationPanel.tsx', 'src/components/three/LabScene.tsx',
  'src/components/three/interactions/InteractiveBuretteApparatus.tsx'];
const hashes = () => Object.fromEntries(files.map(file => [file, createHash('sha256').update(readFileSync(resolve(file))).digest('hex')]));
const report = { errors: [], assertions: {}, sourceBefore: hashes() };
const browser = await chromium.launch({ channel: 'chrome', headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await prepareLabAuditSession(page);
await page.routeWebSocket('**', route => {
  const server = route.connectToServer();
  server.onMessage(message => {
    let type; try { type = JSON.parse(String(message)).type; } catch { /* unrelated socket */ }
    if (type !== 'update' && type !== 'full-reload') route.send(message);
  });
});
await page.addInitScript(() => { performance.setResourceTimingBufferSize(16000); localStorage.setItem('chemlab_vfx_quality_preference', 'low'); });
page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error' && /shader|webgl|THREE/i.test(message.text())) report.errors.push(message.text()); });
const distance = (a, b) => Math.hypot(...a.map((v, i) => v - b[i]));
const near = (a, b, epsilon = 1e-6) => Math.abs(a - b) <= epsilon;

async function attach() {
  await page.locator('#manual-lab canvas').waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const loaded = pattern => performance.getEntriesByType('resource').map(r => r.name).findLast(name => pattern.test(name));
    const { useAppStore: app } = await import(loaded(/\/useAppStore\.ts(?:\?|$)/));
    const { useInstrumentStore: instrument } = await import(loaded(/\/instrumentState\.ts(?:\?|$)/));
    const { useToolDockStore: dock } = await import(loaded(/\/toolDockState\.ts(?:\?|$)/));
    const operations = await import(loaded(/\/instrumentOperations\.ts(?:\?|$)/));
    const persistence = await import(loaded(/\/store\/persistence\.ts(?:\?|$)/));
    const { _roots } = await import(loaded(/@react-three_fiber\.js(?:\?|$)/));
    const three = await import(loaded(/\/three\.js(?:\?|$)/));
    let mounted;
    for (let i = 0; i < 400; i++) {
      mounted = _roots.get(document.querySelector('#manual-lab canvas'));
      if (mounted?.store.getState().internal.active && mounted.store.getState().internal.subscribers.length) break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    if (!mounted) throw new Error('Manual canvas did not mount');
    const root = mounted.store.getState();
    root.internal.subscribe({ current: ({ camera }) => { camera.position.set(6, 4.8, 12); camera.lookAt(0, 1.4, 0); camera.updateMatrixWorld(); } }, 0, mounted.store);
    window.buretteAudit = { app, dock, instrument, operations, persistence, root, three, capture: () => {
      const state = app.getState(), scene = root.scene; scene.updateMatrixWorld(true);
      const drops = scene.getObjectByName('burette-delivery-drops'), ripples = scene.getObjectByName('burette-delivery-ripples');
      const tip = scene.getObjectByName('burette-delivery-tip');
      const sceneBox = name => {
        const mesh = scene.getObjectByName(name);
        const box = mesh && new three.Box3().setFromObject(mesh);
        return box ? { min: box.min.toArray(), max: box.max.toArray() } : null;
      };
      const point = new three.Vector3(), rotation = new three.Quaternion(), scale = new three.Vector3(), matrix = new three.Matrix4(), color = new three.Color();
      const drawn = [];
      if (drops?.visible) for (let i = 0; i < drops.count; i++) {
        drops.getMatrixAt(i, matrix); matrix.decompose(point, rotation, scale); drops.getColorAt(i, color);
        drawn.push({ position: point.applyMatrix4(drops.matrixWorld).toArray(), radius: scale.x, color: color.getHexString() });
      }
      return { burette: structuredClone(state.burette), selected: state.selectedVesselId, paused: state.isSimulationPaused, move: state.moveMode,
        A: state.vessels.receiverA && { volume_ml: state.vessels.receiverA.volume_ml, mass_g: state.vessels.receiverA.mass_g,
          contents: structuredClone(state.vessels.receiverA.contents) },
        B: state.vessels.receiverB && { volume_ml: state.vessels.receiverB.volume_ml, mass_g: state.vessels.receiverB.mass_g },
        history: structuredClone(state.titrationHistory), receipts: structuredClone(instrument.getState().burettePresentations),
        userData: drops?.userData.receipts, drawn, dropCount: drops?.count ?? 0, dropVisible: !!drops?.visible,
        dropMatrix: drops && [...drops.instanceMatrix.array], rippleVisible: !!ripples?.visible,
        tip: tip?.localToWorld(new three.Vector3(0, -.2, 0)).toArray(),
        base: sceneBox('burette-stand-base'), post: sceneBox('burette-stand-post'), bench: sceneBox('workbench-top'),
        fakeContinuousStream: !!scene.getObjectByName('burette-stream') };
    } };
  });
}

try {
  await page.goto(process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767', { waitUntil: 'domcontentloaded' });
  await attach();
  const onBench = ({ base, post, bench }) => base && post && bench && near(base.min[1], bench.max[1])
    && post.min[1] < base.max[1] && post.min[1] > base.min[1]
    && base.min[0] > bench.min[0] && base.max[0] < bench.max[0] && base.min[2] > bench.min[2] && base.max[2] < bench.max[2];
  const capture = () => page.evaluate(() => window.buretteAudit.capture());
  await page.waitForFunction(() => window.buretteAudit.capture().base);
  report.support = await capture();
  report.assertions.defaultStandTouchesRenderedBench = onBench(report.support);
  await page.evaluate(() => {
    const a = window.buretteAudit;
    a.app.getState().setSelectedVesselId('flask_1');
    a.app.setState({ rightSidebarOpen: true });
  });
  await page.getByRole('button', { name: /^(Chuẩn độ|Titration)$/ }).click();
  const station = page.getByRole('region', { name: /Trạm chuẩn độ|Titration station/i });
  await station.getByRole('button', { name: /Căn bình dưới buret|Align selected vessel/ }).click();
  await station.locator('[data-burette-receiver="flask_1"]').waitFor();
  report.raisedSupport = await capture();
  report.assertions.tallFlaskRaisesNozzleButNotFoot = report.raisedSupport.tip[1] > report.support.tip[1] + .2
    && onBench(report.raisedSupport);
  await station.getByRole('button', { name: /Nhả một giọt từ buret|Dispense one burette drop/ }).click();
  await page.waitForFunction(() => window.buretteAudit.app.getState().titrationHistory.length === 1);
  await page.screenshot({ path: resolve(output, '00-grounded-burette-with-flask.png') });
  await page.evaluate(() => window.buretteAudit.app.setState({ rightSidebarOpen: false }));
  const move = page.getByRole('button', { name: /Di chuyển dụng cụ|Move equipment/ });
  await move.click();
  const postPointer = await page.evaluate(() => {
    const a = window.buretteAudit, post = a.root.scene.getObjectByName('burette-stand-post');
    const point = post.localToWorld(new a.three.Vector3(0, .6, 0)).project(a.root.camera);
    const rect = a.root.gl.domElement.getBoundingClientRect();
    return [rect.left + (1 + point.x) * rect.width / 2, rect.top + (1 - point.y) * rect.height / 2];
  });
  await page.mouse.move(...postPointer);
  await page.mouse.down();
  await page.waitForFunction(() => window.buretteAudit.dock.getState().dragging === 'burette');
  await page.mouse.move(postPointer[0] + 155, postPointer[1] + 35, { steps: 12 });
  await page.waitForFunction(start => {
    const a = window.buretteAudit, { burette, tip } = a.capture(), position = burette.position;
    return a.dock.getState().dragging === 'burette' && Math.hypot(position[0] - start[0], position[2] - start[2]) > .4
      && tip && Math.hypot(position[0] - tip[0], position[2] - tip[2]) < 1e-5;
  }, report.raisedSupport.burette.position);
  report.liveDragSupport = await capture();
  report.assertions.standTracksPointerBeforeRelease = onBench(report.liveDragSupport);
  await page.mouse.up();
  await page.waitForFunction(() => window.buretteAudit.dock.getState().dragging === null);
  await move.click();
  report.draggedSupport = await capture();
  report.assertions.dragMovesStandAlongBench = distance(report.raisedSupport.burette.position, report.draggedSupport.burette.position) > .4
    && near(report.raisedSupport.tip[1], report.draggedSupport.tip[1]) && onBench(report.draggedSupport);
  await page.waitForFunction(() => {
    const a = window.buretteAudit, saved = a.persistence.loadPersistedLabState()?.materials?.burette;
    return saved?.position?.every((coordinate, axis) => coordinate === a.app.getState().burette.position[axis]);
  });
  await page.reload({ waitUntil: 'domcontentloaded' }); await attach();
  await page.waitForFunction(() => window.buretteAudit.capture().base);
  report.reloadedSupport = await capture();
  report.assertions.reloadRetainsDraggedSupport = distance(report.draggedSupport.burette.position, report.reloadedSupport.burette.position) < 1e-7
    && onBench(report.reloadedSupport);

  await page.evaluate(() => {
    const a = window.buretteAudit, state = a.app.getState(); state.resetWorkbench();
    const receiver = (id, x) => ({ id, name: id, type: 'beaker', capacity_ml: 100, position: [x, -.135, 0],
      rotationY: 0, isLocked: false, mass_g: 0, volume_ml: 0, volume: 0, temperature_c: 25, ph: 7,
      hasGas: false, hasPrecipitate: false, isBoiling: false, contents: [], substances: [] });
    a.app.setState({ vessels: { receiverA: receiver('receiverA', 0), receiverB: receiver('receiverB', 3) },
      vesselIds: ['receiverA', 'receiverB'], selectedVesselId: 'receiverA', activeTool: 'none',
      activeKinetics: {}, pendingReactions: {}, burners: {}, burnerIds: [], spills: {}, inFlightPours: [],
      isSimulationPaused: false, moveMode: false, draggingVesselId: null, timeScale: .1,
      leftSidebarOpen: false, rightSidebarOpen: false, titrationHistory: [],
      burette: { ...state.burette, position: [0, 1, 0], reagentFormula: 'KMnO4', concentration_M: .01,
        currentVolume_ml: .02, maxVolume_ml: 50, isDispensing: false, flowRate_ml_s: .5 } });
    a.instrument.getState().clearBurettePresentations();
    a.persistence.clearHistory();
    const baseline = a.app.getState();
    a.persistence.pushHistorySnapshot('RESET', baseline.vessels, baseline.burners, 'Burette browser baseline', 'Bản gốc browser buret', {
      inFlightPours: baseline.inFlightPours, spills: baseline.spills, wasteMass_g: baseline.wasteMass_g,
      wasteContents: baseline.wasteContents, burette: baseline.burette, titrationHistory: baseline.titrationHistory });
    a.app.getState().dispenseBuretteDrop('receiverA');
  });
  await page.waitForFunction(() => {
    const a = window.buretteAudit, receipt = a.instrument.getState().burettePresentations[0];
    if (!receipt || receipt.elapsed_s <= receipt.flight.flightTime * .15 || receipt.elapsed_s >= receipt.flight.flightTime * .7) return false;
    a.app.getState().setSimulationPaused(true); return true;
  }, undefined, { polling: 'raf', timeout: 60000 });
  await page.waitForTimeout(300);
  report.partial = await page.evaluate(() => window.buretteAudit.capture());
  const partial = report.partial, receipt = partial.receipts[0];
  report.assertions.finalPartialDropAndLedger = partial.burette.currentVolume_ml === 0 && near(partial.A.volume_ml, .02, 1e-4)
    && near(partial.A.mass_g, .02, 1e-4) && near(partial.A.contents.find(c => c.formula === 'KMnO4')?.moles, .01 * .02 / 1000, 1e-10)
    && partial.history.length === 1 && near(partial.history[0].volumeAdded_ml, .02)
    && near(receipt.volume_ml, .02) && receipt.radius < Math.cbrt(3 * .05 * 1e-6 / (4 * Math.PI)) / .035;
  report.assertions.actualNozzleAndFiniteRadius = partial.drawn.length === 1 && partial.dropCount === 1
    && distance(partial.tip, receipt.outlet) < 1e-5 && near(partial.drawn[0].radius, receipt.radius, 1e-6)
    && near(partial.drawn[0].position[0], receipt.outlet[0]) && near(partial.drawn[0].position[2], receipt.outlet[2])
    && partial.drawn[0].position[1] < receipt.outlet[1] && partial.drawn[0].position[1] > receipt.surface[1]
    && !partial.fakeContinuousStream;
  await page.evaluate(() => { const s = window.buretteAudit.app.getState(); s.setSelectedVesselId('receiverB'); s.setActiveTool('thermometer'); });
  await page.waitForTimeout(700);
  report.reselected = await page.evaluate(() => window.buretteAudit.capture());
  report.assertions.pauseAndSelectionCannotRetarget = report.reselected.selected === 'receiverB'
    && report.reselected.receipts[0].targetId === 'receiverA' && report.reselected.B.mass_g === 0
    && report.reselected.receipts[0].elapsed_s === receipt.elapsed_s
    && JSON.stringify(report.reselected.dropMatrix) === JSON.stringify(partial.dropMatrix)
    && report.reselected.drawn[0].color === partial.drawn[0].color;
  await page.screenshot({ path: resolve(output, '01-finite-partial-drop-fixed-on-A.png') });

  await page.evaluate(() => window.buretteAudit.app.getState().setSimulationPaused(false));
  await page.waitForFunction(() => window.buretteAudit.instrument.getState().burettePresentations.length === 0,
    undefined, { polling: 'raf', timeout: 15000 });
  await page.evaluate(() => window.buretteAudit.app.getState().setSimulationPaused(true));
  await page.waitForTimeout(250); report.drained = await page.evaluate(() => window.buretteAudit.capture());
  report.assertions.exhaustedSourceEndsFiniteEffect = report.drained.burette.currentVolume_ml === 0
    && report.drained.receipts.length === 0 && !report.drained.dropVisible && !report.drained.rippleVisible
    && !report.drained.fakeContinuousStream;

  await page.evaluate(() => window.buretteAudit.app.getState().undo());
  await page.waitForTimeout(300); report.undo = await page.evaluate(() => window.buretteAudit.capture());
  await page.evaluate(() => window.buretteAudit.app.getState().redo());
  await page.waitForTimeout(300); report.redo = await page.evaluate(() => window.buretteAudit.capture());
  report.assertions.undoRedoCoupledAndNoStaleDrop = near(report.undo.burette.currentVolume_ml, .02) && report.undo.A.mass_g === 0
    && report.undo.history.length === 0 && report.undo.receipts.length === 0
    && report.redo.burette.currentVolume_ml === 0 && near(report.redo.A.mass_g, .02, 1e-4)
    && report.redo.history.length === 1 && report.redo.receipts.length === 0 && !report.redo.dropVisible;
  await page.waitForTimeout(1300);
  await page.reload({ waitUntil: 'domcontentloaded' }); await attach();
  await page.evaluate(() => window.buretteAudit.app.getState().setSimulationPaused(true));
  report.reloaded = await page.evaluate(() => window.buretteAudit.capture());
  report.assertions.reloadCouplesSourceTargetAndHistory = report.reloaded.burette.currentVolume_ml === 0
    && !report.reloaded.burette.isDispensing && near(report.reloaded.A.mass_g, .02, 1e-4)
    && report.reloaded.history.length === 1 && report.reloaded.receipts.length === 0;
  await page.screenshot({ path: resolve(output, '02-reloaded-finite-inventory.png') });
  await page.evaluate(() => {
    const a = window.buretteAudit;
    a.app.getState().setSimulationPaused(false);
    a.app.setState({ rightSidebarOpen: true });
  });
  await page.getByRole('button', { name: /^(Chuẩn độ|Titration)$/ }).click();
  await station.getByText(/Nạp hoặc xả buret|Fill or drain the burette/).click();
  await station.getByRole('button', { name: /Nạp đầy từ kho|Refill from stock/ }).click();
  await page.waitForFunction(() => window.buretteAudit.app.getState().burette.currentVolume_ml === 50);
  await station.getByRole('button', { name: /Xả vào chất thải|Drain to waste/ }).click();
  await page.waitForFunction(() => window.buretteAudit.app.getState().burette.currentVolume_ml === 0);
  report.assertions.refillAndDrainKeepReceiverAndRecordWaste = await page.evaluate(() => {
    const state = window.buretteAudit.app.getState();
    return Math.abs(state.vessels.receiverA.mass_g - .02) < 1e-6 && state.wasteMass_g === 50
      && state.titrationHistory.length === 1 && state.wasteContents.some(row => row.formula === 'KMnO4');
  });
  await page.evaluate(() => window.buretteAudit.app.setState({ rightSidebarOpen: false }));

  report.moveTransition = await page.evaluate(() => {
    const a = window.buretteAudit, state = a.app.getState();
    a.app.setState({ isSimulationPaused: false, moveMode: false, selectedVesselId: 'receiverA',
      burette: { ...state.burette, currentVolume_ml: 1, isDispensing: false } });
    a.openResult = a.operations.setBuretteValve(true);
    const openedBeforeMoving = a.app.getState().burette.isDispensing;
    a.app.getState().setMoveMode(true);
    a.app.getState().dispenseBuretteDrop('receiverA');
    return { ...a.openResult, openedBeforeMoving };
  });
  report.beforeMove = await page.evaluate(() => window.buretteAudit.capture());
  await page.waitForTimeout(1600); report.afterMove = await page.evaluate(() => window.buretteAudit.capture());
  report.assertions.continuousMoveHasNoDoseOrFakeJet = report.moveTransition.ok && report.moveTransition.openedBeforeMoving
    && !report.beforeMove.burette.isDispensing && !report.afterMove.burette.isDispensing
    && report.afterMove.burette.currentVolume_ml === report.beforeMove.burette.currentVolume_ml
    && report.afterMove.A.mass_g === report.beforeMove.A.mass_g && report.afterMove.history.length === report.beforeMove.history.length
    && report.afterMove.receipts.length === 0 && !report.afterMove.dropVisible && !report.afterMove.fakeContinuousStream;
  await page.screenshot({ path: resolve(output, '03-move-mode-stops-continuous-dosing.png') });
  report.assertions.noRuntimeErrors = report.errors.length === 0;
  report.sourceAfter = hashes(); report.assertions.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  report.generatedAt = new Date().toISOString();
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  assert.ok(Object.values(report.assertions).every(Boolean), 'Burette delivery assertions');
  console.log(JSON.stringify({ assertions: report.assertions, output }, null, 2));
} catch (error) {
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify({ error: String(error), ...report }, null, 2) + '\n');
  await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {}); throw error;
} finally { await browser.close(); }
