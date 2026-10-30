import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const lab = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(lab, 'docs/research/flocculation-2026-10-29');
const origin = process.env.LAB_FLOC_ORIGIN || 'http://127.0.0.1:6773';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { checkedAt: new Date().toISOString(), errors: [], consoleErrors: [], snapshots: [],
  method: 'Real Beaker and PhysicalSimulationRenderer; pre-existing finite precipitates, fixed 120 Hz population integration, 4x simulation clock. Mean-population coefficients are illustrative. No FPS or experimentally calibrated settling claim. Browser predicates are synchronous.' };
try {
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  await context.route('**/api/**', route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => { if (m.type() === 'error') report.consoleErrors.push(m.text()); });
  await page.goto(`${origin}/scripts/fixtures/appearance.html`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.appearanceReady);
  const setup = await page.evaluate(() => {
    const specimens = ['Cu(OH)2', 'Cu(OH)2', 'Fe(OH)3', 'Fe(OH)3', 'AgCl', 'AgCl']
      .map(formula => ({ formula, mode: 'product', grams: 0.6, agitation: 0.65 }));
    const setup = window.renderSpecimens(specimens);
    window.specimenStore.setState({ timeScale: 4 });
    return setup;
  });
  report.setup = setup;
  let expectedMasses = Object.fromEntries(setup.vessels.map(v => [v.id, 0.6]));
  async function at(seconds, name) {
    await page.waitForFunction(seconds => {
      const samples = window.inspectSpecimens();
      return samples.length === 6 && samples.every(v => v.systems.length === 1 && v.systems[0].clock.integratedTime_s >= seconds);
    }, seconds, { timeout: 60000 });
    const snapshot = await page.evaluate(() => window.inspectSpecimens());
    for (const v of snapshot) for (const s of v.systems) {
      const mass = s.flocculation.suspended.solidMass_g + s.flocculation.settled.solidMass_g;
      if (Math.abs(s.representedMass_g - expectedMasses[v.id]) > 1e-9 || Math.abs(mass - expectedMasses[v.id]) > 1e-9) throw new Error(`Population mass drift ${v.id}: ${mass}`);
    }
    report.snapshots.push({ name, seconds, snapshot });
    await page.screenshot({ path: path.join(output, `${name}.png`) });
  }
  await at(1, '01-new-flocs');
  await at(8, '02-moderate-stirring');
  await page.evaluate(() => {
    Object.keys(window.specimenStore.getState().vessels).forEach((id, index) => {
      window.specimenStore.getState().setVesselState(id, { stirringIntensity: index % 2 ? 0.95 : 0.3 });
    });
  });
  await at(20, '03-gentle-vigorous-pairs');
  const shear = report.snapshots.at(-1).snapshot.flatMap(v => v.systems.map(s => s.flocculation.lastAppliedShear_s_1));
  if (shear.some((g, i) => Math.abs(g - (i % 2 ? 72.2 : 7.2)) > 1e-8)) throw new Error(`Incorrect stirring strength: ${shear}`);
  // Author a finite outflow receipt for removal of 90% of suspended material,
  // retaining the bed, followed by clear-water refill to the original volume.
  // This changes inventory; it does not manually edit aggregate counts or N.
  report.withdrawRefill = await page.evaluate(() => {
    const samples = window.inspectSpecimens();
    return samples.map(sample => {
      const v = window.specimenStore.getState().vessels[sample.id], system = sample.systems[0];
      const removed_g = system.flocculation.suspended.solidMass_g * 0.9;
      const contents = v.contents.map(c => c.formula === system.formula && c.phase === 's'
        ? { ...c, mass_g: c.mass_g - removed_g, moles: c.moles * (c.mass_g - removed_g) / c.mass_g } : c);
      const remaining_g = contents.filter(c => c.formula === system.formula && c.phase === 's').reduce((sum, c) => sum + c.mass_g, 0);
      window.specimenStore.getState().setVesselState(v.id, { contents, mass_g: 30 + remaining_g,
        precipitateAmount_g: remaining_g, stirringIntensity: 0.95,
        precipitateOutflow_g: { ...v.precipitateOutflow_g, [system.formula]: (v.precipitateOutflow_g?.[system.formula] ?? 0) + removed_g } });
      return { id: v.id, removed_g, remaining_g, beforeN: system.flocculation.properties.meanPrimaryCount };
    });
  });
  expectedMasses = Object.fromEntries(report.withdrawRefill.map(row => [row.id, row.remaining_g]));
  await at(32, '04-refill-then-breakage');
  report.netBreakageObserved = report.snapshots.at(-1).snapshot.some((v, i) =>
    v.systems[0].flocculation.properties.meanPrimaryCount < report.withdrawRefill[i].beforeN * 0.9);
  if (!report.netBreakageObserved) throw new Error('No net breakup observed after finite withdrawal/refill');
  await page.evaluate(() => window.specimenStore.getState().setStirringVesselId(Object.keys(window.specimenStore.getState().vessels)[0]));
  await page.waitForFunction(() => !!window.specimenScene.getObjectByName('stirring-rod'));
  await page.waitForTimeout(200);
  await page.evaluate(() => window.specimenStore.setState({ isSimulationPaused: true }));
  const rodPose = await page.evaluate(() => {
    const rod = window.specimenScene.getObjectByName('stirring-rod');
    return JSON.stringify({ position: rod.position.toArray(), rotation: rod.rotation.toArray() });
  });
  const frozen = await page.evaluate(() => JSON.stringify(window.inspectSpecimens()));
  await page.waitForTimeout(500);
  if (await page.evaluate(() => JSON.stringify(window.inspectSpecimens())) !== frozen) throw new Error('Population moved during pause');
  const rodAfter = await page.evaluate(() => {
    const rod = window.specimenScene.getObjectByName('stirring-rod');
    return JSON.stringify({ position: rod.position.toArray(), rotation: rod.rotation.toArray() });
  });
  if (rodAfter !== rodPose) throw new Error('Stirring rod moved during pause');
  report.rodPauseStable = true;
  report.pauseStable = true;
  await context.close();

  // Exercise the actual inspector and button-to-fluid connection, with no fixture override.
  const ui = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await ui.route('**/api/**', route => route.abort());
  const main = await ui.newPage();
  main.on('pageerror', e => report.errors.push(`UI: ${e.message}`));
  await main.goto(origin, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await main.waitForSelector('canvas', { timeout: 60000 });
  report.uiSetup = await main.evaluate(async () => {
    const { useAppStore } = await import('/src/store/useAppStore.ts');
    const { effects } = await import('/src/vfx/vesselEffects.ts');
    const { useQualityStore } = await import('/src/vfx/quality.ts');
    const { SimulationEngine } = await import('/src/simulation/core/SimulationEngine.ts');
    useQualityStore.getState().setPreference('medium');
    for (const id of Object.keys(useAppStore.getState().vessels)) useAppStore.getState().removeVessel(id);
    const id = useAppStore.getState().prepareStudioProgram('fecl3_naoh');
    if (!id || !useAppStore.getState().runStudioProgram(id)) throw new Error('Could not prepare live precipitation');
    const v = useAppStore.getState().vessels[id];
    useAppStore.getState().updateVesselPosition(id, [-2, v.position[1], 0]);
    useAppStore.setState({ selectedVesselId: id, leftSidebarOpen: false, rightSidebarOpen: true });
    Object.assign(window, { flocStore: useAppStore, flocEffects: effects.forVessel(id), flocId: id,
      flocQuality: useQualityStore, flocManager: () => SimulationEngine.findManager(id) });
    return { id };
  });
  await main.waitForFunction(() => (window.flocEffects.inspect().state?.flocculation?.length ?? 0) > 0, undefined, { timeout: 30000 });
  report.ui = [];
  for (const [value, expectedG] of [['0.3', 7.2], ['0.65', 33.8], ['0.95', 72.2]]) {
    await main.getByRole('combobox', { name: /Mức khuấy|Stirring strength/ }).selectOption(value);
    await main.getByTitle(/Khuấy đều bằng đũa thủy tinh|Stir with glass rod/).click();
    await main.waitForFunction(expected => window.flocEffects.inspect().state.flocculation.some(s => Math.abs(s.lastAppliedShear_s_1 - expected) < 1e-8), expectedG);
    report.ui.push(await main.evaluate(() => ({ intensity: window.flocStore.getState().vessels[window.flocId].stirringIntensity,
      active: window.flocStore.getState().stirringVesselId === window.flocId,
      flocculation: window.flocEffects.inspect().state.flocculation })));
  }
  await main.screenshot({ path: path.join(output, '05-live-stirring-control.png') });
  await main.evaluate(() => {
    window.flocStore.setState({ isSimulationPaused: true });
    window.savedFlocManager = window.flocManager();
    window.savedFlocState = JSON.stringify(window.flocEffects.inspect().state.flocculation);
    window.flocQuality.getState().setPreference('low');
  });
  await main.waitForFunction(() => window.flocManager()?.maxPrecipitateParticles === 260);
  report.qualityHistoryStable = await main.evaluate(() => window.savedFlocManager === window.flocManager()
    && window.savedFlocState === JSON.stringify(window.flocEffects.inspect().state.flocculation));
  if (!report.qualityHistoryStable) throw new Error('Quality change reset population history');
  await ui.close();
} catch (e) { report.errors.push(e.stack || String(e)); process.exitCode = 1; }
finally {
  await browser.close();
  await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n');
}
if (report.errors.length || report.consoleErrors.length) process.exitCode = 1;
console.log(JSON.stringify({ phases: report.snapshots.length, pauseStable: report.pauseStable,
  uiStrengths: report.ui?.length, errors: report.errors, consoleErrors: report.consoleErrors }, null, 2));
