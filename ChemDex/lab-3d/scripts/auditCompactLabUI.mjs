import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const output = path.resolve('artifacts/compact-lab-ui');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const report = { errors: [], sizes: [] };
try {
  for (const viewport of [{ width: 1480, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    await page.routeWebSocket('**', () => {});
    page.on('pageerror', error => report.errors.push(error.message));
    await page.route('**/api/**', route => route.abort());
    await page.goto(`${process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6778'}/?seed=42`, { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('canvas', { timeout: 120000 });
    await page.evaluate(async () => {
      const resource = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/store/useAppStore.ts');
      const { useAppStore } = await import(resource?.name ?? '/src/store/useAppStore.ts');
      window.uiAuditStore = useAppStore;
      useAppStore.setState({ language: 'vi', leftSidebarOpen: false, rightSidebarOpen: false, isSimulationPaused: true });
    });
    await page.waitForTimeout(600);
    const within = async selector => {
      const boxes = await page.locator(selector).evaluateAll(elements => elements.filter(el => el.getBoundingClientRect().height > 0).map(el => {
        const box = el.getBoundingClientRect();
        return { label: el.getAttribute('aria-label') || el.textContent.trim().slice(0, 45), x: box.x, y: box.y, right: box.right, bottom: box.bottom };
      }));
      for (const box of boxes) assert(box.x >= -1 && box.y >= -1 && box.right <= viewport.width + 1 && box.bottom <= viewport.height + 1, `${viewport.width}px: ${selector} offscreen ${JSON.stringify(box)}`);
      return boxes;
    };
    const initial = await within('.lab-navigation, .lab-workbench-toolbar, .lab-navigation button, .lab-workbench-toolbar button, .lab-measurement-palette summary, .lab-performance-hud summary');
    assert.equal(await page.locator('[data-sidebar]').count(), 0);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    const canvas = await page.locator('canvas').boundingBox();
    assert(canvas.height >= viewport.height - 100, 'Canvas should use all space below 92px header');
    await page.screenshot({ path: path.join(output, `${viewport.width}-bench.png`) });
    await page.getByRole('button', { name: 'Menu ChemDex', exact: true }).click();
    await within('#chemdex-corner-menu');
    assert.equal(await page.locator('#chemdex-corner-menu a').count(), 6);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('#chemdex-corner-menu').count(), 0);
    await page.getByRole('button', { name: 'Thiết lập bàn thí nghiệm', exact: true }).click();
    await within('#lab-workbench-settings');
    await page.locator('#lab-workbench-settings summary').click();
    await within('#lab-workbench-settings input');
    await page.getByRole('button', { name: 'Vật lí', exact: true }).click();
    const physicsDialog = page.getByRole('dialog', { name: 'Vật lí có kiểm chứng' });
    await physicsDialog.waitFor();
    await physicsDialog.getByRole('button', { name: /Hồ sơ/ }).click();
    assert.equal(await physicsDialog.count(), 1, 'Portal stays mounted while its controls are used');
    await physicsDialog.getByRole('button', { name: 'Đóng', exact: true }).click();
    await page.keyboard.press('Escape');
    await page.getByRole('button', { name: 'Kho hóa chất và dụng cụ', exact: true }).click();
    await within('[data-sidebar="left"]');
    await page.getByRole('button', { name: 'Thông tin bình và phản ứng', exact: true }).click();
    await within('[data-sidebar="right"]');
    if (viewport.width < 1024) assert.equal(await page.locator('[data-sidebar="left"]').count(), 0, 'Mobile draws only one sidebar');
    await page.screenshot({ path: path.join(output, `${viewport.width}-inspector.png`) });
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-sidebar]').count(), 0);
    await page.locator('.lab-measurement-palette summary').click();
    await within('.lab-measurement-grid');
    await page.getByRole('button', { name: 'Đũa khuấy', exact: true }).click();
    assert.equal(await page.evaluate(() => window.uiAuditStore.getState().activeTool), 'stirring_rod');
    assert.equal(await page.locator('.lab-measurement-palette').getAttribute('open'), null, 'Palette closes after choosing a tool');
    await page.getByRole('button', { name: 'Điều khiển dụng cụ', exact: true }).click();
    await within('aside[aria-label="Điều khiển dụng cụ"]');
    await page.getByLabel('Chọn dụng cụ', { exact: true }).selectOption('stirring_rod');
    await page.screenshot({ path: path.join(output, `${viewport.width}-tools.png`) });
    await page.getByRole('button', { name: 'Đóng bảng dụng cụ' }).click();
    await page.getByRole('button', { name: 'Kho hóa chất và dụng cụ', exact: true }).click();
    await page.getByRole('button', { name: 'Bài học', exact: true }).click();
    // The curriculum embeds its reaction library inside the guided experiment UI.
    const libraryTab = page.getByRole('button', { name: /Kho phản ứng|Thư viện phản ứng/ });
    if (await libraryTab.count()) await libraryTab.first().click();
    await page.locator('[data-program-id="cuso4_naoh"]').waitFor({ timeout: 30000 });
    const countBefore = await page.evaluate(() => window.uiAuditStore.getState().vesselIds.length);
    await page.locator('[data-program-id="cuso4_naoh"]').click();
    await page.waitForFunction(count => window.uiAuditStore.getState().vesselIds.length === count + 1, countBefore);
    await page.waitForFunction(() => !window.uiAuditStore.getState().leftSidebarOpen);
    const launched = await page.evaluate(() => {
      const state = window.uiAuditStore.getState(), specimen = state.vessels[state.selectedVesselId];
      return { id: specimen.id, contents: specimen.contents, active: !!state.activeKinetics[specimen.id], paused: state.isSimulationPaused };
    });
    assert.equal(launched.paused, false, 'Quick launch resumes local simulation');
    await page.screenshot({ path: path.join(output, `${viewport.width}-library-launch.png`) });
    await page.keyboard.press('Escape');
    // Exercise pointer capture and keyboard release using a low-fill flask.
    await page.evaluate(async () => {
      const store = window.uiAuditStore;
      const resource = performance.getEntriesByType('resource').find(entry => new URL(entry.name).pathname === '/src/pour/controller/PourController.ts');
      const { PourController } = await import(resource?.name ?? '/src/pour/controller/PourController.ts');
      window.uiAuditPour = PourController;
      const template = Object.values(store.getState().vessels)[0];
      const vessel = (id, type, ml, x) => ({ ...template, id, name: id, type, capacity_ml: 100,
        position: [x, -0.135, 0], rotationY: 0, rotationZ: 0, isLocked: false, isSealed: false, isShattered: false,
        physicalMotion: undefined, liquidMotion: undefined, volume_ml: ml, volume: ml / 100, mass_g: ml,
        temperature_c: 25, stirringIntensity: 0, hasGas: false, hasPrecipitate: false, isBoiling: false,
        reactionTimeline: undefined, reactionState: undefined, substances: ml ? ['H2O'] : [],
        contents: ml ? [{ formula: 'H2O', phase: 'l', mass_g: ml, moles: ml / 18.01528 }] : [] });
      store.setState({ vessels: { source: vessel('source', 'flask', 15, -2), target: vessel('target', 'beaker', 0, 2) },
        vesselIds: ['source', 'target'], activeKinetics: {}, pendingReactions: {}, dissolvingSubstances: {},
        inFlightPours: [], spills: {}, burners: {}, activeTool: 'none', isPouring: false,
        selectedVesselId: 'source', nearestPourTargetId: 'target', isSimulationPaused: false, timeScale: 1,
        pourEpoch: store.getState().pourEpoch + 1 });
      PourController.getSession();
    });
    const hold = page.getByRole('button', { name: /Giữ để rót|Đang rót/ });
    await hold.waitFor();
    await within('[data-pour-controls]');
    const holdBox = await hold.boundingBox();
    await page.mouse.move(holdBox.x + holdBox.width / 2, holdBox.y + holdBox.height / 2);
    await page.mouse.down();
    await page.waitForFunction(() => window.uiAuditStore.getState().vessels.target.volume_ml > 0.05, { timeout: 30000 });
    await within('[data-pour-hud]');
    await page.screenshot({ path: path.join(output, `${viewport.width}-pour.png`) });
    await page.mouse.up();
    await page.waitForFunction(() => !window.uiAuditPour.getSession(), { timeout: 30000 });
    const pointerVolume = await page.evaluate(() => window.uiAuditStore.getState().vessels.target.volume_ml);
    await page.evaluate(() => window.uiAuditStore.setState({ selectedVesselId: 'source', nearestPourTargetId: 'target' }));
    await hold.focus();
    await page.keyboard.down('Space');
    await page.waitForFunction(() => !!window.uiAuditPour.getSession());
    await page.keyboard.up('Space');
    await page.waitForFunction(() => !window.uiAuditPour.getSession(), { timeout: 30000 });
    const settled = await page.evaluate(() => ({ pouring: window.uiAuditStore.getState().isPouring, rotationZ: window.uiAuditStore.getState().vessels.source.rotationZ ?? 0 }));
    assert.equal(settled.pouring, false); assert(Math.abs(settled.rotationZ) < 1e-6);
    report.sizes.push({ viewport, canvas, initial, launched, pointerVolume, settled, passed: true });
    await page.close();
  }
  assert.deepEqual(report.errors, []);
} finally {
  await writeFile(path.join(output, 'audit.json'), JSON.stringify(report, null, 2));
  await browser.close();
}
console.log(JSON.stringify({ errors: report.errors, sizes: report.sizes.map(({ viewport, canvas, pointerVolume, settled, passed }) => ({ viewport, canvas, pointerVolume, settled, passed })) }, null, 2));
