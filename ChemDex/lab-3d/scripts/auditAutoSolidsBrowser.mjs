import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';

const origin = process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767';
const output = 'artifacts/auto-solid-parity';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.addInitScript(() => performance.setResourceTimingBufferSize(5000));
const errors = [], results = [], requestedCases = process.env.LAB_AUTO_SOLID_CASES?.split(',');
page.on('pageerror', error => errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error' && /shader|webgl|THREE/i.test(message.text())) errors.push(message.text()); });

async function advance(predicate) {
  await page.evaluate(predicate => {
    const e = window.__autoAudit, done = new Function('e', `return (${predicate})`);
    e.paused = false;
    for (let i = 0; i < 15000 && !done(e) && !e.error; i++) e.tick(1 / 60);
    e.paused = true;
    window.__autoStore.getState().invalidate();
    if (!done(e)) throw new Error(`Did not reach ${predicate}: ${e.phase} ${e.error ?? ''}`);
  }, predicate);
  await page.waitForTimeout(250);
}
try {
  await page.goto(`${origin}/?mode=auto`, { waitUntil: 'networkidle' });
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).waitFor({ timeout: 60000 });
  const entries = await page.evaluate(async () => {
    const directorUrl = performance.getEntriesByType('resource').map(e => e.name).find(name => /\/AutoExperiment\.ts(\?|$)/.test(name));
    const { AutoExperiment, AUTO_EXPERIMENTS } = await import(directorUrl);
    const original = AutoExperiment.prototype.tick;
    AutoExperiment.prototype.tick = function (delta) { window.__autoAudit = this; return original.call(this, delta); };
    const { useAppStore } = await import('/src/store/useAppStore.ts');
    window.__manualStore = useAppStore;
    window.__manualBefore = JSON.stringify(useAppStore.getState().vessels);
    return ['cu_hno3_conc', 'mg_o2_burn', 'fe_cuso4', 'h2o2_mno2', 'na_h2o', 'zn_hcl', 'al_hcl', 'i2_sublimation', 'kmno4_hcl', 'cuoh2_decomp'].map(id => {
      const entry = AUTO_EXPERIMENTS.find(e => e.id === id);
      return { id, title: entry.title };
    });
  });
  for (const entry of entries) {
    if (requestedCases && !requestedCases.includes(entry.id)) continue;
    await page.getByRole('button', { name: entry.title, exact: false }).first().click();
    await page.waitForFunction(id => window.__autoAudit?.program.id === id, entry.id);
    await page.evaluate(async () => {
      const url = performance.getEntriesByType('resource').map(e => e.name).find(name => /@react-three_fiber\.js/.test(name));
      const { _roots } = await import(url);
      window.__autoStore = _roots.get(document.querySelector('canvas')).store;
      await window.__autoAudit.stocks.initialize();
    });
    await advance("e.phase === 'dose' && e.inFlightMass_g > 0");
    const flight = await page.evaluate(() => {
      const e = window.__autoAudit, index = e.donorIndex, donor = e.donors[index], scene = window.__autoStore.getState().scene;
      const sender = scene.getObjectByName(`auto_donor_solid_${index}`), flying = scene.getObjectByName(`auto_transfer_solid_${index}`);
      const pending = donor.solid.flights.filter(f => !f.arrived);
      return { formula: donor.row.formula, count: flying.count, visible: flying.visible,
        donorCount: sender.count, expectedDonorCount: donor.solid.pieces.length - donor.solid.released,
        expectedCount: pending.length, sameGeometry: sender.geometry === flying.geometry,
        mass: e.sample.mass_g + e.inFlightMass_g + e.donors.reduce((m, d) => m + d.remaining, 0),
        initial: e.donors.reduce((m, d) => m + d.row.mass_g, 0) };
    });
    assert.ok(flight.visible && flight.count > 0);
    assert.equal(flight.count, flight.expectedCount);
    assert.equal(flight.donorCount, flight.expectedDonorCount);
    assert.equal(flight.sameGeometry, true);
    assert.ok(Math.abs(flight.mass - flight.initial) < 1e-7);
    await page.screenshot({ path: `${output}/${entry.id}-flight.png` });
    await advance("(e.phase === 'dose' || e.phase === 'return') && e.donors[e.donorIndex].solid?.arrived > 0");
    const stock = await page.evaluate(() => {
      const e = window.__autoAudit, formula = e.donors[e.donorIndex].row.formula;
      const rowMass = e.sample.contents.filter(c => c.formula === formula && c.phase === 's' && !c.solidOrigin).reduce((m, c) => m + c.mass_g, 0);
      const poses = e.stocks.grains.filter(p => p.formula === formula), node = window.__autoStore.getState().scene.getObjectByName(`auto_stock_${formula}`);
      return { formula, rowMass, posedMass: poses.reduce((m, p) => m + p.mass_g, 0), count: poses.length,
        drawn: node.children.some(c => c.visible && (c.count > 0 || c.geometry?.getAttribute('position'))),
        metalness: node.children[0].material.metalness };
    });
    assert.ok(stock.count > 0 && stock.drawn);
    assert.ok(Math.abs(stock.rowMass - stock.posedMass) < 1e-7);
    if (entry.id === 'h2o2_mno2') assert.equal(stock.metalness, 0);
    await page.getByRole('button', { name: 'Góc cận cảnh' }).click();
    await page.waitForTimeout(500);
    await page.screenshot({ path: `${output}/${entry.id}-stock.png` });
    results.push({ id: entry.id, flight, stock });
    if (entry.id === 'cuoh2_decomp') {
      await advance("e.phase === 'complete'");
      const dry = await page.evaluate(() => {
        const scene = window.__autoStore.getState().scene, e = window.__autoAudit;
        return { product_g: e.sample.contents.filter(c => c.formula === 'CuO' && c.phase === 's').reduce((m, c) => m + c.mass_g, 0),
          sedimentVisible: scene.getObjectByName('auto_sediment_bed').visible,
          color: scene.getObjectByName('auto_sediment_bed').material.color.getHexString(),
          transparent: scene.getObjectByName('auto_sediment_bed').material.transparent,
          duplicateStock: scene.getObjectByName('auto_stock_CuO').children.some(c => c.visible) };
      });
      assert.ok(dry.product_g > 0 && dry.sedimentVisible);
      assert.equal(dry.duplicateStock, false);
      assert.equal(dry.color, '0f172a'); assert.equal(dry.transparent, false);
      results.at(-1).dry = dry;
      await page.screenshot({ path: `${output}/dry-product.png` });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${output}/mobile.png` });
  const old = await page.evaluate(() => { window.__oldAuto = window.__autoAudit; return !!window.__oldAuto.stocks.world; });
  assert.equal(old, true);
  await page.getByRole('button', { name: 'Làm lại thí nghiệm' }).click();
  await page.waitForFunction(() => window.__autoAudit !== window.__oldAuto);
  assert.equal(await page.evaluate(() => window.__oldAuto.stocks.world === undefined), true);
  assert.equal(await page.evaluate(() => JSON.stringify(window.__manualStore.getState().vessels) === window.__manualBefore), true);
  assert.deepEqual(errors, []);
  writeFileSync(`${output}/browser-results.json`, JSON.stringify({ results, errors, workbenchUnchanged: true, disposedOnRestart: true }, null, 2));
  console.log(JSON.stringify({ passed: results.length, errors }, null, 2));
} catch (error) {
  await page.screenshot({ path: `${output}/failure.png` }).catch(() => {});
  throw error;
} finally { await browser.close(); }
