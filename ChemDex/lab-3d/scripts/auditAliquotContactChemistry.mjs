import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve('docs/research/aliquot-chemistry-2026-10-29'); await mkdir(output, { recursive: true });
const report = { errors: [], consoleErrors: [], phases: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/api/**', route => route.abort()); const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
  await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.evaluate(async () => { window.auditRoots = (await import('/node_modules/.vite/deps/@react-three_fiber.js'))._roots; });
  await page.waitForFunction(() => [...window.auditRoots.values()].some(r => r.store.getState().gl?.domElement === document.querySelector('canvas')), undefined, { timeout: 60000 });
  report.pipette = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { aspiratePipette, dispensePipette } = await import('/src/handling/instrumentOperations.ts');
    const { readInstrument } = await import('/src/handling/instrumentReadings.ts');
    const { readComposition } = await import('/src/science/balance.ts');
    store.setState({ vessels: {}, vesselIds: [], burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {},
      pipetteSample: null, inFlightPours: [], spills: {}, isSimulationPaused: true, timeScale: 1, moveMode: false, leftSidebarOpen: false, rightSidebarOpen: false });
    const sourceId = store.getState().prepareStudioProgram('hcl_naoh'); if (!sourceId) throw new Error('Prepare failed');
    const source = store.getState().vessels[sourceId], receiver = { ...source, id: 'receiver', name: 'Bình nhận', position: [2, source.position[1], 0],
      studioProgramId: undefined, contents: [], substances: [], mass_g: 0, volume_ml: 0, volume: 0, programHeatApplied_J: 0 };
    store.setState(s => ({ vessels: { ...s.vessels, receiver }, vesselIds: [...s.vesselIds, 'receiver'], selectedVesselId: sourceId }));
    const amount = (sample, formula = 'HCl') => sample?.contents.filter(c => c.formula === formula).reduce((sum, c) => sum + c.moles, 0) ?? 0;
    const inventory = () => {
      const s = store.getState(), samples = [...Object.values(s.vessels), ...s.inFlightPours.map(p => p.sample), ...Object.values(s.spills), ...(s.pipetteSample ? [s.pipetteSample] : [])];
      const atoms = {}; let mass = samples.reduce((sum, p) => sum + p.mass_g, 0);
      for (const p of samples) for (const c of p.contents ?? []) for (const [a, n] of Object.entries(readComposition(c.formula).atoms)) atoms[a] = (atoms[a] ?? 0) + n * c.moles;
      for (const v of Object.values(s.vessels)) {
        const water = (v.evaporated_ml ?? 0) - (v.wallCondensation?.returned_g ?? 0); mass += water;
        atoms.H = (atoms.H ?? 0) + 2 * water / 18.015; atoms.O = (atoms.O ?? 0) + water / 18.015;
      }
      return { mass_g: mass, atoms };
    };
    const snapshot = () => { const s = store.getState(), p = s.pipetteSample;
      return { inventory: inventory(), pipette: p && { volume_ml: p.volume_ml, mass_g: p.mass_g, temperature_c: p.temperature_c,
        acid_mol: amount(p), salt_mol: amount(p, 'NaCl'), program: p.reactionProgramId }, reading: readInstrument('pipette') }; };
    const versions = [], stop = store.subscribe(() => versions.push(inventory()));
    Object.assign(window, { aliquotAudit: { store, sourceId, inventory, snapshot, amount } });
    const before = snapshot();
    if (!aspiratePipette(5).ok) throw new Error('Aspiration failed');
    const loaded = snapshot(); await new Promise(resolve => setTimeout(resolve, 70));
    store.setState({ isSimulationPaused: false }); store.getState().tickSimulation(0.1); store.setState({ isSimulationPaused: true });
    const held = snapshot();
    if (Math.abs(held.pipette.acid_mol - loaded.pipette.acid_mol / 2) > 1e-12) throw new Error('Pipette chemistry froze');
    if (!dispensePipette(2.5, 'receiver').ok) throw new Error('Dispense failed');
    const dispensed = snapshot(); await new Promise(resolve => setTimeout(resolve, 70));
    store.setState({ isSimulationPaused: false }); store.getState().tickSimulation(0.1); store.setState({ isSimulationPaused: true });
    const remainder = snapshot(); stop();
    if (Math.abs(remainder.pipette.acid_mol - dispensed.pipette.acid_mol / 2) > 1e-12) throw new Error('Remainder chemistry froze');
    for (const v of versions) {
      if (Math.abs(v.mass_g - before.inventory.mass_g) > 1e-8) throw new Error('Non-atomic pipette mass transfer');
      for (const [a, n] of Object.entries(before.inventory.atoms)) if (Math.abs((v.atoms[a] ?? 0) - n) > 1e-10) throw new Error(`Atom ${a} changed`);
    }
    return { before, loaded, held, dispensed, remainder, observedVersions: versions.length };
  });
  await page.waitForTimeout(500); await page.screenshot({ path: path.join(output, '01-reacting-pipette.png') });
  await page.waitForTimeout(1300); await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  report.restored = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts'); store.setState({ isSimulationPaused: true });
    const before = store.getState().pipetteSample;
    if (!before) throw new Error('Reload lost held sample');
    const acid = p => p.contents.filter(c => c.formula === 'HCl').reduce((sum, c) => sum + c.moles, 0);
    await new Promise(resolve => setTimeout(resolve, 70));
    store.setState({ isSimulationPaused: false }); store.getState().tickSimulation(0.1); store.setState({ isSimulationPaused: true });
    const after = store.getState().pipetteSample;
    if (Math.abs(acid(after) - acid(before) / 2) > 1e-12) throw new Error('Restored sample did not continue');
    return { volume_ml: before.volume_ml, acidBefore_mol: acid(before), acidAfter_mol: acid(after), program: after.reactionProgramId };
  });
  if (Math.abs(report.restored.acidBefore_mol - report.pipette.remainder.pipette.acid_mol) > 1e-12) throw new Error('Reload changed composition');
  report.flight = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { traceLaunchedStream } = await import('/src/pour/physics/ballistics.ts');
    const { LAB_PHYSICS } = await import('/src/engine/interactionEngine.ts');
    store.setState({ vessels: {}, vesselIds: [], burners: {}, activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {},
      pipetteSample: null, inFlightPours: [], spills: {}, isSimulationPaused: true, timeScale: 1 });
    const id = store.getState().prepareStudioProgram('hcl_naoh'); store.getState().runStudioProgram(id);
    const trajectory = traceLaunchedStream([0, 3, 0], [0, 0, 0], null, LAB_PHYSICS.TABLE_SURFACE_Y);
    store.getState().releasePourLiquid({ id: 'flight_audit', sourceId: id, sourceName: 'Nguồn', sessionId: 'audit', targetId: null, targetPose: '', duration_s: 0.2, trajectory }, 5);
    const acid = p => p.contents.filter(c => c.formula === 'HCl').reduce((sum, c) => sum + c.moles, 0);
    const first = store.getState().inFlightPours[0], initialAcid = acid(first.sample);
    store.setState({ isSimulationPaused: false }); store.getState().advancePourTransport(0.1); store.setState({ isSimulationPaused: true });
    const next = store.getState().inFlightPours[0];
    if (Math.abs(acid(next.sample) - initialAcid / 2) > 1e-12 || Object.keys(store.getState().spills).length) throw new Error('Incorrect chemistry before first ground contact');
    window.flightAudit = { store, initialAcid, flight_s: trajectory.timeOfFlight, duration_s: 0.2 };
    return { initialAcid_mol: initialAcid, after100msAcid_mol: acid(next.sample), temperature_c: next.sample.temperature_c,
      flight_s: trajectory.timeOfFlight, duration_s: 0.2 };
  });
  await page.waitForTimeout(500); await page.screenshot({ path: path.join(output, '02-reacting-before-impact.png') });
  report.arrived = await page.evaluate(() => {
    const { store, initialAcid, flight_s, duration_s } = window.flightAudit;
    store.setState({ isSimulationPaused: false }); store.getState().advancePourTransport(1); store.setState({ isSimulationPaused: true });
    const s = store.getState(), pools = Object.values(s.spills), k = Math.LN2 / 0.1;
    const acid = pools.flatMap(p => p.contents ?? []).filter(c => c.formula === 'HCl').reduce((sum, c) => sum + c.moles, 0);
    const expected = initialAcid * (Math.exp(-k * flight_s) - Math.exp(-k * (flight_s + duration_s))) / (k * duration_s);
    if (Math.abs(acid - expected) > 1e-12 || s.inFlightPours.length) throw new Error('Arrival composition depends on end-of-frame chemistry');
    const mass = Object.values(s.vessels).reduce((sum, v) => sum + v.mass_g, 0) + pools.reduce((sum, p) => sum + p.mass_g, 0);
    if (Math.abs(mass - 30) > 1e-8) throw new Error('Flight lost sample mass');
    return { acid_mol: acid, expectedAcid_mol: expected, mass_g: mass, spill_ml: pools.reduce((sum, p) => sum + p.volume_ml, 0) };
  });
  await page.waitForTimeout(500); await page.screenshot({ path: path.join(output, '03-arrived-composition.png') });
  await context.close();
} catch (error) { report.errors.push(error.stack ?? String(error)); }
finally { await browser.close(); await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify(report, null, 2)); if (report.errors.length || report.consoleErrors.length) process.exitCode = 1;
