import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const output = process.env.LAB_DRAG_OUTPUT ?? 'artifacts/stock-drag';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const report = { physics: process.env.LAB_DRAG_PHYSICS === '1', errors: [], checks: [] };
await page.routeWebSocket('**', route => {
  const server = route.connectToServer();
  server.onMessage(message => {
    let type;
    try { type = JSON.parse(String(message)).type; } catch { /* Ordinary socket payload. */ }
    if (type !== 'update' && type !== 'full-reload') route.send(message);
  });
});
page.on('pageerror', e => report.errors.push(e.stack ?? e.message));
page.on('console', m => { if (m.type() === 'error') console.log(m.text()); });
await page.addInitScript(() => {
  performance.setResourceTimingBufferSize(10000);
  window.__stockMessages = [];
  localStorage.setItem('chemlab_vfx_quality_preference', 'low');
  const send = Worker.prototype.postMessage;
  Worker.prototype.postMessage = function(message, ...rest) {
    if (message?.input?.containers) {
      window.__stockMessages.push({ direction: 'send', id: message.id, paused: message.paused,
        seconds: message.path.reduce((sum, frame) => sum + frame.seconds, 0),
        ids: message.input.containers.map(container => container.id) });
      if (!this.__auditHook) {
        this.__auditHook = true;
        this.addEventListener('message', event => window.__stockMessages.push({ direction: 'receive', id: event.data.id,
          error: event.data.error, tick: event.data.snapshot?.tick,
          grains: event.data.snapshot?.grains.map(grain => grain.vesselId) }));
      }
    }
    if (window.__delayStock && message?.input?.containers) {
      const worker = this;
      setTimeout(() => send.call(worker, message, ...rest), 180);
    } else send.call(this, message, ...rest);
  };
});
try {
  await page.goto(process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767', { waitUntil: 'domcontentloaded' });
  await page.locator('#manual-lab canvas').waitFor({ timeout: 60000 });
  await page.evaluate(async physics => {
    const loaded = pattern => performance.getEntriesByType('resource').map(r => r.name).findLast(name => pattern.test(name));
    const { useAppStore: app } = await import(loaded(/\/src\/store\/useAppStore\.ts(?:\?|$)/));
    const { _roots } = await import(loaded(/\/@react-three_fiber\.js(?:\?|$)/));
    const { Matrix4 } = await import(loaded(/\/three\.js(?:\?|$)/));
    let mounted;
    for (let attempt = 0; attempt < 300 && !mounted; attempt++) {
      mounted = [..._roots.values()].find(r => r.store.getState().gl?.domElement === document.querySelector('#manual-lab canvas'));
      if (!mounted) await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (!mounted) throw new Error('Manual scene did not finish mounting');
    app.setState({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {},
      spills: {}, inFlightPours: [], isSimulationPaused: true, timeScale: 1, leftSidebarOpen: false, rightSidebarOpen: false });
    const ids = [];
    for (const [i, formula] of ['CuSO4·5H2O', 'Fe'].entries()) {
      app.getState().addVessel('beaker', formula); const id = app.getState().vesselIds.at(-1); ids.push(id);
      app.setState(s => ({ vessels: { ...s.vessels, [id]: { ...s.vessels[id], capacity_ml: 100,
        mass_g: i ? 55 : 5, volume_ml: i ? 50 : 0, volume: i ? 0.5 : 0,
        contents: [{ formula, phase: 's', mass_g: 5, moles: 5 / (i ? 55.845 : 249.677) },
          ...(i ? [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }] : [])],
        substances: i ? [formula, 'H2O'] : [formula], position: [-2 + i * 4, -0.135, 2] } } }));
    }
    app.setState({ selectedVesselId: null, leftSidebarOpen: false, rightSidebarOpen: false });
    // CameraRig may replace the mounted camera after the first root snapshot.
    // Hit projection and scene capture must read the live canvas state.
    const root = new Proxy({}, { get: (_, property) => mounted.store.getState()[property] });
    root.internal.subscribe({ current: ({ camera }) => { camera.position.set(0, 3.2, 10); camera.lookAt(0, -0.1, 1.5); camera.updateMatrixWorld(); } }, 0,
      root.internal.subscribers.find(s => s.store)?.store);
    window.dragAudit = { app, ids, root, Matrix4 };
    window.dragAudit.capture = id => {
      const v = app.getState().vessels[id], formula = v.contents.find(c => c.phase === 's').formula;
      let mesh = root.scene.getObjectByName(`stock_solid_${id}_${formula}`);
      if (!mesh) root.scene.traverse(node => {
        if (!mesh && node.isInstancedMesh && node.parent?.name === `contact_powder_${id}_${formula}`) mesh = node;
      });
      const body = root.scene.getObjectByName(`vessel_si_body_${id}`);
      const local = [];
      if (mesh) for (let i = 0; i < mesh.count; i++) { const m = new Matrix4(); mesh.getMatrixAt(i, m); local.push(m.elements.slice(12, 15)); }
      return { id, position: v.position, body: body?.parent.position.toArray(), local,
        stockMass: v.contents.filter(c => c.phase === 's').reduce((sum, c) => sum + c.mass_g, 0),
        spills: Object.values(app.getState().spills).filter(s => s.stockMotion).length, tick: v.stockMotion?.tick,
        dragging: app.getState().draggingVesselId, inspectorOpen: app.getState().rightSidebarOpen, grains: v.stockMotion?.grains.length };
    };
    if (physics) {
      const { usePhysicsStore } = await import(loaded(/\/src\/physical\/usePhysicsStore\.ts(?:\?|$)/));
      usePhysicsStore.getState().setEnabled(true);
    }
    app.getState().setSimulationPaused(false);
  }, report.physics);
  if (process.env.LAB_DRAG_ASSEMBLY_ONLY !== '1')
    await page.waitForFunction(() => window.dragAudit.ids.every(id => window.dragAudit.app.getState().vessels[id].stockMotion?.tick >= 150), undefined, { timeout: 60000 });
  await page.getByRole('button', { name: 'Di chuyển dụng cụ', exact: true }).click();
  for (const index of process.env.LAB_DRAG_ASSEMBLY_ONLY === '1' ? [] : [0, 1]) {
    await page.evaluate(() => { const a = window.dragAudit; a.app.setState({ leftSidebarOpen: false, rightSidebarOpen: false }); window.__delayStock = true; });
    const before = await page.evaluate(index => window.dragAudit.capture(window.dragAudit.ids[index]), index);
    const screen = await page.evaluate(index => {
      const a = window.dragAudit, v = a.app.getState().vessels[a.ids[index]], rect = a.root.gl.domElement.getBoundingClientRect();
      const p = a.root.scene.position.clone().fromArray(v.position); p.y -= 0.3; p.project(a.root.camera);
      return { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2 };
    }, index);
    await page.mouse.move(screen.x, screen.y); await page.mouse.down();
    await page.waitForFunction(index => window.dragAudit.app.getState().draggingVesselId === window.dragAudit.ids[index], index);
    assert.equal(await page.evaluate(() => window.dragAudit.app.getState().rightSidebarOpen), false, 'Move mode must not open an obstructing inspector');
    const samples = [];
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(screen.x + (index ? -1 : 1) * 28 * i, screen.y - 10 * i);
      await page.waitForTimeout(40);
      samples.push(await page.evaluate(index => window.dragAudit.capture(window.dragAudit.ids[index]), index));
    }
    if (index === 1) await page.evaluate(() => window.dragAudit.app.getState().setSimulationPaused(true));
    await page.screenshot({ path: `${output}/${index ? 'wet-paused' : 'dry'}-held.png` });
    await page.mouse.up();
    await page.waitForTimeout(700);
    const after = await page.evaluate(index => window.dragAudit.capture(window.dragAudit.ids[index]), index);
    assert.equal(after.dragging, null); assert.equal(after.stockMass, 5); assert.equal(after.spills, 0);
    assert.equal(after.grains, before.grains);
    assert.ok(Math.hypot(...after.position.map((x, i) => x - before.position[i])) > 0.2, 'The actual pointer drag must move the vessel');
    for (const sample of [...samples, after]) {
      assert.equal(sample.inspectorOpen, false);
      assert.equal(sample.stockMass, 5); assert.equal(sample.spills, 0);
      assert.equal(sample.local.length, before.local.length);
      sample.local.forEach((p, i) => p.forEach((x, axis) => assert.ok(Math.abs(x - before.local[i][axis]) < 0.06,
        `Rendered stock left the vessel during drag: axis ${axis}, before ${before.local[i][axis]}, after ${x}`)));
    }
    report.checks.push({ case: index ? 'wet-paused-busy-release' : 'dry-running', before, after, samples });
    await page.screenshot({ path: `${output}/${index ? 'wet-paused' : 'dry'}-placed.png` });
    await page.evaluate(() => { window.__delayStock = false; window.dragAudit.app.getState().setSimulationPaused(false); });
  }
  if (!report.physics) {
    const linked = await page.evaluate(() => {
      const a = window.dragAudit, app = a.app;
      app.setState({ vessels: {}, vesselIds: [], spills: {}, activeKinetics: {}, isSimulationPaused: true, draggingVesselId: null });
      app.getState().addVessel('test_tube_rack', 'Rack'); const rackId = app.getState().vesselIds.at(-1);
      app.getState().addVessel('test_tube', 'Tube'); const tubeId = app.getState().vesselIds.at(-1);
      app.setState(s => ({ vessels: { [rackId]: { ...s.vessels[rackId], position: [0, -.945, 2], slottedTestTubeIds: [tubeId] },
        [tubeId]: { ...s.vessels[tubeId], position: [-.65, -.495, 2], capacity_ml: 50, mass_g: 5, volume_ml: 0, volume: 0,
          contents: [{ formula: 'CuSO4·5H2O', phase: 's', mass_g: 5, moles: 5 / 249.677 }], substances: ['CuSO4·5H2O'] } },
        vesselIds: [rackId, tubeId], selectedVesselId: null, leftSidebarOpen: false, rightSidebarOpen: false }));
      a.ids = [tubeId]; a.linked = { rackId, tubeId };
      return a.linked;
    });
    await page.waitForFunction(id => window.dragAudit.app.getState().vessels[id]?.stockMotion?.grains.length > 0, linked.tubeId, { timeout: 60000 });
    // Freeze settling before comparing carried local coordinates. Otherwise
    // free gravity between the baseline and pointer pickup measures normal
    // rearrangement rather than a failure to carry the tube with its rack.
    await page.evaluate(() => window.dragAudit.app.getState().setSimulationPaused(true));
    await page.waitForTimeout(700);
    const before = await page.evaluate(id => window.dragAudit.capture(id), linked.tubeId);
    assert.ok(before.local.length > 0, 'The linked tube must render actual solid instances');
    assert.equal(before.local.length, before.grains, 'Every physical tube grain must have a rendered instance');
    const screen = await page.evaluate(id => {
      const a = window.dragAudit, v = a.app.getState().vessels[id], rect = a.root.gl.domElement.getBoundingClientRect();
      const p = a.root.scene.position.clone().fromArray(v.position); p.x += 1; p.y -= .15; p.z += .42; p.project(a.root.camera);
      const result = { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2,
        rect: { x: rect.left, y: rect.top, width: rect.width, height: rect.height }, camera: a.root.camera.position.toArray(), world: v.position };
      window.__rackScreen = result; return result;
    }, linked.rackId);
    await page.evaluate(() => { window.__delayStock = true; });
    let rackHit = false;
    for (const dy of [-80, -60, -40, -20, 0, 20, 40, 60, 80]) for (const dx of [-80, -60, -40, -20, 0, 20, 40, 60, 80]) {
      if (rackHit) break;
      await page.mouse.move(screen.x + dx, screen.y + dy); await page.mouse.down();
      await page.waitForTimeout(35);
      rackHit = await page.evaluate(id => window.dragAudit.app.getState().draggingVesselId === id, linked.rackId);
      if (!rackHit) await page.mouse.up();
    }
    assert.equal(rackHit, true, 'The pointer must hit the rack apparatus, not the carried tube');
    const samples = [];
    for (let i = 1; i <= 6; i++) {
      await page.mouse.move(screen.x + i * 23, screen.y - i * 7);
      await page.waitForTimeout(40);
      samples.push(await page.evaluate(id => window.dragAudit.capture(id), linked.tubeId));
    }
    await page.screenshot({ path: `${output}/linked-rack-held.png` });
    await page.mouse.up(); await page.waitForTimeout(700);
    const after = await page.evaluate(id => window.dragAudit.capture(id), linked.tubeId);
    assert.ok(Math.hypot(...after.position.map((x, i) => x - before.position[i])) > .2, 'Dragging the rack must relocate its tube');
    for (const sample of [...samples, after]) {
      assert.equal(sample.stockMass, 5); assert.equal(sample.spills, 0); assert.equal(sample.grains, before.grains);
      assert.equal(sample.local.length, before.local.length);
      sample.local.forEach((p, i) => p.forEach((x, axis) => assert.ok(Math.abs(x - before.local[i][axis]) < .06,
        `Rack-carried tube stock changed its local frame: ${axis} ${before.local[i][axis]} -> ${x}`)));
    }
    report.checks.push({ case: 'rack-carries-tube-with-busy-worker', before, after, samples });
    await page.screenshot({ path: `${output}/linked-rack-placed.png` });
    await page.evaluate(() => { window.__delayStock = false; });
  }
  assert.deepEqual(report.errors, []);
  report.passed = true;
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
  console.log(JSON.stringify({ passed: true, cases: report.checks.map(c => c.case), errors: report.errors }));
} catch (error) {
  report.failure = String(error);
  report.state = await page.evaluate(() => window.dragAudit?.ids.map(id => window.dragAudit.capture(id))).catch(() => null);
  report.diagnostics = await page.evaluate(() => ({ paused: window.dragAudit?.app.getState().isSimulationPaused,
    timeScale: window.dragAudit?.app.getState().timeScale, hidden: document.hidden,
    frameloop: window.dragAudit?.root.frameloop, messages: window.__stockMessages?.slice(-12), screen: window.__rackScreen })).catch(() => null);
  console.log(JSON.stringify(report.state));
  await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
  throw error;
} finally { await browser.close(); }
