import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(process.env.PRECIPITATE_STRESS_OUTPUT ?? 'artifacts/precipitate-stress');
await mkdir(output, { recursive: true });
const report = { errors: [], consoleErrors: [], samples: [] };
const leakControl = process.env.PRECIPITATE_LEAK_CONTROL === '1';
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const mobile = process.env.PRECIPITATE_STRESS_MOBILE === '1';
  const context = await browser.newContext({ viewport: mobile ? { width: 430, height: 932 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
  await context.addInitScript(() => {
    localStorage.setItem('chemlab_vfx_quality_preference', 'low');
    window.gpuBuffers = { created: 0, deleted: 0, live: 0 }; window.contextLosses = 0;
    const live = new WeakSet();
    for (const Type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) if (Type) {
      const create = Type.prototype.createBuffer, remove = Type.prototype.deleteBuffer;
      Type.prototype.createBuffer = function(...args) { const buffer = create.apply(this, args); if (buffer && !live.has(buffer)) {
        live.add(buffer); window.gpuBuffers.created++; window.gpuBuffers.live++; } return buffer; };
      Type.prototype.deleteBuffer = function(buffer) { if (buffer && live.has(buffer)) { live.delete(buffer); window.gpuBuffers.deleted++; window.gpuBuffers.live--; }
        return remove.call(this, buffer); };
    }
    document.addEventListener('webglcontextlost', () => window.contextLosses++, true);
  });
  await context.route('**/api/**', route => route.abort());
  const page = await context.newPage(); page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('net::ERR_FAILED')) report.consoleErrors.push(message.text()); });
  await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773'}/?vfx=1`, { waitUntil: 'domcontentloaded' }); await page.waitForSelector('canvas');
  await page.evaluate(async () => {
    const { useAppStore: app } = await import('/src/store/useAppStore.ts');
    const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
    const { PRECIPITATE_MORPHOLOGIES: forms } = await import('/src/engine/studioMorphology.ts');
    const { SimulationEngine: simulation } = await import('/src/simulation/core/SimulationEngine.ts');
    const { computeMolarMass } = await import('/src/engine/ledger.ts');
    app.getState().setSimulationPaused(true);
    const original = Object.values(app.getState().vessels).find(v => v.type === 'beaker');
    const seed = { ...original, id: 'stress_reference' };
    app.setState({ vessels: { [seed.id]: { ...seed, position: [0, -0.135, 2] } }, vesselIds: [seed.id],
      selectedVesselId: seed.id, activeKinetics: {}, pendingReactions: {}, spills: {}, inFlightPours: [], burners: {}, burnerIds: [], timeScale: 1,
      rightSidebarOpen: false, leftSidebarOpen: false }); simulation.clearAll();
    window.precipitateAudit = { app, forms, simulation, computeMolarMass, seedId: seed.id,
      root: () => [..._roots.values()].find(r => r.store.getState().gl.domElement === document.querySelector('canvas')).store.getState() };
  });
  await page.locator('button[title="Precipitate Crystal & Colloid Morphology"]').click();
  const seedId = await page.evaluate(() => window.precipitateAudit.seedId);
  const targetSelect = page.locator('select').filter({ has: page.locator(`option[value="${seedId}"]`) }).first();
  if (await targetSelect.count()) await targetSelect.selectOption(seedId);
  const card = page.getByRole('heading', { name: 'Kết tủa trắng vón', exact: true }).locator('xpath=../../..');
  for (let i = 0; i < 60; i++) await card.getByRole('button').click();
  const repeated = await page.evaluate(() => ({ count: window.precipitateAudit.app.getState().vesselIds.length,
    buffers: { ...window.gpuBuffers }, losses: window.contextLosses }));
  if (repeated.count !== 1) throw new Error(`Repeated preview created ${repeated.count} cups`);
  report.repeatedClicks = { clicks: 60, ...repeated }; console.log('60 repeated Studio clicks passed');
  await page.evaluate(leakControl => {
    const a = window.precipitateAudit;
    for (const form of a.forms) {
      const id = a.app.getState().prepareStudioMorphology(form.type);
      if (form.programId && a.app.getState().runStudioProgram(id)) a.app.getState().seekStudioProgram(id, 1);
    }
    const ids = Object.keys(a.app.getState().vessels); a.ids = ids;
    a.app.setState(s => ({ selectedVesselId: null, leftSidebarOpen: false, rightSidebarOpen: false,
      vessels: Object.fromEntries(ids.map((id, i) => [id, { ...s.vessels[id], position: [(i % 4 - 1.5) * 2, -0.135, i < 4 ? 2 : -0.5] }])) }));
    const root = a.root(); root.internal.subscribe({ current: ({ camera }) => { camera.position.fromArray(a.cameraPose ?? [0, 4.5, 10]); camera.lookAt(...(a.cameraAim ?? [0, -0.2, 1])); camera.updateMatrixWorld(); } }, 0,
      root.internal.subscribers.find(s => s.store)?.store);
    a.snapshot = () => { const root = a.root(), layers = []; root.scene.traverse(o => { if (o.name.startsWith('physical_precipitate_')) layers.push({ name: o.name, count: o.count }); });
      return { cups: Object.keys(a.app.getState().vessels).length, glyphs: layers.reduce((n, m) => n + m.count, 0), layers,
        geometries: root.gl.info.memory.geometries, buffers: { ...window.gpuBuffers }, losses: window.contextLosses,
        masses: Object.values(a.app.getState().vessels).map(v => [v.id, v.mass_g]) }; };
    if (leakControl) {
      let instance; root.scene.traverse(o => { if (o.isInstancedMesh) instance = o; });
      // Positive control: reproduce the former dispose={null} lifecycle in an
      // isolated browser only, proving the buffer audit can detect this leak.
      Object.getPrototypeOf(instance).dispose = () => {};
    }
    a.app.getState().setSimulationPaused(false);
  }, leakControl);
  await page.waitForFunction(() => window.precipitateAudit.ids.every(id => window.precipitateAudit.simulation.findManager(id)?.hasPrecipitationSnapshot), undefined, { timeout: 60000 });
  await page.waitForTimeout(2500);
  const baseline = await page.evaluate(() => window.precipitateAudit.snapshot()); report.samples.push({ phase: 'eight-specimens', ...baseline });
  const fixture = await page.evaluate(() => {
    const s = window.precipitateAudit.app.getState();
    return { vessels: s.vessels, burners: s.burners, savedAt: Date.now(), materials: { spills: s.spills, inFlightPours: s.inFlightPours,
      wasteContents: s.wasteContents, wasteMass_g: s.wasteMass_g, workbenchEscapedGas_g: s.workbenchEscapedGas_g, pipetteSample: s.pipetteSample } };
  });
  await writeFile(resolve(output, 'fixture.json'), JSON.stringify(fixture));
  if (baseline.glyphs > 350) throw new Error(`Unbounded scene glyph count ${baseline.glyphs}`);
  await page.screenshot({ path: resolve(output, '01-eight-specimens.png') });
  await page.evaluate(() => {
    const a = window.precipitateAudit; a.app.getState().setSimulationPaused(true);
    a.quantitative = () => a.ids.map(id => { const m = a.simulation.findManager(id); return [...m.precipitationSystems.values()].map(s => ({
      mass: s.representedMass_g, particles: s.particles.map(p => [p.x, p.y, p.z, p.physicalRadius_m, p.mass_ug]),
    })); });
    a.beforeViewToggle = JSON.stringify(a.quantitative());
  });
  await page.getByRole('checkbox', { name: 'Phóng đại cụm keo để quan sát' }).uncheck();
  await page.waitForTimeout(200);
  report.readabilityPreservesPhysics = await page.evaluate(() => window.precipitateAudit.beforeViewToggle === JSON.stringify(window.precipitateAudit.quantitative()));
  if (!report.readabilityPreservesPhysics) throw new Error('Display enlargement changed quantitative particles');
  await page.getByRole('checkbox', { name: 'Phóng đại cụm keo để quan sát' }).check();
  await page.evaluate(() => { const a = window.precipitateAudit; a.app.getState().setSimulationPaused(false); a.swap = formula => {
    const id = a.ids[0], old = a.app.getState().vessels[id]; a.app.setState(s => ({ activeKinetics: {}, vessels: { ...s.vessels, [id]: { ...old,
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 30, moles: 30 / a.computeMolarMass('H2O') },
        { formula, phase: 's', mass_g: 0.5, moles: 0.5 / a.computeMolarMass(formula), solidOrigin: 'precipitate' }],
      substances: ['H2O', formula], volume_ml: 30, mass_g: 30.5, precipitateSubstance: formula, hasPrecipitate: true, precipitateAmount_g: 0.5 } } }));
  }; });
  for (let i = 0; i < 4; i++) { await page.evaluate(formula => window.precipitateAudit.swap(formula), i % 2 ? 'AgCl' : 'Fe(OH)3'); await page.waitForTimeout(120); }
  await page.waitForTimeout(1200); const warm = await page.evaluate(() => window.precipitateAudit.snapshot());
  for (let i = 0; i < 40; i++) { await page.evaluate(formula => window.precipitateAudit.swap(formula), i % 2 ? 'AgCl' : 'Fe(OH)3'); await page.waitForTimeout(90); }
  await page.waitForTimeout(1800); const switched = await page.evaluate(() => window.precipitateAudit.snapshot());
  report.samples.push({ phase: 'after-40-species-switches', ...switched });
  report.bufferGrowth = switched.buffers.live - warm.buffers.live;
  if (!leakControl && report.bufferGrowth > 32) throw new Error(`GPU buffer growth after switching: ${report.bufferGrowth}`);
  if (leakControl && report.bufferGrowth <= 32) throw new Error('Positive control failed to reproduce the former buffer leak');
  report.leakControl = leakControl;
  if (switched.losses) throw new Error(`Lost ${switched.losses} WebGL contexts`);
  await page.evaluate(() => {
    const a = window.precipitateAudit, id = a.ids[0], v = a.app.getState().vessels[id];
    a.app.setState({ vessels: { [id]: { ...v, position: [0, -0.135, 2], studioMorphologyType: undefined,
      contents: [{ formula: 'Fe', phase: 's', mass_g: 5, moles: 5 / a.computeMolarMass('Fe') }], mass_g: 5, volume_ml: 0,
      substances: ['Fe'], hasPrecipitate: false, precipitateSubstance: undefined, stockMotion: undefined, effectSampleRevision: (v.effectSampleRevision ?? 0) + 1 } },
      vesselIds: [id], selectedVesselId: null, activeKinetics: {} }); a.ironId = id;
  });
  await page.waitForFunction(() => window.precipitateAudit.app.getState().vessels[window.precipitateAudit.ironId].stockMotion?.grains.every(p => p.powder), undefined, { timeout: 60000 });
  await page.evaluate(() => window.precipitateAudit.app.getState().setSimulationPaused(false)); await page.waitForTimeout(2000);
  report.iron = await page.evaluate(() => { const a = window.precipitateAudit, v = a.app.getState().vessels[a.ironId];
    return { mass_g: v.mass_g, allPowder: v.stockMotion.grains.every(p => p.powder), carriers: v.stockMotion.grains.length,
      powderMesh: !!a.root().scene.getObjectByName(`contact_powder_${v.id}_Fe`) }; });
  if (!report.iron.allPowder || !report.iron.powderMesh) throw new Error('Fine iron powder rendered as another form');
  await page.getByRole('button', { name: 'Đóng Studio', exact: true }).click();
  await page.evaluate(() => { const a = window.precipitateAudit; a.cameraPose = [0, 1.4, 6]; a.cameraAim = [0, -0.5, 2]; });
  await page.waitForTimeout(300);
  await page.screenshot({ path: resolve(output, '02-iron-powder.png') });
  report.mobile = mobile; await context.close();
} finally { await browser.close(); await writeFile(resolve(output, 'browser-audit.json'), JSON.stringify(report, null, 2)); }
if (report.errors.length || report.consoleErrors.length) throw new Error(JSON.stringify({ errors: report.errors, consoleErrors: report.consoleErrors }));
console.log(JSON.stringify({ clicks: report.repeatedClicks.clicks, glyphs: report.samples[0].glyphs, bufferGrowth: report.bufferGrowth, iron: report.iron, errors: report.errors }));
