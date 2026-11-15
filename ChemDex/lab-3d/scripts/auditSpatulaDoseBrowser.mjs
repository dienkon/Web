import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
const output = process.env.LAB_SPATULA_OUTPUT ?? 'artifacts/spatula-dose';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const report = { errors: [], checks: [] };
await page.routeWebSocket('**', route => {
  const server = route.connectToServer();
  server.onMessage(message => {
    let type; try { type = JSON.parse(String(message)).type; } catch { /* Ordinary socket payload. */ }
    if (type !== 'update' && type !== 'full-reload') route.send(message);
  });
});
page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
await page.addInitScript(() => {
  performance.setResourceTimingBufferSize(10000);
  localStorage.setItem('chemlab_vfx_quality_preference', 'low');
});
try {
  await page.goto(process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767', { waitUntil: 'domcontentloaded' });
  await page.locator('#manual-lab canvas').waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const loaded = pattern => performance.getEntriesByType('resource').map(r => r.name).findLast(name => pattern.test(name));
    const { useAppStore: app } = await import(loaded(/\/src\/store\/useAppStore\.ts(?:\?|$)/));
    const { _roots } = await import(loaded(/\/@react-three_fiber\.js(?:\?|$)/));
    let mounted;
    for (let i = 0; i < 300 && !mounted; i++) {
      mounted = [..._roots.values()].find(r => r.store.getState().gl?.domElement === document.querySelector('#manual-lab canvas'));
      if (!mounted) await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (!mounted) throw new Error('Manual scene did not mount');
    app.setState({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], activeKinetics: {}, pendingReactions: {},
      spills: {}, inFlightPours: [], isSimulationPaused: true, moveMode: false, timeScale: 0.25,
      language: 'vi', leftSidebarOpen: false, rightSidebarOpen: false });
    app.getState().addVessel('beaker', 'Mẫu thìa hữu hạn');
    const id = app.getState().vesselIds.at(-1);
    app.setState(s => ({ vessels: { ...s.vessels, [id]: { ...s.vessels[id], position: [0, -0.135, 1.5], capacity_ml: 100 } },
      selectedVesselId: id, rightSidebarOpen: false }));
    app.getState().setActiveTool('spatula'); app.getState().setSpatulaScoop('Fe', 1, '#73777f');
    const root = mounted.store.getState();
    root.internal.subscribe({ current: ({ camera }) => {
      camera.position.set(0, 3.2, 10); camera.lookAt(0, 0.2, 1.5); camera.updateMatrixWorld();
    } }, 0, root.internal.subscribers.find(s => s.store)?.store);
    const contacts = [], advance = app.getState().advancePourContact;
    app.setState({ advancePourContact: (doseId, fraction, pieces) => {
      contacts.push({ doseId, fraction, pieces: pieces?.map(p => ({ mass_g: p.mass_g, position_m: p.position_m })) ?? [] });
      return advance(doseId, fraction, pieces);
    } });
    window.spatulaAudit = { app, root, id, contacts, capture: () => {
      const state = app.getState(), dose = state.pouringChemical;
      return { mass_g: state.vessels[id]?.mass_g, scoop_g: state.spatulaState.mass_g, dose,
        dockVisible: !!root.scene.getObjectByName('tool-spatula'),
        animationVisible: !!root.scene.getObjectByName('solid-dose-animation'), contacts: structuredClone(contacts) };
    } };
    app.getState().setSimulationPaused(false);
  });
  await page.getByRole('button', { name: 'Điều khiển dụng cụ', exact: true }).click();
  await page.getByLabel('Chọn dụng cụ', { exact: true }).selectOption('spatula');
  await page.getByRole('button', { name: 'Cho mẫu vào bình', exact: true }).click();
  await page.evaluate(() => window.spatulaAudit.app.getState().setSimulationPaused(true));
  await page.waitForTimeout(500);
  const reserved = await page.evaluate(() => window.spatulaAudit.capture());
  assert.equal(reserved.mass_g, 0); assert.equal(reserved.scoop_g, 0);
  assert.equal(reserved.dose.amount, 1); assert.equal(reserved.dose.source.kind, 'spatula');
  assert.equal(reserved.dockVisible, false); assert.equal(reserved.animationVisible, true);
  await page.screenshot({ path: `${output}/button-paused-before-contact.png` });
  await page.evaluate(() => window.spatulaAudit.app.getState().setSimulationPaused(false));
  await page.waitForFunction(() => {
    const a = window.spatulaAudit, s = a.app.getState(), m = s.vessels[a.id].mass_g;
    if (m > 0 && m < 1) { s.setSimulationPaused(true); return true; }
    return false;
  }, undefined, { polling: 'raf', timeout: 30000 });
  const partial = await page.evaluate(() => window.spatulaAudit.capture());
  assert(partial.mass_g > 0 && partial.mass_g < 1);
  assert.equal(partial.dockVisible, false);
  assert(partial.contacts.some(contact => contact.pieces.length > 0));
  await page.screenshot({ path: `${output}/partial-physical-contact.png` });
  await page.evaluate(() => { const a = window.spatulaAudit; a.app.getState().clearPour(a.app.getState().pouringChemical.id); });
  await page.waitForTimeout(150);
  const cancelled = await page.evaluate(() => window.spatulaAudit.capture());
  assert(Math.abs(cancelled.mass_g + cancelled.scoop_g - 1) < 1e-10);
  assert.equal(cancelled.dose, null);
  report.checks.push({ case: 'button-pause-contact-cancel', reserved, partial, cancelled });
  await page.getByRole('button', { name: 'Đóng bảng dụng cụ', exact: true }).click();
  await page.evaluate(() => { const s = window.spatulaAudit.app.getState(); s.setSimulationPaused(false); s.setTimeScale(1); });
  await page.waitForTimeout(500);
  const point = await page.evaluate(() => {
    const a = window.spatulaAudit, tool = a.root.scene.getObjectByName('tool-spatula'), rect = a.root.gl.domElement.getBoundingClientRect();
    tool.updateWorldMatrix(true, true);
    const p = tool.children[0].position.clone(); tool.localToWorld(p); p.project(a.root.camera);
    return { x: rect.left + (p.x + 1) * rect.width / 2, y: rect.top + (1 - p.y) * rect.height / 2 };
  });
  await page.mouse.click(point.x, point.y);
  await page.waitForFunction(() => window.spatulaAudit.app.getState().pouringChemical?.source?.kind === 'spatula');
  const clicked = await page.evaluate(() => window.spatulaAudit.capture());
  assert.equal(clicked.mass_g, cancelled.mass_g);
  assert.equal(clicked.dose.amount, cancelled.scoop_g);
  await page.waitForFunction(() => !window.spatulaAudit.app.getState().pouringChemical, undefined, { timeout: 30000 });
  const completed = await page.evaluate(() => window.spatulaAudit.capture());
  assert(Math.abs(completed.mass_g - 1) < 1e-10); assert.equal(completed.scoop_g, 0);
  const delivered = completed.contacts.filter(c => c.doseId === clicked.dose.id).flatMap(c => c.pieces).reduce((sum, p) => sum + p.mass_g, 0);
  assert(Math.abs(delivered - clicked.dose.amount) < 1e-10);
  await page.screenshot({ path: `${output}/mesh-click-completed.png` });
  report.checks.push({ case: 'real-mesh-click-finite-remainder', clicked, completed });
  assert.deepEqual(report.errors, []); report.passed = true;
  console.log(JSON.stringify({ passed: true, checks: report.checks.map(c => c.case), errors: report.errors }));
} catch (error) {
  report.failure = String(error);
  report.state = await page.evaluate(() => window.spatulaAudit?.capture()).catch(() => null);
  await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  throw error;
} finally {
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
