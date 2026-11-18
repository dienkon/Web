import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const origin = process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767';
const output = resolve(process.env.LAB_AUDIT_OUTPUT ?? 'artifacts/interactive-onboarding');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const results = [], storageKey = 'chemdex_lab_interactive_tour_v2';
const actions = [
  ['manual-mode', '#manual-lab-tab'], ['open-catalog', '[data-tour="catalog-toggle"]'],
  ['equipment-tab', '[data-tour="equipment-tab"]'], ['add-beaker', '[data-tour="add-beaker"]'],
  ['select-beaker', '[data-tour="practice-vessel"] button'], ['chemicals-tab', '[data-tour="chemicals-tab"]'],
  ['search-water', '[data-tour="chemical-search"]', 'H2O'], ['choose-water', '[data-tour="chemical-H2O"]'],
  ['measure-water', '[data-tour="dose-10ml"]'], ['confirm-water', '[data-tour="dose-confirm"]'],
  ['wait-water'], ['open-inspect', '[data-tour="inspect-toggle"]'], ['read-volume', '.lab-tour-next'],
  ['lock-vessel', '[data-tour="vessel-lock"]'], ['unlock-vessel', '[data-tour="vessel-lock"]'],
  ['pause-simulation', '[data-tour="simulation-pause"]'], ['resume-simulation', '[data-tour="simulation-pause"]'],
  ['lessons-tab', '[data-tour="lessons-tab"]'], ['read-lessons', '.lab-tour-next'], ['auto-mode', '#automatic-lab-tab'],
  ['auto-catalog', '[data-tour="auto-catalog-toggle"]'], ['auto-search', '[data-tour="auto-search"]', 'CuSO4'],
  ['auto-reaction', '[data-tour-reaction="cuso4_naoh"]'], ['auto-pause', '[data-tour="auto-pause"]'],
  ['auto-timeline', '[data-tour="auto-timeline-toggle"]'], ['read-timeline', '.lab-tour-next'],
  ['auto-closeup', '[data-tour="auto-closeup"]'], ['auto-resume', '[data-tour="auto-pause"]'], ['return-manual', '#manual-lab-tab'],
];

