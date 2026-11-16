import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const output = resolve(process.env.LAB_AUTO_DROP_OUTPUT ?? 'artifacts/auto-drop-receipts');
const origin = process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767';
mkdirSync(output, { recursive: true });
const sourceFiles = ['src/handling/dropFlight.ts', 'src/handling/liquidDosePlan.ts',
  'src/vfx/autoplay/AutoExperiment.ts', 'src/vfx/autoplay/AutoExperimentScene.tsx',
  'src/vfx/autoplay/autoDonors.ts', 'src/vfx/autoplay/receiverFrame.ts'];
const fingerprints = () => Object.fromEntries(sourceFiles.map(file => [file,
  createHash('sha256').update(readFileSync(resolve(file))).digest('hex')]));
const report = { origin, errors: [], assertions: {}, sourceBefore: fingerprints() };
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
await page.routeWebSocket('**', route => {
  const server = route.connectToServer();
  server.onMessage(message => {
    let type; try { type = JSON.parse(String(message)).type; } catch { /* unrelated socket traffic */ }
    if (type !== 'update' && type !== 'full-reload') route.send(message);
  });
});
await page.addInitScript(() => {
  performance.setResourceTimingBufferSize(12000);
  localStorage.setItem('chemlab_vfx_quality_preference', 'low');
});
page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
page.on('console', message => {
  if (message.type() === 'error' && /shader|webgl|THREE/i.test(message.text())) report.errors.push(message.text());
});
const near = (a, b, epsilon = 1e-7) => Math.abs(a - b) <= epsilon;
const distance = (a, b) => Math.hypot(...a.map((value, axis) => value - b[axis]));

async function freeze() {
  await page.evaluate(() => {
    window.__autoAudit.paused = true;
    window.__autoStore.getState().invalidate();
  });
  await page.waitForTimeout(120);
}

async function advanceManual(predicate, message, maxFrames = 600) {
  const result = await page.evaluate(({ predicate, maxFrames }) => {
    const e = window.__autoAudit, done = new Function('e', `return (${predicate})`);
    e.paused = false;
    let frames = 0;
    while (frames < maxFrames && !done(e) && !e.error) { e.tick(1 / 60); frames++; }
    e.paused = true;
    window.__autoStore.getState().invalidate();
    return { frames, done: done(e), phase: e.phase, elapsed: e.elapsed, error: e.error };
  }, { predicate, maxFrames });
  if (!result.done) throw new Error(`${message}: ${JSON.stringify(result)}`);
  await page.waitForTimeout(100);
  return result;
}

async function stepFrames(count) {
  await page.evaluate(count => {
    const e = window.__autoAudit;
    e.paused = false;
    for (let i = 0; i < count && !e.error; i++) e.tick(1 / 60);
    e.paused = true;
    window.__autoStore.getState().invalidate();
  }, count);
  await page.waitForTimeout(100);
}

async function capture() {
  return page.evaluate(() => {
    const e = window.__autoAudit, { scene } = window.__autoStore.getState();
    scene.updateMatrixWorld(true);
    const index = window.__autoDropIndex ?? 0, donor = e.donors[index], receipts = donor.liquidDrops ?? [];
    const mesh = scene.getObjectByName('auto_transfer_drops'), ripple = scene.getObjectByName('auto_drop_impact_ripples');
    const splashes = scene.getObjectByName('auto_drop_impact_splashes');
    const outlet = scene.getObjectByName(`auto_dropper_outlet_${index}`);
    const three = window.__autoThree;
    const matrix = new three.Matrix4(), position = new three.Vector3(), rotation = new three.Quaternion(), scale = new three.Vector3();
    const drawn = [];
    if (mesh) for (let i = 0; i < mesh.count; i++) {
      mesh.getMatrixAt(i, matrix); matrix.decompose(position, rotation, scale);
      if (scale.x > 1e-9) drawn.push({ position: position.clone().applyMatrix4(mesh.matrixWorld).toArray(), radius: scale.x });
    }
    const last = receipts.at(-1);
    const flightPosition = receipt => {
      const age = Math.max(0, Math.min(receipt.flight.flightTime, e.elapsed - receipt.releaseAt));
      return [receipt.flight.start[0], Math.max(receipt.flight.target[1], receipt.flight.start[1]
        - 0.5 * receipt.flight.gravity * age * age), receipt.flight.start[2]];
    };
    return {
      phase: e.phase, phaseTime: e.phaseTime, elapsed: e.elapsed, paused: e.paused,
      donorIndex: e.donorIndex, donor: { remaining: donor.remaining, totalMass_g: donor.totalMass_g,
        solutionVolume_ml: donor.solutionVolume_ml, fraction: donor.fraction, doseMode: donor.doseMode,
        drops: structuredClone(receipts), inFlightMass_g: e.inFlightMass_g },
      sample: { mass_g: e.sample.mass_g, volume_ml: e.sample.volume_ml, evaporated_ml: e.sample.evaporated_ml ?? 0,
        position: [...e.sample.position],
        contents: structuredClone(e.sample.contents), contact: structuredClone(e.sample.recentPourContact) },
      accountedMass_g: e.accountedMass_g,
      outletTip: outlet?.localToWorld(new three.Vector3(0, -0.06, 0)).toArray(),
      drawn, expectedFirstDrop: receipts[0] ? flightPosition(receipts[0]) : null,
      rippleVisible: !!ripple?.visible, rippleCount: ripple?.count ?? 0,
      splashVisible: !!splashes?.visible, splashCount: splashes?.count ?? 0,
      sharedTransientEffectsMounted: !!scene.getObjectByName(`vessel-transient-effects-${e.sample.id}`),
      effectNodeNames: (() => { const names = []; scene.traverse(node => { if (/auto_transfer|auto_dropper|auto_drop_impact|vessel-transient/.test(node.name)) names.push(node.name); }); return names; })(),
    };
  });
}

