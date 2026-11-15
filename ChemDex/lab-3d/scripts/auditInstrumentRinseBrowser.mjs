import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const output = resolve(process.env.LAB_RINSE_OUTPUT ?? 'artifacts/instrument-rinse');
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
const report = { errors: [], assertions: {} };
const sourceFiles = ['src/store/useAppStore.ts', 'src/handling/instrumentRinse.ts', 'src/handling/instrumentRinseVisual.ts',
  'src/components/InstrumentRinseStatus.tsx', 'src/components/three/interactions/InstrumentRinseAnimation.tsx',
  'src/components/three/interactions/ContinuousLiquidStream.tsx'];
const fingerprint = () => Object.fromEntries(sourceFiles.map(file => [file,
  createHash('sha256').update(readFileSync(resolve(file))).digest('hex')]));
report.sourceBefore = fingerprint();
page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error' && /shader|webgl|THREE/i.test(message.text())) report.errors.push(message.text()); });

try {
  await page.goto(process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767', { waitUntil: 'domcontentloaded' });
  await page.locator('#manual-lab canvas').waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const loaded = pattern => performance.getEntriesByType('resource').map(r => r.name).findLast(name => pattern.test(name));
    const { useAppStore: app } = await import(loaded(/\/useAppStore\.ts(?:\?|$)/));
    const { _roots } = await import(loaded(/@react-three_fiber\.js(?:\?|$)/));
    const three = await import(loaded(/\/three\.js(?:\?|$)/));
    const visual = await import(loaded(/\/instrumentRinseVisual\.ts(?:\?|$)/));
    let mounted;
    for (let attempt = 0; attempt < 400; attempt++) {
      mounted = _roots.get(document.querySelector('#manual-lab canvas'));
      if (mounted?.store.getState().internal.active && mounted.store.getState().internal.subscribers.length > 0) break;
      await new Promise(resolve => setTimeout(resolve, 25));
    }
    if (!mounted) throw new Error('Manual renderer is not mounted');
    const root = mounted.store.getState();
    app.getState().resetWorkbench();
    const bottle = { id: 'rinse_water', type: 'wash_bottle', name: 'Nước cất hữu hạn 25 mL', capacity_ml: 250,
      position: [-3, -0.135, 0], rotationY: 0, isLocked: false, mass_g: 25, volume_ml: 25, volume: .1, temperature_c: 25, ph: 7,
      liquidColor: '#f8fafc', hasGas: false, hasPrecipitate: false, isBoiling: false,
      substances: ['H2O'], contents: [{ formula: 'H2O', phase: 'l', mass_g: 25, moles: 25 / 18.015 }] };
    const receiver = { ...bottle, id: 'rinse_receiver', name: 'Bình nhận', type: 'beaker', capacity_ml: 100,
      position: [2, -0.135, 0], mass_g: 0, volume_ml: 0, volume: 0, contents: [], substances: [] };
    app.setState({ vessels: { rinse_water: bottle, rinse_receiver: receiver }, vesselIds: ['rinse_water', 'rinse_receiver'],
      selectedVesselId: 'rinse_receiver', burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {},
      inFlightPours: [], spills: {}, wasteMass_g: 0, wasteContents: [], instrumentRinse: null,
      pouringChemical: null, stockDosePending: false, isSimulationPaused: false, moveMode: false, timeScale: .5,
      language: 'vi', leftSidebarOpen: false, rightSidebarOpen: false });
    app.getState().touchToolChemical('pipette', 'NaCl');
    const audit = window.rinseAudit = { app, root, three, visual };
    root.internal.subscribe({ current: ({ camera }) => {
      const anchor = app.getState().instrumentRinse?.anchor ?? audit.anchor ?? [0, -1.135, 3];
      audit.anchor = anchor;
      camera.position.set(anchor[0] + 3.3, anchor[1] + 3, anchor[2] + 6.5);
      camera.lookAt(anchor[0], anchor[1] + .45, anchor[2]); camera.updateMatrixWorld();
    } }, 0, mounted.store);
    audit.capture = () => {
      const s = app.getState(), session = s.instrumentRinse, scene = root.scene;
      scene.updateMatrixWorld(true);
      const bottleBody = scene.getObjectByName('vessel_si_body_rinse_water');
      const nozzle = bottleBody?.localToWorld(new three.Vector3(...visual.WASH_BOTTLE_NOZZLE_LOCAL)).toArray();
      const tool = scene.getObjectByName('tool-pipette'), tipNode = scene.getObjectByName('tool-pipette-outlet');
      const tip = tipNode?.localToWorld(new three.Vector3(0, -.175, 0)).toArray();
      const stream = scene.getObjectByName('instrument-rinse-stream'), jet = scene.getObjectByName('instrument-rinse-stream-jet');
      const jetEnds = jet ? [-.5, .5].map(y => jet.localToWorld(new three.Vector3(0, y, 0)).toArray()) : [];
      const streamMatrices = [];
      stream?.traverse(n => { if (n.isInstancedMesh) streamMatrices.push(...n.instanceMatrix.array); });
      const bottle = s.vessels.rinse_water;
      return { session: session && structuredClone(session), dirty: s.toolContamination.pipette, paused: s.isSimulationPaused,
        bottle: { volume_ml: bottle?.volume_ml, mass_g: bottle?.mass_g, evaporated_g: bottle?.evaporated_ml ?? 0,
          returned_g: bottle?.wallCondensation?.returned_g ?? 0 }, wasteMass_g: s.wasteMass_g,
        wasteWater_g: s.wasteContents.filter(row => row.formula === 'H2O').reduce((sum, row) => sum + row.mass_g, 0),
        nozzle, tip, expectedContact: session && visual.rinseToolContact(session), jetEnds,
        streamVisible: !!stream?.visible, streamMatrices,
        toolMatrix: tool?.matrixWorld.toArray(), bottleMatrix: scene.getObjectByName('wash-bottle-rinse_water')?.matrixWorld.toArray(),
        trayMounted: !!scene.getObjectByName('instrument-rinse-tray'), waterMounted: !!scene.getObjectByName('instrument-rinse-collected-water'),
        progress: document.querySelector('progress')?.value,
        progressLabel: document.querySelector('progress')?.getAttribute('aria-label'),
        toolCount: scene.getObjectsByProperty('name', 'tool-pipette').length,
        bottleCount: scene.getObjectsByProperty('name', 'wash-bottle-rinse_water').length };
    };
  });
  await page.getByRole('button', { name: 'Điều khiển dụng cụ', exact: true }).click();
  await page.getByRole('button', { name: 'Rửa pipet', exact: true }).click();
  await page.getByRole('progressbar').waitFor();
  await page.waitForFunction(() => {
    const s = window.rinseAudit.app.getState();
    return s.instrumentRinse?.phase === 'washing' && s.instrumentRinse.dispensed_ml >= .4;
  }, undefined, { polling: 'raf', timeout: 60000 });
  report.washing = await page.evaluate(() => window.rinseAudit.capture());
  const washing = report.washing;
  const distance = (a, b) => Math.hypot(...a.map((value, axis) => value - b[axis]));
  report.assertions.actualFiniteProgress = washing.session.dispensed_ml > 0 && washing.session.dispensed_ml < 5
    && Math.abs(washing.wasteMass_g - washing.session.dispensed_ml) < 1e-8
    && Math.abs(washing.progress - washing.session.dispensed_ml) < 1e-8;
  report.assertions.vietnameseProgressLabel = washing.progressLabel === 'Lượng nước đã rửa';
  report.assertions.existingBottleAndTool = washing.toolCount === 1 && washing.bottleCount === 1 && washing.trayMounted && washing.waterMounted;
  report.assertions.waterCollectedWithoutLoss = Math.abs(washing.bottle.mass_g + washing.wasteMass_g
    + washing.bottle.evaporated_g - washing.bottle.returned_g - 25) < 1e-8;
  report.assertions.correctToolContact = distance(washing.tip, washing.expectedContact) < 1e-5;
  report.sourceEndpointError = Math.min(...washing.jetEnds.map(end => distance(end, washing.nozzle)));
  report.targetEndpointError = Math.min(...washing.jetEnds.map(end => distance(end, washing.tip)));
  report.assertions.streamMeetsActualNozzleAndTool = washing.streamVisible
    && report.sourceEndpointError < 1e-4 && report.targetEndpointError < 1e-4;
  await page.screenshot({ path: resolve(output, '01-active-finite-rinse.png') });
  await page.getByRole('button', { name: 'Tạm dừng phản ứng', exact: true }).click();
  await page.getByText(/Tạm dừng/, { exact: false }).first().waitFor();
  await page.waitForTimeout(250);
  const paused = await page.evaluate(() => window.rinseAudit.capture());
  await page.waitForTimeout(750);
  report.paused = await page.evaluate(() => window.rinseAudit.capture());
  report.assertions.pauseFreezesMaterialAndWater = paused.session.elapsed_s === report.paused.session.elapsed_s
    && paused.wasteMass_g === report.paused.wasteMass_g && paused.bottle.mass_g === report.paused.bottle.mass_g
    && JSON.stringify(paused.streamMatrices) === JSON.stringify(report.paused.streamMatrices)
    && JSON.stringify(paused.toolMatrix) === JSON.stringify(report.paused.toolMatrix)
    && JSON.stringify(paused.bottleMatrix) === JSON.stringify(report.paused.bottleMatrix);
  await page.screenshot({ path: resolve(output, '02-paused-rinse.png') });
  await page.getByRole('button', { name: 'Dừng rửa', exact: true }).click();
  await page.waitForFunction(() => !window.rinseAudit.app.getState().instrumentRinse);
  report.cancelled = await page.evaluate(() => window.rinseAudit.capture());
  report.assertions.cancelPreservesWasteAndDirtyTool = !report.cancelled.session && report.cancelled.dirty === 'NaCl'
    && report.cancelled.wasteMass_g === report.paused.wasteMass_g && report.cancelled.bottle.mass_g === report.paused.bottle.mass_g;
  report.assertions.rinsePanelDoesNotBlockCancel = await page.getByRole('button', { name: 'Rửa pipet', exact: true }).isVisible();
  await page.screenshot({ path: resolve(output, '03-cancelled-rinse-keeps-waste.png') });
  report.assertions.noRuntimeErrors = report.errors.length === 0;
  report.sourceAfter = fingerprint();
  report.assertions.sourceStableDuringAudit = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  report.generatedAt = new Date().toISOString();
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  assert.ok(Object.values(report.assertions).every(Boolean), 'Finite rinse browser assertions');
  console.log(JSON.stringify({ assertions: report.assertions, endpointError: [report.sourceEndpointError, report.targetEndpointError], output }, null, 2));
} catch (error) {
  report.diagnostics = await page.evaluate(() => ({
    progress: [...document.querySelectorAll('progress')].map(node => ({ label: node.getAttribute('aria-label'), value: node.value })),
    rinse: window.rinseAudit?.app.getState().instrumentRinse,
    notices: [...document.querySelectorAll('[role="status"]')].map(node => node.textContent),
  })).catch(() => undefined);
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify({ error: String(error), ...report }, null, 2) + '\n');
  await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  throw error;
} finally { await browser.close(); }
