import { mkdirSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';
import { goldenRainInventory } from '../src/science/goldenRainProtocol';
import { sameMolecularFormula } from '../src/science/speciesIdentity';

const outputDirectory = resolve('artifacts/reaction-fidelity');
mkdirSync(outputDirectory, { recursive: true });
const experiment = new AutoExperiment('golden_rain', true);
await experiment.stocks.initialize();
const initialMass_g = experiment.donors.reduce((sum, donor) => sum + donor.remaining, 0);
const initialLead_mol = experiment.donors.reduce((sum, donor) => sum + (sameMolecularFormula(donor.row.formula, 'Pb(NO3)2') ? donor.row.moles : 0), 0);
const transitions: ReturnType<typeof snapshot>[] = [], samples: ReturnType<typeof snapshot>[] = [];
let maxMassError_g = 0, maxRepresentedSolidError_g = 0, maxParticleParcels = 0, maxRenderedParticles = 0;
let maxPlateParcels = 0, maxPlateMass_g = 0, maxTemperature_c = 25, maxPendingTime_s = 0;
let firstColdPrecipitate_s: number | null = null, firstPlate_s: number | null = null, clearAt_s: number | null = null;
let previousPhase: string | undefined, previousLog = '', nextSample_s = 0, nextProgress_s = 300;
const started = performance.now();

function snapshot() {
  const vessel = experiment.sample, inventory = goldenRainInventory(vessel);
  const systems = [...experiment.physics.precipitationSystems.entries()].map(([key, system]) => ({
    key, morphology: system.profile.morphology, profileId: system.profile.id, profileBasis: system.profile.modelBasis,
    density_g_cm3: system.profile.particleDensity_g_cm3, modelBasis: system.profile.modelBasis,
    particleParcels: system.particles.length, renderBudget: system.maxParticles,
    renderedParticles: Math.min(system.maxParticles, system.particles.length),
    representedMass_g: system.representedMass_g, lastInputMass_g: system.lastInputMass_g,
    bedMass_g: system.sedimentBed.amount_g, clock: system.clock,
    meanPhysicalRadius_m: system.particles.length
      ? system.particles.reduce((sum, particle) => sum + (particle.physicalRadius_m ?? 0), 0) / system.particles.length : 0,
  }));
  const accountedMass_g = vessel.mass_g + (vessel.evaporated_ml ?? 0)
    + Object.values(vessel.escapedGas_g ?? {}).reduce((sum, mass) => sum + mass, 0)
    + experiment.donors.reduce((sum, donor) => sum + donor.remaining, 0) + experiment.inFlightMass_g
    + experiment.transferWaste.reduce((sum, waste) => sum + waste.mass_g, 0);
  return { elapsed_s: experiment.elapsed, phase: experiment.phase, caption: experiment.caption,
    temperature_c: vessel.temperature_c, volume_ml: vessel.volume_ml, mass_g: vessel.mass_g,
    evaporatedWater_g: vessel.evaporated_ml ?? 0, accountedMass_g, massError_g: accountedMass_g - initialMass_g,
    precipitate: inventory, settledFraction: experiment.settledFraction,
    sedimentBed: { ...experiment.physics.sedimentBed }, cloudiness: experiment.physics.cloudiness,
    stirringDrive: experiment.stirringDrive, flame: experiment.flame,
    totalLeadIodide_mol: vessel.contents.filter(row => sameMolecularFormula(row.formula, 'PbI2'))
      .reduce((sum, row) => sum + row.moles, 0),
    systems, error: experiment.error };
}

for (let frame = 0; frame < 36000 && !['complete', 'error'].includes(experiment.phase); frame++) {
  experiment.tick(0.1);
  const inventory = goldenRainInventory(experiment.sample);
  if (inventory.solid_g > 1e-8 && firstColdPrecipitate_s === null) firstColdPrecipitate_s = experiment.elapsed;
  if (inventory.plates_g > 1e-8 && firstPlate_s === null) firstPlate_s = experiment.elapsed;
  if (experiment.phase === 'cool' && clearAt_s === null) clearAt_s = experiment.elapsed;
  maxPlateMass_g = Math.max(maxPlateMass_g, inventory.plates_g);
  maxTemperature_c = Math.max(maxTemperature_c, experiment.sample.temperature_c);
  let parcels = 0, rendered = 0, represented = 0;
  for (const [key, system] of experiment.physics.precipitationSystems) {
    parcels += system.particles.length; rendered += Math.min(system.maxParticles, system.particles.length);
    represented += system.representedMass_g;
    maxPendingTime_s = Math.max(maxPendingTime_s, system.pendingTime_s);
    if (key.includes('CRYSTAL_PLATE')) maxPlateParcels = Math.max(maxPlateParcels, system.particles.length);
  }
  maxParticleParcels = Math.max(maxParticleParcels, parcels); maxRenderedParticles = Math.max(maxRenderedParticles, rendered);
  maxRepresentedSolidError_g = Math.max(maxRepresentedSolidError_g, Math.abs(represented - inventory.solid_g));
  const state = snapshot();
  maxMassError_g = Math.max(maxMassError_g, Math.abs(state.massError_g));
  if (experiment.phase !== previousPhase || experiment.log.at(-1) !== previousLog) {
    transitions.push(state); previousPhase = experiment.phase; previousLog = experiment.log.at(-1) ?? '';
    console.log(JSON.stringify({ event: 'transition', elapsed_s: +experiment.elapsed.toFixed(2), phase: experiment.phase,
      temperature_c: +experiment.sample.temperature_c.toFixed(3), solid_g: inventory.solid_g, plates_g: inventory.plates_g,
      settled: experiment.settledFraction, particles: parcels }));
  }
  if (experiment.elapsed >= nextSample_s) { samples.push(state); nextSample_s += 30; }
  if (experiment.elapsed >= nextProgress_s) {
    console.log(JSON.stringify({ event: 'progress', elapsed_s: +experiment.elapsed.toFixed(2), phase: experiment.phase,
      temperature_c: +experiment.sample.temperature_c.toFixed(3), solid_g: inventory.solid_g,
      settled: experiment.settledFraction, particles: parcels, maxMassError_g }));
    nextProgress_s += 300;
  }
}
const final = snapshot(); samples.push(final);
const assertions = {
  completed: experiment.phase === 'complete', noError: experiment.error === null,
  reachedDissolution: clearAt_s !== null, coolingCreatedPlates: firstPlate_s !== null && clearAt_s !== null && firstPlate_s >= clearAt_s,
  settledAtLeast90Percent: experiment.settledFraction >= 0.9,
  massConservedWithin10Micrograms: maxMassError_g <= 1e-5,
  leadIodideConservedWithin1Nanomol: Math.abs(final.totalLeadIodide_mol - initialLead_mol) <= 1e-9,
  representedSolidConservedWithin10Nanograms: maxRepresentedSolidError_g <= 1e-8,
  renderedWithinBudget: maxRenderedParticles <= experiment.physics.maxPrecipitateParticles,
  physicalClockCaughtUp: maxPendingTime_s <= 1e-8,
};
const report = { generatedAt: new Date().toISOString(), audit: 'Headless AutoExperiment(true), stocks initialized, fixed 60 Hz director/120 Hz precipitation',
  initialMass_g, initialLead_mol, maxSimulated_s: 3600, wallSeconds: (performance.now() - started) / 1000,
  assertions, measurements: { firstColdPrecipitate_s, firstPlate_s, clearAt_s, maxMassError_g, maxRepresentedSolidError_g,
    maxParticleParcels, maxRenderedParticles, renderBudget: experiment.physics.maxPrecipitateParticles,
    maxPlateParcels, maxPlateMass_g, maxTemperature_c, maxPendingTime_s }, transitions, final, samples,
  limitations: ['Headless state audit does not validate pixels, glass transparency or UI overlays.',
    'The PbI2 water-solubility curve and precipitation relaxation rates are proxies; plate drag/growth are not fitted experimental kinetics.'] };
writeFileSync(resolve(outputDirectory, 'golden-rain-runtime.json'), JSON.stringify(report, null, 2) + '\n');
const lines = ['# Kiểm tra Golden Rain với hiệu ứng vật lý', '',
  `Trạng thái: **${final.phase}**; thời gian mô phỏng ${final.elapsed_s.toFixed(1)} s; tính toán ${report.wallSeconds.toFixed(1)} s.`, '',
  '| Kiểm tra | Kết quả |', '| --- | --- |', ...Object.entries(assertions).map(([key, value]) => `| ${key} | ${value ? 'Đạt' : 'Chưa đạt'} |`), '',
  '| Thời gian (s) | Pha | Nhiệt độ (°C) | PbI₂ rắn (g) | Phiến (g) | Đã lắng |', '| --- | --- | --- | --- | --- | --- |',
  ...transitions.map(row => `| ${row.elapsed_s.toFixed(1)} | ${row.phase} | ${row.temperature_c.toFixed(2)} | ${row.precipitate.solid_g.toPrecision(5)} | ${row.precipitate.plates_g.toPrecision(5)} | ${(100 * row.settledFraction).toFixed(1)}% |`), '',
  `Sai số khối lượng cực đại: ${maxMassError_g.toExponential(3)} g. Sai lệch rắn được đại diện: ${maxRepresentedSolidError_g.toExponential(3)} g.`,
  `Số parcel vật lý tối đa: ${maxParticleParcels}; số hạt được chọn vẽ tối đa: ${maxRenderedParticles}/${experiment.physics.maxPrecipitateParticles}.`, '',
  ...report.limitations.map(line => `- ${line}`), ''];
writeFileSync(resolve(outputDirectory, 'golden-rain-runtime.vi.md'), lines.join('\n'));
experiment.stocks.dispose();
console.log(JSON.stringify({ event: 'finished', phase: final.phase, elapsed_s: final.elapsed_s, assertions,
  measurements: report.measurements, output: resolve(outputDirectory, 'golden-rain-runtime.json') }));
if (Object.values(assertions).some(value => !value)) process.exitCode = 1;