async function run(viewport, label) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce' });
  const page = await context.newPage();
  page.setDefaultTimeout(60000);
  await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
  const errors = [];
  page.on('pageerror', error => errors.push(error.stack ?? error.message));
  const at = id => page.locator(`[data-lab-tour-active][data-tour-step="${id}"]`).waitFor();
  try {
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await at('welcome');
    await page.screenshot({ path: `${output}/${label}-welcome.png` });
    assert.equal(await page.locator('.lab-tour-mask').first().evaluate(el => getComputedStyle(el).backdropFilter), 'blur(5px)');
    await page.getByRole('button', { name: 'Bắt đầu thực hành', exact: true }).click();
    for (const [id, selector, value] of actions) {
      await at(id); console.log(`${label}: ${id}`);
      if (id === 'wait-water') continue;
      await page.locator('[data-tour-focused]').first().waitFor();
      const control = page.locator(selector).first();
      await control.waitFor();
      if (id === 'select-beaker') {
        await page.waitForFunction(() => !!document.querySelector('[data-tour="practice-vessel"][data-tour-focused]'));
        await page.waitForTimeout(800);
        await page.screenshot({ path: `${output}/${label}-vessel-focus.png` });
      }
      if (['equipment-tab', 'measure-water', 'auto-pause'].includes(id)) {
        await page.screenshot({ path: `${output}/${label}-${id}.png` });
        assert.equal(await page.locator('.lab-tour-next').isDisabled(), true, 'Cannot advance before performing the action');
        const bounds = await control.boundingBox(), card = await page.locator('.lab-tour-coach').boundingBox();
        assert.ok(bounds && card);
        const overlap = bounds.x < card.x + card.width && bounds.x + bounds.width > card.x && bounds.y < card.y + card.height && bounds.y + bounds.height > card.y;
        assert.equal(overlap, false, `Coach covers ${id}`);
      }
      if (id === 'search-water') {
        await page.keyboard.press('Escape');
        assert.equal(await page.locator('[data-lab-tour-active]').count(), 0);
        await page.getByRole('button', { name: 'Mở hướng dẫn người mới' }).click();
        await at(id);
        await page.reload({ waitUntil: 'domcontentloaded' });
        await page.getByRole('button', { name: 'Mở hướng dẫn người mới' }).waitFor();
        assert.equal(await page.locator('[data-lab-tour-active]').count(), 0, 'Dismissal survives reload');
        await page.getByRole('button', { name: 'Mở hướng dẫn người mới' }).click();
        await at(id);
        await page.locator('[data-tour="chemical-search"][data-tour-focused]').waitFor();
        await control.fill('wrong formula');
        await page.waitForTimeout(300);
        assert.equal(await page.locator('.lab-tour-next').isDisabled(), true);
      }
      if (value) await control.fill(value); else await control.click();
      if (id === 'add-beaker') await page.waitForFunction(key => !!JSON.parse(localStorage.getItem(key)).vesselId, storageKey);
    }
    await at('finish');
    await page.waitForTimeout(700);
    const actual = await page.evaluate(async key => {
      const url = performance.getEntriesByType('resource').map(e => e.name).findLast(name => /\/src\/store\/useAppStore\.ts(?:\?|$)/.test(name));
      const { useAppStore } = await import(url);
      const progress = JSON.parse(localStorage.getItem(key)), state = useAppStore.getState(), vessel = state.vessels[progress.vesselId];
      return { volume: vessel.volume_ml, water: vessel.contents.some(c => c.formula === 'H2O'), locked: vessel.isLocked, camera: state.cameraFocusPosition, position: vessel.position, done: progress.done };
    }, storageKey);
    assert.ok(Math.abs(actual.volume - 10) < .1, `Expected actual 10 mL, got ${actual.volume}`);
    assert.equal(actual.water, true); assert.equal(actual.locked, false);
    assert.ok(actual.camera && Math.abs(actual.camera[0] - actual.position[0]) < .1, 'Camera focuses on the real vessel');
    for (const [id] of actions) assert.ok(actual.done.includes(id), `Missing completed action ${id}`);
    await page.getByRole('button', { name: 'Hoàn tất', exact: true }).click();
    assert.equal(await page.locator('.lab-tour-mask').count(), 0);
    assert.equal(await page.locator('[data-tour-focused]').count(), 0);
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.getByRole('button', { name: 'Mở hướng dẫn người mới' }).waitFor();
    assert.equal(await page.locator('[data-lab-tour-active]').count(), 0);
    await page.getByRole('button', { name: 'Mở hướng dẫn người mới' }).click();
    await at('welcome');
    await page.getByRole('button', { name: 'Đọc hướng dẫn chi tiết', exact: true }).click();
    await page.locator('dialog.lab-guide').waitFor();
    await page.getByRole('button', { name: 'Switch guide to English' }).click();
    assert.equal(await page.locator('#lab-guide-title').textContent(), 'Meet your virtual lab');
    await page.getByRole('button', { name: 'Close guide for now' }).click();
    await at('welcome');
    assert.ok((await page.locator('#lab-tour-title').textContent()).includes('Let’s try'));
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('[data-lab-tour-active]').count(), 0);
    assert.deepEqual(errors, []);
    results.push({ viewport, actions: actions.length, receivedVolume_ml: actual.volume, errors });
  } catch (error) {
    await page.screenshot({ path: `${output}/${label}-failure.png` }).catch(() => {});
    console.error('Current step:', await page.locator('[data-lab-tour-active]').getAttribute('data-tour-step').catch(() => null));
    console.error('Focused target:', await page.locator('[data-tour-focused]').evaluateAll(elements => elements.map(el => ({ tag: el.tagName, tour: el.getAttribute('data-tour'), rect: el.getBoundingClientRect().toJSON() }))));
    throw error;
  } finally { await context.close(); }
}
async function edgeCases() {
  const context = await browser.newContext({ viewport: { width: 320, height: 568 }, reducedMotion: 'reduce' });
  const page = await context.newPage(); page.setDefaultTimeout(60000);
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(key => {
    performance.setResourceTimingBufferSize(5000);
    localStorage.setItem(key, JSON.stringify({ index: 30, completed: true, done: [], vesselId: null }));
    localStorage.setItem('chemlab_vfx_quality_preference', 'low');
  }, storageKey);
  const at = id => page.locator(`[data-tour-step="${id}"]`).waitFor();
  const seedResume = (id, vesselId = null) => page.evaluate(async ({ id, vesselId }) => {
    const resources = performance.getEntriesByType('resource').map(e => e.name);
    const tourUrl = resources.findLast(n => /\/src\/store\/useLabTour\.ts(?:\?|$)/.test(n));
    const dataUrl = resources.findLast(n => /\/src\/data\/labTour\.ts(?:\?|$)/.test(n));
    const appUrl = resources.findLast(n => /\/src\/store\/useAppStore\.ts(?:\?|$)/.test(n));
    const { useLabTour } = await import(tourUrl), { LAB_TOUR_STEPS } = await import(dataUrl);
    window.__edgeLab = (await import(appUrl)).useAppStore;
    useLabTour.setState({ active: false, index: LAB_TOUR_STEPS.findIndex(step => step.id === id), vesselId, done: [], completed: false });
    useLabTour.getState().start();
  }, { id, vesselId });
  const noOverlap = async selector => {
    await page.locator(`${selector}[data-tour-focused]`).waitFor();
    const a = await page.locator(selector).boundingBox(), b = await page.locator('.lab-tour-coach').boundingBox();
    assert.ok(a && b);
    const overlap = a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
    assert.equal(overlap, false);
    const size = page.viewportSize();
    assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.width <= size.width && a.y + a.height <= size.height);
  };
  try {
    await page.goto(origin, { waitUntil: 'domcontentloaded' });
    await page.locator('[data-tour="catalog-toggle"]').click();
    await page.getByRole('button', { name: 'Rắn', exact: true }).click();
    await page.locator('[data-tour="equipment-tab"]').click();
    await page.getByPlaceholder('Tìm hơn 20 loại dụng cụ...').fill('no equipment matches this');
    await page.locator('[data-tour="simulation-pause"]').click();
    await seedResume('add-beaker');
    await at('add-beaker');
    await page.locator('[data-tour="add-beaker"][data-tour-focused]').waitFor();
    assert.equal(await page.getByPlaceholder('Tìm hơn 20 loại dụng cụ...').inputValue(), '');
    await page.locator('[data-tour="add-beaker"]').click();
    await at('select-beaker');
    await page.locator('[data-tour="practice-vessel"][data-tour-focused]').waitFor();
    await page.waitForTimeout(1000);
    const vesselId = await page.evaluate(key => JSON.parse(localStorage.getItem(key)).vesselId, storageKey);
    const box = await page.locator('[data-tour="practice-vessel"]').boundingBox();
    await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
    await at('chemicals-tab');
    await page.locator('[data-tour="chemicals-tab"][data-tour-focused]').click();
    await at('search-water');
    await page.locator('[data-tour="chemical-search"][data-tour-focused]').fill('H2O');
    await at('choose-water');
    await page.locator('[data-tour="chemical-H2O"][data-tour-focused]').click();
    await at('measure-water');
    await noOverlap('[data-tour="dose-10ml"]');
    await page.screenshot({ path: `${output}/small-phone-measuring.png` });
    await page.locator('[data-tour="dose-10ml"]').click();
    await at('confirm-water');
    await page.setViewportSize({ width: 844, height: 390 });
    await page.waitForTimeout(400);
    await noOverlap('[data-tour="dose-confirm"]');
    await page.screenshot({ path: `${output}/landscape-confirming.png` });
    await page.locator('[data-tour="dose-confirm"]').click();
    await at('open-inspect');
    const water = await page.evaluate(id => ({ volume: window.__edgeLab.getState().vessels[id].volume_ml, paused: window.__edgeLab.getState().isSimulationPaused }), vesselId);
    assert.ok(Math.abs(water.volume - 10) < .1); assert.equal(water.paused, false);
    await page.keyboard.press('Escape');
    assert.equal(await page.locator('.lab-app').evaluate(el => Math.round(el.getBoundingClientRect().width)), 844);
    await seedResume('auto-pause', vesselId);
    await at('auto-reaction');
    await page.locator('[data-tour-reaction="cuso4_naoh"][data-tour-focused]').click();
    await at('auto-pause');
    await page.locator('[data-tour="auto-pause"][data-tour-focused]').click();
    await at('auto-timeline');
    await page.keyboard.press('Escape');
    await page.setViewportSize({ width: 320, height: 568 });
    await seedResume('equipment-tab', vesselId);
    await at('equipment-tab');
    await page.locator('[data-tour-focused]').waitFor();
    const selection = await page.evaluate(() => window.__edgeLab.getState().selectedVesselId);
    for (let i = 0; i < 12; i++) {
      await page.keyboard.press('Tab');
      assert.equal(await page.evaluate(() => !!document.activeElement?.closest('[data-tour-focused],.lab-tour-coach')), true);
    }
    await page.keyboard.press('r'); await page.keyboard.press('g');
    await page.mouse.click(2, 2);
    assert.equal(await page.evaluate(() => window.__edgeLab.getState().selectedVesselId), selection);
    assert.equal(await page.evaluate(() => window.__edgeLab.getState().draggingVesselId), null);
    await page.keyboard.press('Escape');
    assert.equal(await page.evaluate(() => window.__edgeLab.getState().selectedVesselId), selection);
    assert.equal(await page.locator('[data-tour-focused]').count(), 0);
    assert.deepEqual(errors, []);
    results.push({ checks: ['stale filters cleared', 'real 3D vessel click', 'paused-lab recovery', '320px measurement', 'landscape confirmation', 'automatic-runtime recovery', 'focus and shortcut isolation', 'outside clicks blocked', 'cleanup'], errors });
  } catch (error) {
    await page.screenshot({ path: `${output}/edge-failure.png` }).catch(() => {});
    console.error('Edge step:', await page.locator('[data-lab-tour-active]').getAttribute('data-tour-step').catch(() => null));
    throw error;
  } finally { await context.close(); }
}
try {
  if (!process.env.LAB_AUDIT_EDGES_ONLY) {
    await run({ width: 1440, height: 960 }, 'desktop');
    if (!process.env.LAB_AUDIT_DESKTOP_ONLY) await run({ width: 390, height: 844 }, 'phone');
  }
  if (!process.env.LAB_AUDIT_DESKTOP_ONLY) await edgeCases();
  writeFileSync(`${output}/${process.env.LAB_AUDIT_EDGES_ONLY ? 'edge-report' : 'report'}.json`, JSON.stringify(results, null, 2));
  console.log(JSON.stringify(results, null, 2));
} finally { await browser.close(); }
