import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const output = resolve(process.env.STOCK_CONTACT_OUTPUT ?? 'artifacts/stock-contacts'); await mkdir(output, { recursive: true });
const report = { errors: [], consoleErrors: [], checks: [] };
const browser = await chromium.launch({ channel: 'chrome', headless: true });
try {
  const mobile = process.env.STOCK_CONTACT_MOBILE === '1';
  const context = await browser.newContext(mobile ? { viewport: { width: 430, height: 932 }, isMobile: true, hasTouch: true, deviceScaleFactor: 1 }
    : { viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'low'));
  if (process.env.STOCK_CONTACT_TRACE === '1') await context.addInitScript(() => {
    window.stockTrace = [];
    const post = Worker.prototype.postMessage, attached = new WeakSet();
    Worker.prototype.postMessage = function(message, ...rest) {
      if (message?.input?.containers) {
        if (!attached.has(this)) { attached.add(this); this.addEventListener('message', event => {
          const s = event.data.snapshot;
          if (s && window.stockTrace.length < 1000) window.stockTrace.push({ kind: 'out', tick: s.tick,
            grains: s.grains.map(g => ({ owner: g.vesselId, id: g.pose.id, p: g.pose.position_m })), escapes: s.escapes.map(g => g.pose.id) });
        }); }
        if (window.stockTrace.length < 1000) window.stockTrace.push({ kind: 'in', seconds: message.seconds, paused: message.paused,
          containers: message.input.containers.map(c => ({ id: c.id, p: c.position_m, q: c.rotation, restore: c.restore, mass: c.groups.reduce((sum, g) => sum + g.mass_g, 0) })) });
      }
      return post.call(this, message, ...rest);
    };
  });
  await context.route('**/api/**', route => route.abort());
  const page = await context.newPage(); page.on('pageerror', e => report.errors.push(e.stack ?? e.message));
  page.on('console', m => { if (m.type() === 'error' && !m.text().includes('net::ERR_FAILED')) report.consoleErrors.push(m.text()); });
  await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773', { waitUntil: 'domcontentloaded' });
  await page.waitForSelector('canvas');
  await page.evaluate(async () => {
    const { useAppStore: app } = await import('/src/store/useAppStore.ts');
    const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
    const { computeMolarMass } = await import('/src/engine/ledger.ts');
    const { PourController } = await import('/src/pour/controller/PourController.ts');
    const { geometryVolume } = await import('/src/components/three/stockSolidGeometry.ts');
    app.setState({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {}, spills: {},
      inFlightPours: [], isSimulationPaused: true, leftSidebarOpen: false, rightSidebarOpen: false, timeScale: 1 });
    const ids = [];
    for (const [i, formula] of ['CuSO4·5H2O', 'S', ''].entries()) {
      app.getState().addVessel('beaker', formula || 'Bình nhận'); const id = Object.keys(app.getState().vessels).at(-1); ids.push(id);
      const mass_g = i === 0 ? 5 : i === 1 ? 2 : 0;
      app.setState(s => ({ vessels: { ...s.vessels, [id]: { ...s.vessels[id], capacity_ml: 100,
        contents: formula ? [{ formula, mass_g, moles: mass_g / computeMolarMass(formula), phase: 's', initialMass_g: mass_g }] : [],
        mass_g, volume_ml: 0, volume: 0, substances: formula ? [formula] : [], position: [-2.8 + i * 2.8, -0.135, 2] } } }));
    }
    app.setState({ selectedVesselId: null, leftSidebarOpen: false, rightSidebarOpen: false });
    window.stockContactAudit = { app, ids, PourController, geometryVolume,
      root: () => [..._roots.values()].find(r => r.store.getState().gl.domElement === document.querySelector('canvas')).store.getState() };
  });
  await page.waitForFunction(() => window.stockContactAudit.ids.slice(0, 2).every(id => window.stockContactAudit.app.getState().vessels[id].stockMotion?.grains.length > 0), undefined, { timeout: 60000 });
  await page.evaluate(() => {
    const a = window.stockContactAudit, root = a.root();
    root.internal.subscribe({ current: ({ camera }) => { camera.position.set(0, 3.2, 10); camera.lookAt(0, -0.1, 1.5); camera.updateMatrixWorld(); } }, 0,
      [...root.internal.subscribers].find(s => s.store)?.store);
    a.capture = () => ({ vessels: a.ids.map(id => {
      const v = a.app.getState().vessels[id], poses = v.stockMotion?.grains ?? [];
      const powder = root.scene.getObjectByName(`contact_powder_${id}_S`);
      return { id, mass_g: v.mass_g, contents: v.contents, grains: poses, motionTick: v.stockMotion?.tick,
        maxHeight_m: poses.length ? Math.max(...poses.map(p => p.position_m[1])) - Math.min(...poses.map(p => p.position_m[1])) : 0,
        powder: powder?.children.find(m => m.geometry?.userData.powder)?.geometry.userData.powder };
    }), spills: Object.values(a.app.getState().spills).map(s => ({ id: s.id, mass_g: s.mass_g, motion: s.stockMotion, contents: s.contents })) });
    a.app.getState().setSimulationPaused(false);
  });
  await page.waitForFunction(() => window.stockContactAudit.app.getState().vessels[window.stockContactAudit.ids[0]].stockMotion?.tick >= 180, undefined, { timeout: 60000 });
  await page.evaluate(() => window.stockContactAudit.app.getState().setSimulationPaused(true));
  await page.waitForTimeout(500);
  report.checks.push({ phase: 'settled', snapshot: await page.evaluate(() => window.stockContactAudit.capture()) });
  console.log('settled');
  await page.screenshot({ path: resolve(output, '01-spread-floor.png') });
  const cup = await page.evaluate(() => {
    const a = window.stockContactAudit, root = a.root(), canvas = root.gl.domElement.getBoundingClientRect();
    const p = root.scene.position.clone().fromArray(a.app.getState().vessels[a.ids[1]].position); p.y -= 0.3; p.project(root.camera);
    return { x: canvas.left + (p.x + 1) * canvas.width / 2, y: canvas.top + (1 - p.y) * canvas.height / 2 };
  });
  if (mobile) await page.touchscreen.tap(cup.x, cup.y); else await page.mouse.click(cup.x, cup.y);
  await page.waitForFunction(() => window.stockContactAudit.app.getState().selectedVesselId === window.stockContactAudit.ids[1]);
  report.input = mobile ? 'touch' : 'mouse';
  await page.evaluate(() => window.stockContactAudit.app.setState({ rightSidebarOpen: false, leftSidebarOpen: false }));
  const paused = await page.evaluate(() => window.stockContactAudit.capture());
  await page.waitForTimeout(3500);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('chemlab_physical_state_v4')));
  const preserved = paused.vessels.every(v => (stored.vessels[v.id]?.stockMotion?.grains.length ?? 0) === v.grains.length);
  if (!preserved) throw new Error('Settled contact poses were not persisted');
  const still = await page.evaluate(() => window.stockContactAudit.capture());
  if (JSON.stringify(paused) !== JSON.stringify(still)) throw new Error('Stock moved while paused');
  report.persistence = { stockGrains: paused.vessels.reduce((sum, v) => sum + v.grains.length, 0), paused: true };
  await page.evaluate(() => {
    const a = window.stockContactAudit; a.app.getState().setSimulationPaused(false); a.app.getState().triggerPour('CuSO4·5H2O', a.ids[2], 2);
  });
  await page.waitForFunction(() => window.stockContactAudit.app.getState().vessels[window.stockContactAudit.ids[2]].stockMotion?.grains.length > 0, undefined, { timeout: 60000 });
  await page.screenshot({ path: resolve(output, '02-real-dose-contact.png') });
  await page.waitForFunction(() => {
    const a = window.stockContactAudit; return !a.app.getState().pouringChemical && Math.abs(a.app.getState().vessels[a.ids[2]].mass_g - 2) < 1e-8;
  }, undefined, { timeout: 60000 });
  report.checks.push({ phase: 'after-dose', snapshot: await page.evaluate(() => window.stockContactAudit.capture()) });
  console.log('after-dose');
  await page.screenshot({ path: resolve(output, '03-after-dose.png') });
  await page.evaluate(() => {
    const a = window.stockContactAudit;
    a.PourController.beginPour({ mode: 'HAND_TILT', sourceId: a.ids[0], targetId: a.ids[2], assist: 'off' });
    a.PourController.setTilt(1.9);
  });
  await page.waitForFunction(() => Object.values(window.stockContactAudit.app.getState().spills).some(s => s.stockMotion), undefined, { timeout: 60000 });
  report.checks.push({ phase: 'tilted', snapshot: await page.evaluate(() => window.stockContactAudit.capture()) });
  console.log('tilted');
  await page.screenshot({ path: resolve(output, '04-tilted-escape.png') });
  // Capture follows the actual trajectory: a fast manual tilt may spill or
  // contaminate a neighbouring cup instead of reaching the chosen target.
  await page.waitForFunction(() => window.stockContactAudit.ids.slice(1).some(id => window.stockContactAudit.app.getState().vessels[id].mass_g > 2.01), undefined, { timeout: 60000 }).catch(async error => {
    report.checks.push({ phase: 'capture-timeout', snapshot: await page.evaluate(() => window.stockContactAudit.capture()) });
    report.session = await page.evaluate(() => window.stockContactAudit.PourController.getSession());
    report.trace = await page.evaluate(() => window.stockTrace);
    await page.screenshot({ path: resolve(output, 'capture-timeout.png') }); throw error;
  });
  report.checks.push({ phase: 'captured', snapshot: await page.evaluate(() => window.stockContactAudit.capture()) });
  console.log('captured');
  await page.screenshot({ path: resolve(output, '05-captured-stock.png') });
  await page.evaluate(() => window.stockContactAudit.app.getState().setSimulationPaused(true));
  await page.waitForTimeout(500);
  const final = await page.evaluate(() => window.stockContactAudit.capture());
  const mass = final.vessels.reduce((s, v) => s + v.mass_g, 0) + final.spills.reduce((s, p) => s + p.mass_g, 0);
  if (Math.abs(mass - 9) > 1e-7) throw new Error(`Stock inventory imbalance: ${mass}`);
  report.mass_g = mass;
  const ids = final.vessels.map(v => v.id);
  await page.waitForTimeout(3500);
  await page.reload({ waitUntil: 'domcontentloaded' }); await page.waitForSelector('canvas');
  const restored = await page.evaluate(async ids => {
    const { useAppStore: app } = await import('/src/store/useAppStore.ts'); app.getState().setSimulationPaused(true);
    return ids.map(id => ({ id, mass_g: app.getState().vessels[id]?.mass_g,
      grains: app.getState().vessels[id]?.stockMotion?.grains.map(p => p.id) ?? [] }));
  }, ids);
  if (restored.some(v => !Number.isFinite(v.mass_g))) throw new Error('Saved specimen missing after reload');
  if (restored.reduce((s, v) => s + v.grains.length, 0) === 0) throw new Error('Contact identities lost after reload');
  report.reload = restored;
  await context.close();
} finally { await browser.close(); await writeFile(resolve(output, 'browser-audit.json'), JSON.stringify(report, null, 2)); }
if (report.errors.length || report.consoleErrors.length) throw new Error(JSON.stringify({ errors: report.errors, consoleErrors: report.consoleErrors }));
console.log(JSON.stringify({ phases: report.checks.map(c => c.phase), mass_g: report.mass_g, errors: report.errors, consoleErrors: report.consoleErrors }));
