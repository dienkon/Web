import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const output = path.resolve(process.env.REACTION_AUDIT_OUTPUT ?? 'docs/research/reaction-continuation-2026-10-29');
await mkdir(output, { recursive: true });
const report = { errors: [], consoleErrors: [], scenarios: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.route('**/api/**', route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('net::ERR_FAILED')) report.consoleErrors.push(message.text());
  });
  await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773', { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.evaluate(async () => { window.auditRoots = (await import('/node_modules/.vite/deps/@react-three_fiber.js'))._roots; });
  await page.waitForFunction(() => [...window.auditRoots.values()].some(r => r.store.getState().gl?.domElement === document.querySelector('canvas')),
    undefined, { timeout: 60000 });
  for (const mode of ['direct', 'flight', 'pipette']) {
    const result = await page.evaluate(async mode => {
      const { useAppStore: store } = await import('/src/store/useAppStore.ts');
      const { aspiratePipette } = await import('/src/handling/instrumentOperations.ts');
      const { useInstrumentStore } = await import('/src/handling/instrumentState.ts');
      const { readComposition } = await import('/src/science/balance.ts');
      store.setState({ vessels: {}, vesselIds: [], burners: {}, activeKinetics: {}, pendingReactions: {},
        dissolvingSubstances: {}, inFlightPours: [], spills: {}, isSimulationPaused: true, timeScale: 1,
        leftSidebarOpen: false, rightSidebarOpen: false, moveMode: false });
      const id = store.getState().prepareStudioProgram('hcl_naoh');
      if (!id || !store.getState().runStudioProgram(id)) throw new Error('Cannot prepare/start sample');
      const targetId = 'audit_receiver', source = store.getState().vessels[id];
      store.setState(s => ({ vessels: { ...s.vessels, [targetId]: { ...source, id: targetId, name: 'Bình nhận',
        position: [3, source.position[1], 0], contents: [], substances: [], volume_ml: 0, volume: 0, mass_g: 0,
        studioProgramId: undefined, programHeatApplied_J: 0 } }, vesselIds: [...s.vesselIds, targetId] }));
      const tick = dt => { store.setState({ isSimulationPaused: false }); store.getState().tickSimulation(dt); store.setState({ isSimulationPaused: true }); };
      const amount = v => v.contents.filter(c => c.formula === 'HCl').reduce((sum, c) => sum + c.moles, 0);
      const inventory = () => {
        const s = store.getState(), pipette = s.pipetteSample;
        const samples = [...Object.values(s.vessels), ...s.inFlightPours.map(p => p.sample), ...(pipette ? [pipette] : [])];
        const atoms = {};
        for (const v of samples) for (const c of v.contents) for (const [a, n] of Object.entries(readComposition(c.formula).atoms)) atoms[a] = (atoms[a] ?? 0) + n * c.moles;
        let vapor = 0;
        for (const v of Object.values(s.vessels)) {
          const lost = (v.evaporated_ml ?? 0) - (v.wallCondensation?.returned_g ?? 0); vapor += lost;
          atoms.H = (atoms.H ?? 0) + lost * 2 / 18.015; atoms.O = (atoms.O ?? 0) + lost / 18.015;
        }
        return { mass_g: samples.reduce((sum, v) => sum + v.mass_g, vapor), atoms };
      };
      store.getState().setPipetteSample(null);
      await new Promise(resolve => setTimeout(resolve, 70));
      tick(0.1);
      const initial = inventory(), previous = store.getState().activeKinetics[id].progress;
      const volume = store.getState().vessels[id].volume_ml / 2;
      if (mode === 'direct') store.getState().transferLiquidContinuous(id, targetId, volume);
      else if (mode === 'flight') store.getState().releasePourLiquid({ id: 'audit_drop', sessionId: 'audit', sourceId: id,
        sourceName: source.name, targetId: null, targetPose: '', duration_s: 0.1,
        trajectory: { exitPos: [0, 4, 0], exitVel: [0, 0, 0], impactPos: [0, -1.175, 0], landingKind: 'table',
          targetVesselId: null, timeOfFlight: 1 } }, volume);
      else { store.setState({ selectedVesselId: id }); if (!aspiratePipette(5).ok) throw new Error('Aspiration failed'); }
      const afterWithdrawal = store.getState(), acid = amount(afterWithdrawal.vessels[id]), heat = afterWithdrawal.vessels[id].programHeatApplied_J;
      if (afterWithdrawal.activeKinetics[id]?.progress !== previous) throw new Error(`${mode}: lost/reset kinetics`);
      // Production store batches commits at 20 Hz. Let that real gate elapse
      // while paused, without replacing performance.now or injecting test flags.
      await new Promise(resolve => setTimeout(resolve, 70));
      tick(0.1);
      const after = store.getState(), final = inventory(), remainingAcid = amount(after.vessels[id]);
      if (Math.abs(remainingAcid - acid / 2) > 1e-12) throw new Error(`${mode}: source did not halve remaining acid ${JSON.stringify({acid,remainingAcid,previous,progress:after.activeKinetics[id],volume:after.vessels[id].volume_ml})}`);
      if (Math.abs(final.mass_g - initial.mass_g) > 1e-8) throw new Error(`${mode}: mass changed`);
      for (const [a, n] of Object.entries(initial.atoms)) if (Math.abs((final.atoms[a] ?? 0) - n) > 1e-10) throw new Error(`${mode}: ${a} changed`);
      return { mode, previousProgress: previous, progress: after.activeKinetics[id].progress,
        acidBefore_mol: acid, acidAfter_mol: remainingAcid, newHeat_J: after.vessels[id].programHeatApplied_J - heat,
        initial, final, inFlight_ml: after.inFlightPours.reduce((sum, p) => sum + p.sample.volume_ml, 0) };
    }, mode);
    report.scenarios.push(result);
    await page.waitForTimeout(500);
    await page.screenshot({ path: path.join(output, `${mode}.png`) });
  }
  await context.close();
} catch (error) { report.errors.push(error.stack ?? String(error)); }
finally { await browser.close(); await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n'); }
console.log(JSON.stringify(report, null, 2));
if (report.errors.length || report.consoleErrors.length) process.exitCode = 1;
