import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { prepareLabAuditSession } from './fixtures/labAuditSession.mjs';

const output = resolve(process.env.LAB_CLOCK_OUTPUT ?? 'artifacts/instrument-clock');
mkdirSync(output, { recursive: true });
const report = { probes: [], assertions: {}, errors: [] };
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1366, height: 768 } });
await prepareLabAuditSession(page);
await page.addInitScript(() => {
  performance.setResourceTimingBufferSize(12000);
  localStorage.setItem('chemlab_vfx_quality_preference', 'low');
});
page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error' && /shader|webgl|THREE/i.test(message.text())) report.errors.push(message.text()); });
page.setDefaultTimeout(60000);

const snapshot = name => page.evaluate(name => {
  const object = window.__instrumentClock.root.scene.getObjectByName(name);
  if (!object) throw new Error(`Missing visible instrument: ${name}`);
  const text = []; object.traverse(child => { if (typeof child.text === 'string') text.push(child.text); });
  return { position: object.position.toArray(), rotation: object.rotation.toArray(), text };
}, name);

try {
  await page.goto(process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767', { waitUntil: 'domcontentloaded' });
  await page.locator('#manual-lab canvas').waitFor();
  await page.evaluate(async () => {
    const loaded = pattern => performance.getEntriesByType('resource').map(entry => entry.name).findLast(name => pattern.test(name));
    const { useAppStore: app } = await import(loaded(/\/useAppStore\.ts(?:\?|$)/));
    const { _roots } = await import(loaded(/@react-three_fiber\.js(?:\?|$)/));
    const { useInstrumentStore: instruments } = await import(loaded(/\/instrumentState\.ts(?:\?|$)/));
    app.getState().resetWorkbench();
    app.setState({ vessels: {}, vesselIds: [], burners: {}, burnerIds: [], isSimulationPaused: true, timeScale: 1,
      leftSidebarOpen: false, rightSidebarOpen: true, language: 'vi' });
    app.getState().addVessel('beaker', 'Mẫu kiểm tra dụng cụ đo');
    const id = app.getState().vesselIds.at(-1), vessel = app.getState().vessels[id];
    app.setState({ selectedVesselId: id, vessels: { [id]: { ...vessel, position: [0, -.135, 0], capacity_ml: 250,
      volume_ml: 150, volume: .6, mass_g: 150, temperature_c: 80, liquidColor: '#f8fafc', substances: ['H2O'],
      contents: [{ formula: 'H2O', phase: 'l', mass_g: 150, moles: 150 / 18.015 }] } } });
    instruments.setState({ balanceTare_g: 0 });
    let mounted;
    for (let i = 0; i < 300 && !mounted; i++) {
      mounted = _roots.get(document.querySelector('#manual-lab canvas'));
      if (!mounted) await new Promise(resolve => setTimeout(resolve, 50));
    }
    if (!mounted) throw new Error('Manual scene did not mount');
    window.__instrumentClock = { app, instruments, id, root: mounted.store.getState() };
  });
  for (const tool of ['thermometer', 'ph_meter']) {
    await page.evaluate(tool => {
      const { app } = window.__instrumentClock;
      app.getState().setActiveTool(tool); app.setState({ isSimulationPaused: false, timeScale: 1 });
    }, tool);
    await page.waitForTimeout(700);
    await page.evaluate(() => window.__instrumentClock.app.getState().setSimulationPaused(true));
    await page.waitForTimeout(200);
    const paused = await snapshot(`tool-${tool}`);
    await page.waitForTimeout(650);
    assert.deepEqual(await snapshot(`tool-${tool}`), paused, `${tool}: pose and display must freeze together`);
    assert.ok(paused.text.some(text => tool === 'thermometer' ? /°C/.test(text) : /^pH \d/.test(text)));
    await page.screenshot({ path: `${output}/${tool}-paused.png` });
    await page.evaluate(() => window.__instrumentClock.app.setState({ isSimulationPaused: false, timeScale: 4 }));
    await page.waitForTimeout(300);
    const resumed = await snapshot(`tool-${tool}`);
    assert.notDeepEqual(resumed.position, paused.position, `${tool}: must continue after resume`);
    report.probes.push({ tool, paused, resumed, freezeVerified: true });
  }
  await page.evaluate(() => {
    const { app, instruments, id, root } = window.__instrumentClock;
    const balance = root.scene.getObjectByName('tool-balance');
    app.getState().setActiveTool('balance');
    app.getState().setVesselState(id, { position: balance.position.toArray() });
    instruments.setState({ balanceTare_g: 0 });
    app.setState({ isSimulationPaused: false, timeScale: 1 });
  });
  await page.waitForTimeout(250);
  await page.evaluate(() => window.__instrumentClock.app.getState().setSimulationPaused(true));
  await page.waitForTimeout(150); const balancePaused = await snapshot('tool-balance');
  await page.waitForTimeout(650); assert.deepEqual(await snapshot('tool-balance'), balancePaused);
  await page.evaluate(() => window.__instrumentClock.app.setState({ isSimulationPaused: false, timeScale: 8 }));
  await page.waitForTimeout(800);
  const balanceSettled = await snapshot('tool-balance');
  const mass = Number.parseFloat(balanceSettled.text.find(text => / g$/.test(text)));
  assert.ok(Math.abs(mass - 235) <= .02, `Expected finite 150 g water + 85 g beaker, received ${mass}`);
  report.assertions = { probePauseAndResume: true, balancePause: true, balanceSettlesAt8x: true };
  report.balance = { paused: balancePaused, settled: balanceSettled };
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'Mobile controls must fit');
  await page.screenshot({ path: `${output}/mobile.png` });
  assert.deepEqual(report.errors, []); report.assertions.noRuntimeOrShaderErrors = true;
  console.log(JSON.stringify(report.assertions, null, 2));
} catch (error) {
  report.failure = String(error); await page.screenshot({ path: `${output}/failure.png` }).catch(() => {}); throw error;
} finally {
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2) + '\n');
  await browser.close();
}
