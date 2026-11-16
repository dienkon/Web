import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const output = process.env.LAB_TITRATION_OUTPUT ?? 'artifacts/titration-controls';
mkdirSync(output, { recursive: true });
const report = { assertions: {}, errors: [] };
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
page.on('pageerror', error => report.errors.push(error.message));
await page.addInitScript(() => { performance.setResourceTimingBufferSize(12000); localStorage.setItem('chemlab_vfx_quality_preference', 'low'); });
const panel = page.getByRole('region', { name: 'Trạm chuẩn độ', exact: true });
try {
  await page.goto(process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767');
  await page.locator('#manual-lab canvas').waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(r => r.name).findLast(n => /\/useAppStore\.ts(?:\?|$)/.test(n));
    const { useAppStore: app } = await import(url);
    app.getState().resetWorkbench();
    const receiver = (id, x) => ({ id, name: id, type: 'beaker', capacity_ml: 100, position: [x, -.135, 0],
      rotationY: 0, isLocked: false, contents: [], substances: [], mass_g: 0, volume_ml: 0, volume: 0,
      temperature_c: 25, ph: 7, hasGas: false, hasPrecipitate: false, isBoiling: false });
    app.setState(s => ({ vessels: { receiverA: receiver('receiverA', 0), receiverB: receiver('receiverB', 3) },
      vesselIds: ['receiverA', 'receiverB'], selectedVesselId: 'receiverB', rightSidebarOpen: true,
      leftSidebarOpen: false, isSimulationPaused: true, timeScale: .1, moveMode: false, draggingVesselId: null,
      titrationHistory: [], burette: { ...s.burette, position: [0, 1, 0], reagentFormula: 'NaCl', concentration_M: .1, currentVolume_ml: .02 } }));
    window.titrationAudit = app;
  });
  await page.getByRole('button', { name: 'Chuẩn độ', exact: true }).click();
  await panel.waitFor();
  report.assertions.actualReceiverShown = await panel.locator('[data-burette-receiver="receiverA"]').count() === 1;
  report.assertions.exactFinalDoseShown = await panel.getByRole('button', { name: 'Nhả một giọt từ buret', exact: true }).textContent() === '+0.02 mL';
  await panel.getByRole('button', { name: 'Nhả một giọt từ buret', exact: true }).click();
  await panel.getByRole('status').filter({ hasText: 'Tiếp tục mô phỏng' }).waitFor();
  report.assertions.pauseExplainedWithoutTransfer = await page.evaluate(() => {
    const s = window.titrationAudit.getState(); return s.burette.currentVolume_ml === .02 && s.vessels.receiverA.mass_g === 0;
  });
  await page.evaluate(() => window.titrationAudit.getState().setSimulationPaused(false));
  await panel.getByRole('button', { name: 'Nhả một giọt từ buret', exact: true }).click();
  await panel.getByRole('status').filter({ hasText: 'Đã nhả 0.020 mL' }).waitFor();
  report.assertions.doseAndGraphUseActualReceiver = await page.evaluate(() => {
    const s = window.titrationAudit.getState(); return s.burette.currentVolume_ml === 0 && s.vessels.receiverA.mass_g > .019
      && s.vessels.receiverB.mass_g === 0 && s.titrationHistory.length === 1 && s.titrationHistory[0].vesselId === 'receiverA';
  });
  assert.match(await panel.textContent(), /Đồ thị: receiverA/);
  await page.screenshot({ path: `${output}/desktop.png` });
  await page.evaluate(() => {
    const app = window.titrationAudit; app.getState().setSimulationPaused(true);
    app.setState(s => ({ burette: { ...s.burette, currentVolume_ml: 1 }, vessels: { ...s.vessels,
      receiverA: { ...s.vessels.receiverA, position: [-3, -.135, 0] } } }));
    app.getState().setSimulationPaused(false);
  });
  await panel.getByRole('button', { name: 'Nhả một giọt từ buret', exact: true }).click();
  await panel.getByRole('status').filter({ hasText: 'Chưa có bình nhận' }).waitFor();
  report.assertions.missingReceiverExplained = await panel.locator('[data-burette-receiver=""]').count() === 1;
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(150);
  await page.evaluate(() => window.titrationAudit.getState().setRightSidebarOpen(true));
  await page.getByRole('button', { name: 'Chuẩn độ', exact: true }).click();
  await panel.waitFor();
  report.assertions.compactPanelDoesNotOverflow = await panel.evaluate(node => {
    const bounds = node.getBoundingClientRect(); return node.scrollWidth <= node.clientWidth + 1 && bounds.left >= 0 && bounds.right <= innerWidth;
  });
  await page.screenshot({ path: `${output}/mobile.png` });
  report.assertions.noRuntimeErrors = report.errors.length === 0;
  assert.ok(Object.values(report.assertions).every(Boolean), JSON.stringify(report.assertions));
  console.log(JSON.stringify(report));
} finally {
  writeFileSync(`${output}/report.json`, JSON.stringify(report, null, 2));
  await browser.close();
}
