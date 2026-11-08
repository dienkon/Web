import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve('artifacts/spill-suspension/development'); await mkdir(output, { recursive: true });
const report = { errors: [], consoleErrors: [], cases: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  for (const [tier, mobile] of [['low', false], ['high', false], ['low', true]]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 430, height: 932 } : { width: 1440, height: 1000 }, isMobile: mobile, hasTouch: mobile });
    await context.addInitScript(tier => { localStorage.setItem('chemlab_vfx_quality_preference', tier);
      window.suspensionLosses = 0; window.suspensionBuffers = 0; const alive = new WeakSet();
      document.addEventListener('webglcontextlost', () => window.suspensionLosses++, true);
      for (const Type of [window.WebGLRenderingContext, window.WebGL2RenderingContext]) if (Type) {
        const create = Type.prototype.createBuffer, remove = Type.prototype.deleteBuffer;
        Type.prototype.createBuffer = function(...args) { const b = create.apply(this, args); if (b && !alive.has(b)) { alive.add(b); window.suspensionBuffers++; } return b; };
        Type.prototype.deleteBuffer = function(b) { if (b && alive.has(b)) { alive.delete(b); window.suspensionBuffers--; } return remove.call(this, b); };
      }
    }, tier);
    await context.route('**/api/**', route => route.abort());
    const page = await context.newPage(); page.on('pageerror', e => { if (!report.errors.includes(e.message)) report.errors.push(e.message); });
    page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
    await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773', { waitUntil: 'domcontentloaded' }); await page.waitForSelector('canvas');
    await page.waitForTimeout(1000);
    const fixture = await page.evaluate(async mobile => {
      const { useAppStore: app } = await import('/src/store/useAppStore.ts');
      const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
      const { computeMolarMass } = await import('/src/engine/ledger.ts');
      const { calculateSpillRadius } = await import('/src/science/overflowPhysics.ts');
      const { spillSuspensionAppearance } = await import('/src/science/spillSuspension.ts');
      const { stepWorkbenchSpills } = await import('/src/engine/spillChemistry.ts');
      const recipes = [['CuSO4', 0.0003, 'NaOH', 0.0006], ['FeCl3', 0.0002, 'NaOH', 0.0006],
        ['AgNO3', 0.0003, 'NaCl', 0.0003], ['Pb(NO3)2', 0.0001, 'KI', 0.0002]], spills = {};
      const row = (formula, moles, phase) => ({ formula, moles, phase, mass_g: moles * computeMolarMass(formula) });
      recipes.forEach(([a, na, b, nb], i) => {
        const contents = [row('H2O', 10 / computeMolarMass('H2O'), 'l'), row(a, na, 'aq'), row(b, nb, 'aq')], id = `cloud-${i}`;
        spills[id] = { id, position: [(i - 1.5) * 2.3, -1.175, 2], contents, substances: contents.map(c => c.formula),
          mass_g: contents.reduce((s, c) => s + c.mass_g, 0), volume_ml: 10, radius: calculateSpillRadius(10), color: '#ffffff', temperature_c: 25, isHazard: true, timestamp: 0 };
      });
      spills.iron = { id: 'iron', position: [0, -1.175, 4.3], contents: [row('Fe', 1 / computeMolarMass('Fe'), 's')], substances: ['Fe'], mass_g: 1,
        volume_ml: 0, radius: 0, color: '#4a4f54', isHazard: false, temperature_c: 25, timestamp: 0 };
      app.setState({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], spills, activeKinetics: {}, pendingReactions: {}, inFlightPours: [],
        workbenchEscapedGas_g: {}, isSimulationPaused: true, leftSidebarOpen: false, rightSidebarOpen: false, selectedVesselId: null, timeScale: 1 });
      const canvasRoot = [..._roots.values()].find(r => r.store.getState().gl.domElement === document.querySelector('canvas')), root = canvasRoot.store.getState();
      root.internal.subscribe({ current: ({ camera }) => { camera.position.set(0, mobile ? 7 : 3.5, mobile ? 14 : 8);
        camera.lookAt(0, -1.175, 2.5); camera.updateMatrixWorld(); } }, 0, canvasRoot.store);
      window.spillSuspensionAudit = { app, stepWorkbenchSpills, initial: structuredClone(spills), root, capture: () => ({
        mass_g: Object.values(app.getState().spills).reduce((s, p) => s + p.mass_g, 0),
        pools: Object.values(app.getState().spills).filter(s => s.volume_ml > 0).map(s => {
          const a = spillSuspensionAppearance(s), bed = root.scene.getObjectByName(`spill-sediment:${s.id}`);
          return { id: s.id, suspended_g: a.suspended_g, settled_g: a.settled_g, scattering_per_m: a.scattering_per_m,
            bedVolume_m3: a.bedVolume_m3, cohorts: s.suspension?.species.map(s => s.cohorts.length), bedVisible: !!bed };
        }), powder: root.scene.getObjectByName('spill-powder:iron')?.geometry.type,
        buffers: window.suspensionBuffers, losses: window.suspensionLosses }) };
      return JSON.stringify({ vessels: {}, burners: {}, savedAt: Date.now(), materials: { spills, inFlightPours: [],
        wasteMass_g: 0, wasteContents: [], workbenchEscapedGas_g: {} } });
    }, mobile);
    if (tier === 'low' && !mobile) await writeFile(resolve('artifacts/spill-suspension/fixture.json'), fixture);
    await page.evaluate(() => window.spillSuspensionAudit.app.getState().setSimulationPaused(false));
    await page.waitForFunction(() => { const s = window.spillSuspensionAudit.capture(); return s.pools.every(p => p.suspended_g > 0 && p.settled_g > 0); }, undefined, { timeout: 60000 });
    await page.evaluate(() => window.spillSuspensionAudit.app.getState().setSimulationPaused(true)); await page.waitForTimeout(200);
    const fresh = await page.evaluate(() => window.spillSuspensionAudit.capture());
    await page.screenshot({ path: resolve(output, `${tier}-${mobile ? 'mobile' : 'desktop'}-fresh.png`) });
    await page.waitForTimeout(500);
    const paused = await page.evaluate(() => window.spillSuspensionAudit.capture());
    if (JSON.stringify(fresh.pools) !== JSON.stringify(paused.pools) || fresh.mass_g !== paused.mass_g) throw new Error('Suspension moved while paused');
    await page.evaluate(() => { const a = window.spillSuspensionAudit; a.app.setState({ timeScale: 5 }); a.app.getState().setSimulationPaused(false); });
    await page.waitForFunction(() => window.spillSuspensionAudit.capture().pools.every(p => p.settled_g > 10 * p.suspended_g), undefined, { timeout: 60000 });
    await page.evaluate(() => window.spillSuspensionAudit.app.getState().setSimulationPaused(true)); await page.waitForTimeout(200);
    const settled = await page.evaluate(() => window.spillSuspensionAudit.capture());
    if (Math.abs(fresh.mass_g - settled.mass_g) > 1e-8 || settled.powder !== 'ConeGeometry') throw new Error('Mass or stock form changed');
    await page.screenshot({ path: resolve(output, `${tier}-${mobile ? 'mobile' : 'desktop'}-settled.png`) });
    await page.waitForFunction(() => {
      const s = window.spillSuspensionAudit.app.getState(), saved = JSON.parse(localStorage.getItem('chemlab_physical_state_v4') ?? 'null');
      return saved && JSON.stringify(saved.materials?.spills) === JSON.stringify(s.spills);
    });
    const restored = await page.evaluate(async () => {
      const { loadPersistedLabState } = await import('/src/store/persistence.ts');
      const a = window.spillSuspensionAudit, saved = loadPersistedLabState();
      const same = JSON.stringify(saved.materials.spills) === JSON.stringify(a.app.getState().spills);
      a.app.setState({ spills: saved.materials.spills }); return same;
    });
    if (!restored) throw new Error('Suspension checkpoint did not round trip');
    if (tier === 'low' && !mobile) {
      await page.evaluate(() => { const a = window.spillSuspensionAudit; a.app.setState({ spills: a.initial }); }); await page.waitForTimeout(500);
      const baseline = await page.evaluate(() => window.spillSuspensionAudit.capture());
      for (let i = 0; i < 30; i++) {
        await page.evaluate(() => { const a = window.spillSuspensionAudit; let spills = structuredClone(a.initial);
          for (let j = 0; j < 5; j++) spills = a.stepWorkbenchSpills(spills, 0.1).spills;
          a.app.setState({ spills }); }); await page.waitForTimeout(100);
      }
      await page.evaluate(() => { const a = window.spillSuspensionAudit; a.app.setState({ spills: a.initial }); }); await page.waitForTimeout(800);
      const end = await page.evaluate(() => window.spillSuspensionAudit.capture());
      if (end.buffers - baseline.buffers > 8 || end.losses) throw new Error(`Resource growth: ${baseline.buffers} -> ${end.buffers}`);
      report.churn = { cycles: 30, before: baseline.buffers, after: end.buffers };
    }
    report.cases.push({ tier, mobile, fresh, settled, paused: true, checkpointRestored: restored }); await context.close();
  }
} finally { await browser.close(); await writeFile(resolve(output, 'browser-audit.json'), JSON.stringify(report, null, 2)); }
if (report.errors.length || report.consoleErrors.length) throw new Error(JSON.stringify(report));
console.log(JSON.stringify({ cases: report.cases.map(c => ({ tier: c.tier, mobile: c.mobile, mass_g: c.settled.mass_g })), churn: report.churn }));
