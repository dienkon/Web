import { mkdirSync, writeFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { cpus, platform, arch } from 'node:os';
import { performance } from 'node:perf_hooks';
import { PrecipitationSystem } from '../src/simulation/effects/PrecipitationSystem';
import { PRNG } from '../src/core/rng';
import { getVesselProfile } from '../src/pour/physics/profiles';
import { liquidLevelForVolume } from '../src/science/vesselDimensions';

const frames = 240, dt = 1 / 60, vesselCount = 20;
const profile = getVesselProfile('beaker', 100), fill = liquidLevelForVolume('beaker', 25, 100);
const formulas = ['BaSO4', 'Cu(OH)2', 'AgCl', 'PbI2'];
function run(budget: number) {
  const systems = Array.from({ length: vesselCount }, (_, i) => new PrecipitationSystem(budget, formulas[i % formulas.length], new PRNG(470 + i)));
  const durations: number[] = [];
  let maxLive = 0, maxMassError_g = 0;
  for (let frame = 0; frame < frames; frame++) {
    const mass = 0.01 + Math.min(frame, 120) * 0.0002;
    const start = performance.now();
    systems.forEach((s, i) => s.update(dt, { substance: formulas[i % formulas.length],
      formation: formulas[i % formulas.length] === 'PbI2' ? 'CRYSTAL_PLATE' : undefined,
      temp_c: 25, density_g_ml: 1, viscosity_mPa_s: 1, volume_ml: 25, vesselProfile: profile,
      radius: profile.r(fill), liquidBottomY: profile.baseY, surfaceY: fill, precipitateAmount_g: mass,
      agitation: frame >= 160 && frame < 200 ? 0.5 : 0,
      entryPoint: [0.25, fill - 0.02, 0.1] }));
    durations.push(performance.now() - start);
    for (const s of systems) {
      maxLive = Math.max(maxLive, s.particles.length);
      maxMassError_g = Math.max(maxMassError_g, Math.abs(s.representedMass_g - mass));
    }
  }
  const hash = createHash('sha256').update(JSON.stringify(systems.map(s => ({ particles: s.particles,
    bed: s.sedimentBed.amount_g, depth: s.opticalDepth, mass: s.representedMass_g,
    flocculation: s.flocculation, time: s.integratedTime_s })))).digest('hex');
  const sorted = [...durations].sort((a, b) => a - b);
  return { displayBudgetPerSpecies: budget, stateHash: hash, maxLivePerSpecies: maxLive, maxMassError_g,
    physicalCapacityPerSpecies: systems[0].transportCapacity, finalBedMass_g: systems.reduce((sum, s) => sum + s.sedimentBed.amount_g, 0),
    cpuBatchMean_ms: durations.reduce((a, b) => a + b, 0) / frames,
    cpuBatchP95_ms: sorted[Math.floor(0.95 * (sorted.length - 1))],
    cpuTotal_ms: durations.reduce((a, b) => a + b, 0) };
}
run(35); // JIT warmup excluded from measured batches.
const cases = [0, 35, 900].map(run);
const invariants = { samePhysicalStateAcrossBudgets: new Set(cases.map(c => c.stateHash)).size === 1,
  boundedPopulation: cases.every(c => c.maxLivePerSpecies <= c.physicalCapacityPerSpecies),
  conservedMass: cases.every(c => c.maxMassError_g < 1e-10) };
const report = { scope: 'CPU precipitation transport only; no React, optics atlas, WebGL, chemistry or FPS claim',
  environment: { node: process.version, os: `${platform()} ${arch()}`, cpu: cpus()[0]?.model },
  vesselCount, seconds: frames * dt, dt, frames, workload: '4 species, source growth2s, settling, stirring0.667s',
  cases, invariants };
mkdirSync('artifacts/precipitate-transport-population', { recursive: true });
writeFileSync('artifacts/precipitate-transport-population/audit.json', JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
if (Object.values(invariants).some(value => !value)) process.exitCode = 1;
