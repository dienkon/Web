import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve(process.env.LAB_CAPTION_OUTPUT ?? 'artifacts/auto-captions');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
const report = { errors: [], stages: [] };
await page.routeWebSocket('**', route => {
  const server = route.connectToServer();
  server.onMessage(message => {
    let type; try { type = JSON.parse(String(message)).type; } catch { /* Worker/socket traffic. */ }
    if (type !== 'update' && type !== 'full-reload') route.send(message);
  });
});
await page.addInitScript(() => performance.setResourceTimingBufferSize(10000));
page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error' && /shader|webgl|THREE/i.test(message.text())) report.errors.push(message.text()); });

async function select(id) {
  if (!(await page.locator('#automatic-lab [data-sidebar="left"]').count())) await page.getByRole('button', { name: 'Hiện danh mục tự động', exact: true }).click();
  const title = await page.evaluate(id => window.captionAudit.entries.find(entry => entry.id === id).title, id);
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).fill(title);
  await page.getByRole('button', { name: title, exact: false }).first().click();
  await page.waitForFunction(id => window.captionAudit.e?.id === id, id);
  await page.evaluate(async () => {
    const a = window.captionAudit;
    await a.e.stocks.initialize();
    const loaded = pattern => performance.getEntriesByType('resource').map(r => r.name).findLast(name => pattern.test(name));
    const { _roots } = await import(loaded(/@react-three_fiber\.js(?:\?|$)/));
    a.root = _roots.get(document.querySelector('#automatic-lab canvas')).store;
  });
}

async function capture(condition, filename) {
  const state = await page.evaluate(condition => {
    const a = window.captionAudit, e = a.e, done = new Function('e', `return (${condition})`);
    e.paused = false;
    for (let frame = 0; frame < 12000 && !done(e) && !e.error; frame++) a.tick.call(e, 1 / 60);
    if (!done(e)) throw new Error(`Caption state not reached: ${e.phase} ${e.error}`);
    e.paused = true; e.camera = 'transfer'; e.automaticCamera = true; a.root.getState().invalidate();
    const d = e.donors[e.donorIndex];
    return { id: e.id, phase: e.phase, caption: e.caption, time: e.elapsed, formula: d.row.formula,
      fraction: d.fraction, mass_g: d.row.mass_g, arrived: d.solid?.arrived, released: d.solid?.released,
      airborneMass_g: e.inFlightMass_g, valveOpen: e.gasValveOpen, steps: e.steps };
  }, condition);
  await page.getByText(state.caption, { exact: true }).waitFor({ timeout: 10000 });
  await page.waitForTimeout(500);
  await page.screenshot({ path: resolve(output, filename) });
  report.stages.push({ ...state, screenshot: filename, visibleCaption: true });
  return state;
}

try {
  await page.goto(`${process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767'}/?mode=auto`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Hiện danh mục tự động', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const loaded = pattern => performance.getEntriesByType('resource').map(r => r.name).findLast(name => pattern.test(name));
    const { AutoExperiment, AUTO_EXPERIMENTS } = await import(loaded(/\/AutoExperiment\.ts(?:\?|$)/));
    window.captionAudit = { entries: AUTO_EXPERIMENTS, tick: AutoExperiment.prototype.tick };
    AutoExperiment.prototype.tick = function () { window.captionAudit.e = this; };
  });
  await select('cu_agno3');
  const airborne = await capture("e.phase === 'dose' && e.donors[e.donorIndex]?.solid?.released > 0 && e.donors[e.donorIndex].solid.arrived === 0", '01-solid-airborne-zero-grams.png');
  assert.ok(airborne.airborneMass_g > 0 && airborne.fraction === 0);
  assert.match(airborne.caption, /· 0\.00 \/ [\d.e+-]+ g đã vào bình/);
  assert.ok(!airborne.caption.includes('mL'));
  const partial = await capture("e.phase === 'dose' && e.donors[e.donorIndex]?.solid?.arrived > 0 && e.donors[e.donorIndex].fraction < 1", '02-solid-arrived-grams.png');
  assert.ok(partial.arrived > 0 && partial.fraction > 0 && partial.fraction < 1);
  assert.match(partial.caption, /Thêm chất rắn Cu · [\d.e+-]+ \/ [\d.e+-]+ g đã vào bình/);
  await select('nh3_hcl');
  const gas = await capture("e.phase === 'dose' && e.gasValveOpen && e.donors[e.donorIndex].fraction > .1", '03-open-gas-valve-millilitres.png');
  assert.ok(gas.valveOpen && gas.fraction > 0 && gas.fraction < 1);
  assert.match(gas.caption, /Dẫn khí qua ống NH3 · [\d.e+-]+ \/ [\d.e+-]+ mL đã vào bình/);
  assert.deepEqual(report.errors, []);
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  console.log(JSON.stringify(report, null, 2));
} catch (error) {
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify({ error: String(error), ...report }, null, 2) + '\n');
  await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  throw error;
} finally { await browser.close(); }
