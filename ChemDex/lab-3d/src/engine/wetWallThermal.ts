import type { VesselState } from '../types/chemistry';
import { applyThermalEnergy, sampleHeatCapacity } from './thermalState';
import { wallThermalPaths } from './wallThermalPaths';
import { DEFAULT_LAB_ENVIRONMENT, waterBoilingPointAtPressure } from '../science/labEnvironment';
import { stepWallWaterPhase } from '../science/wallWaterPhase';
import { aqueousWaterBoundary } from '../science/aqueousWaterBoundary';

/** Exact film segments against an implicit final bulk temperature. The scalar
 * bracket couples finite bulk heat/phase capacity without explicit overshoot.
 * First-order operator splitting; finite boiling/dryout, no glass inertia/ice. */
export function stepWetWallThermal(v: VesselState, dt: number, includedDryHeat_J = 0, enabled = true) {
  const air = v.effectsEnvironment?.temperature_c ?? v.environment?.temperature_c ?? DEFAULT_LAB_ENVIRONMENT.temperature_c;
  const paths = wallThermalPaths(v, air), temperatures: { innerWall_c?: number; outerWall_c?: number } = {};
  const empty = { temperatures, innerVapor_g: 0, innerVaporEnergy_J: 0, innerVaporTemperatureMass_c_g: 0 };
  if (!(dt > 0) || !Number.isFinite(dt) || !v.wallCondensation) return { ...empty, vessel: v };
  const marked = { ...v, wallCondensation: { ...v.wallCondensation,
    thermalStatus: !enabled && paths.patches.length ? 'deferred-state-transition' : paths.status } };
  if (paths.patches.length === 0 || !enabled || !Number.isFinite(includedDryHeat_J)) return { ...empty, vessel: marked };
  const boiling = waterBoilingPointAtPressure(v.effectsEnvironment?.pressure_atm ?? v.environment?.pressure_atm);
  let activePatches = paths.patches, dryCredit = includedDryHeat_J, partialSealed = false;
  const evaluate = (bulk: number) => activePatches.map(p => ({ side: p.side, ...stepWallWaterPhase({
    dt, mass_g: p.mass_g, temperature_c: p.temperature_c, boiling_c: boiling,
    sample_c: bulk, air_c: air, sample_W_K: p.sample_W_K, air_W_K: p.air_W_K,
    allowBoiling: p.side === 'outer' || !v.isSealed,
  }) }));
  let anchor = evaluate(v.temperature_c);
  if (anchor.some(p => !p.valid && p.reason === 'unsupported-sealed-boiling' && p.side === 'inner')) {
    activePatches = paths.patches.filter(p => p.side !== 'inner'); partialSealed = true;
    temperatures.innerWall_c = v.wallCondensation.innerWall_c;
    dryCredit *= activePatches.reduce((s, p) => s + p.replacedDry_W_K, 0)
      / paths.patches.reduce((s, p) => s + p.replacedDry_W_K, 0);
    anchor = evaluate(v.temperature_c);
  }
  const creditOnlyTemperature = applyThermalEnergy(v, dryCredit, dt).temperature_c;
  let low = Math.min(v.temperature_c, creditOnlyTemperature, air, ...paths.patches.map(p => p.temperature_c));
  let high = Math.max(v.temperature_c, creditOnlyTemperature, air, ...paths.patches.map(p => p.temperature_c));
  const capacity = sampleHeatCapacity(v);
  const failure = (reason: string) => ({ ...empty, vessel: { ...marked,
    wallCondensation: { ...marked.wallCondensation, thermalStatus: reason } } });
  if (activePatches.length === 0) return failure('unsupported-sealed-boiling');
  if (anchor.some(p => !p.valid)) return failure(anchor.find(p => !p.valid)!.reason);
  const candidate = v.temperature_c + (dryCredit - anchor.reduce((s, p) => s + p.fromSample_J, 0))
    / (capacity + anchor.reduce((s, p) => s + p.fromSampleSlope_J_K, 0));
  const predictedNodes = Number.isFinite(candidate) ? evaluate(candidate) : [];
  const prediction = applyThermalEnergy(v, dryCredit - predictedNodes.reduce((s, p) => s + p.fromSample_J, 0), dt);
  const linear = candidate >= low && candidate <= high && predictedNodes.every(p => p.valid)
    && Math.abs(candidate - prediction.temperature_c) < 1e-11;
  if (linear) { low = candidate; high = candidate; }
  for (let i = 0; !linear && i < 56; i++) {
    const trial = (low + high) / 2, nodes = evaluate(trial);
    if (nodes.some(p => !p.valid)) return failure(nodes.find(p => !p.valid)!.reason);
    const sampleHeat = nodes.reduce((s, p) => s + p.fromSample_J, 0);
    const response = applyThermalEnergy(v, dryCredit - sampleHeat, dt).temperature_c;
    if (!Number.isFinite(response)) return failure('numerical-limit');
    if (response > trial) low = trial; else high = trial;
  }
  const result = evaluate((low + high) / 2);
  const fromSample = result.reduce((s, p) => s + p.fromSample_J, 0), fromAir = result.reduce((s, p) => s + p.fromAir_J, 0);
  if (result.some(p => !p.valid) || ![fromSample, fromAir, ...result.map(p => p.temperature_c)].every(Number.isFinite)) return failure('numerical-limit');
  const thermal = applyThermalEnergy(v, dryCredit - fromSample, dt);
  for (const p of result) temperatures[`${p.side}Wall_c`] = p.temperature_c;
  const wall = { ...marked.wallCondensation, ...temperatures,
    thermalStatus: partialSealed ? 'partial-sealed-boiling' : result.some(p => p.evaporated_g > 0)
      ? result.some(p => p.mass_g === 0) ? 'finite-dryout' : 'finite-boiling' : marked.wallCondensation.thermalStatus,
    filmHeatFromSample_J: (v.wallCondensation.filmHeatFromSample_J ?? 0) + fromSample,
    filmHeatFromAir_J: (v.wallCondensation.filmHeatFromAir_J ?? 0) + fromAir,
    filmSensibleEnergyChange_J: (v.wallCondensation.filmSensibleEnergyChange_J ?? 0) + result.reduce((s, p) => s + p.storedChange_J, 0),
    dryHeatReplaced_J: (v.wallCondensation.dryHeatReplaced_J ?? 0) + dryCredit,
    heatRejected_J: v.wallCondensation.heatRejected_J - fromAir,
    heatTransferredToSample_J: v.wallCondensation.heatTransferredToSample_J - fromSample,
  };
  let innerVapor_g = 0, innerVaporEnergy_J = 0, innerVaporTemperatureMass_c_g = 0;
  for (const r of result) {
    const ratio = r.mass_g / v.wallCondensation[`${r.side}_g`];
    wall[`${r.side}_g`] = r.mass_g;
    if (r.evaporated_g > 0) {
      wall[`${r.side}Beads`] = wall[`${r.side}Beads`]?.map(b => ({ ...b, mass_g: b.mass_g * ratio })).filter(b => b.mass_g > 0);
      wall[`${r.side}ThermalEvaporated_g`] = (wall[`${r.side}ThermalEvaporated_g`] ?? 0) + r.evaporated_g;
      wall[`${r.side}ThermalVaporEnergy_J`] = (wall[`${r.side}ThermalVaporEnergy_J`] ?? 0) + r.vaporEnergy_J;
      if (r.side === 'inner') { innerVapor_g += r.evaporated_g; innerVaporEnergy_J += r.vaporEnergy_J;
        innerVaporTemperatureMass_c_g += r.vaporTemperatureMass_c_g; }
      else wall.ambientReleased_g += r.evaporated_g;
    }
  }
  const updated = { ...v, ...thermal }, boundary = aqueousWaterBoundary(updated);
  // A zero-net film correction is not a new thermal time step. Retain the
  // already metered bulk boiling source while the corrected sample is still
  // at Tb; a real subcooling, dryout or unsupported state ends it.
  const isBoiling = !updated.isSealed && !updated.thermalModelLimit && boundary.water_g > 0
    && (v.isBoiling || thermal.isBoiling === true) && updated.temperature_c >= boundary.boiling_c - 1e-8;
  return { vessel: { ...updated, isBoiling,
    boilingIntensity: isBoiling ? Math.max(v.boilingIntensity ?? 0, thermal.boilingIntensity ?? 0) : 0,
    wallCondensation: wall }, temperatures, innerVapor_g, innerVaporEnergy_J, innerVaporTemperatureMass_c_g };
}
