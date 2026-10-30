import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const output = path.resolve(process.env.FUNNEL_DISCHARGE_AUDIT_OUTPUT ?? 'docs/research/funnel-discharge-2026-10-30');
await mkdir(output, { recursive: true });
const report = { method: 'Real app/store discharge, source body matrix, finite transit mesh and arrival pipeline. Paused controlled ticks isolate release and flight. No calibrated Cd, priming, viscosity, rigid contact or FPS claim.', cases: [], errors: [], consoleErrors: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'low'));
  await context.route('**/api/**', r => r.abort());
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.stack ?? e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
  await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.evaluate(async () => { window.funnelRoots = (await import('/node_modules/.vite/deps/@react-three_fiber.js'))._roots; });
  await page.waitForFunction(() => [...window.funnelRoots.values()].some(r => r.store.getState().gl?.domElement === document.querySelector('canvas')), undefined, { timeout: 60000 });
  await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { PourController } = await import('/src/pour/controller/PourController.ts');
    const { calculateFunnelDischarge } = await import('/src/science/funnelDischarge.ts');
    const { advanceFunnelFlow } = await import('/src/engine/funnelFlow.ts');
    const { renderedVesselBody } = await import('/src/simulation/render/vesselBodyFrames.ts');
    const { computeMolarMass } = await import('/src/engine/ledger.ts');
    const { geometryVolume } = await import('/src/components/three/stockSolidGeometry.ts');
    const { Vector3, BufferGeometry, BufferAttribute } = await import('/node_modules/.vite/deps/three.js');
    const root = [...window.funnelRoots.values()].find(r => r.store.getState().gl?.domElement === document.querySelector('canvas')).store.getState();
    const a = { store, root };
    a.setup = (angle, full = false) => {
      store.setState(s => ({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {},
        dissolvingSubstances: {}, inFlightPours: [], spills: {}, pipetteSample: null, isSimulationPaused: true, timeScale: 1,
        pourEpoch: s.pourEpoch + 1, isPouring: false, selectedVesselId: null, leftSidebarOpen: false, rightSidebarOpen: false }));
      PourController.getSession(); store.getState().addVessel('separatory_funnel', 'Nguồn xả đáy'); store.getState().addVessel('beaker', 'Bình nhận');
      [a.sourceId, a.targetId] = Object.keys(store.getState().vessels);
      const row = (formula, mass_g, liquidLayer) => ({ formula, mass_g, moles: mass_g / computeMolarMass(formula), phase: 'l', liquidLayer });
      const sourceRows = [row('H2O', 20, 'aqueous'), row('C6H6', 8.79, 'organic')], targetRows = full ? [row('H2O', 99.999, 'aqueous')] : [];
      store.setState(s => ({ vessels: {
        [a.sourceId]: { ...s.vessels[a.sourceId], capacity_ml: 150, position: [0, 4, 0], rotationY: 0.4,
          volume_ml: 30, volume: 0.2, mass_g: 28.79, contents: sourceRows, substances: ['H2O', 'C6H6'],
          immiscibleOrganicVolume_ml: 10, immiscibleOrganicColor: '#eab431', liquidColor: '#25b5db', stopcockOpen: true, temperature_c: 25 },
        [a.targetId]: { ...s.vessels[a.targetId], capacity_ml: 100, position: [0, -0.135, 0], volume_ml: full ? 99.999 : 0,
          volume: full ? 0.99999 : 0, mass_g: full ? 99.999 : 0, contents: targetRows, substances: full ? ['H2O'] : [] } } }));
      PourController.beginPour({ sourceId: a.sourceId, targetId: a.targetId, mode: 'HAND_TILT', assist: 'low' });
      const session = PourController.getSession(); session.sourcePos = [0, 4, 0]; session.tilt = angle; session.sourceRotationZ = -angle; session.targetTilt = angle;
    };
    a.inventory = () => {
      const state = store.getState(), parts = [...Object.values(state.vessels), ...state.inFlightPours.map(p => p.sample), ...Object.values(state.spills)];
      const moles = {}; for (const p of parts) for (const row of p.contents) moles[row.formula] = (moles[row.formula] ?? 0) + row.moles;
      // The nearly full open water receiver also evaporates during the real
      // thermal tick. Retain its independently reported non-bulk water budget;
      // widening a liquid-only conservation tolerance would hide that sink.
      const evaporatedWater_g = Object.values(state.vessels).reduce((s, v) => s + (v.evaporated_ml ?? 0) - (v.wallCondensation?.returned_g ?? 0), 0);
      moles.H2O = (moles.H2O ?? 0) + evaporatedWater_g / computeMolarMass('H2O');
      return { mass_g: parts.reduce((s, p) => s + p.mass_g, 0) + evaporatedWater_g,
        volume_ml: parts.reduce((s, p) => s + p.volume_ml, 0) + evaporatedWater_g, evaporatedWater_g, moles };
    };
    a.snapshot = () => {
      const state = store.getState(), source = state.vessels[a.sourceId], target = state.vessels[a.targetId], body = renderedVesselBody(a.sourceId);
      if (!body) return null;
      const up = new Vector3(0, 1, 0).transformDirection(body.matrixWorld.clone().invert());
      const discharge = calculateFunnelDischarge(source, up.toArray());
      const parcels = state.inFlightPours.filter(p => p.sourceId === a.sourceId).map(p => ({ volume_ml: p.sample.volume_ml,
        mass_g: p.sample.mass_g, organicVolume_ml: p.sample.organicVolume_ml, elapsed_s: p.elapsed_s, duration_s: p.duration_s,
        trajectory: p.trajectory, releaseBasis: p.releaseBasis, phase: p.sample.contents.map(r => r.formula) }));
      const stream = root.scene.getObjectByName('finite_air_stream');
      let renderedVolume_ml = 0;
      if (stream?.geometry.drawRange.count) {
        const g = new BufferGeometry(); g.setAttribute('position', stream.geometry.attributes.position);
        const start = stream.geometry.drawRange.start, end = start + stream.geometry.drawRange.count;
        g.setIndex(new BufferAttribute(stream.geometry.index.array.slice(start, end), 1));
        renderedVolume_ml = geometryVolume(g) * 3.5 ** 3;
        // Position is borrowed from the live mesh; only the temporary index
        // belongs to this audit geometry. No renderer uses this temporary g.
        g.dispose();
      }
      return { angle: Math.atan2(Math.hypot(up.x, up.z), up.y), discharge, source: structuredClone(source), target: structuredClone(target), parcels,
        transit: stream ? { visible: stream.visible, vertices: stream.geometry.attributes.position?.count,
          drawn: stream.geometry.drawRange.count, volume_ml: renderedVolume_ml } : null,
        legacyBeam: !!root.scene.getObjectByName(`funnel_stream_${a.sourceId}`), stopperPresent: !!root.scene.getObjectByName(`separatory_stopper_${a.sourceId}`), inventory: a.inventory() };
    };
    a.release = dt => {
      const before = a.snapshot(), up = new Vector3(0, 1, 0).transformDirection(renderedVesselBody(a.sourceId).matrixWorld.clone().invert());
      const predicted = advanceFunnelFlow(store.getState().vessels[a.sourceId], null, dt, up.toArray());
      store.setState({ isSimulationPaused: false }); store.getState().tickSimulation(dt); store.setState({ isSimulationPaused: true });
      return { before, predicted_ml: predicted.moved_ml, meanDischarge: predicted.discharge, after: a.snapshot() };
    };
    a.advance = dt => { store.setState({ isSimulationPaused: false }); store.getState().advancePourTransport(dt); store.setState({ isSimulationPaused: true }); root.invalidate(); };
    a.changeFlight = mode => store.setState(s => ({ vessels: { ...s.vessels,
      ...(mode === 'close' ? { [a.sourceId]: { ...s.vessels[a.sourceId], stopcockOpen: false } } : {}),
      ...(mode === 'seal' ? { [a.sourceId]: { ...s.vessels[a.sourceId], isSealed: true } } : {}),
      ...(mode === 'move' ? { [a.targetId]: { ...s.vessels[a.targetId], position: [3, -0.135, 0] } } : {}) } }));
    window.funnelDischargeAudit = a;
  });
  const conserved = (before, after) => {
    for (const key of ['mass_g', 'volume_ml']) if (Math.abs(before[key] - after[key]) > 1e-7) throw new Error(`Inventory ${key}: ${JSON.stringify({ before, after })}`);
    for (const key of Object.keys(before.moles)) if (Math.abs(before.moles[key] - (after.moles[key] ?? 0)) > 1e-9) throw new Error(`Moles ${key}`);
  };
  for (const [name, angle, full] of [['upright', 0, false], ['mixed-port', 1.08, false], ['dry-port', Math.PI, false], ['receiver-overflow', 0, true], ['target-moved', 0, false], ['sealed-source', 0, false]]) {
    await page.evaluate(([angle, full]) => window.funnelDischargeAudit.setup(angle, full), [angle, full]);
    if (name === 'sealed-source') await page.evaluate(() => window.funnelDischargeAudit.changeFlight('seal'));
    await page.waitForFunction(angle => { const s = window.funnelDischargeAudit.snapshot(); return s && Math.abs(s.angle - angle) < 1e-8; }, angle, { timeout: 60000 });
    await page.waitForTimeout(70); // Store's real 50-ms commit cadence; not a process poll.
    const release = await page.evaluate(() => window.funnelDischargeAudit.release(0.005));
    if (release.after.legacyBeam) throw new Error('Unmetered source beam remains');
    if (release.before.stopperPresent !== (name === 'sealed-source')) throw new Error(`Stopper visual disagrees with vessel seal ${name}`);
    conserved(release.before.inventory, release.after.inventory);
    const expected = release.predicted_ml;
    const released = release.after.parcels.reduce((s, p) => s + p.volume_ml, 0);
    const nonBulk = v => (v.evaporated_ml ?? 0) - (v.wallCondensation?.returned_g ?? 0);
    const targetBaseline = release.before.target.volume_ml - nonBulk(release.after.target) + nonBulk(release.before.target);
    if (Math.abs(released - expected) > 1e-7 || Math.abs(release.after.target.volume_ml - targetBaseline) > 1e-9)
      throw new Error(`Release mismatch ${name}: ${JSON.stringify({released, expected, targetBefore:release.before.target.volume_ml, targetAfter:release.after.target.volume_ml, targetBaseline})}`);
    if (name === 'dry-port' && released !== 0) throw new Error('Dry port released liquid');
    if (name === 'mixed-port' && !(release.after.parcels[0]?.organicVolume_ml > 0 && release.after.parcels[0].organicVolume_ml < released)) throw new Error('Mixed port lost a phase');
    let inFlight = null, arrival = null, quality = [];
    if (released > 0) {
      if (name === 'upright') await page.evaluate(() => window.funnelDischargeAudit.changeFlight('close'));
      const tof = release.after.parcels[0].trajectory.timeOfFlight;
      await page.evaluate(dt => window.funnelDischargeAudit.advance(dt), tof / 2);
      await page.waitForFunction(() => {
        const mesh = window.funnelDischargeAudit.root.scene.getObjectByName('finite_air_stream');
        return mesh?.visible && mesh.geometry.drawRange.count > 0;
      }, undefined, { timeout: 60000 });
      inFlight = await page.evaluate(() => window.funnelDischargeAudit.snapshot());
      if (inFlight.target.volume_ml !== release.after.target.volume_ml || !inFlight.parcels.length) throw new Error(`Premature receipt ${name}`);
      if (!inFlight.transit?.visible || !(inFlight.transit.drawn > 0) || !(inFlight.transit.volume_ml > 0)) throw new Error(`Finite flight not rendered ${name}: ${JSON.stringify(inFlight.transit)}`);
      if (Math.abs(inFlight.transit.volume_ml / released - 1) > 1e-5) throw new Error(`Flight mesh volume mismatch ${name}`);
      for (const tier of ['low', 'medium', 'high', 'ultra']) {
        await page.evaluate(async tier => { const { useQualityStore } = await import('/src/vfx/quality.ts'); useQualityStore.getState().setPreference(tier); await new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))); }, tier);
        const s = await page.evaluate(() => window.funnelDischargeAudit.snapshot()); conserved(inFlight.inventory, s.inventory);
        if (!s.transit?.visible || Math.abs(s.transit.volume_ml / released - 1) > 1e-5) throw new Error(`Quality changed finite mesh ${name} ${tier}`);
        quality.push({ tier, transit: s.transit });
      }
      await page.screenshot({ path: path.join(output, `${name}-flight.png`) });
      if (name === 'target-moved') await page.evaluate(() => window.funnelDischargeAudit.changeFlight('move'));
      await page.evaluate(() => window.funnelDischargeAudit.advance(3));
      await page.waitForTimeout(80);
      arrival = await page.evaluate(() => window.funnelDischargeAudit.snapshot()); conserved(release.before.inventory, arrival.inventory);
      if (name === 'upright' && Math.abs(arrival.target.volume_ml - released) > 1e-8) throw new Error('Upright jet missed aligned receiver');
      if (name === 'receiver-overflow' && Math.abs(arrival.target.volume_ml - 100) > 1e-8) throw new Error('Receiver capacity ignored');
      if (name === 'target-moved' && arrival.target.volume_ml !== 0) throw new Error('Jet teleported to moved receiver');
    }
    report.cases.push({ name, angle, release, inFlight, quality, arrival });
  }
  await context.close();
} catch (e) { report.errors.push(e.stack ?? String(e)); process.exitCode = 1; }
finally { await browser.close(); await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n'); }
if (report.errors.length || report.consoleErrors.length) process.exitCode = 1;
console.log(JSON.stringify({ cases: report.cases.length, errors: report.errors, consoleErrors: report.consoleErrors }, null, 2));
