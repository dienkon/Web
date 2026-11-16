import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve(process.env.LAB_OPERATIONS_OUTPUT ?? 'artifacts/lab-operations');
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
    app.setState({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {},
      isSimulationPaused: true, isPouring: false, isMixing: false, moveMode: false, draggingVesselId: null,
      leftSidebarOpen: false, rightSidebarOpen: false, language: 'vi', wasteMass_g: 0, wasteContents: [] });
    const point = [0, -1.155, 3];
    app.getState().addSpill(point, 100, ['H2O'], '#6ec6ff', 'Kiểm tra bọt biển', 100,
      [{ formula: 'H2O', phase: 'l', mass_g: 100, moles: 100 / 18.015 }]);
    const originalWipe = app.getState().wipeSpillAt, calls = [];
    app.setState({ wipeSpillAt: (position, radius) => { calls.push({ position, radius }); originalWipe(position, radius); } });
    const root = mounted.store;
    root.getState().internal.subscribe({ current: ({ camera }) => {
      camera.position.set(0, 6, 13); camera.lookAt(0, -1, 2); camera.updateMatrixWorld();
    } }, 0, root);
    app.getState().setActiveTool('sponge');
    const pointerEvents = [];
    root.getState().gl.domElement.addEventListener('pointerdown', event => {
      const live = root.getState(), rect = live.gl.domElement.getBoundingClientRect();
      const ray = new three.Raycaster();
      ray.setFromCamera(new three.Vector2((event.clientX - rect.left) / rect.width * 2 - 1,
        1 - (event.clientY - rect.top) / rect.height * 2), live.camera);
      const hit = ray.ray.intersectPlane(new three.Plane(new three.Vector3(0, 1, 0), 1.175), new three.Vector3());
      pointerEvents.push({ x: event.clientX, y: event.clientY, button: event.button, hit: hit?.toArray(), tool: app.getState().activeTool });
    });
    window.__operationsAudit = { app, root, three, calls, point, originalWipe, pointerEvents };
  });
  await page.waitForFunction(() => {
    const a = window.__operationsAudit, scene = a.root.getState().scene;
    let spongeMounted = false;
    scene.traverse(node => { if (node.material?.color?.getHexString() === 'facc15') spongeMounted = true; });
    return spongeMounted && a.root.getState().camera.position.distanceTo(new a.three.Vector3(0, 6, 13)) < 1e-8;
  });
  const point = await page.evaluate(() => {
    const a = window.__operationsAudit, root = a.root.getState(), canvas = root.gl.domElement.getBoundingClientRect();
    const p = new a.three.Vector3(...a.point).project(root.camera);
    return { x: canvas.left + (p.x + 1) * canvas.width / 2, y: canvas.top + (1 - p.y) * canvas.height / 2 };
  });
  report.pointer = point;
  await page.mouse.move(point.x, point.y);
  await page.mouse.click(point.x, point.y);
  await page.waitForTimeout(150);
  report.sponge = await page.evaluate(() => {
    const a = window.__operationsAudit, s = a.app.getState();
    return { calls: structuredClone(a.calls), pointerEvents: structuredClone(a.pointerEvents), wasteMass_g: s.wasteMass_g,
      remainingMass_g: Object.values(s.spills).reduce((sum, spill) => sum + spill.mass_g, 0) };
  });
  report.assertions.onePrimaryClickOneWipe = report.sponge.calls.length === 1;
  report.assertions.cleanupPreservesMass = report.sponge.wasteMass_g > 0 && report.sponge.remainingMass_g > 0
    && Math.abs(report.sponge.wasteMass_g + report.sponge.remainingMass_g - 100) < 1e-8;
  await page.mouse.click(point.x, point.y, { button: 'right' });
  report.assertions.secondaryClickDoesNotWipe = await page.evaluate(() => window.__operationsAudit.calls.length === 1);
  await page.screenshot({ path: resolve(output, '01-single-sponge-wipe.png') });
  await page.evaluate(() => {
    const a = window.__operationsAudit;
    a.app.setState({ wipeSpillAt: a.originalWipe, activeTool: 'none', rightSidebarOpen: true });
    const shell = (id, type, contents) => ({ id, name: id, type, capacity_ml: 100, position: [id === 'filter' ? -2 : 1, -.135, 0],
      rotationY: 0, isLocked: false, volume_ml: 0, volume: 0, temperature_c: 25, ph: 7,
      contents, substances: [...new Set(contents.map(row => row.formula))], mass_g: contents.reduce((sum, row) => sum + row.mass_g, 0),
      hasGas: false, hasPrecipitate: false, isBoiling: false });
    const powder = { formula: 'PbI2', phase: 's', mass_g: .02, moles: .02 / 461.01,
      solidOrigin: 'precipitate', precipitateFormation: 'FINE_POWDER' };
    const plate = { ...powder, mass_g: .03, moles: .03 / 461.01, precipitateFormation: 'CRYSTAL_PLATE', location: 'filter' };
    const filter = { ...shell('filter', 'filter_funnel', [plate]), filterPaperResidue_g: .03, residueReceiverId: 'receiver' };
    const receiver = shell('receiver', 'watch_glass', [powder]);
    a.app.setState({ vessels: { filter, receiver }, vesselIds: ['filter', 'receiver'], selectedVesselId: 'filter',
      activeKinetics: {}, pendingReactions: {}, spills: {}, inFlightPours: [] });
  });
  await page.getByRole('button', { name: 'Thu hồi cặn trên giấy lọc', exact: true }).click();
  report.filter = await page.evaluate(() => {
    const s = window.__operationsAudit.app.getState();
    return { source: structuredClone(s.vessels.filter), receiver: structuredClone(s.vessels.receiver) };
  });
  report.assertions.filterRecoveryPreservesBothForms = report.filter.receiver.contents.some(row => row.precipitateFormation === 'FINE_POWDER' && Math.abs(row.mass_g - .02) < 1e-10)
    && report.filter.receiver.contents.some(row => row.precipitateFormation === 'CRYSTAL_PLATE' && Math.abs(row.mass_g - .03) < 1e-10);
  report.assertions.filterRecoveryConservesMass = report.filter.source.filterPaperResidue_g === 0
    && Math.abs(report.filter.source.mass_g) < 1e-10 && Math.abs(report.filter.receiver.mass_g - .05) < 1e-10;
  await page.screenshot({ path: resolve(output, '02-distinct-recovered-crystals.png') });

  await page.evaluate(() => {
    const a = window.__operationsAudit;
    const id = a.app.getState().prepareStudioProgram('cuoh2_decomp');
    a.app.setState({ selectedVesselId: id, rightSidebarOpen: true, isSimulationPaused: true });
    a.preparedId = id;
  });
  const prepared = page.getByRole('region', { name: 'Chạy mẫu đã chuẩn bị', exact: true });
  await prepared.waitFor();
  await prepared.getByRole('button', { name: 'Kiểm tra điều kiện và chạy mẫu', exact: true }).click();
  report.assertions.coldSpecimenExplainsConditions = await page.evaluate(() => {
    const a = window.__operationsAudit, s = a.app.getState();
    return s.isSimulationPaused && !s.activeKinetics[a.preparedId];
  }) && /60/.test(await prepared.textContent());
  report.preparedBefore = await page.evaluate(() => {
    const a = window.__operationsAudit, s = a.app.getState();
    return { id: a.preparedId, ids: [...s.vesselIds], mass_g: s.vessels[a.preparedId].mass_g };
  });
  await page.evaluate(() => {
    const a = window.__operationsAudit;
    a.app.getState().setVesselState(a.preparedId, { temperature_c: 65 });
  });
  await prepared.getByRole('button', { name: 'Kiểm tra điều kiện và chạy mẫu', exact: true }).click();
  report.preparedAfter = await page.evaluate(() => {
    const a = window.__operationsAudit, s = a.app.getState(), program = s.activeKinetics[a.preparedId]?.program?.id;
    const result = { ids: [...s.vesselIds], program, paused: s.isSimulationPaused,
      baselineMass_g: s.activeKinetics[a.preparedId]?.initialVesselBaseline?.mass_g,
      mass_g: s.vessels[a.preparedId].mass_g };
    s.setSimulationPaused(true); return result;
  });
  report.assertions.warmedSpecimenStartsWithoutDuplicate = report.preparedAfter.program === 'cuoh2_decomp'
    && !report.preparedAfter.paused && JSON.stringify(report.preparedBefore.ids) === JSON.stringify(report.preparedAfter.ids)
    && Math.abs(report.preparedBefore.mass_g - report.preparedAfter.baselineMass_g) < 1e-8;
  await page.screenshot({ path: resolve(output, '03-existing-specimen-started.png') });
  report.assertions.noRuntimeErrors = report.errors.length === 0;
  assert.ok(Object.values(report.assertions).every(Boolean), JSON.stringify(report.assertions));
  console.log(JSON.stringify(report.assertions, null, 2));
} finally {
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
