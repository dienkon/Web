import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

export async function auditExteriorOverflow(page, output, report) {
  await page.evaluate(async () => { window.exteriorRoots = (await import('/node_modules/.vite/deps/@react-three_fiber.js'))._roots; });
  await page.waitForFunction(() => [...window.exteriorRoots.values()].some(root => root.store.getState().gl?.domElement === document.querySelector('canvas')), undefined, { timeout: 60000 });
  await page.evaluate(async () => {
    const { useAppStore: store } = await import('/src/store/useAppStore.ts');
    const { effects } = await import('/src/vfx/vesselEffects.ts');
    const { overflowWallTime, overflowLocationFractions } = await import('/src/engine/overflowTransport.ts');
    const { _roots } = await import('/node_modules/.vite/deps/@react-three_fiber.js');
    const scene = [..._roots.values()].find(root => root.store.getState().gl.domElement === document.querySelector('canvas')).store.getState().scene;
    const geometryVolume = name => {
      const mesh = scene.getObjectByName(name), geometry = mesh?.geometry;
      if (!mesh?.visible || !geometry?.drawRange.count) return 0;
      const positions = geometry.attributes.position, indices = geometry.index;
      const origin = [positions.getX(indices.getX(0)), positions.getY(indices.getX(0)), positions.getZ(indices.getX(0))];
      let volume = 0;
      for (let i = 0; i < geometry.drawRange.count; i += 3) {
        const [a, b, c] = [0, 1, 2].map(k => { const v = indices.getX(i + k); return [positions.getX(v) - origin[0], positions.getY(v) - origin[1], positions.getZ(v) - origin[2]]; });
        volume += (a[0] * (b[1] * c[2] - b[2] * c[1]) + a[1] * (b[2] * c[0] - b[0] * c[2]) + a[2] * (b[0] * c[1] - b[1] * c[0])) / 6;
      }
      return Math.abs(volume) * 3.5 ** 3;
    };
    const snapshot = () => {
      const state = store.getState(), packets = state.inFlightPours;
      const material = [...Object.values(state.vessels), ...packets.map(p => p.sample), ...Object.values(state.spills)];
      const substances = {};
      for (const part of material) for (const c of part.contents ?? []) substances[c.formula] = (substances[c.formula] ?? 0) + c.moles;
      const locations = { wall_ml: 0, air_ml: 0, queued_ml: 0 };
      for (const p of packets) {
        const f = overflowLocationFractions(p);
        locations.wall_ml += p.sample.volume_ml * f.wall; locations.air_ml += p.sample.volume_ml * f.air;
        locations.queued_ml += p.sample.volume_ml * f.queued;
      }
      return { mass_g: material.reduce((sum, part) => sum + part.mass_g, 0), substances, ...locations,
        ground_ml: Object.values(state.spills).reduce((sum, p) => sum + p.volume_ml, 0),
        pending_ml: packets.reduce((sum, p) => sum + p.sample.volume_ml, 0),
        renderedWall_ml: geometryVolume('finite_exterior_film'), renderedAir_ml: geometryVolume('finite_air_stream'),
        packets: packets.map(p => ({ stage: p.stage, volume_ml: p.sample.volume_ml, elapsed_s: p.elapsed_s,
          wall_s: overflowWallTime(p), flight_s: p.trajectory.timeOfFlight, duration_s: p.duration_s, releaseBasis: p.releaseBasis,
          circularSheet: p.circularSheet, span_rad: p.wallFilm?.azimuthSpan_rad, widthBasis: p.wallFilm?.widthBasis,
          entrySpeed_m_s: p.wallFilm?.entrySpeed_m_s, reynolds4: p.wallFilm?.reynolds4,
          exit: p.trajectory.exitPos })), spills: Object.values(state.spills).map(p => ({ volume_ml: p.volume_ml, position: p.position })) };
    };
    const setup = () => {
      store.setState({ isSimulationPaused: true, timeScale: 1 });
      for (const id of Object.keys(store.getState().vessels)) store.getState().removeVessel(id);
      store.getState().addVessel('beaker', 'Nguồn dung dịch'); store.getState().addVessel('beaker', 'Bình hứng đầy');
      const [sourceId, targetId] = Object.keys(store.getState().vessels), vessels = { ...store.getState().vessels };
      for (const [id, volume, position, salted] of [[sourceId, 50, [-3, 0, 0], true], [targetId, 100, [0, 0.8, 0], false]]) {
        vessels[id] = { ...vessels[id], capacity_ml: 100, volume_ml: volume, volume: volume / 100, mass_g: volume,
          position, temperature_c: 25, liquidColor: salted ? '#4ca9cf' : '#f8fafc', substances: salted ? ['H2O', 'CuSO4'] : ['H2O'],
          contents: [{ formula: 'H2O', phase: 'l', mass_g: volume * (salted ? 0.98 : 1), moles: volume * (salted ? 0.98 : 1) / 18.015 },
            ...(salted ? [{ formula: 'CuSO4', phase: 'aq', mass_g: volume * 0.02, moles: volume * 0.02 / 159.61 }] : [])] };
      }
      store.setState({ vessels, burners: {}, activeKinetics: {}, pendingReactions: {}, spills: {}, inFlightPours: [],
        selectedVesselId: targetId, leftSidebarOpen: false, rightSidebarOpen: false });
      window.exteriorIds = { sourceId, targetId };
      return snapshot();
    };
    const dose = () => {
      window.exteriorDoseMasses = [];
      const stop = store.subscribe(() => window.exteriorDoseMasses.push(snapshot().mass_g));
      try { return effects.forVessel(window.exteriorIds.targetId).doseLiquid(window.exteriorIds.sourceId, 20); }
      finally { stop(); }
    };
    const advance = dt => { store.setState({ isSimulationPaused: false }); store.getState().advancePourTransport(dt); store.setState({ isSimulationPaused: true }); };
    Object.assign(window, { exteriorAudit: { store, scene, snapshot, setup, dose, advance } });
  });
  const initial = await page.evaluate(() => window.exteriorAudit.setup());
  report.initial = initial;
  await page.waitForTimeout(1000);
  report.receipt = await page.evaluate(() => window.exteriorAudit.dose());
  const atRelease = await page.evaluate(() => window.exteriorAudit.snapshot());
  report.observableDoseMasses_g = await page.evaluate(() => window.exteriorDoseMasses);
  if (report.observableDoseMasses_g.some(mass => Math.abs(mass - initial.mass_g) > 1e-8)) throw new Error('Unbalanced intermediate dose commit');
  if (atRelease.ground_ml !== 0 || Math.abs(atRelease.pending_ml - 20) > 1e-9) throw new Error('Early ground deposition or missing release');
  report.release = atRelease;
  let elapsed = 0;
  async function at(time, name) {
    await page.evaluate(dt => window.exteriorAudit.advance(dt), time - elapsed); elapsed = time;
    await page.waitForFunction(() => {
      const s = window.exteriorAudit.snapshot();
      return Math.abs(s.renderedWall_ml - s.wall_ml) < 0.003 && Math.abs(s.renderedAir_ml - s.air_ml) < 0.003;
    }, undefined, { timeout: 60000 });
    const sample = await page.evaluate(() => window.exteriorAudit.snapshot());
    if (Math.abs(sample.mass_g - initial.mass_g) > 1e-8) throw new Error(`Material loss at ${name}`);
    for (const [species, moles] of Object.entries(initial.substances)) if (Math.abs(sample.substances[species] - moles) > 1e-10) throw new Error(`Species loss at ${name}: ${species}`);
    report.phases.push({ name, ...sample });
    await page.screenshot({ path: path.join(output, `${name}.png`) });
    return sample;
  }
  const packet = atRelease.packets[0], travel = packet.wall_s + packet.flight_s;
  const film = await at(0.02, '01-wall-before-ground');
  if (film.ground_ml !== 0 || film.air_ml !== 0) throw new Error('Premature falling flow');
  const air = await at(packet.wall_s + packet.flight_s / 2, '02-air-before-ground');
  if (air.ground_ml !== 0 || air.air_ml <= 0) throw new Error('Invalid pre-impact material state');
  const partial = await at(travel + packet.duration_s / 2, '03-partial-ground');
  if (Math.abs(partial.ground_ml - 10) > 1e-8) throw new Error('Incorrect partial arrival');
  await at(travel + packet.duration_s + 0.001, '04-complete-ground');
  await page.evaluate(() => { window.exteriorAudit.setup(); window.exteriorAudit.dose(); });
  const moved = await page.evaluate(() => {
    const audit = window.exteriorAudit, p = audit.snapshot().packets[0];
    audit.advance(p.wall_s + p.flight_s / 2);
    audit.store.getState().updateVesselPosition(window.exteriorIds.targetId, [3, 0.8, -1]); audit.advance(0.001);
    return audit.snapshot();
  });
  if (!moved.packets.some(p => p.stage === 'air' && p.exit[0] < 2) || !moved.packets.some(p => p.stage === 'overflow' && p.exit[0] > 3)) throw new Error('Moving support teleported airborne fluid');
  report.moved = moved;
  await page.evaluate(() => window.exteriorAudit.advance(2));
  await page.waitForTimeout(200);
  const afterMove = await page.evaluate(() => window.exteriorAudit.snapshot());
  if (!afterMove.spills.some(p => p.position[0] < 1.5) || !afterMove.spills.some(p => p.position[0] > 1.5)
    || Math.abs(afterMove.ground_ml - 20) > 1e-8) throw new Error('Missing separate landings after move');
  report.afterMove = afterMove;
  await page.screenshot({ path: path.join(output, '05-moved-support.png') });
  await page.evaluate(() => {
    const a = window.exteriorAudit; a.setup(); a.dose(); const p = a.snapshot().packets[0];
    a.advance(p.wall_s + p.flight_s + p.duration_s / 4);
  });
  await page.waitForTimeout(1300); // wait for the actual persistence debounce
  report.beforeReload = await page.evaluate(() => window.exteriorAudit.snapshot());
  await page.reload({ waitUntil: 'domcontentloaded', timeout: 120000 });
  await page.waitForSelector('canvas', { timeout: 60000 });
  report.afterReload = await page.evaluate(async () => {
    const { useAppStore } = await import('/src/store/useAppStore.ts');
    useAppStore.setState({ isSimulationPaused: true }); const s = useAppStore.getState();
    return { mass_g: Object.values(s.vessels).reduce((sum, v) => sum + v.mass_g, 0)
      + s.inFlightPours.reduce((sum, p) => sum + p.sample.mass_g, 0) + Object.values(s.spills).reduce((sum, p) => sum + p.mass_g, 0),
      outside_ml: s.inFlightPours.reduce((sum, p) => sum + p.sample.volume_ml, 0) + Object.values(s.spills).reduce((sum, p) => sum + p.volume_ml, 0) };
  });
  if (Math.abs(report.afterReload.mass_g - initial.mass_g) > 1e-8 || Math.abs(report.afterReload.outside_ml - 20) > 1e-8) throw new Error('Reload duplicated/lost exterior matter');
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const output = path.resolve(process.env.OVERFLOW_AUDIT_OUTPUT ?? 'docs/research/overflow-transit-2026-10-29'); await mkdir(output, { recursive: true });
  const browser = await chromium.launch({ channel: 'chrome', headless: true });
  const report = { errors: [], consoleErrors: [], phases: [] };
  try {
    const context = await browser.newContext({ viewport: { width: 1440, height: 1000 } });
    await context.addInitScript(() => localStorage.setItem('chemlab_vfx_quality_preference', 'medium'));
    await context.route('**/api/**', route => route.abort()); const page = await context.newPage();
    page.on('pageerror', error => report.errors.push(error.message));
    page.on('console', message => { if (message.type() === 'error' && !message.text().includes('net::ERR_FAILED')) report.consoleErrors.push(message.text()); });
    await page.goto(process.env.LAB_ORIGIN ?? 'http://127.0.0.1:6773', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.waitForSelector('canvas', { timeout: 60000 });
    await auditExteriorOverflow(page, output, report); await context.close();
  } catch (error) { report.errors.push(error.stack ?? String(error)); process.exitCode = 1; }
  finally { await browser.close(); await writeFile(path.join(output, 'browser-audit.json'), JSON.stringify(report, null, 2) + '\n'); }
  if (report.errors.length || report.consoleErrors.length) process.exitCode = 1;
  console.log(JSON.stringify({ phases: report.phases.length, errors: report.errors, consoleErrors: report.consoleErrors }, null, 2));
}
