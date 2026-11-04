import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const origin = process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773';
const output = path.resolve('artifacts/effect-performance');
const label = process.env.AUDIT_LABEL ?? 'current';
await mkdir(output, { recursive: true });
console.log('Launching browser');
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { errors: [], consoleErrors: [], readings: [] };
try {
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, deviceScaleFactor: 1 });
  page.on('pageerror', e => report.errors.push(e.message));
  page.on('crash', () => report.errors.push('Browser page crashed'));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('404')) report.consoleErrors.push(m.text()); });
  await page.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'low'));
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  console.log('Preparing three simultaneous reactions');
  report.setup = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { useFrameStats: stats } = await import('/src/render/FrameTelemetry.tsx');
    const { useQualityStore: quality } = await import('/src/vfx/quality.ts');
    const { SimulationEngine } = await import('/src/simulation/core/SimulationEngine.ts');
    const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
    for (const id of Object.keys(store.getState().vessels)) store.getState().removeVessel(id);
    const ids = ['fecl3_naoh', 'caco3_hcl', 'zn_cuso4'].map(p => {
      const id = store.getState().prepareStudioProgram(p);
      if (!id || !store.getState().runStudioProgram(id)) throw new Error(`Cannot start ${p}`);
      return id;
    });
    ids.forEach((id, index) => store.getState().updateVesselPosition(id, [(index - 1) * 3, store.getState().vessels[id].position[1], 0]));
    store.setState({ selectedVesselId: ids[0], leftSidebarOpen: false, rightSidebarOpen: false });
    const gl = [..._roots.values()][0].store.getState().gl;
    const ext = gl.getContext().getExtension('WEBGL_debug_renderer_info');
    Object.assign(window, { audit: { store, stats, quality, SimulationEngine, gl, ids } });
    return { ids, renderer: ext ? gl.getContext().getParameter(ext.UNMASKED_RENDERER_WEBGL) : 'unknown' };
  });
  await page.waitForTimeout(10000);
  await page.waitForFunction(() => window.audit.stats.getState().samples > 0, undefined, { timeout: 30000 });
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Profiler.enable');
  await cdp.send('Profiler.start');
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(1100);
    report.readings.push(await page.evaluate(() => ({ ...window.audit.stats.getState(), tier: window.audit.quality.getState().effectiveTier,
      geometries: window.audit.gl.info.memory.geometries, textures: window.audit.gl.info.memory.textures })));
  }
  const { profile } = await cdp.send('Profiler.stop');
  await writeFile(path.join(output, `${label}.cpuprofile`), JSON.stringify(profile));
  const hits = new Map();
  for (const n of profile.nodes) {
    const key = `${n.callFrame.functionName} (${n.callFrame.url}:${n.callFrame.lineNumber + 1})`;
    hits.set(key, (hits.get(key) ?? 0) + (n.hitCount ?? 0));
  }
  report.cpuHotspots = [...hits].sort((a, b) => b[1] - a[1]).slice(0, 25);
  await page.evaluate(() => {
    window.audit.store.setState({ isSimulationPaused: true });
    window.audit.savedManagers = window.audit.ids.map(id => window.audit.SimulationEngine.findManager(id));
    window.audit.snapshot = () => JSON.stringify(window.audit.savedManagers.map(m => [...m.precipitationSystems].map(([formula, s]) =>
      ({ formula, mass: s.representedMass_g, time: s.integratedTime_s }))));
    window.audit.savedSnapshot = window.audit.snapshot();
    window.audit.savedInventory = JSON.stringify(window.audit.store.getState().vessels);
    window.audit.historyStable = () => {
      if (!window.audit.ids.every((id, i) => window.audit.SimulationEngine.findManager(id) === window.audit.savedManagers[i])
        || JSON.stringify(window.audit.store.getState().vessels) !== window.audit.savedInventory) return false;
      const before = JSON.parse(window.audit.savedSnapshot), after = JSON.parse(window.audit.snapshot());
      // Changing representative glyph budgets can reorder floating-point sums.
      // Chemistry and clocks must be exact; represented mass has 1e-10 g tolerance.
      return before.every((systems, i) => systems.length === after[i].length && systems.every((s, j) =>
        s.formula === after[i][j].formula && s.time === after[i][j].time && Math.abs(s.mass - after[i][j].mass) < 1e-10));
    };
  });
  for (const tier of ['medium', 'high', 'ultra', 'low', 'potato', 'medium', 'high', 'low', 'medium', 'high', 'low']) {
    console.log(`Checking quality: ${tier}`);
    await page.evaluate(t => window.audit.quality.getState().setPreference(t), tier);
    await page.waitForTimeout(2500);
    report.readings.push(await page.evaluate(() => ({ ...window.audit.stats.getState(), tier: window.audit.quality.getState().effectiveTier,
      geometries: window.audit.gl.info.memory.geometries, textures: window.audit.gl.info.memory.textures })));
  }
  const settledLow = report.readings.filter(reading => reading.tier === 'low').slice(-3);
  report.gpuResourcesStable = settledLow.every(reading => reading.textures === settledLow[0].textures
    && reading.geometries === settledLow[0].geometries);
  if (!report.gpuResourcesStable) throw new Error('GPU resources accumulated across paused quality cycles');
  report.historyStable = await page.evaluate(() => window.audit.historyStable());
  if (!report.historyStable) throw new Error('Quality switch reset paused physical history');
  await page.screenshot({ path: path.join(output, `${label}-low.png`) });
  await page.setViewportSize({ width: 3840, height: 2160 });
  await page.evaluate(() => window.audit.quality.getState().setPreference('high'));
  await page.waitForTimeout(1500);
  report.largeCanvas = await page.evaluate(() => ({ width: window.audit.gl.domElement.width, height: window.audit.gl.domElement.height }));
  if (report.largeCanvas.width * report.largeCanvas.height > 2_810_000) throw new Error('Framebuffer exceeded pixel budget');
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.waitForTimeout(1500);
  report.resizedCanvas = await page.evaluate(() => ({ width: window.audit.gl.domElement.clientWidth, height: window.audit.gl.domElement.clientHeight }));
  if (report.resizedCanvas.height > 1000) throw new Error('Canvas retained its previous large-screen height');
  await page.evaluate(() => window.audit.quality.getState().setPreference('auto'));
  await page.waitForTimeout(12000);
  report.auto = await page.evaluate(() => ({ tier: window.audit.quality.getState().effectiveTier, ...window.audit.stats.getState() }));
  report.contextRecovery = await page.evaluate(async () => {
    const extension = window.audit.gl.getContext().getExtension('WEBGL_lose_context');
    if (!extension) return 'unsupported';
    await new Promise(resolve => {
      const canvas = window.audit.gl.domElement;
      canvas.addEventListener('webglcontextlost', () => setTimeout(() => extension.restoreContext(), 100), { once: true });
      canvas.addEventListener('webglcontextrestored', resolve, { once: true });
      extension.loseContext();
    });
    return 'restored';
  });
  await page.waitForTimeout(4000);
  report.recovered = await page.evaluate(() => ({ tier: window.audit.quality.getState().effectiveTier,
    frameloop: [...document.querySelectorAll('canvas')].length, ...window.audit.stats.getState(),
    historyStable: window.audit.historyStable() }));
  await page.screenshot({ path: path.join(output, `${label}.png`) });
  report.contextLost = await page.evaluate(() => window.audit.gl.getContext().isContextLost());
} catch (e) { report.errors.push(e.stack ?? String(e)); }
finally {
  await browser.close();
  await writeFile(path.join(output, `${label}.json`), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify(report, null, 2));
if (report.errors.length || report.consoleErrors.length || report.contextLost) process.exitCode = 1;
