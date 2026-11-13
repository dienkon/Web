import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const origin = process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767';
const output = process.env.LAB_AUDIT_OUTPUT ?? 'artifacts/automatic-experiments';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
const errors = [];
page.on('pageerror', error => errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error' && /shader|webgl|THREE/i.test(message.text())) errors.push(message.text()); });

async function resize(side, delta) {
  const panel = page.locator(`[data-sidebar="${side}"]`), handle = panel.getByRole('separator');
  const before = await panel.boundingBox(), grip = await handle.boundingBox();
  await page.mouse.move(grip.x + grip.width / 2, grip.y + grip.height / 2);
  await page.mouse.down();
  await page.mouse.move(grip.x + grip.width / 2 + delta, grip.y + grip.height / 2, { steps: 8 });
  await page.mouse.up();
  const after = await panel.boundingBox();
  assert.ok(after.width > before.width + 40, `${side} sidebar must widen`);
  return after.width;
}

// The audit instruments the director in the dev browser, without shipping a
// test bridge in the application. Advance real fixed steps to inspect each act.
async function advance(predicate) {
  return page.evaluate(({ predicate }) => {
    const e = window.__autoAudit;
    if (!e) throw new Error('No automatic director');
    const done = new Function('e', `return (${predicate})`);
    e.paused = false; e.speed = 1;
    for (let i = 0; i < 15000 && !done(e) && !e.error; i++) e.tick(1 / 60);
    e.paused = true;
    window.__autoStore?.getState().invalidate();
    if (!done(e)) throw new Error(`Did not reach ${predicate}: ${e.phase} ${e.error ?? ''}`);
    return { elapsed: e.elapsed, phase: e.phase, mass: e.sample.mass_g, donor: e.donorIndex,
      clouds: [...e.clouds.clouds.values()].reduce((n, c) => n + c.system.particles.length, 0) };
  }, { predicate });
}

try {
  await page.goto(`${origin}/?mode=auto`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).waitFor({ timeout: 60000 });
  assert.equal(await page.getByRole('tab', { name: 'Tự động', exact: true }).getAttribute('aria-selected'), 'true');
  await page.evaluate(async () => {
    const directorUrl = performance.getEntriesByType('resource').map(entry => entry.name).find(name => /\/AutoExperiment\.ts(\?|$)/.test(name));
    const { AutoExperiment } = await import(directorUrl);
    const original = AutoExperiment.prototype.tick;
    AutoExperiment.prototype.tick = function (delta) { window.__autoAudit = this; return original.call(this, delta); };
    const { useAppStore } = await import('/src/store/useAppStore.ts');
    window.__manualBefore = JSON.stringify({ vessels: useAppStore.getState().vessels, burners: useAppStore.getState().burners });
  });
  await page.getByRole('button', { name: 'CuSO4 + NaOH', exact: true }).first().click();
  await page.waitForFunction(() => !!window.__autoAudit);
  await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(entry => entry.name).find(name => /@react-three_fiber\.js/.test(name));
    const { _roots } = await import(url);
    window.__canvasBefore = document.querySelector('canvas');
    window.__autoStore = _roots.get(window.__canvasBefore).store;
  });
  const carrying = await advance("e.phase === 'carry' && e.phaseTime > 0.6");
  assert.equal(carrying.mass, 0, 'No solvent can appear before a transfer');
  await page.screenshot({ path: `${output}/workspace-carry.png` });
  const pouring = await advance("e.phase === 'dose' && e.phaseTime > 1.3");
  assert.ok(pouring.mass > 0);
  await page.waitForTimeout(700);
  const transfer = await page.evaluate(() => {
    const { scene } = window.__autoStore.getState(), e = window.__autoAudit;
    const donor = scene.getObjectByName(`auto_donor_${e.donorIndex}`), stream = scene.getObjectByName('auto_transfer_stream');
    return { pose: donor.position.toArray(), expected: e.donorPose.position, tilt: donor.rotation.z, visible: stream.visible, segments: stream.count };
  });
  assert.deepEqual(transfer.pose, transfer.expected); assert.ok(transfer.tilt < -1);
  assert.equal(transfer.visible, true); assert.ok(transfer.segments > 0);
  await page.screenshot({ path: `${output}/workspace-pour.png` });
  const leftWidth = await resize('left', 80), rightWidth = await resize('right', -70);
  assert.equal(await page.evaluate(() => document.querySelector('canvas') === window.__canvasBefore), true);
  assert.equal(await page.evaluate(() => window.__autoStore.getState().frameloop), 'demand');
  await page.getByRole('separator').first().focus(); await page.keyboard.press('ArrowRight');
  assert.ok((await page.locator('[data-sidebar="left"]').boundingBox()).width > leftWidth);
  const clock = await page.locator('[data-auto-elapsed]').getAttribute('data-auto-elapsed');
  await page.waitForTimeout(500);
  assert.equal(await page.locator('[data-auto-elapsed]').getAttribute('data-auto-elapsed'), clock);
  const precipitate = await advance("e.phase === 'react' || e.phase === 'observe' || e.phase === 'complete'");
  assert.ok(precipitate.mass > 0);
  await page.getByRole('button', { name: 'Góc cận cảnh' }).click();
  await page.waitForTimeout(1200);
  await page.screenshot({ path: `${output}/workspace-precipitate.png` });
  await page.getByRole('button', { name: 'Làm lại thí nghiệm' }).click();
  await page.waitForFunction(() => window.__autoAudit.elapsed < 2 && window.__autoAudit.donorIndex === 0);
  assert.equal(await page.evaluate(() => window.__autoAudit.sample.mass_g), 0);
  assert.equal(await page.evaluate(() => document.querySelector('canvas') === window.__canvasBefore), true, 'Restart reuses the WebGL context');
  await page.getByRole('button', { name: 'Cu + HNO3', exact: true }).first().click();
  await page.waitForFunction(() => window.__autoAudit.program.id === 'cu_hno3_conc');
  const smoke = await advance('e.clouds.clouds.size > 0 && [...e.clouds.clouds.values()].some(c => c.system.particles.length > 10)');
  assert.ok(smoke.clouds > 10);
  await page.getByRole('button', { name: 'Góc cận cảnh' }).click(); await page.waitForTimeout(900);
  await page.screenshot({ path: `${output}/workspace-smoke.png` });
  await page.getByRole('button', { name: 'NH3 + HCl', exact: true }).first().click();
  await page.waitForFunction(() => window.__autoAudit.program.id === 'nh3_hcl');
  const clean = await page.evaluate(() => ({ mass: window.__autoAudit.sample.mass_g, clouds: window.__autoAudit.clouds.clouds.size,
    donorMeshes: window.__autoStore.getState().scene.children.flatMap(c => c.children).length }));
  assert.equal(clean.mass, 0); assert.equal(clean.clouds, 0);
  assert.equal(await page.evaluate(() => document.querySelector('canvas') === window.__canvasBefore), true, 'Changing reactions reuses the canvas');
  const finished = await advance("e.phase === 'complete' && e.phaseTime > 3.1");
  assert.equal(finished.phase, 'complete');
  await page.getByRole('checkbox', { name: 'Liên tục' }).check();
  await page.getByRole('button', { name: 'Tiếp tục tự động', exact: true }).click();
  await page.waitForFunction(() => window.__autoAudit.program.id !== 'nh3_hcl');
  await page.getByRole('checkbox', { name: 'Liên tục' }).uncheck();
  await page.getByRole('button', { name: 'Toàn màn hình bàn tự động' }).click();
  await page.waitForFunction(() => !!document.fullscreenElement);
  await page.keyboard.press('Escape');
  await page.waitForFunction(() => !document.fullscreenElement);
  const manualPreserved = await page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/useAppStore.ts');
    return JSON.stringify({ vessels: useAppStore.getState().vessels, burners: useAppStore.getState().burners }) === window.__manualBefore;
  });
  assert.equal(manualPreserved, true, 'Automatic playback must not modify the manual bench');
  await page.getByRole('tab', { name: 'Thao tác', exact: true }).click();
  await page.getByRole('tabpanel', { name: 'Thao tác', exact: true }).waitFor();
  await page.locator('[data-sidebar="right"]').waitFor({ state: 'visible', timeout: 60000 });
  assert.ok((await page.locator('[data-sidebar="right"]').boundingBox()).width >= rightWidth - 1);
  await resize('left', 50); await resize('right', -45);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('tab', { name: 'Tự động', exact: true }).click();
  await page.getByRole('button', { name: 'CuSO4 + NaOH', exact: true }).first().click();
  await page.waitForFunction(() => window.__autoAudit.program.id === 'cuso4_naoh');
  assert.equal(await page.locator('[data-sidebar]').count(), 0, 'Mobile panels close after selection');
  await advance("e.phase === 'dose' && e.phaseTime > 1.4");
  await page.waitForTimeout(700); await page.screenshot({ path: `${output}/workspace-mobile.png` });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
  await page.getByRole('button', { name: 'Hiện danh mục tự động' }).click();
  assert.equal(await page.locator('[data-sidebar="left"]').count(), 1);
  await page.getByRole('button', { name: 'Đóng danh mục tự động' }).click();
  await page.getByRole('button', { name: 'Hiện trình tự tự động' }).click();
  assert.equal(await page.locator('[data-sidebar="right"]').count(), 1);
  await page.getByRole('button', { name: 'Đóng trình tự tự động' }).click();
  assert.deepEqual(errors, []);
  const report = { automaticTab: true, resizableManualAndAutomaticSidebars: true, keyboardResize: true,
    emptyReceiverBeforePour: true, animatedDonorAndStream: transfer, pauseUsesDemandRendering: true,
    restartReusesCanvas: true, nextReactionClearsPreviousRun: true, smoke: true, playlist: true, fullscreen: true,
    manualBenchPreserved: true, mobile: true, errors };
  writeFileSync(`${output}/workspace-browser.json`, JSON.stringify(report, null, 2) + '\n');
  console.log(report);
} catch (error) {
  await page.screenshot({ path: `${output}/workspace-failure.png` }).catch(() => {});
  console.error({ errors }); throw error;
} finally { await browser.close(); }
