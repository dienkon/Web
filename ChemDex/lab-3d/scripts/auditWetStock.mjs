import { chromium } from '@playwright/test';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const production = process.env.WET_STOCK_PRODUCTION === '1';
const output = resolve('artifacts/wet-stock', production ? 'production' : 'development');
await mkdir(output, { recursive: true });
const report = { errors: [], consoleErrors: [], cases: [] };
const fixture = production ? await readFile(resolve('artifacts/wet-stock/fixture.json'), 'utf8') : null;
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 430, height: 932 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
    await context.addInitScript(record => {
      if (record) localStorage.setItem('chemlab_physical_state_v4', record);
      localStorage.setItem('chemlab_vfx_quality_preference', 'low');
      window.wetStockMessages = []; window.wetStockLosses = 0;
      document.addEventListener('webglcontextlost', () => window.wetStockLosses++, true);
      const post = Worker.prototype.postMessage;
      Worker.prototype.postMessage = function(message, ...rest) {
        if (message?.input?.spills?.length) {
          if (window.wetStockMessages.length >= 300) window.wetStockMessages.shift();
          window.wetStockMessages.push({ mass_g: message.input.spills.reduce((s, p) => s + p.mass_g, 0),
            restores: message.input.spills.filter(p => p.restore).length, count: message.input.spills.length });
        }
        return post.call(this, message, ...rest);
      };
    }, fixture);
    await context.route('**/api/**', route => route.abort());
    const page = await context.newPage(); page.on('pageerror', e => { const text = e.stack ?? e.message; if (!report.errors.includes(text)) report.errors.push(text); });
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
    await page.goto(process.env.LAB_ORIGIN ?? (production ? 'http://127.0.0.1:6774' : 'http://127.0.0.1:6773'), { waitUntil: 'domcontentloaded' });
    await page.waitForSelector('canvas');
    if (!production) {
      const record = await page.evaluate(async () => {
        const { useAppStore: app } = await import('/src/store/useAppStore.ts');
        const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
        const { stockGroup } = await import('/src/physical/stockAdapter.ts');
        const { computeMolarMass } = await import('/src/engine/ledger.ts');
        const { calculateSpillRadius } = await import('/src/science/overflowPhysics.ts');
        app.setState({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {},
          spills: {}, inFlightPours: [], workbenchEscapedGas_g: {}, isSimulationPaused: true,
          leftSidebarOpen: false, rightSidebarOpen: false, selectedVesselId: null, timeScale: 1 });
        const row = (formula, mass_g, phase) => ({ formula, mass_g, phase, moles: mass_g / computeMolarMass(formula) });
        const spills = {};
        for (const [i, formula] of ['Zn', 'Fe'].entries()) {
          const x = i ? 1.6 : -1.6, contents = [row('H2O', 10, 'l'), row('HCl', 0.03646, 'aq')], id = `pool-${i}`;
          spills[id] = { id, position: [x, -1.175, 2], contents, substances: ['H2O', 'HCl'], mass_g: 10.03646,
            volume_ml: 10, radius: calculateSpillRadius(10), color: '#fff', temperature_c: 25, isHazard: true, timestamp: 0 };
          for (let j = 0; j < 4; j++) {
            const id = `stock:${i * 4 + j + 1}`, key = `stock_spill_${id}`, mass_g = 0.01, group = stockGroup(formula, mass_g), scale_m = Math.cbrt(mass_g / 1000 / group.density_kg_m3);
            const position = [x + (j % 2 ? 0.13 : -0.13), -0.65 + Math.floor(j / 2) * 0.14, 2 + (j % 2 ? 0.1 : -0.1)];
            spills[key] = { id: key, position, contents: [row(formula, mass_g, 's')], substances: [formula],
              mass_g, volume_ml: 0, radius: scale_m / 0.035, color: '#888', temperature_c: 25, isHazard: false, timestamp: 0,
              stockMotion: { id, vesselId: 'source', formula, mass_g, scale_m, powder: group.powder,
                position_m: position.map(p => p * 0.035), rotation: [0, 0, 0, 1], velocity_m_s: [0, 0, 0], angularVelocity_rad_s: [0, 0, 0], sleeping: false } };
          }
        }
        app.setState({ spills });
        const canvasRoot = [..._roots.values()].find(r => r.store.getState().gl.domElement === document.querySelector('canvas'));
        const root = canvasRoot.store.getState();
        window.wetStockAudit = { app, root, capture: () => {
          const s = app.getState(); const grains = Object.values(s.spills).filter(s => s.stockMotion), pools = Object.values(s.spills).filter(s => !s.stockMotion);
          return { mass_g: Object.values(s.spills).reduce((n, p) => n + p.mass_g, 0) + Object.values(s.workbenchEscapedGas_g).reduce((n, g) => n + g, 0),
            stock_g: grains.reduce((n, p) => n + p.mass_g, 0), gases: s.workbenchEscapedGas_g,
            sites: pools.flatMap(s => s.solidContactSites ?? []),
            bubbleCounts: pools.map(s => root.scene.getObjectByName(`spill-bubbles:${s.id}`)?.count),
            grains: grains.map(g => ({ id: g.stockMotion.id, mass_g: g.mass_g, position_m: g.stockMotion.position_m })) };
        } };
        return JSON.stringify({ vessels: {}, burners: {}, savedAt: Date.now(), materials: { spills, inFlightPours: [],
          wasteMass_g: 0, wasteContents: [], workbenchEscapedGas_g: {} } });
      });
      if (!mobile) await writeFile(resolve('artifacts/wet-stock/fixture.json'), record);
      await page.waitForFunction(() => !!window.wetStockAudit.root.scene.getObjectByName('escaped_stock:1'));
      await page.evaluate(async mobile => {
        const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
        const canvasRoot = [..._roots.values()].find(r => r.store.getState().gl.domElement === document.querySelector('canvas'));
        canvasRoot.store.getState().internal.subscribe({ current: ({ camera }) => {
          camera.position.set(0, mobile ? 6 : 3, mobile ? 11 : 6); camera.lookAt(0, -1.175, 2); camera.updateMatrixWorld();
        } }, 0, canvasRoot.store);
      }, mobile);
      await page.waitForTimeout(1000);
      const initial = await page.evaluate(() => window.wetStockAudit.capture());
      await page.evaluate(() => window.wetStockAudit.app.getState().setSimulationPaused(false));
      await page.waitForFunction(() => window.wetStockAudit.capture().sites.length >= 2, undefined, { timeout: 60000 });
      const reacting = await page.evaluate(() => window.wetStockAudit.capture());
      if (!(reacting.stock_g < initial.stock_g) || Math.abs(reacting.mass_g - initial.mass_g) > 1e-8) throw new Error('Contact inventory failed');
      if (reacting.bubbleCounts.some(n => n !== 16)) throw new Error('Unbounded or missing gas mesh');
      await page.screenshot({ path: resolve(output, mobile ? 'mobile-contact.png' : 'desktop-contact.png') });
      await page.evaluate(() => window.wetStockAudit.app.getState().setSimulationPaused(true)); await page.waitForTimeout(500);
      const paused = await page.evaluate(() => window.wetStockAudit.capture()); await page.waitForTimeout(600);
      if (JSON.stringify(paused) !== JSON.stringify(await page.evaluate(() => window.wetStockAudit.capture()))) throw new Error('Paused contact moved');
      await page.evaluate(() => {
        const a = window.wetStockAudit, s = a.app.getState(); a.saved = structuredClone({ spills: s.spills, workbenchEscapedGas_g: s.workbenchEscapedGas_g });
        a.app.getState().setSimulationPaused(false);
      });
      await page.waitForFunction(mass => window.wetStockAudit.capture().stock_g < mass - 1e-6, paused.stock_g);
      const marker = await page.evaluate(() => {
        const a = window.wetStockAudit; a.app.setState({ ...structuredClone(a.saved), isSimulationPaused: true }); return window.wetStockMessages.length;
      });
      await page.waitForFunction(marker => window.wetStockMessages.slice(marker).some(m => m.restores > 0), marker);
      await page.waitForTimeout(600);
      const restored = await page.evaluate(() => window.wetStockAudit.capture());
      if (Math.abs(restored.mass_g - paused.mass_g) > 1e-9 || Math.abs(restored.stock_g - paused.stock_g) > 1e-9
        || restored.grains.some(g => g.position_m.some((p, i) => Math.abs(p - paused.grains.find(old => old.id === g.id).position_m[i]) > 1e-7))) throw new Error('Restore replayed a stale trajectory');
      await page.evaluate(() => window.wetStockAudit.app.setState({ spills: {} })); await page.waitForTimeout(600);
      if (await page.evaluate(() => Object.keys(window.wetStockAudit.app.getState().spills).length)) throw new Error('Removed matter reappeared');
      report.cases.push({ mobile, initial, reacting, paused: true, restored: true, removedWithoutResurrection: true });
    } else {
      await page.waitForFunction(() => window.wetStockMessages.some(s => s.mass_g < 0.07999), undefined, { timeout: 60000 });
      await page.screenshot({ path: resolve(output, mobile ? 'mobile-contact.png' : 'desktop-contact.png') });
      report.cases.push({ mobile, workerInputs: await page.evaluate(() => window.wetStockMessages) });
    }
    const losses = await page.evaluate(() => window.wetStockLosses); if (losses) throw new Error(`Lost ${losses} WebGL contexts`);
    await context.close();
  }
} finally { await browser.close(); await writeFile(resolve(output, 'browser-audit.json'), JSON.stringify(report, null, 2)); }
if (report.errors.length || report.consoleErrors.length) throw new Error(JSON.stringify({ errors: report.errors, consoleErrors: report.consoleErrors }));
console.log(JSON.stringify({ cases: report.cases.map(c => ({ mobile: c.mobile, stock_g: c.reacting?.stock_g, paused: c.paused })), errors: report.errors, consoleErrors: report.consoleErrors }));
