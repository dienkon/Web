import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { auditExteriorOverflow } from './auditOverflowTransport.mjs';

const origin = process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773';
const output = path.resolve(process.env.CONTACT_AUDIT_OUTPUT ?? 'docs/research/overflow-transit-2026-10-29/contact-and-overflow');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { errors: [], consoleErrors: [], observations: [], phases: [] };
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
  await context.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'medium'));
  await context.route('**/api/**', route => route.abort());
  const page = await context.newPage();
  page.on('pageerror', error => report.errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.text().includes('net::ERR_FAILED')) report.consoleErrors.push(message.text()); });
  await page.goto(origin, { waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  await page.evaluate(async () => { window.contactRoots = (await import('/node_modules/.vite/deps/@react-three_fiber.js'))._roots; });
  await page.waitForFunction(() => [...window.contactRoots.values()].some(root => root.store.getState().gl?.domElement === document.querySelector('canvas')), undefined, { timeout: 60000 });
  report.setup = await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
    const { effects } = await import('/src/vfx/vesselEffects.ts');
    for (const id of Object.keys(store.getState().vessels)) store.getState().removeVessel(id);
    store.setState({ burners: {}, leftSidebarOpen: false, rightSidebarOpen: false, isSimulationPaused: true, timeScale: 1 });
    const ids = ['fecl3_naoh', 'agno3_nacl', 'bacl2_na2so4'].map((program, index) => {
      const id = store.getState().prepareStudioProgram(program);
      if (!id) throw new Error(`Cannot prepare ${program}`);
      store.getState().updateVesselPosition(id, [(index - 1) * 3, store.getState().vessels[id].position[1], 1.5]);
      return id;
    });
    const root = [..._roots.values()].find(root => root.store.getState().gl.domElement === document.querySelector('canvas'));
    const scene = root.store.getState().scene;
    Object.assign(window, { contactStore: store, contactScene: scene, contactEffects: effects, contactIds: ids,
      contactHistory: [], contactInitial: ids.map(id => store.getState().vessels[id]) });
    window.contactUnsubscribe = store.subscribe(state => {
      const entry = ids.map(id => ({ id, progress: state.activeKinetics[id]?.progress,
        precipitate_g: state.vessels[id]?.precipitateAmount_g, mass_g: state.vessels[id]?.mass_g,
        evaporated_g: state.vessels[id]?.evaporated_ml ?? 0 }));
      const key = JSON.stringify(entry);
      if (key !== window.lastContactKey) { window.contactHistory.push(entry); window.lastContactKey = key; }
    });
    return ids.map(id => ({ id, program: store.getState().vessels[id].studioProgramId, mass_g: store.getState().vessels[id].mass_g }));
  });
  await page.waitForTimeout(2500);
  await page.evaluate(() => {
    for (const id of window.contactIds) if (!window.contactStore.getState().runStudioProgram(id)) throw new Error('Run failed');
    window.contactStore.setState({ isSimulationPaused: false });
  });
  await page.waitForFunction(() => window.contactIds.every(id => (window.contactStore.getState().activeKinetics[id]?.progress ?? 1) > 0.95), undefined, { timeout: 60000 });
  await page.evaluate(() => window.contactStore.setState({ isSimulationPaused: true }));
  if (await page.getByText(/(?:tua nhanh|time-lapse) ×225/).count()) throw new Error('Authored timeWarp shown as actual clock speed');
  report.clockBadgeTruthful = true;
  report.contactHistory = await page.evaluate(() => window.contactHistory);
  for (const setup of report.setup) {
    const entries = report.contactHistory.flat().filter(entry => entry.id === setup.id);
    if (!entries.some(entry => entry.progress > 0 && entry.progress < 1)) throw new Error(`No continuous contact evolution ${setup.program}`);
    if (!entries.some(entry => entry.precipitate_g > 0)) throw new Error(`No solid ${setup.program}`);
    if (entries.some(entry => Math.abs(entry.mass_g + entry.evaporated_g - setup.mass_g) > 1e-5)) throw new Error(`Contact mass mismatch ${setup.program}`);
  }
  await page.screenshot({ path: path.join(output, '01-rapid-precipitation.png') });
  console.log('Verified live rapid precipitation');
  await page.evaluate(() => window.contactUnsubscribe());
  await auditExteriorOverflow(page, output, report);
  await context.close();
} catch (error) { report.errors.push(error.stack ?? String(error)); process.exitCode = 1; }
finally { await browser.close(); await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n'); }
if (report.errors.length || report.consoleErrors.length) process.exitCode = 1;
console.log(JSON.stringify({ errors: report.errors, consoleErrors: report.consoleErrors, phases: report.phases.length }, null, 2));
