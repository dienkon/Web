import { chromium } from '@playwright/test';
import assert from 'node:assert/strict';
import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const origin = process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767';
const output = resolve(process.env.LAB_GOLDEN_RAIN_OUTPUT ?? 'artifacts/reaction-fidelity/golden-rain-browser');
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
// Long physical runs must not be reset by unrelated development hot updates.
await page.routeWebSocket('**', () => {});
await page.addInitScript(() => performance.setResourceTimingBufferSize(10000));
const errors = [], resourceFailures = [], stages = [];
let nextProgress_s = 300;
page.on('pageerror', error => errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error' && /shader|webgl|THREE/i.test(message.text())) errors.push(message.text()); });
page.on('requestfailed', request => {
  if (/\/src\/|\/assets\/|\/node_modules\//.test(request.url())) resourceFailures.push({ url: request.url(), error: request.failure()?.errorText });
});
page.on('response', response => {
  if (response.status() >= 400 && /\/src\/|\/assets\/|\/node_modules\//.test(response.url()))
    resourceFailures.push({ url: response.url(), status: response.status() });
});

// React's director remains mounted for every snapshot. Suppress its wall-clock
// tick during the audit, then accept ordinary fixed steps in bounded batches.
// Each batch yields back to the browser before the next one begins.
async function advanceUntil(expression, maximumElapsed_s) {
  for (;;) {
    const result = await page.evaluate(({ expression, maximumElapsed_s }) => {
      const e = window.__goldenAudit, done = new Function('e', 'inventory', `return (${expression})`);
      if (!e) throw new Error('The mounted Golden Rain director is unavailable.');
      e.paused = false;
      let steps = 0;
      for (; steps < 120 && !done(e, window.__goldenInventory(e.sample)) && !e.error && e.elapsed < maximumElapsed_s; steps++)
        window.__goldenTick.call(e, 0.1);
      e.paused = true;
      window.__goldenCanvasStore.getState().invalidate();
      return { done: done(e, window.__goldenInventory(e.sample)), elapsed_s: e.elapsed, phase: e.phase, error: e.error, steps };
    }, { expression, maximumElapsed_s });
    if (result.error) throw new Error(result.error);
    if (result.elapsed_s >= nextProgress_s) {
      console.log(JSON.stringify({ event: 'advancing', phase: result.phase, elapsed_s: +result.elapsed_s.toFixed(1) }));
      nextProgress_s += 300;
    }
    if (result.done) return result;
    if (result.elapsed_s >= maximumElapsed_s) throw new Error(`Did not reach ${expression}: ${JSON.stringify(result)}`);
    if (result.steps === 0) throw new Error('Golden Rain did not accept simulation time.');
  }
}

async function capture(label, file, camera = 'close') {
  await page.evaluate(camera => {
    const e = window.__goldenAudit;
    e.paused = true; e.camera = camera; e.automaticCamera = true;
    window.__goldenCanvasStore.getState().invalidate();
  }, camera);
  await page.waitForTimeout(1600);
  const state = await page.evaluate(label => {
    const e = window.__goldenAudit, root = window.__goldenCanvasStore.getState(), scene = root.scene;
    const inventory = window.__goldenInventory(e.sample);
    const drawn = [...e.physics.precipitationSystems.entries()].map(([key, system]) => {
      const mesh = scene.getObjectByName(`auto_precipitate_${key}`);
      if (mesh?.geometry) mesh.geometry.computeBoundingBox();
      const box = mesh?.geometry?.boundingBox;
      return { key, morphology: system.profile.morphology, color: system.profile.color,
        physicalParcels: system.particles.length, suspendedParcels: system.particles.filter(particle => !particle.settled).length,
        representedMass_g: system.representedMass_g, settledMass_g: system.sedimentBed.amount_g,
        drawn: mesh ? { visible: mesh.visible, count: mesh.count, geometryType: mesh.geometry.type,
          bounds: box ? { min: box.min.toArray(), max: box.max.toArray() } : null,
          material: { color: mesh.material.color.getHexString(), roughness: mesh.material.roughness,
            metalness: mesh.material.metalness, opacity: mesh.material.opacity, clearcoat: mesh.material.clearcoat },
          opacityRange: mesh.geometry.getAttribute('aParticleOpacity') && mesh.count > 0
            ? Array.from(mesh.geometry.getAttribute('aParticleOpacity').array.slice(0, mesh.count))
              .reduce((range, value) => [Math.min(range[0], value), Math.max(range[1], value)], [1, 0]) : null } : null };
    });
    const bed = scene.getObjectByName('auto_sediment_bed'), liquid = scene.getObjectByName('auto_liquid');
    const donor = e.donors[e.donorIndex], dropper = scene.getObjectByName(`auto_dropper_${e.donorIndex}`);
    const drops = scene.getObjectByName('auto_transfer_drops'), stream = scene.getObjectByName('auto_transfer_stream');
    const burner = scene.getObjectByName('auto_alcohol_burner'), flame = scene.getObjectByName('auto_condition_flame');
    const hotplate = scene.getObjectByName('auto_hotplate'), heatIndicator = scene.getObjectByName('auto_heat_indicator');
    scene.updateMatrixWorld(true);
    const hotplateBounds = hotplate ? new window.__goldenBox3().setFromObject(hotplate) : null;
    const vesselBaseY = 1.04 - 1;
    const accountedMass_g = e.sample.mass_g + (e.sample.evaporated_ml ?? 0)
      + Object.values(e.sample.escapedGas_g ?? {}).reduce((sum, mass) => sum + mass, 0)
      + e.donors.reduce((sum, donor) => sum + donor.remaining, 0) + e.inFlightMass_g
      + e.transferWaste.reduce((sum, waste) => sum + waste.mass_g, 0);
    return { label, elapsed_s: e.elapsed, phase: e.phase, caption: e.caption,
      temperature_c: e.sample.temperature_c, volume_ml: e.sample.volume_ml,
      inventory, accountedMass_g, massError_g: accountedMass_g - window.__goldenInitialMass,
      settledFraction: e.settledFraction, cloudiness: e.physics.cloudiness, flame: e.flame, stirringDrive: e.stirringDrive,
      drawn, bed: { visible: bed?.visible, color: bed?.material.color.getHexString(), amount_g: e.physics.sedimentBed.amount_g,
        thickness: e.physics.sedimentBed.thickness, opacity: bed?.material.opacity,
        transparent: bed?.material.transparent }, liquidVisible: !!liquid?.visible,
      transfer: { formula: donor?.row.formula, doseMode: donor?.doseMode, volume_ml: donor?.solutionVolume_ml,
        schedule: donor?.dropSchedule, fraction: donor?.fraction, activeDropper: e.dropperActive,
        mountedDropper: !!dropper, dropperVisible: !!dropper?.visible,
        dropsVisible: !!drops?.visible, drawnDrops: drops?.count ?? 0, streamVisible: !!stream?.visible },
      heatingApparatus: { burnerMounted: !!burner, burnerVisible: !!burner?.visible,
        flameMounted: !!flame, flameVisible: !!flame?.visible, flameColor: flame?.material.color.getHexString(),
        hotplateMounted: !!hotplate, hotplateVisible: !!hotplate?.visible, vesselBaseY,
        hotplateBounds: hotplateBounds ? { min: hotplateBounds.min.toArray(), max: hotplateBounds.max.toArray() } : null,
        heatIndicatorMounted: !!heatIndicator, heatIndicatorVisible: !!heatIndicator?.visible },
      camera: { position: root.camera.position.toArray(), fov: root.camera.fov },
      canvas: root.gl.domElement.getBoundingClientRect().toJSON(), renderCalls: root.gl.info.render.calls,
      renderer: root.gl.getContext().getParameter(root.gl.getContext().RENDERER),
      panelsOpen: document.querySelectorAll('#automatic-lab [data-sidebar]').length,
      error: e.error };
  }, label);
  await page.screenshot({ path: resolve(output, file) });
  const stage = { ...state, screenshot: file };
  stages.push(stage);
  console.log(JSON.stringify({ stage: label, phase: stage.phase, seconds: +stage.elapsed_s.toFixed(1),
    temperature_c: +stage.temperature_c.toFixed(2), solid_g: stage.inventory.solid_g, plates_g: stage.inventory.plates_g,
    rendered: stage.drawn.map(row => ({ key: row.key, morphology: row.morphology, count: row.drawn?.count, visible: row.drawn?.visible })) }));
  return stage;
}

try {
  await page.goto(`${origin}/?mode=auto`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Hiện danh mục tự động', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).waitFor({ timeout: 60000 });
  const goldenRainTitle = await page.evaluate(async () => {
    const resources = performance.getEntriesByType('resource').map(entry => entry.name);
    const directorUrl = resources.findLast(name => /\/AutoExperiment\.ts(?:\?|$)/.test(name));
    const protocolUrl = resources.findLast(name => /\/goldenRainProtocol\.ts(?:\?|$)/.test(name));
    if (!directorUrl || !protocolUrl) throw new Error('Golden Rain application modules are not loaded.');
    const { AutoExperiment, AUTO_EXPERIMENTS } = await import(directorUrl);
    const { goldenRainInventory } = await import(protocolUrl);
    window.__goldenInventory = goldenRainInventory;
    window.__goldenTick = AutoExperiment.prototype.tick;
    AutoExperiment.prototype.tick = function () { window.__goldenAudit = this; };
    return AUTO_EXPERIMENTS.find(entry => entry.id === 'golden_rain').title;
  });
  await page.getByRole('button', { name: goldenRainTitle, exact: true }).first().click();
  await page.waitForFunction(() => window.__goldenAudit?.id === 'golden_rain');
  await page.evaluate(async () => {
    const e = window.__goldenAudit;
    e.paused = true; e.speed = 1;
    await e.stocks.initialize();
    const url = performance.getEntriesByType('resource').map(entry => entry.name).findLast(name => /@react-three_fiber\.js/.test(name));
    if (!url) throw new Error('The mounted React Three renderer module is unavailable.');
    const { _roots } = await import(url);
    const threeUrl = performance.getEntriesByType('resource').map(entry => entry.name).findLast(name => /\/three\.js(?:\?|$)/.test(name));
    if (!threeUrl) throw new Error('The mounted Three.js module is unavailable.');
    const { Box3 } = await import(threeUrl);
    window.__goldenBox3 = Box3;
    window.__goldenCanvasStore = _roots.get(document.querySelector('#automatic-lab canvas')).store;
    window.__goldenInitialMass = e.sample.mass_g + e.donors.reduce((sum, donor) => sum + donor.remaining, 0);
  });
  await advanceUntil("e.dropperActive && e.phaseTime >= 0.79 && e.phaseTime < e.donors[e.donorIndex].dropSchedule.releaseStart + e.donors[e.donorIndex].dropSchedule.flightTime", 40);
  const pipette = await capture('Liều nhỏ dùng pipet và giọt riêng', '00-small-dose-pipette.png', 'transfer');
  await advanceUntil("e.phase === 'condition' && inventory.solid_g > 0.08 && e.sample.temperature_c < 30", 80);
  const cold = await capture('Kết tủa vàng mịn sau khi trộn lạnh', '01-cold-yellow-precipitate.png');
  await advanceUntil("e.phase === 'condition' && e.flame && e.sample.temperature_c >= 60 && inventory.solid_g > 0", 180);
  const heating = await capture('Bếp gia nhiệt đang đun và kết tủa đang tan', '02-heating-dissolution.png');
  await advanceUntil("e.phase === 'cool' && inventory.clear", 180);
  const hot = await capture('Dung dịch nóng trong sau khi PbI₂ tan', '03-hot-clear-dissolution.png');
  await advanceUntil("e.phase === 'cool' && inventory.plates_g > 0.003 && e.elapsed >= 300", 900);
  const plates = await capture('Phiến vàng hình thành và lắng khi nguội', '04-cooling-golden-plates.png');
  await advanceUntil("e.phase === 'complete' && e.settledFraction >= 0.9", 3600);
  const settled = await capture('Lớp phiến vàng lắng và dịch phía trên trong', '05-settled-golden-bed.png');
  const assertions = {
    smallDoseUsesRenderedPipette: pipette.transfer.activeDropper && pipette.transfer.doseMode === 'dropper'
      && pipette.transfer.volume_ml <= 2 && pipette.transfer.mountedDropper && pipette.transfer.dropperVisible,
    smallDoseHasSeparateDrops: pipette.transfer.dropsVisible && pipette.transfer.drawnDrops > 0 && !pipette.transfer.streamVisible,
    coldFineYellowMesh: cold.drawn.some(row => row.morphology === 'fine_powder' && row.drawn?.visible && row.drawn.count > 0),
    heatHasVisibleHotplateAndIndicator: heating.flame && heating.heatingApparatus.hotplateVisible && heating.heatingApparatus.heatIndicatorVisible,
    hotplateSitsBelowGlass: !!heating.heatingApparatus.hotplateBounds
      && heating.heatingApparatus.hotplateBounds.max[1] <= heating.heatingApparatus.vesselBaseY + 0.001,
    heatingHasNoIntrusiveFlame: !heating.heatingApparatus.flameVisible,
    heatOffAfterDissolving: !hot.flame && !hot.heatingApparatus.heatIndicatorVisible && !plates.flame && !plates.heatingApparatus.heatIndicatorVisible,
    hotSolidDissolved: hot.inventory.clear && hot.inventory.solid_g < 1e-8 && hot.drawn.every(row => !row.drawn?.visible || row.drawn.count === 0),
    coolingCrystalMesh: plates.inventory.plates_g > 0 && plates.drawn.some(row => row.morphology === 'crystalline' && row.drawn?.visible && row.drawn.count > 0),
    plateGeometryIsThin: plates.drawn.filter(row => row.morphology === 'crystalline').every(row => row.drawn?.bounds
      && (row.drawn.bounds.max[1] - row.drawn.bounds.min[1]) < (row.drawn.bounds.max[0] - row.drawn.bounds.min[0]) / 10),
    settledAtLeast90Percent: settled.settledFraction >= 0.9 && settled.bed.visible && settled.bed.amount_g > 0,
    traceSedimentPreservesBottomVisibility: plates.bed.amount_g >= 0.01 || (plates.bed.transparent && plates.bed.opacity < 0.99),
    sequenceUsesCooling: cold.elapsed_s < hot.elapsed_s && hot.elapsed_s < plates.elapsed_s && plates.elapsed_s < settled.elapsed_s
      && hot.temperature_c > plates.temperature_c && plates.temperature_c > settled.temperature_c,
    finiteMassConserved: stages.every(stage => Math.abs(stage.massError_g) < 1e-5),
    liquidAndCanvasVisible: stages.every(stage => stage.liquidVisible && stage.canvas.width > 300 && stage.canvas.height > 300),
    reactionViewHasNoSidePanels: stages.every(stage => stage.panelsOpen === 0),
    noRuntimeOrShaderErrors: errors.length === 0,
    sourceAndAssetResourcesLoaded: resourceFailures.length === 0,
    vietnameseColorWordPreserved: goldenRainTitle.startsWith('Mưa vàng'),
  };
  const report = { generatedAt: new Date().toISOString(), origin, assertions, stages, errors, resourceFailures,
    method: 'Mounted Auto Lab scene; ordinary fixed 60 Hz director in bounded 12 s batches, paused only for screenshots.',
    limitations: ['Representative grain display is magnified; mesh inspection is not experimental particle-size calibration.',
      'Water solubility, crystal growth and equivalent-sphere settling use the current illustrative transport model.'] };
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  writeFileSync(resolve(output, 'report.vi.md'), ['# Mưa vàng — kiểm tra cảnh 3D trên trình duyệt', '',
    '| Kiểm tra | Kết quả |', '| --- | --- |', ...Object.entries(assertions).map(([key, value]) => `| ${key} | ${value ? 'Đạt' : 'Chưa đạt'} |`), '',
    '| Ảnh | Pha | Thời gian mô phỏng | Nhiệt độ | PbI₂ rắn | Phiến | Đã lắng |', '| --- | --- | --- | --- | --- | --- | --- |',
    ...stages.map(stage => `| [${stage.label}](${stage.screenshot}) | ${stage.phase} | ${stage.elapsed_s.toFixed(1)} s | ${stage.temperature_c.toFixed(2)} °C | ${stage.inventory.solid_g.toPrecision(4)} g | ${stage.inventory.plates_g.toPrecision(4)} g | ${(100 * stage.settledFraction).toFixed(2)}% |`), '',
    ...report.limitations.map(line => `- ${line}`), ''].join('\n'));
  console.log(JSON.stringify({ assertions, output }, null, 2));
  assert.ok(Object.values(assertions).every(Boolean), 'Golden Rain rendered-stage assertions failed.');
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify({ error: String(error), stages, errors, resourceFailures }, null, 2) + '\n');
  throw error;
} finally {
  await browser.close();
}
