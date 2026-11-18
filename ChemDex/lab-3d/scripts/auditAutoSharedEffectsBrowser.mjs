import { chromium } from '@playwright/test';
import { prepareLabAuditSession } from './fixtures/labAuditSession.mjs';
import assert from 'node:assert/strict';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';

const output = resolve(process.env.LAB_SHARED_OUTPUT ?? 'artifacts/auto-shared-effects');
const origin = process.env.LAB_AUDIT_ORIGIN ?? 'http://127.0.0.1:6767';
mkdirSync(output, { recursive: true });
const report = { errors: [], resources: [], stages: [], assertions: {} };
const sourceFiles = ['src/vfx/autoplay/AutoExperiment.ts', 'src/vfx/autoplay/AutoExperimentScene.tsx',
  'src/vfx/autoplay/autoVisualRuntime.ts', 'src/simulation/render/PhysicalSimulationRenderer.tsx',
  'src/vfx/SharedVesselTransientEffects.tsx', 'src/vfx/materials/liquid.tsx'];
const fingerprint = () => Object.fromEntries(sourceFiles.map(file => [file,
  createHash('sha256').update(readFileSync(resolve(file))).digest('hex')]));
report.sourceBefore = fingerprint();
const browser = await chromium.launch({ headless: true, args: ['--use-angle=swiftshader', '--enable-webgl', '--enable-unsafe-swiftshader'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
await prepareLabAuditSession(page);
await page.routeWebSocket('**', route => {
  const server = route.connectToServer();
  server.onMessage(message => {
    let type; try { type = JSON.parse(String(message)).type; } catch { /* Worker/socket traffic. */ }
    if (type !== 'update' && type !== 'full-reload') route.send(message);
  });
});
await page.addInitScript(() => performance.setResourceTimingBufferSize(10000));
page.on('pageerror', error => report.errors.push(error.stack ?? error.message));
page.on('console', message => { if (message.type() === 'error' && /webgl|shader|THREE/i.test(message.text())) report.errors.push(message.text()); });
page.on('requestfailed', request => { if (/\/src\/|\/assets\//.test(request.url())) report.resources.push({ url: request.url(), error: request.failure()?.errorText }); });

async function select(id) {
  if (!(await page.locator('#automatic-lab [data-sidebar="left"]').count()))
    await page.getByRole('button', { name: 'Hiện danh mục tự động', exact: true }).click();
  const title = await page.evaluate(id => window.sharedAudit.entries.find(e => e.id === id)?.title, id);
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).fill(title);
  await page.getByRole('button', { name: title, exact: false }).first().click();
  await page.waitForFunction(id => window.sharedAudit.e?.id === id, id);
  await page.evaluate(async () => {
    const a = window.sharedAudit, loaded = pattern => performance.getEntriesByType('resource').map(r => r.name).findLast(name => pattern.test(name));
    const { _roots } = await import(loaded(/@react-three_fiber\.js(?:\?|$)/));
    a.canvas = _roots.get(document.querySelector('#automatic-lab canvas')).store;
    const r3f = _roots.get(document.querySelector('#automatic-lab canvas'));
    const pending = [r3f.fiber.current];
    let found;
    while (pending.length) {
      const node = pending.pop(); if (!node) continue;
      const value = node.memoizedProps?.value;
      if (value?.manager === a.e.physics && value?.store) { found = { store: value.store, runtime: value }; break; }
      if (node.child) pending.push(node.child); if (node.sibling) pending.push(node.sibling);
    }
    if (!found) throw new Error('Shared vessel visual provider did not mount');
    a.runtimes.set(a.e, found); a.e.paused = true; a.e.speed = 1;
    await a.e.stocks.initialize(); a.canvas.getState().invalidate();
  });
  await page.waitForFunction(() => {
    const a = window.sharedAudit, runtime = a.runtimes.get(a.e);
    return runtime?.store.getState().vessels[a.e.sample.id] === a.e.sample;
  });
}

async function advance(expression, maximum_s = 240) {
  for (;;) {
    const result = await page.evaluate(({ expression, maximum_s }) => {
      const a = window.sharedAudit, e = a.e, done = new Function('e', 'inventory', `return (${expression})`);
      e.paused = false;
      let frames = 0;
      for (; frames < 120 && !done(e, a.golden(e.sample)) && !e.error && e.elapsed < maximum_s; frames++) a.tick.call(e, .1);
      e.paused = true; a.canvas.getState().invalidate();
      return { done: done(e, a.golden(e.sample)), frames, phase: e.phase, elapsed: e.elapsed, error: e.error };
    }, { expression, maximum_s });
    await page.waitForFunction(() => {
      const a = window.sharedAudit, runtime = a.runtimes.get(a.e);
      return runtime?.store.getState().vessels[a.e.sample.id] === a.e.sample;
    });
    if (result.error) throw new Error(result.error);
    if (result.done) return;
    if (!result.frames || result.elapsed >= maximum_s) throw new Error(`No phase ${expression}: ${JSON.stringify(result)}`);
  }
}

async function capture(label, file, camera = 'close') {
  await page.evaluate(camera => {
    const a = window.sharedAudit; a.e.camera = camera; a.e.automaticCamera = true; a.canvas.getState().invalidate();
  }, camera);
  await page.waitForTimeout(1400);
  const result = await page.evaluate(label => {
    const a = window.sharedAudit, e = a.e, root = a.canvas.getState(), scene = root.scene, runtime = a.runtimes.get(e);
    scene.updateMatrixWorld(true);
    const nodes = [];
    const visible = node => { let value = node; while (value) { if (!value.visible) return false; value = value.parent; } return true; };
    scene.traverse(node => {
      if (!/^(physical_|liquid_|foam_|finite-foam|sediment_bed|stock_|solids_|auto_shared_body|vessel-transient|sodium-)/.test(node.name)) return;
      const material = node.material, matrix = new a.three.Matrix4(), point = new a.three.Vector3();
      if (node.isInstancedMesh && node.count > 0) { node.getMatrixAt(0, matrix); point.setFromMatrixPosition(matrix).applyMatrix4(node.matrixWorld); }
      else node.getWorldPosition(point);
      node.geometry?.computeBoundingBox();
      const bounds = node.geometry?.boundingBox;
      nodes.push({ name: node.name, visible: visible(node), ownVisible: node.visible, count: node.count,
        position: point.toArray(), geometry: node.geometry?.type,
        bounds: bounds ? { min: bounds.min.toArray(), max: bounds.max.toArray() } : null,
        material: material ? { type: material.type, color: material.color?.getHexString(), opacity: material.opacity,
          transparent: material.transparent, roughness: material.roughness, metalness: material.metalness,
          vertexShader: material.vertexShader?.slice(0, 120), uniforms: Object.keys(material.uniforms ?? {}) } : null,
        deposit: node.userData.metalDeposit });
    });
    const donor = e.donors[e.donorIndex], stream = scene.getObjectByName('auto_transfer_stream'), drops = scene.getObjectByName('auto_transfer_drops');
    const body = scene.getObjectByName(`auto_shared_body_${e.sample.id}`), transform = a.bodyTransform(e.sample);
    const bodyPosition = body.getWorldPosition(new a.three.Vector3()), bodyScale = body.getWorldScale(new a.three.Vector3());
    const mist = scene.getObjectByName(`physical_mist_${e.sample.id}`), mistParticle = e.physics.evaporationSystem.particles[0];
    let mistPositionError;
    if (mist?.visible && mist.count > 0 && mistParticle) {
      const matrix = new a.three.Matrix4(); mist.getMatrixAt(0, matrix);
      const position = new a.three.Vector3().setFromMatrixPosition(matrix).applyMatrix4(mist.matrixWorld);
      mistPositionError = position.distanceTo(new a.three.Vector3(mistParticle.x, mistParticle.y, mistParticle.z));
    }
    return { label, id: e.id, phase: e.phase, elapsed_s: e.elapsed, temperature_c: e.sample.temperature_c,
      transfer: { formula: donor?.row.formula, amount_ml: donor?.solutionVolume_ml, mode: donor?.doseMode,
        fraction: donor?.fraction, startedAt_s: donor?.doseStartedAt, phaseTime_s: e.phaseTime,
        streamVisible: !!stream?.visible, streamCount: stream?.count ?? 0,
        dropsVisible: !!drops?.visible, dropsCount: drops?.count ?? 0 },
      paused: e.paused, progress: e.progress, sample: { volume_ml: e.sample.volume_ml, mass_g: e.sample.mass_g,
        foam_ml: e.sample.foam_ml ?? 0, contents: e.sample.contents, precipitate: e.sample.precipitateSubstance },
      inventory: a.golden(e.sample), settledFraction: e.settledFraction,
      bodyFrame: { position: bodyPosition.toArray(), scale: bodyScale.toArray(),
        expectedPosition: [e.sample.position[0], e.sample.position[1] + transform.offsetY, e.sample.position[2]],
        expectedScale: transform.scale, mistPositionError },
      physical: [...e.physics.precipitationSystems.values()].map(system => ({ formula: system.profile.formula,
        morphology: system.profile.morphology, count: system.particles.length, sediment_g: system.sedimentBed.amount_g })),
      evaporation: e.physics.evaporationSystem.particles?.length, nodes,
      runtime: { matchingSample: runtime.store.getState().vessels[e.sample.id] === e.sample,
        managerSame: runtime.runtime.manager === e.physics, appearanceSame: runtime.runtime.appearance === e.appearance },
      manualUnchanged: JSON.stringify(a.manual.getState().vessels) === a.manualBefore,
      oldRendererMounted: !!scene.getObjectByName('auto_liquid') || !!scene.getObjectByName('auto_sediment_bed'),
      render: { calls: root.gl.info.render.calls, triangles: root.gl.info.render.triangles, frame: root.gl.info.render.frame } };
  }, label);
  result.screenshot = file; report.stages.push(result);
  await page.screenshot({ path: resolve(output, file) });
  return result;
}

try {
  await page.goto(`${origin}/?mode=auto`, { waitUntil: 'domcontentloaded' });
  await page.getByRole('button', { name: 'Hiện danh mục tự động', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm thí nghiệm tự động' }).waitFor({ timeout: 60000 });
  await page.evaluate(async () => {
    const loaded = pattern => performance.getEntriesByType('resource').map(r => r.name).findLast(name => pattern.test(name));
    const director = await import(loaded(/\/AutoExperiment\.ts(?:\?|$)/));
    const { useAppStore: manual } = await import(loaded(/\/useAppStore\.ts(?:\?|$)/));
    const three = await import(loaded(/\/three\.js(?:\?|$)/));
    const { goldenRainInventory: golden } = await import(loaded(/\/goldenRainProtocol\.ts(?:\?|$)/));
    const { vesselBodyTransform: bodyTransform } = await import(loaded(/\/vesselScale\.ts(?:\?|$)/));
    const a = window.sharedAudit = { runtimes: new Map(), entries: director.AUTO_EXPERIMENTS,
      tick: director.AutoExperiment.prototype.tick, manual, manualBefore: JSON.stringify(manual.getState().vessels), three, golden, bodyTransform };
    director.AutoExperiment.prototype.tick = function () { a.e = this; };
  });
  await select('hno3_koh');
  await advance("e.dropperActive && e.phaseTime >= e.donors[e.donorIndex].dropSchedule.releaseStart + e.donors[e.donorIndex].dropSchedule.flightTime * .35");
  const microdose = await capture('Vi lượng ≤0,2 mL tách giọt', '00-microdose-drops.png', 'transfer');
  report.assertions.microdoseUsesSeparateDrops = microdose.transfer.amount_ml <= .2 && microdose.transfer.mode === 'dropper'
    && microdose.transfer.dropsVisible && microdose.transfer.dropsCount > 0 && !microdose.transfer.streamVisible;
  await select('cuso4_naoh');
  await advance("e.streamActive && e.donors[e.donorIndex].solutionVolume_ml >= 1 && e.donors[e.donorIndex].solutionVolume_ml <= 2 && e.phaseTime > 1");
  const pour = await capture('Liều 1–2 mL rót thành dòng nhanh', '00-ordinary-dose-pour.png', 'transfer');
  report.assertions.ordinaryDoseUsesStream = pour.transfer.mode === 'pour' && pour.transfer.streamVisible
    && pour.transfer.streamCount > 0 && !pour.transfer.dropsVisible;
  await advance("e.phase === 'return' && e.donors[e.donorIndex].solutionVolume_ml >= 1 && e.donors[e.donorIndex].solutionVolume_ml <= 2");
  report.dosing = await page.evaluate(() => {
    const e = window.sharedAudit.e, d = e.donors[e.donorIndex];
    return { formula: d.row.formula, amount_ml: d.solutionVolume_ml, mode: d.doseMode,
      doseDuration_s: e.elapsed - d.doseStartedAt, fraction: d.fraction };
  });
  report.assertions.ordinaryDoseFinishesQuickly = report.dosing.fraction === 1 && report.dosing.doseDuration_s < 4;
  await advance("e.physics.precipitationSystems.size > 0 && e.sample.precipitateAmount_g > .001");
  const copper = await capture('Cu(OH)₂ dùng chung hạt và chất lỏng của bàn thí nghiệm', '01-copper-hydroxide.png');
  report.assertions.canonicalPrecipitate = copper.nodes.some(n => n.name.startsWith('physical_precipitate_') && n.visible && n.count > 0);
  report.assertions.canonicalLiquid = copper.nodes.some(n => n.name === 'liquid_surface_auto_receiver' && n.visible);
  report.assertions.canonicalMistMounted = copper.nodes.some(n => n.name === 'physical_mist_auto_receiver');
  report.assertions.scopedManagerAndAppearance = copper.runtime.managerSame && copper.runtime.appearanceSame && copper.runtime.matchingSample;
  report.assertions.oldRenderersAbsent = !copper.oldRendererMounted;
  console.log(JSON.stringify({ event: 'representative-smoke', assertions: report.assertions }));
  if (!Object.values(report.assertions).every(Boolean)) throw new Error('Initial shared renderer smoke failed');

  await select('cu_agno3');
  await advance("e.sample.contents.some(row => row.formula === 'Ag' && row.depositSubstrate === 'Cu' && !row.depositReleased && row.mass_g > .001)", 240);
  const coating = await capture('Bạc mọc trên vật mang đồng từ phản ứng thực', '02-copper-silver-coating.png');
  report.assertions.canonicalSilverCoating = coating.nodes.some(n => n.name === 'stock_coating_Cu_Ag'
    && n.visible && n.count > 0 && n.deposit?.mass_g > 0);
  await select('na_h2o');
  await advance("e.sample.contents.some(row => row.formula === 'Na' && row.phase === 's' && row.mass_g > 1e-5)", 240);
  const sodium = await capture('Mẫu natri thực dùng chung viên kim loại và mặt dung dịch', '02-sodium-water-shared.png');
  report.assertions.canonicalSodiumPellet = sodium.nodes.some(n => n.name === 'sodium-metal' && n.visible)
    && sodium.nodes.some(n => n.name === 'liquid_surface_auto_receiver' && n.visible);

  await select('h2o2_kmno4');
  await advance("e.phase === 'complete'", 240);
  const oxygen = await capture('Oxy và MnO₂ dùng chung hạt, khí và chất lỏng', '02-shared-oxygen-reaction.png');
  report.assertions.canonicalOxygenReaction = oxygen.nodes.some(n => n.name.startsWith('physical_precipitate_') && n.visible)
    && oxygen.runtime.managerSame && oxygen.runtime.appearanceSame;
  report.assertions.noInventedFoamWithoutSurfactant = oxygen.sample.foam_ml === 0
    && !oxygen.nodes.some(n => n.name === 'finite-foam-auto_receiver' && n.visible);
  await select('h2o2_mno2');
  report.foamFixture = await page.evaluate(async () => {
    const a = window.sharedAudit, e = a.e;
    const loaded = pattern => performance.getEntriesByType('resource').map(r => r.name).findLast(name => pattern.test(name));
    const { createStudioSample, planStudioProgram } = await import(loaded(/\/studioProgram\.ts(?:\?|$)/));
    const sample = createStudioSample(e.program, e.sample, 'oxygen_foam');
    const plan = planStudioProgram(e.program, sample, 'vi');
    e.lesson = undefined; e.baseline = structuredClone(sample); e.kinetics = plan.kinetics;
    e.contactKinetics = undefined; e.replayProgress = 0; e.contactProgress = 0; e.progress = 0;
    e.sample = structuredClone(sample); e.phase = 'react'; e.phaseTime = 0;
    a.canvas.getState().invalidate();
    return { mode: 'Authored oxygen_foam virtual specimen; actual automatic chemistry advances finite peroxide and explicit surfactant',
      initialMass_g: sample.mass_g,
      surfactant_g: sample.contents.filter(row => row.formula === 'C12H25NaO4S').reduce((sum, row) => sum + row.mass_g, 0) };
  });
  await advance('(e.sample.foam_ml ?? 0) > 1', 240);
  const foam = await capture('Mẫu oxy có chất hoạt động bề mặt thực — bọt khí hữu hạn', '03-finite-surfactant-foam.png');
  report.assertions.canonicalFiniteFoam = foam.sample.foam_ml > 1
    && foam.nodes.some(n => n.name === 'finite-foam-auto_receiver' && n.visible)
    && foam.nodes.some(n => n.name === 'foam_surface_auto_receiver' && n.visible);
  report.foamFixture.state = await page.evaluate(() => {
    const s = window.sharedAudit.e.sample;
    const escaped_g = Object.values(s.escapedGas_g ?? {}).reduce((sum, mass) => sum + mass, 0);
    return { mass_g: s.mass_g, escaped_g, evaporated_g: s.evaporated_ml ?? 0,
      returnedWall_g: s.wallCondensation?.returned_g ?? 0,
      foamOxygen_g: s.contents.filter(row => row.location === 'foam' && row.formula === 'O2').reduce((sum, row) => sum + row.mass_g, 0) };
  });
  const foamMass = report.foamFixture.state;
  report.assertions.finiteFoamMassConserved = foamMass.foamOxygen_g > 0 && Math.abs(foamMass.mass_g + foamMass.escaped_g
    + foamMass.evaporated_g - foamMass.returnedWall_g - report.foamFixture.initialMass_g) < 1e-8;
  // A finite pure-water fixture verifies the shared mist renderer. It is
  // separate from reaction recipes; 90 °C Golden Rain need not make white fog.
  report.thermalFixture = await page.evaluate(async () => {
    const a = window.sharedAudit, e = a.e;
    const loaded = pattern => performance.getEntriesByType('resource').map(r => r.name).findLast(name => pattern.test(name));
    const { stepVesselThermal } = await import(loaded(/\/thermalState\.ts(?:\?|$)/));
    const { routeWaterVaporToWall, finalizeWaterVaporOutflow } = await import(loaded(/\/waterVaporRouting\.ts(?:\?|$)/));
    e.physics.reset();
    e.phase = 'observe'; e.phaseTime = 0; e.progress = 1; e.flame = false;
    e.kinetics = undefined; e.contactKinetics = undefined;
    e.sample = { id: 'auto_receiver', type: 'beaker', name: 'Finite hot-water renderer fixture',
      position: [0, 1.04, 0], capacity_ml: 250, rotationY: 0, isLocked: false, isSealed: false,
      mass_g: 20, volume_ml: 20, volume: .08, temperature_c: 100, ph: 7,
      liquidColor: '#f8fafc', hasGas: false, hasPrecipitate: false, isBoiling: false,
      substances: ['H2O'], contents: [{ formula: 'H2O', phase: 'l', mass_g: 20, moles: 20 / 18.015 }] };
    const body = a.canvas.getState().scene.getObjectByName('auto_shared_body_auto_receiver');
    body.updateWorldMatrix(true, true);
    const bodyMatrixWorld = [...body.matrixWorld.elements];
    for (let frame = 0; frame < 180; frame++) {
      const previous = e.sample, dt = 1 / 60;
      const thermal = stepVesselThermal(previous, dt, 1600);
      const heated = { ...previous, ...thermal };
      const routed = routeWaterVaporToWall(heated, previous, dt,
        { includedDryHeat_J: thermal.wallThermalDryCredit_J ?? 0, enabled: thermal.wallThermalEligible ?? false });
      e.sample = finalizeWaterVaporOutflow(routed.vessel, previous, routed.availableVapor_g, dt,
        routed.availableVaporEnergy_J, routed.availableVaporTemperatureMass_c_g);
      e.elapsed += dt;
      e.physics.step(e.sample, dt, { thermalStateAuthoritative: true, liquidMotionAuthoritative: true,
        bodyMatrixWorld });
    }
    const wall = e.sample.wallCondensation;
    const wall_g = (wall?.inner_g ?? 0) + (wall?.outer_g ?? 0);
    a.canvas.getState().invalidate();
    return { mode: 'Controlled pure-water fixture; actual finite thermal/wall/outflow functions, not an authored reaction',
      inputWater_g: 20, heatPower_W: 1600, heatingSeconds: 3, temperature_c: e.sample.temperature_c,
      remainingLiquid_g: e.sample.mass_g, wall_g, released_g: e.sample.waterVaporReleased_g ?? 0,
      massError_g: e.sample.mass_g + wall_g + (e.sample.waterVaporReleased_g ?? 0) - 20,
      physicalMistParticles: e.physics.evaporationSystem.particles.length,
      physicalVaporAccepted_g: e.physics.evaporationSystem.acceptedVapor_g };
  });
  await page.waitForFunction(() => {
    const a = window.sharedAudit;
    return a.runtimes.get(a.e).store.getState().vessels[a.e.sample.id] === a.e.sample;
  });
  const steam = await capture('Nguồn hơi nước hữu hạn ở điểm sôi — mẫu kiểm tra renderer', '03-finite-hot-water-mist.png');
  report.assertions.finiteSteamVisible = steam.nodes.some(n => n.name === 'physical_mist_auto_receiver' && n.visible && n.count > 0);
  report.assertions.finiteSteamMassConserved = Math.abs(report.thermalFixture.massError_g) < 1e-8
    && report.thermalFixture.released_g > 0 && report.thermalFixture.physicalVaporAccepted_g > 0;
  const pausedBefore = await page.evaluate(() => ({ time: window.sharedAudit.e.elapsed, sample: JSON.stringify(window.sharedAudit.e.sample) }));
  await page.waitForTimeout(1000);
  report.assertions.pauseStable = await page.evaluate(before => window.sharedAudit.e.elapsed === before.time && JSON.stringify(window.sharedAudit.e.sample) === before.sample, pausedBefore);
  report.assertions.workbenchUnchanged = report.stages.every(stage => stage.manualUnchanged);
  report.assertions.sharedBodyUsesCanonicalWorldScale = report.stages.every(stage => stage.bodyFrame.position.every((value, axis) =>
    Math.abs(value - stage.bodyFrame.expectedPosition[axis]) < 1e-7) && stage.bodyFrame.scale.every(value => Math.abs(value - stage.bodyFrame.expectedScale) < 1e-7));
  report.assertions.mistStaysInItsWorldFrame = report.stages.every(stage => stage.bodyFrame.mistPositionError === undefined || stage.bodyFrame.mistPositionError < 1e-5);
  report.assertions.noRuntimeErrors = report.errors.length === 0;
  report.assertions.resourcesLoaded = report.resources.length === 0;
  report.sourceAfter = fingerprint();
  report.assertions.sourceUnchangedDuringAudit = JSON.stringify(report.sourceBefore) === JSON.stringify(report.sourceAfter);
  report.generatedAt = new Date().toISOString();
  writeFileSync(resolve(output, 'report.json'), JSON.stringify(report, null, 2) + '\n');
  assert.ok(Object.values(report.assertions).every(Boolean), 'Shared visual smoke assertions');
  console.log(JSON.stringify({ output, assertions: report.assertions }, null, 2));
} catch (error) {
  writeFileSync(resolve(output, 'failure.json'), JSON.stringify({ error: String(error), ...report }, null, 2) + '\n');
  await page.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  throw error;
} finally { await browser.close(); }
