import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const lab = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(lab, 'docs/research/stock-product-appearance-2026-10-28');
const origin = process.env.LAB_APPEARANCE_ORIGIN || 'http://127.0.0.1:6773';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { checkedAt: new Date().toISOString(), origin, screenshots: [], errors: [], consoleErrors: [],
  blockedRequests: [], expectedBlockedNetworkErrors: [],
  method: 'Actual Beaker, RealisticLiquid, SolidContentsRenderer and PhysicalSimulationRenderer in a development-only fixture. All current stock identities and precipitate profiles visited; stock solids shown at 5 g except 0.05 g alkali metals, liquids at 30 mL, 50 mL modeled glassware, 25 C. Product samples are pre-existing solid inventory, not evidence of a reaction pathway. Plate/needle route labels are supplied explicitly. Product optics, aggregates, packing and transport remain illustrative. Separate lab runs exercise actual studio reaction preparation and progression. No cloud chemistry calls. No FPS conclusions from this capture.' };
try {
  const blockApi = route => { report.blockedRequests.push(route.request().url()); return route.abort(); };
  const recordConsole = (message, prefix = '') => {
    if (message.type() !== 'error') return;
    const entry = { message: prefix + message.text(), url: message.location().url };
    if (report.blockedRequests.includes(entry.url) && message.text().includes('net::ERR_FAILED')) report.expectedBlockedNetworkErrors.push(entry);
    else report.consoleErrors.push(entry);
  };
  const context = await browser.newContext({ viewport: { width: 1600, height: 1000 }, deviceScaleFactor: 1 });
  await context.route('**/api/**', blockApi);
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('console', m => recordConsole(m));
  await page.goto(`${origin}/scripts/fixtures/appearance.html`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.appearanceReady && !!document.querySelector('canvas'), { timeout: 60000 });
  await page.waitForTimeout(1500);
  const inventory = await page.evaluate(() => ({ stocks: window.stockFormulas, products: window.productFormulas }));
  report.inventory = inventory;
  async function capture(name, specimens, delay = 650) {
    const setup = await page.evaluate(specimens => window.renderSpecimens(specimens), specimens);
    await page.waitForTimeout(delay);
    await page.screenshot({ path: path.join(output, `${name}.png`) });
    const simulation = await page.evaluate(async () => {
      const { SimulationEngine } = await import('/src/simulation/core/SimulationEngine.ts');
      const { useAppStore } = await import('/src/store/useAppStore.ts');
      return Object.values(useAppStore.getState().vessels).map(v => {
        const m = SimulationEngine.getManager(v.id);
        return { id: v.id, cloudiness: m.cloudiness, sediment_g: m.sedimentBed.amount_g,
          represented_g: [...m.precipitationSystems.values()].reduce((s, p) => s + p.representedMass_g, 0) };
      });
    });
    report.screenshots.push({ name, specimens, setup, simulation });
  }
  if (!process.env.LAB_APPEARANCE_SKIP_SPECIMENS) {
  for (let i = 0; i < inventory.stocks.length; i += 6) {
    await capture(`stocks-${String(i / 6 + 1).padStart(2, '0')}`, inventory.stocks.slice(i, i + 6).map(formula => ({ formula })));
  }
  for (let i = 0; i < inventory.products.length; i += 6) {
    await capture(`products-${String(i / 6 + 1).padStart(2, '0')}`, inventory.products.slice(i, i + 6).map(formula => ({ formula, mode: 'product' })), 1600);
  }
  await capture('stock-forms', ['Fe (nail)', 'Al (foil)', 'Mg (ribbon)', 'Cu (turnings)', 'CuSO4·5H2O', 'I2'].map(formula => ({ formula })));
  await capture('submerged-forms', ['Fe (nail)', 'Al (foil)', 'Zn (granules)', 'Cu (turnings)', 'CuSO4·5H2O', 'I2'].map(formula => ({ formula, wet: true })));
  await capture('powder-dose-scale', [0.01, 0.1, 1, 2, 5, 10].map(grams => ({ formula: 'CaCO3', grams })));
  await capture('precipitate-forms', ['AgCl', 'BaSO4', 'Cu(OH)2', 'Fe(OH)3', 'PbI2', 'Al(OH)3'].map(formula => ({ formula, mode: 'product', grams: 0.01 })), 2000);
  await capture('conditional-crystals', [{ formula: 'PbI2', mode: 'product' },
    { formula: 'PbI2', mode: 'product', formation: 'CRYSTAL_PLATE' }, { formula: 'PbCl2', mode: 'product', formation: 'CRYSTAL_NEEDLE' },
    { formula: 'CuSO4' }, { formula: 'CuSO4 (solid)' }, { formula: 'CuSO4·5H2O' }], 2200);
  await capture('attached-metals', [
    { formula: 'Fe (nail)', wet: true },
    { formula: 'Fe (nail)', wet: true, deposit: { formula: 'Cu', mass_g: 0.1, reactionId: 'fe_cuso4' } },
    { formula: 'Fe (nail)', wet: true, deposit: { formula: 'Cu', mass_g: 0.4, reactionId: 'fe_cuso4' } },
    { formula: 'Zn (granules)', wet: true, deposit: { formula: 'Ag', mass_g: 0.2, reactionId: 'zn_agno3' } },
    { formula: 'Cu (turnings)', wet: true, deposit: { formula: 'Ag', mass_g: 0.2, reactionId: 'cu_agno3' } },
    { formula: 'Mg (powder)', wet: true, deposit: { formula: 'Cu', mass_g: 0.2, reactionId: 'mg_cuso4' } },
  ]);
  }
  await context.close();

  const labContext = await browser.newContext({ viewport: { width: 1600, height: 1000 } });
  await labContext.route('**/api/**', blockApi);
  await labContext.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'high'));
  const main = await labContext.newPage();
  main.on('pageerror', e => report.errors.push(`lab: ${e.message}`));
  main.on('console', m => recordConsole(m, 'lab: '));
  await main.goto(origin, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await main.waitForSelector('canvas', { timeout: 60000 });
  await main.waitForTimeout(2000);
  report.reactions = [];
  for (const programs of [['bacl2_na2so4', 'agno3_nacl', 'cuso4_naoh'], ['fecl3_naoh', 'pbno32_ki', 'alcl3_naoh'],
    ['fe_cuso4', 'zn_agno3', 'cu_agno3']]) {
    const prepared = await main.evaluate(async programs => {
      const { useAppStore } = await import('/src/store/useAppStore.ts');
      const state = useAppStore.getState();
      for (const id of Object.keys(state.vessels)) state.removeVessel(id);
      useAppStore.setState({ leftSidebarOpen: false, rightSidebarOpen: false });
      return programs.map((program, i) => {
        const id = useAppStore.getState().prepareStudioProgram(program);
        if (!id) throw new Error(`Failed to prepare ${program}`);
        const v = useAppStore.getState().vessels[id];
        if (program === 'fe_cuso4') useAppStore.getState().setVesselState(id, {
          contents: v.contents.map(c => c.formula === 'Fe' ? { ...c, formula: 'Fe (nail)' } : c),
          substances: v.substances.map(s => s === 'Fe' ? 'Fe (nail)' : s),
        });
        useAppStore.getState().updateVesselPosition(id, [(i - 1) * 3, v.position[1], 0]);
        return { program, id };
      });
    }, programs);
    await main.screenshot({ path: path.join(output, `lab-${programs[0]}-before.png`) });
    const started = await main.evaluate(async prepared => {
      const { useAppStore } = await import('/src/store/useAppStore.ts');
      return prepared.map(p => ({ ...p, started: useAppStore.getState().runStudioProgram(p.id) }));
    }, prepared);
    if (started.some(p => !p.started)) throw new Error(`Reaction start failed: ${JSON.stringify(started)}`);
    await main.waitForTimeout(2500);
    await main.screenshot({ path: path.join(output, `lab-${programs[0]}-reaction.png`) });
    const snapshot = await main.evaluate(async () => {
      const { useAppStore } = await import('/src/store/useAppStore.ts');
      return Object.values(useAppStore.getState().vessels).map(v => ({ id: v.id,
        contents: v.contents, precipitateAmount_g: v.precipitateAmount_g, temperature_c: v.temperature_c,
        progress: useAppStore.getState().activeKinetics[v.id]?.progress }));
    });
    report.reactions.push({ started, snapshot });
  }
  report.dispensing = [];
  if (process.env.LAB_APPEARANCE_TRACE) await main.evaluate(async () => {
    const { useAppStore: s } = await import('/src/store/useAppStore.ts');
    window.doseTrace = [];
    s.subscribe((next, previous) => {
      if (previous.pouringChemical && !next.pouringChemical) window.doseTrace.push({ event: 'dose-cleared',
        previous: previous.pouringChemical, stack: new Error().stack });
    });
    const mix = s.getState().mixSubstances, tick = s.getState().tickSimulation, clear = s.getState().clearPour;
    s.setState({ mixSubstances: async (...args) => {
      window.doseTrace.push({ event: 'before', id: args[0], chemical: args[1], amount: args[2], mass: s.getState().vessels[args[0]]?.mass_g });
      await mix(...args);
      window.doseTrace.push({ event: 'after', id: args[0], mass: s.getState().vessels[args[0]]?.mass_g, baseline: s.getState().activeKinetics[args[0]]?.initialVesselBaseline?.mass_g });
    }, tickSimulation: (...args) => {
      const before = Object.fromEntries(Object.values(s.getState().vessels).map(v => [v.id, v.mass_g]));
      const result = tick(...args);
      for (const v of Object.values(s.getState().vessels)) if (v.mass_g < before[v.id] - 1e-8)
        window.doseTrace.push({ event: 'DROP', id: v.id, before: before[v.id], after: v.mass_g,
          baseline: s.getState().activeKinetics[v.id]?.initialVesselBaseline?.mass_g });
      return result;
    }, clearPour: id => { window.doseTrace.push({ event: 'clear', dose: s.getState().pouringChemical }); return clear(id); } });
  });
  for (const [chemical, amount] of [['Fe (nail)', 1], ['Al (foil)', 0.5], ['CuSO4·5H2O', 1], ['NaOH (solid)', 0.5]]) {
    const setup = await main.evaluate(async ({ chemical, amount }) => {
      const { useAppStore } = await import('/src/store/useAppStore.ts');
      const state = useAppStore.getState();
      for (const id of Object.keys(state.vessels)) state.removeVessel(id);
      state.addVessel('beaker', 'Dispensing QA');
      const id = Object.keys(useAppStore.getState().vessels)[0];
      useAppStore.getState().setVesselState(id, { position: [0, -0.135, 0], volume_ml: 0,
        volume: 0, mass_g: 0, contents: [], substances: [], hasPrecipitate: false });
      useAppStore.getState().triggerPour(chemical, id, amount);
      window.appearanceLabStore = useAppStore;
      return { id, chemical, amount };
    }, { chemical, amount });
    await main.waitForTimeout(550);
    await main.screenshot({ path: path.join(output, `dose-${chemical.replace(/[^a-z0-9]/gi, '_')}-air.png`) });
    await main.waitForFunction(() => window.appearanceLabStore.getState().pouringChemical === null,
      undefined, { timeout: 30000 });
    const final = await main.evaluate(async id => {
      const { useAppStore } = await import('/src/store/useAppStore.ts');
      const v = useAppStore.getState().vessels[id];
      return { mass_g: v.mass_g, volume_ml: v.volume_ml, contents: v.contents, mixError: useAppStore.getState().mixError,
        dose: useAppStore.getState().pouringChemical };
    }, setup.id);
    if (process.env.LAB_APPEARANCE_TRACE) report.doseTrace = await main.evaluate(() => window.doseTrace);
    if (Math.abs(final.mass_g - amount) > 1e-7 || final.volume_ml !== 0
      || !final.contents.every(c => c.phase === 's')) throw new Error(`Incorrect dose inventory: ${JSON.stringify({ setup, final })}`);
    report.dispensing.push({ setup, final });
  }
  await labContext.close();
} catch (error) {
  report.errors.push(error.stack || String(error)); process.exitCode = 1;
} finally {
  await browser.close();
  await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n');
}
if (report.errors.length || report.consoleErrors.length) process.exitCode = 1;
console.log(JSON.stringify({ stocks: report.inventory?.stocks.length, products: report.inventory?.products.length,
  screenshots: report.screenshots.length, reactionRuns: report.reactions?.flatMap(r => r.started).length,
  stockDoseRuns: report.dispensing?.length,
  expectedBlockedNetworkErrors: report.expectedBlockedNetworkErrors.length,
  errors: report.errors, consoleErrors: report.consoleErrors }, null, 2));
