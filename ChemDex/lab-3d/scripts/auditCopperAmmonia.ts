import { mkdirSync, writeFileSync } from 'node:fs';
import { copperAmmoniaEquilibrium, COPPER_AMMONIA_SOURCES, HYDROXO_AMMINES } from '../src/science/copperAmmoniaEquilibrium';
import { computeMolarMass } from '../src/engine/ledger';
import { AutoExperiment } from '../src/vfx/autoplay/AutoExperiment';
import { useAppStore } from '../src/store/useAppStore';

const output = 'artifacts/copper-ammonia';
mkdirSync(output, { recursive: true });
const row = (formula: string, moles: number, phase = 'aq') => ({ formula, moles, phase, mass_g: moles * computeMolarMass(formula) });
const grid = [];
for (const temperature_c of [5, 25, 60, 90]) for (const volume_ml of [30, 50, 500])
for (const ratio of [0.1, 0.5, 1, 2, 4, 5, 20, 100]) for (const sodiumHydroxide_mol of [0, 0.001, 0.01]) {
  const contents = [row('CuSO4', 0.001), row('NH3', 0.001 * ratio), row('H2O', volume_ml / 18.015, 'l')];
  if (sodiumHydroxide_mol) contents.push(row('NaOH', sodiumHydroxide_mol));
  const result = copperAmmoniaEquilibrium(contents, volume_ml, temperature_c);
  if (!result) throw new Error(`Unsupported grid point ${temperature_c}/${volume_ml}/${ratio}`);
  const { state: s } = result;
  // Recompute element-component balances from individual reported species;
  // do not trust only the solver's diagnostic residual fields.
  const C = s.freeCopper_M + s.hydrolyzedCopper_M + s.copperSulfatePair_M
    + s.ammines_M.reduce((sum, c) => sum + c, 0) + s.hydroxoAmmines_M.reduce((sum, c) => sum + c, 0)
    + s.solid_mol / (volume_ml / 1000);
  const N = s.freeAmmonia_M + s.ammonium_M + s.ammines_M.reduce((sum, c, i) => sum + (i + 1) * c, 0)
    + s.hydroxoAmmines_M.reduce((sum, c, i) => sum + HYDROXO_AMMINES[i].ammonia * c, 0);
  const S = s.freeSulfate_M + s.bisulfate_M + s.copperSulfatePair_M;
  const errors = [C - 0.001 / (volume_ml / 1000), N - 0.001 * ratio / (volume_ml / 1000),
    S - 0.001 / (volume_ml / 1000), s.chargeResidual_M];
  if (errors.some(e => !Number.isFinite(e) || Math.abs(e) > 1e-9)) throw new Error('Component or charge balance failed.');
  if (s.solid_mol > 1e-12 ? Math.abs(s.saturationRatio - 1) > 1e-8 : s.saturationRatio > 1 + 1e-8)
    throw new Error('Phase complementarity failed.');
  grid.push({ temperature_c, volume_ml, ammoniaCopperRatio: ratio, sodiumHydroxide_mol, ph: s.ph,
    solidFraction: s.solid_mol / 0.001, ammineFractions: s.ammines_M.map(c => c * volume_ml / 1000 / 0.001),
    hydroxoAmmineFractions: s.hydroxoAmmines_M.map(c => c * volume_ml / 1000 / 0.001),
    freeAmmonia_M: s.freeAmmonia_M, saturationRatio: s.saturationRatio, componentResiduals_M: errors });
}
writeFileSync(`${output}/speciation-grid.json`, JSON.stringify({ count: grid.length, sources: COPPER_AMMONIA_SOURCES,
  activityModel: 'ideal_concentration', kineticCalibration: false, hydroxoAmmineSpecies: HYDROXO_AMMINES,
  results: grid }, null, 2) + '\n');

await new Promise(resolve => setTimeout(resolve, 200));
const e = new AutoExperiment('cuso4_nh3');
await e.stocks.initialize();
const before = useAppStore.getState();
const initialMass_g = e.sample.mass_g + e.donors.reduce((sum, d) => sum + d.remaining, 0);
let peakGel_g = 0, gelDuringDose = false, maximumMassError_g = 0, peakParticles = 0;
for (let frame = 0; frame < 2600 && !['complete', 'error'].includes(e.phase); frame++) {
  e.tick(0.1);
  const gel = e.sample.precipitateAmount_g ?? 0;
  peakGel_g = Math.max(peakGel_g, gel);
  gelDuringDose ||= e.phase === 'dose' && gel > 1e-5;
  const mass = e.sample.mass_g + Object.values(e.sample.escapedGas_g ?? {}).reduce((s, c) => s + c, 0)
    + (e.sample.evaporated_ml ?? 0) + e.inFlightMass_g + e.donors.reduce((s, d) => s + d.remaining, 0);
  maximumMassError_g = Math.max(maximumMassError_g, Math.abs(mass - initialMass_g));
  peakParticles = Math.max(peakParticles, [...e.physics.precipitationSystems.values()].reduce((sum, p) => sum + p.particles.length, 0));
}
const report = { checkedAt: new Date().toISOString(), gridPoints: grid.length, sources: COPPER_AMMONIA_SOURCES,
  automatic: { phase: e.phase, error: e.error, initialMass_g, finalMass_g: e.sample.mass_g, maximumMassError_g,
    gelDuringDose, peakGel_g, finalGel_g: e.sample.precipitateAmount_g ?? 0, seconds: e.elapsed,
    peakParticles, finalParticles: [...e.physics.precipitationSystems.values()].reduce((sum, p) => sum + p.particles.length, 0),
    finalCloudiness: e.physics.cloudiness, particleBudget: e.physics.maxPrecipitateParticles,
    workbenchUnchanged: useAppStore.getState() === before },
  experimentallyValidated: false, kineticsCalibrated: false, rgbCalibrated: false,
  limitations: ['Ideal concentrations, not a full activity model.', 'Dimer species and other ligands are excluded; mixed-complex temperature enthalpies are estimates.',
    'Material heat uses the component-pool approximation; mixed-complex calorimetry is not calibrated.',
    'The finite material relaxation time is illustrative.', 'Projection uses neutral analytical salt pools, not literal neutral dissolved molecules.'] };
e.stocks.dispose();
writeFileSync(`${output}/physical-audit.json`, JSON.stringify(report, null, 2) + '\n');
const ok = e.phase === 'complete' && !e.error && gelDuringDose && report.automatic.finalGel_g < 1e-7
  && maximumMassError_g < 1e-5 && peakParticles <= e.physics.maxPrecipitateParticles && report.automatic.workbenchUnchanged;
console.log(JSON.stringify({ ...report, ok }, null, 2));
if (!ok) process.exitCode = 1;
