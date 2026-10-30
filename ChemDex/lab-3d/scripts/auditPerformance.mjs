import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const origin = process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773';
const output = path.resolve('docs/research/performance-2026-10-29');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { errors: [], consoleErrors: [], blockedApiRequests: 0, readings: [] };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  await context.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'medium'));
  await context.route('**/api/**', route => { report.blockedApiRequests++; return route.abort(); });
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.text().includes('net::ERR_FAILED')) report.consoleErrors.push(message.text());
  });
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  report.setup = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { useQualityStore: quality } = await import('/src/vfx/quality.ts');
    const { useFrameStats: stats } = await import('/src/render/FrameTelemetry.tsx');
    const { SimulationEngine } = await import('/src/simulation/core/SimulationEngine.ts');
    const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
    for (const id of Object.keys(store.getState().vessels)) store.getState().removeVessel(id);
    const id = store.getState().prepareStudioProgram('fecl3_naoh');
    if (!id || !store.getState().runStudioProgram(id)) throw new Error('Precipitation setup failed');
    store.getState().updateVesselPosition(id, [-2, store.getState().vessels[id].position[1], 0]);
    store.setState({ selectedVesselId: id, leftSidebarOpen: false, rightSidebarOpen: true });
    const root = [..._roots.values()].find(root => root.store.getState().gl.domElement === document.querySelector('canvas'));
    if (!root) throw new Error('Canvas renderer missing');
    const gl = root.store.getState().gl;
    const extension = gl.getContext().getExtension('WEBGL_debug_renderer_info');
    Object.assign(window, { auditStore: store, auditQuality: quality, auditStats: stats,
      auditManager: () => SimulationEngine.findManager(id), auditGl: gl });
    return { id, renderer: extension ? gl.getContext().getParameter(extension.UNMASKED_RENDERER_WEBGL) : 'unknown' };
  });
  await page.waitForFunction(() => window.auditManager()?.hasPrecipitationSnapshot, undefined, { timeout: 60000 });
  await page.waitForTimeout(5000);
  await page.evaluate(() => { window.auditStore.setState({ isSimulationPaused: true }); });
  await page.waitForTimeout(1000);
  await page.evaluate(() => {
    window.savedAuditManager = window.auditManager();
    window.auditSnapshot = () => JSON.stringify([...window.auditManager().precipitationSystems].map(([formula, system]) => ({
      formula, mass: system.representedMass_g, flocculation: system.flocculation, clock: system.clock }))) ;
    window.savedAuditSnapshot = window.auditSnapshot();
  });
  for (const tier of ['medium', 'low', 'high', 'low']) {
    await page.getByRole('combobox', { name: 'Chất lượng đồ họa' }).selectOption(tier);
    await page.waitForTimeout(3500);
    const readings = [];
    for (let index = 0; index < 3; index++) {
      await page.waitForTimeout(1100);
      readings.push(await page.evaluate(() => ({ ...window.auditStats.getState(), autoReset: window.auditGl.info.autoReset })));
    }
    if (readings.some(reading => reading.drawCalls <= 1 || reading.triangles <= 10000 || reading.autoReset))
      throw new Error(`Incomplete renderer counters: ${tier}`);
    const stable = await page.evaluate(() => window.auditManager() === window.savedAuditManager
      && window.auditSnapshot() === window.savedAuditSnapshot);
    if (!stable) throw new Error(`Quality change reset paused history: ${tier}`);
    const budget = await page.evaluate(() => window.auditManager().maxPrecipitateParticles);
    report.readings.push({ tier, budget, historyStable: stable, readings });
    if (report.readings.length <= 2) await page.screenshot({ path: path.join(output, `${tier}.png`) });
  }
  report.pauseAndQualityStable = true;
  await page.evaluate(() => window.auditStore.setState({ isSimulationPaused: false }));
  await page.waitForFunction(() => window.auditSnapshot() !== window.savedAuditSnapshot);
  report.resumes = true;
  await context.close();
} catch (error) { report.errors.push(error.stack ?? String(error)); process.exitCode = 1; }
finally { await browser.close(); await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n'); }
if (report.errors.length || report.consoleErrors.length) process.exitCode = 1;
console.log(JSON.stringify(report, null, 2));
