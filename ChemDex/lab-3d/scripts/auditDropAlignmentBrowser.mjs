import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve(process.env.LAB_DROP_OUTPUT ?? 'artifacts/drop-alignment');
const origin = process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767';
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
await page.addInitScript(() => performance.setResourceTimingBufferSize(10000));
const report = { errors: [], automatic: {}, manual: {} };
page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error' && /webgl|shader|THREE/i.test(message.text())) report.errors.push(message.text()); });

async function autoAdvance(predicate) {
  await page.evaluate(predicate => {
    const e = window.dropAudit.e, done = new Function('e', `return (${predicate})`);
    for (let i = 0; i < 9000 && !done(e); i++) window.dropAudit.tick.call(e, 1 / 60);
    if (!done(e)) throw new Error(`Did not reach ${predicate}: ${e.phase} ${e.error}`);
    e.paused = true; window.dropAudit.root.invalidate();
  }, predicate);
  await page.waitForTimeout(500);
}

try {
  await page.goto(`${origin}/?mode=auto`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Hiện danh mục tự động', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const loaded = pattern => performance.getEntriesByType('resource').map(r => r.name).findLast(name => pattern.test(name));
    const { AutoExperiment } = await import(loaded(/\/AutoExperiment\.ts(?:\?|$)/));
    window.dropAudit = { tick: AutoExperiment.prototype.tick };
    AutoExperiment.prototype.tick = function () { window.dropAudit.e = this; };
  });
  await page.getByRole('button', { name: /^HNO3 \+ KOH/ }).first().click();
  await page.waitForFunction(() => window.dropAudit.e?.id === 'hno3_koh');
  await page.evaluate(async () => {
    const loaded = pattern => performance.getEntriesByType('resource').map(r => r.name).findLast(name => pattern.test(name));
    const { _roots } = await import(loaded(/@react-three_fiber\.js(?:\?|$)/));
    const three = await import(loaded(/\/three\.js(?:\?|$)/));
    const { vesselLocalToWorld } = await import(loaded(/\/vesselScale\.ts(?:\?|$)/));
    const a = window.dropAudit;
    a.root = _roots.get(document.querySelector('#automatic-lab canvas')).store.getState();
    a.three = three;
    a.capture = () => {
      const e = a.e, d = e.donors[e.donorIndex], scene = a.root.scene;
      scene.updateMatrixWorld(true);
      const outlet = scene.getObjectByName(`auto_dropper_outlet_${e.donorIndex}`);
      const tip = outlet?.localToWorld(new three.Vector3(0, -0.06, 0)).toArray();
      const drops = scene.getObjectByName('auto_transfer_drops'), matrix = new three.Matrix4(), position = new three.Vector3();
      const points = [];
      for (let i = 0; i < (drops?.count ?? 0); i++) { drops.getMatrixAt(i, matrix); position.setFromMatrixPosition(matrix).applyMatrix4(drops.matrixWorld); points.push(position.toArray()); }
      return { phase: e.phase, elapsed: e.elapsed, phaseTime: e.phaseTime, formula: d.row.formula,
        amount_ml: d.solutionVolume_ml, mode: d.doseMode, fraction: d.fraction, tip, lip: e.donorLip,
        flight: d.dropFlight, schedule: d.dropSchedule, drawnDrops: points, streamVisible: scene.getObjectByName('auto_transfer_stream')?.visible,
        contact: e.sample.recentPourContact,
        contactWorld: e.sample.recentPourContact ? vesselLocalToWorld(e.sample, e.sample.recentPourContact.point) : null,
        receiverOrigin: e.sample.position, receiverMass_g: e.sample.mass_g };
    };
  });
  await autoAdvance("e.dropperActive && e.phaseTime >= e.donors[e.donorIndex].dropSchedule.releaseStart + e.donors[e.donorIndex].dropSchedule.flightTime * .35");
  report.automatic.falling = await page.evaluate(() => window.dropAudit.capture());
  const falling = report.automatic.falling;
  assert.equal(falling.mode, 'dropper'); assert.ok(falling.amount_ml <= 0.2);
  assert.equal(falling.fraction, 0); assert.equal(falling.drawnDrops.length, 1); assert.equal(falling.streamVisible, false);
  assert.ok(falling.tip.every((value, axis) => Math.abs(value - falling.lip[axis]) < 1e-6), 'Rendered outlet equals flight origin');
  assert.equal(falling.drawnDrops[0][0], falling.tip[0]); assert.equal(falling.drawnDrops[0][2], falling.tip[2]);
  assert.equal(falling.tip[0], falling.receiverOrigin[0]); assert.equal(falling.tip[2], falling.receiverOrigin[2]);
  assert.ok(falling.drawnDrops[0][1] > falling.flight.target[1]);
  await page.screenshot({ path: resolve(output, 'automatic-microdrop-falling.png') });
  await page.evaluate(() => { window.dropAudit.e.paused = false; });
  await autoAdvance('e.donors[e.donorIndex]?.doseMode === \'dropper\' && e.donors[e.donorIndex].fraction > 0');
  report.automatic.contact = await page.evaluate(() => window.dropAudit.capture());
  const contact = report.automatic.contact;
  assert.ok(contact.fraction > 0 && contact.fraction < 1);
  assert.ok(contact.contactWorld.every((value, axis) => Math.abs(value - falling.flight.target[axis]) < 1e-8));
  await page.screenshot({ path: resolve(output, 'automatic-microdrop-contact.png') });

  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.locator('#manual-lab canvas').waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const loaded = pattern => performance.getEntriesByType('resource').map(r => r.name).findLast(name => pattern.test(name));
    const { useAppStore: app } = await import(loaded(/\/src\/store\/useAppStore\.ts(?:\?|$)/));
    const { _roots } = await import(loaded(/@react-three_fiber\.js(?:\?|$)/));
    const three = await import(loaded(/\/three\.js(?:\?|$)/));
    const { vesselWorldLiquidSurfaceY } = await import(loaded(/\/vesselGeometry\.ts(?:\?|$)/));
    const root = _roots.get(document.querySelector('#manual-lab canvas')).store.getState();
    app.setState({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {},
      spills: {}, inFlightPours: [], isSimulationPaused: true, moveMode: false, timeScale: 0.1,
      language: 'vi', leftSidebarOpen: false, rightSidebarOpen: false });
    app.getState().addVessel('beaker', 'Mẫu lệch tâm');
    const id = app.getState().vesselIds.at(-1), volume_ml = 50;
    app.setState(s => ({ vessels: { ...s.vessels, [id]: { ...s.vessels[id], position: [1.2, 0.4, -1.3],
      capacity_ml: 100, volume_ml, volume: .5, mass_g: 50,
      substances: ['H2O'], contents: [{ formula: 'H2O', phase: 'l', mass_g: 50, moles: 50 / 18.015 }] } },
      selectedVesselId: id, rightSidebarOpen: false }));
    root.internal.subscribe({ current: ({ camera }) => { camera.position.set(3.8, 3.1, 7.4); camera.lookAt(1.2, 1, -1.3); camera.updateMatrixWorld(); } }, 0,
      root.internal.subscribers.find(s => s.store)?.store);
    window.manualDropAudit = { app, root, id, three, initialSurfaceY: app.getState().vessels[id].position[1] + vesselWorldLiquidSurfaceY(app.getState().vessels[id]) };
    app.getState().triggerPour('NaOH', id, 0.12);
    app.getState().setSimulationPaused(false);
  });
  await page.waitForFunction(() => {
    const a = window.manualDropAudit, drop = a.root.scene.getObjectByName('stock-dropper-drop');
    const outlet = a.root.scene.getObjectByName('stock-dropper-outlet');
    if (drop?.visible && outlet) {
      const tip = outlet.localToWorld(new a.three.Vector3(0, -0.125, 0));
      if (drop.position.y < tip.y - 0.15) { a.app.getState().setSimulationPaused(true); return true; }
    }
    return false;
  }, undefined, { polling: 'raf', timeout: 30000 });
  await page.waitForTimeout(150);
  report.manual.falling = await page.evaluate(() => {
    const a = window.manualDropAudit, scene = a.root.scene;
    scene.updateMatrixWorld(true);
    const outlet = scene.getObjectByName('stock-dropper-outlet'), drop = scene.getObjectByName('stock-dropper-drop');
    const tip = outlet.localToWorld(new a.three.Vector3(0, -0.125, 0)).toArray();
    return { tip, drop: drop.getWorldPosition(new a.three.Vector3()).toArray(),
      receiverPosition: a.app.getState().vessels[a.id].position, surfaceY: a.initialSurfaceY,
      receiverMass_g: a.app.getState().vessels[a.id].mass_g,
      evaporated_ml: a.app.getState().vessels[a.id].evaporated_ml ?? 0, dose: a.app.getState().pouringChemical };
  });
  const manual = report.manual.falling;
  assert.equal(manual.dose.releasedAmount, 0);
  assert.ok(Math.abs(manual.receiverMass_g + manual.evaporated_ml - 50) < 1e-8, 'Before contact the receiver only loses its tracked evaporated water');
  assert.ok(Math.abs(manual.tip[0] - manual.drop[0]) < 1e-8 && Math.abs(manual.tip[2] - manual.drop[2]) < 1e-8);
  assert.ok(manual.tip[1] > manual.drop[1] && manual.drop[1] > manual.surfaceY);
  assert.deepEqual([manual.tip[0], manual.tip[2]], [manual.receiverPosition[0], manual.receiverPosition[2]]);
  await page.screenshot({ path: resolve(output, 'manual-translated-microdrop.png') });
  await page.evaluate(async () => {
    const a = window.manualDropAudit, s = a.app.getState();
    s.clearPour();
    const loaded = pattern => performance.getEntriesByType('resource').map(r => r.name).findLast(name => pattern.test(name));
    a.operations = await import(loaded(/\/instrumentOperations\.ts(?:\?|$)/));
    s.setSimulationPaused(false); a.operations.aspiratePipette(2.5);
  });
  await page.waitForTimeout(1800);
  await page.evaluate(() => window.manualDropAudit.operations.dispensePipette(1));
  await page.waitForFunction(() => {
    const a = window.manualDropAudit, stream = a.root.scene.getObjectByName('pipette-stream');
    if (stream?.visible) { a.app.getState().setSimulationPaused(true); return true; }
    return false;
  }, undefined, { polling: 'raf', timeout: 10000 });
  await page.waitForTimeout(300);
  report.manual.handheld = await page.evaluate(() => {
    const a = window.manualDropAudit, scene = a.root.scene;
    scene.updateMatrixWorld(true);
    const outlet = scene.getObjectByName('tool-pipette-outlet'), jet = scene.getObjectByName('pipette-stream-jet');
    return { tip: outlet.localToWorld(new a.three.Vector3(0, -0.175, 0)).toArray(),
      jetEnds: [jet.localToWorld(new a.three.Vector3(0, -.5, 0)).toArray(), jet.localToWorld(new a.three.Vector3(0, .5, 0)).toArray()],
      streamVisible: scene.getObjectByName('pipette-stream').visible };
  });
  const handheld = report.manual.handheld;
  assert.ok(handheld.streamVisible);
  assert.ok(handheld.jetEnds.some(end => Math.hypot(...end.map((value, axis) => value - handheld.tip[axis])) < 1e-4), 'Handheld flow starts at the actual visible capillary outlet');
  await page.screenshot({ path: resolve(output, 'manual-handheld-outlet-flow.png') });
  assert.deepEqual(report.errors, []);
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify({ error: String(error), ...report }, null, 2) + '\n');
  await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  throw error;
} finally { await browser.close(); }
