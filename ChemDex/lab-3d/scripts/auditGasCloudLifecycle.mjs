import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
const output = path.resolve(process.env.GAS_CLOUD_AUDIT_OUTPUT ?? 'docs/research/gas-cloud-lifecycle-2026-10-29');
await mkdir(output, { recursive: true });
const report = { errors: [], consoleErrors: [], qualities: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'low'));
  await context.route('**/api/**', route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', e => report.errors.push(e.stack ?? e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
  const origin = process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773';
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { roomGasClouds: room } = await import('/src/simulation/effects/GasCloudRepository.ts');
    const { useQualityStore: quality, QUALITY_CONFIGS } = await import('/src/vfx/quality.ts');
    const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
    const { computeMolarMass } = await import('/src/engine/ledger.ts');
    store.setState(s => ({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {},
      dissolvingSubstances: {}, inFlightPours: [], spills: {}, pipetteSample: null, isSimulationPaused: true,
      timeScale: 1, pourEpoch: s.pourEpoch + 1, isPouring: false, leftSidebarOpen: false, rightSidebarOpen: false }));
    room.clear(); room.syncEpoch(store.getState().pourEpoch);
    const id = store.getState().prepareStudioProgram('cu_hno3_conc');
    if (!id || !store.getState().runStudioProgram(id)) throw new Error('Failed to start actual Cu/HNO3 specimen');
    const population = () => JSON.stringify([...room.clouds.values()].map(c => ({ key: c.key, accepted: c.acceptedExhaust_mol,
      inputQueue: c.receipts.map(r => [r.remaining, r.input.mol_s]), system: c.system })));
    const snapshot = () => {
      const root = [..._roots.values()].find(r => r.store.getState().gl?.domElement === document.querySelector('canvas'));
      const mesh = root?.store.getState().scene.getObjectByName('gas_clouds_NO2'), clouds = [...room.clouds.values()];
      const count = clouds.reduce((n, c) => n + c.system.particles.length, 0), tier = quality.getState().effectiveTier;
      const maximum = Math.max(16, Math.floor((tier === 'high' || tier === 'ultra' ? 140 : tier === 'medium' ? 70 : 30) * QUALITY_CONFIGS[tier].particleMultiplier));
      return { tier, maximum, modelCount: count, drawCount: mesh?.visible ? mesh.count : 0, population: population(),
        channels: clouds.map(c => ({ key: c.key, revision: c.revision, sourceLive: c.sourceLive, count: c.system.particles.length,
          accepted_mol: c.acceptedExhaust_mol, integrated_mol: c.system.integratedGas_mol, age: c.system.integratedSeconds })),
        escaped_mol: (store.getState().vessels[id]?.escapedGas_g?.NO2 ?? 0) / computeMolarMass('NO2'),
        reactionActive: !!store.getState().activeKinetics[id] };
    };
    window.cloudAudit = { store, room, quality, id, snapshot, population };
    store.setState({ isSimulationPaused: false });
  });
  await page.waitForFunction(() => window.cloudAudit.snapshot().modelCount >= 24, undefined, { timeout: 90000 });
  await page.evaluate(() => window.cloudAudit.store.setState({ isSimulationPaused: true }));
  report.emitting = await page.evaluate(() => window.cloudAudit.snapshot());
  const accepted = report.emitting.channels.reduce((n, c) => n + c.accepted_mol, 0);
  if (Math.abs(accepted - report.emitting.escaped_mol) > 1e-10) throw new Error('Exhaust receipts do not match the chemical ledger');
  for (const tier of ['ultra', 'potato', 'medium', 'low']) {
    await page.evaluate(t => window.cloudAudit.quality.getState().setPreference(t), tier);
    await page.waitForFunction(t => { const s = window.cloudAudit.snapshot(); return s.tier === t && s.drawCount === Math.min(s.modelCount, s.maximum); }, tier, { timeout: 90000 });
    const s = await page.evaluate(() => window.cloudAudit.snapshot());
    if (s.population !== report.emitting.population) throw new Error(`Quality changed cloud history: ${tier}`);
    report.qualities.push(s);
  }
  await page.screenshot({ path: path.join(output, '01-emitting-paused.png') });
  await page.evaluate(() => window.cloudAudit.store.setState({ timeScale: 8, isSimulationPaused: false }));
  await page.waitForFunction(() => { const s = window.cloudAudit.snapshot(); return !s.reactionActive && s.modelCount > 0; }, undefined, { timeout: 90000 });
  await page.evaluate(() => window.cloudAudit.store.setState({ isSimulationPaused: true }));
  report.sourceFinished = await page.evaluate(() => window.cloudAudit.snapshot());
  await page.screenshot({ path: path.join(output, '02-tail-after-reaction.png') });
  await page.evaluate(() => {
    const a = window.cloudAudit;
    if (!a.store.getState().prepareStudioProgram('cu_hno3_conc', undefined, a.id) || !a.store.getState().runStudioProgram(a.id)) throw new Error('Replacement failed');
    a.store.setState({ isSimulationPaused: false, timeScale: 1 });
  });
  await page.waitForFunction(() => { const s = window.cloudAudit.snapshot(); return s.channels.length >= 2 && s.channels.every(c => c.count > 0); }, undefined, { timeout: 90000 });
  await page.evaluate(() => window.cloudAudit.store.setState({ isSimulationPaused: true }));
  report.replaced = await page.evaluate(() => window.cloudAudit.snapshot());
  await page.evaluate(() => { const a = window.cloudAudit; a.store.getState().removeVessel(a.id); });
  await page.waitForFunction(() => { const s = window.cloudAudit.snapshot(); return s.drawCount === Math.min(s.modelCount, s.maximum); });
  report.deleted = await page.evaluate(() => window.cloudAudit.snapshot());
  if (report.deleted.population !== report.replaced.population) throw new Error('Deleting source destroyed room exhaust');
  report.decay = await page.evaluate(() => {
    const a = window.cloudAudit, before = JSON.stringify(a.store.getState().vessels), samples = [];
    for (let i = 0; i < 25; i++) { a.room.advance(0.2, []); samples.push({ t_s: (i + 1) * 0.2, ...a.snapshot() }); }
    if (JSON.stringify(a.store.getState().vessels) !== before) throw new Error('Optical decay changed canonical matter');
    return samples;
  });
  if (report.decay.at(-1).channels.length) throw new Error('Room tail did not retire after decay');
  // Save a paused positive last-frame receipt, then verify reload cannot replay it.
  await page.evaluate(() => {
    const a = window.cloudAudit; a.id = a.store.getState().prepareStudioProgram('cu_hno3_conc');
    if (!a.id || !a.store.getState().runStudioProgram(a.id)) throw new Error('Reload specimen failed');
    a.store.setState({ isSimulationPaused: false, timeScale: 1 });
  });
  await page.waitForFunction(() => window.cloudAudit.snapshot().modelCount >= 2, undefined, { timeout: 90000 });
  await page.evaluate(() => window.cloudAudit.store.setState({ isSimulationPaused: true }));
  await page.waitForTimeout(1200);
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  report.reload = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts'); store.setState({ isSimulationPaused: true });
    const { roomGasClouds: room } = await import('/src/simulation/effects/GasCloudRepository.ts');
    return { clouds: room.clouds.size, positiveFlux: Object.values(store.getState().vessels).some(v => Object.values(v.gasFlux?.escaped_mol_s ?? {}).some(n => n > 0)) };
  });
  if (report.reload.clouds || report.reload.positiveFlux) throw new Error('Reload replayed a historic exhaust receipt');
  await page.goto(`${origin}/scripts/fixtures/gas-clouds.html`, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForFunction(() => window.gasFixtureReady);
  await page.evaluate(() => window.gasFixture.seed());
  const controlled = await page.evaluate(() => window.gasFixture.snapshot());
  await page.evaluate(() => window.gasFixture.unmount());
  await page.waitForFunction(() => !document.querySelector('canvas'));
  const detached = await page.evaluate(() => window.gasFixture.snapshot());
  await page.evaluate(() => window.gasFixture.mount());
  await page.waitForSelector('canvas');
  const remounted = await page.evaluate(() => window.gasFixture.snapshot());
  if (controlled !== detached || controlled !== remounted) throw new Error('Canvas remount changed the paused optical population');
  report.remount = { preserved: true, controlledOpticalSeed: true };
  for (const s of [report.emitting, report.sourceFinished, report.replaced, report.deleted, ...report.qualities, ...report.decay]) delete s.population;
  await context.close();
} catch (e) { report.errors.push(e.stack ?? String(e)); process.exitCode = 1; }
finally { await browser.close(); await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n'); }
if (report.errors.length || report.consoleErrors.length) process.exitCode = 1;
console.log(JSON.stringify({ qualityChanges: report.qualities.length, remount: report.remount, errors: report.errors, consoleErrors: report.consoleErrors }, null, 2));