async function startMicrodose() {
  await page.evaluate(() => {
    const e = window.__autoAudit, index = e.donors.findIndex(item => item.doseMode === 'dropper'), donor = e.donors[index];
    if (index < 0 || !donor) throw new Error('The selected automatic recipe has no initially mounted microdrop donor.');
    window.__autoDropIndex = index;
    const amount = 0.12;
    donor.row = { formula: 'H2O', phase: 'l', mass_g: amount, moles: amount / 18.015 };
    donor.components = [{ ...donor.row }];
    donor.color = '#b91c1c'; donor.remaining = amount; donor.totalMass_g = amount;
    donor.solutionVolume_ml = amount; donor.fraction = 0; donor.doseMode = 'dropper';
    donor.liquidDrops = []; donor.dropSchedule = undefined; donor.dropFlight = undefined; donor.dropStartedAt = undefined;
    e.donors.forEach((other, otherIndex) => {
      if (otherIndex === index) return;
      other.remaining = 0; other.totalMass_g = 0; other.solutionVolume_ml = 0; other.fraction = 1;
      other.row = { ...other.row, mass_g: 0, moles: 0 }; other.components = [];
    });
    e.sample = { ...e.sample, position: [1.35, 1.04, -0.65], contents: [], substances: [], mass_g: 0, volume_ml: 0, volume: 0 };
    e.donorIndex = index; e.phase = 'carry'; e.phaseTime = 2; e.elapsed = 0; e.accumulator = 0;
    e.paused = false; e.speed = 1; e.enter('dose'); e.paused = true;
    window.__autoStore.getState().invalidate();
  });
}

try {
  await page.goto(origin, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Kho hóa chất và dụng cụ', exact: true }).click();
  await page.getByRole('button', { name: 'Thông tin bình và phản ứng', exact: true }).click();
  await page.getByRole('tab', { name: 'Tự động', exact: true }).click();
  await page.getByRole('button', { name: 'Hiện danh mục tự động', exact: true }).waitFor({ timeout: 60000 });
  await page.getByRole('button', { name: 'Hiện danh mục tự động' }).click();
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const resource = pattern => performance.getEntriesByType('resource').map(entry => entry.name).findLast(name => pattern.test(name));
    const { AutoExperiment } = await import(resource(/\/AutoExperiment\.ts(?:\?|$)/));
    const three = await import(resource(/\/three\.js(?:\?|$)/));
    const original = AutoExperiment.prototype.tick;
    AutoExperiment.prototype.tick = function (delta) { window.__autoAudit = this; return original.call(this, delta); };
    const { _roots } = await import(resource(/@react-three_fiber\.js(?:\?|$)/));
    window.__autoThree = three;
    window.__autoGetRoot = () => _roots.get(document.querySelector('#automatic-lab canvas'));
  });
  await page.getByRole('button', { name: /HNO3 \+ KOH/i }).first().click();
  await page.waitForFunction(() => !!window.__autoAudit && !!window.__autoGetRoot()?.store?.getState()?.scene,
    undefined, { timeout: 60000 });
  await page.evaluate(() => { window.__autoStore = window.__autoGetRoot().store; });
  await startMicrodose();

  await stepFrames(50);
  report.inFlight = await capture();
  const flight = report.inFlight, first = flight.donor.drops[0];
  report.assertions.outletMatchesFirstDropPath = !!flight.outletTip && distance(flight.outletTip, first.flight.start) < 1e-5;
  report.assertions.translatedReceiverControlsLanding = near(first.flight.target[0], 1.35, 1e-5)
    && near(first.flight.target[2], -0.65, 1e-5) && near(flight.sample.position[0], 1.35) && near(flight.sample.position[2], -0.65);
  report.assertions.sourceLeavesAtReleaseDestinationReceivesAtImpact = near(flight.donor.remaining, 0.07, 1e-7)
    && near(flight.sample.mass_g, 0, 1e-9) && near(flight.donor.inFlightMass_g, 0.05, 1e-7)
    && near(flight.accountedMass_g, 0.12, 1e-7) && !first.arrived;
  report.assertions.renderedDropMatchesReceipt = flight.drawn.length === 1
    && distance(flight.drawn[0].position, flight.expectedFirstDrop) < 1e-4;
  report.assertions.sharedLabEffectsMounted = flight.sharedTransientEffectsMounted;
  report.assertions.pauseFreezesModel = flight.paused;
  await page.screenshot({ path: resolve(output, '01-red-microdrop-in-flight.png') });

  await page.waitForTimeout(500);
  report.paused = await capture();
  report.assertions.pauseFreezesFlightAndLedger = near(report.paused.elapsed, flight.elapsed, 1e-12)
    && JSON.stringify(report.paused.donor.drops) === JSON.stringify(flight.donor.drops)
    && near(report.paused.donor.remaining, flight.donor.remaining) && near(report.paused.sample.mass_g, flight.sample.mass_g);

  await advanceManual('e.donors[0].liquidDrops?.[0]?.arrived === true', 'First drop never arrived');
  report.firstImpact = await capture();
  report.assertions.firstDoseOccursAtImpact = near(report.firstImpact.sample.mass_g + report.firstImpact.sample.evaporated_ml, 0.05, 1e-7)
    && near(report.firstImpact.donor.remaining, 0.07, 1e-7)
    && near(report.firstImpact.donor.inFlightMass_g, 0, 1e-7)
    && near(report.firstImpact.accountedMass_g, 0.12, 1e-7)
    && near(report.firstImpact.donor.fraction, 0.05 / 0.12, 1e-7);
  await page.screenshot({ path: resolve(output, '02-first-drop-arrives.png') });

  await advanceManual('e.phase === "return" && e.donors[0].liquidDrops?.length === 3 && e.donors[0].liquidDrops.every(drop => drop.arrived)',
    'Automatic microdose did not finish with three accepted drops');
  report.finished = await capture();
  const finished = report.finished;
  report.assertions.exactPartialDropAndMassConservation = finished.donor.drops.length === 3
    && near(finished.donor.drops[0].volume_ml, 0.05) && near(finished.donor.drops[1].volume_ml, 0.05)
    && near(finished.donor.drops[2].volume_ml, 0.02) && finished.donor.drops.every(drop => drop.arrived)
    && near(finished.donor.remaining, 0) && near(finished.sample.mass_g + finished.sample.evaporated_ml, 0.12, 1e-7)
    && near(finished.donor.inFlightMass_g, 0, 1e-7) && near(finished.accountedMass_g, 0.12, 1e-7);
  report.assertions.lastImpactPersistsThroughReturn = finished.phase === 'return' && finished.rippleVisible && finished.rippleCount > 0;
  report.assertions.sharedRendererRetainsEffects = finished.sharedTransientEffectsMounted;
  await page.screenshot({ path: resolve(output, '03-final-impact-persists-in-return.png') });

  const dosePolicy = await page.evaluate(async () => {
    const url = performance.getEntriesByType('resource').map(entry => entry.name).findLast(name => /\/liquidDosePlan\.ts(?:\?|$)/.test(name));
    const { liquidDosePlan } = await import(url);
    return { micro: liquidDosePlan(0.12).mode, oneMl: liquidDosePlan(1).mode, twoMl: liquidDosePlan(2).mode };
  });
  report.dosePolicy = dosePolicy;
  report.assertions.onlyTinyAmountsUseDrops = dosePolicy.micro === 'dropper' && dosePolicy.oneMl === 'pour' && dosePolicy.twoMl === 'pour';
  report.assertions.noRuntimeErrors = report.errors.length === 0;
  report.sourceAfter = fingerprints();
  report.assertions.sourceStable = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  report.generatedAt = new Date().toISOString();
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  assert.ok(Object.values(report.assertions).every(Boolean), 'Automatic drop receipt assertions');
  console.log(JSON.stringify({ assertions: report.assertions, dosePolicy, output }, null, 2));
} catch (error) {
  report.error = String(error);
  report.sourceAfter = fingerprints();
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify(report, null, 2) + '\n');
  await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  throw error;
} finally { await browser.close(); }
