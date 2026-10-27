import type { VesselState } from '../types/chemistry';
import { DEFAULT_LAB_ENVIRONMENT, waterBoilingPointAtPressure } from '../science/labEnvironment';
import { aqueousWaterBoundary } from '../science/aqueousWaterBoundary';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { waterSaturationPressurePa } from '../science/waterSurface';
import { computeMolarMass } from './ledger';
import { applyThermalEnergy, aqueousBoilingPoint } from './thermalState';
import { ensureHeadspaceReference, gasPressurePatch } from './headspacePressure';
import { returnWallWater, stepWallCondensation } from './wallCondensation';
import { WATER_CP_J_G_K, waterLatentHeatJ_G } from './waterProperties';
import { stepWetWallThermal } from './wetWallThermal';

const escapedWater = (v: VesselState) => Object.entries(v.escapedGas_g ?? {})
  .reduce((sum, [formula, mass]) => sum + (sameMolecularFormula(formula, 'H2O') ? mass : 0), 0);

/** One final-step routing boundary after thermal, reaction and gas projection.
 * Chemical escapedGas_g remains a gross source ledger used by reaction replay;
 * waterVaporReleased_g is the actual external water sink after recovery.
 * Headspace carrier gas is a fresh-stream mixing approximation, not a solved
 * retained gas inventory or diffusion/residence-time model. */
export function routeWaterVaporToWall(current: VesselState, previous: VesselState, dt: number,
  wallThermalHandoff?: { includedDryHeat_J: number; enabled: boolean }) {
  current = ensureHeadspaceReference(current);
  if (!Number.isFinite(dt) || dt <= 0 || current.id.startsWith('lesson_vessel_') || current.type === 'hot_plate') {
    return { vessel: current, availableVapor_g: 0, availableVaporEnergy_J: 0, availableVaporTemperatureMass_c_g: 0, drainedOutside_g: 0 };
  }
  const wetWall = stepWetWallThermal(current, dt, wallThermalHandoff?.includedDryHeat_J ?? 0, wallThermalHandoff?.enabled ?? true);
  current = wetWall.vessel;
  const thermal_g = Math.max(0, (current.evaporated_ml ?? 0) - (previous.evaporated_ml ?? 0));
  const chemical_g = Math.max(0, escapedWater(current) - escapedWater(previous));
  const source_g = current.isSealed || current.isShattered ? 0 : thermal_g + chemical_g + wetWall.innerVapor_g;
  // Thermal packets are metered where water leaves, before dry glass heats up.
  // Chemical/legacy sources lack a gas-energy ledger: label their T-based estimate.
  const env = { ...DEFAULT_LAB_ENVIRONMENT, ...current.environment, ...current.effectsEnvironment };
  const pureBoiling = waterBoilingPointAtPressure(env.pressure_atm);
  const referenceTemperature = Math.min(current.temperature_c, pureBoiling);
  const estimate = WATER_CP_J_G_K * referenceTemperature + waterLatentHeatJ_G(referenceTemperature)
    + 1.86 * (current.temperature_c - referenceTemperature);
  const thermalEnergy = thermal_g > 0 && current.thermalVaporEnthalpy_J !== undefined
    ? Math.max(0, current.thermalVaporEnthalpy_J - (previous.thermalVaporEnthalpy_J ?? 0)) : thermal_g * estimate;
  const sourceEnergy = source_g > 0 ? thermalEnergy + (chemical_g > 0 ? chemical_g * estimate : 0) + wetWall.innerVaporEnergy_J : 0;
  const specificEnergy = source_g > 0 ? sourceEnergy / source_g : 0;
  const thermalTemperatureMass = thermal_g > 0 && current.thermalVaporSensibleEnthalpy_J !== undefined
    ? Math.max(0, current.thermalVaporSensibleEnthalpy_J - (previous.thermalVaporSensibleEnthalpy_J ?? 0)) / WATER_CP_J_G_K
    : thermal_g * current.temperature_c;
  const sourceTemperatureMass = source_g > 0 ? thermalTemperatureMass + chemical_g * current.temperature_c
    + wetWall.innerVaporTemperatureMass_c_g : 0;
  const specificTemperature = source_g > 0 ? sourceTemperatureMass / source_g : 0;
  const totalPressure = env.pressure_atm * 101325;
  const boundary = aqueousWaterBoundary(current);
  const surfaceTemperature = Math.min(current.temperature_c, Number.isFinite(boundary.boiling_c) ? boundary.boiling_c : pureBoiling);
  const saturatedFraction = Math.max(1e-9, Math.min(1, (boundary.activity ?? 1) * waterSaturationPressurePa(surfaceTemperature) / totalPressure));
  const carrierMol = thermal_g > 0 ? thermal_g / 18.015 * (1 - saturatedFraction) / saturatedFraction : 0;
  let otherMol = 0;
  for (const [formula, mass] of Object.entries(current.escapedGas_g ?? {})) {
    if (sameMolecularFormula(formula, 'H2O')) continue;
    const mm = computeMolarMass(formula);
    if (mm > 0) otherMol += Math.max(0, mass - (previous.escapedGas_g?.[formula] ?? 0)) / mm;
  }
  const waterMol = source_g / 18.015;
  const streamMol = waterMol + carrierMol + otherMol;
  const headspaceWaterPressure_Pa = streamMol > 0 ? totalPressure * waterMol / streamMol
    : (env.relativeHumidity ?? 0.5) * waterSaturationPressurePa(env.temperature_c);
  const condensation = stepWallCondensation(current, dt, source_g, { headspaceWaterPressure_Pa,
    vaporSpecificEnthalpy_J_g: specificEnergy, wallTemperatures: wetWall.temperatures,
    dryWallTemperatures: { innerWall_c: env.temperature_c + 0.35 * (current.temperature_c - env.temperature_c),
      outerWall_c: env.temperature_c + 0.9 * (current.temperature_c - env.temperature_c) } });
  let vessel: VesselState = { ...current, wallCondensation: condensation.wall,
    waterVaporEnergyModel: chemical_g > 0 || (thermal_g > 0 && current.thermalVaporEnthalpy_J === undefined)
      ? 'source-temperature-estimate' : 'emission-ledger',
    waterVaporTemperatureModel: chemical_g > 0 || (thermal_g > 0 && current.thermalVaporSensibleEnthalpy_J === undefined)
      ? 'source-temperature-estimate' : 'emission-ledger',
    condensationMist: Math.min(1, condensation.wall.inner_g / 0.03) };
  let extraVapor_g = 0;
  if (condensation.latentHeatToSample_J !== 0) {
    const correction = applyThermalEnergy(vessel, condensation.latentHeatToSample_J, dt);
    extraVapor_g = correction.evaporatedStep_g;
    vessel = { ...vessel, ...correction,
      isBoiling: (current.isBoiling || correction.isBoiling === true)
        && correction.temperature_c >= aqueousBoilingPoint({ ...vessel, ...correction }) - 1e-8 };
  }
  const evaporatedBeforeReturn = vessel.evaporated_ml ?? 0;
  vessel = returnWallWater(vessel, condensation.returnedStep_g, condensation.returnedTemperature_c);
  // Returned liquid may flash on hot dry glass or after dilution lowers the
  // boiling point. Route that finite new vapor to the same shared sink budget.
  extraVapor_g += Math.max(0, (vessel.evaporated_ml ?? 0) - evaporatedBeforeReturn);
  vessel.evaporationRate_g_s = (thermal_g + extraVapor_g) / dt;
  vessel.waterVaporFromChemistry_g = (previous.waterVaporFromChemistry_g ?? escapedWater(previous)) + chemical_g;
  // Wall drying is evaporation into carrier air, not a new jet of pure steam.
  // Otherwise a drying room-temperature wall could falsely become white fog.
  const dryingTemperature = condensation.wallEvaporatedStep_g > 0
    ? condensation.wallEvaporatedTemperatureMass_c_g / condensation.wallEvaporatedStep_g : condensation.wall.innerWall_c;
  const wallFraction = Math.max(1e-9, Math.min(1, waterSaturationPressurePa(dryingTemperature) / totalPressure));
  const dryingCarrierMol = condensation.wallEvaporatedStep_g > 0
    ? condensation.wallEvaporatedStep_g / 18.015 * (1 - wallFraction) / wallFraction : 0;
  const dryingEnthalpy = condensation.wallEvaporatedEnergy_J;
  const extraEnergy = Math.max(0, (vessel.thermalVaporEnthalpy_J ?? 0) - (current.thermalVaporEnthalpy_J ?? 0));
  const availableVaporEnergy_J = sourceEnergy - (condensation.capturedStep_g ?? 0) * specificEnergy
    + dryingEnthalpy + extraEnergy;
  const extraTemperatureMass = Math.max(0, (vessel.thermalVaporSensibleEnthalpy_J ?? 0)
    - (current.thermalVaporSensibleEnthalpy_J ?? 0)) / WATER_CP_J_G_K;
  const availableVaporTemperatureMass_c_g = sourceTemperatureMass - (condensation.capturedStep_g ?? 0) * specificTemperature
    + condensation.wallEvaporatedTemperatureMass_c_g + extraTemperatureMass;
  vessel.waterVaporCarrier_mol_s = (carrierMol + otherMol + dryingCarrierMol) / dt;
  vessel = { ...vessel, ...gasPressurePatch(vessel) };
  return { vessel, availableVapor_g: condensation.availableVapor_g + extraVapor_g,
    availableVaporEnergy_J,
    availableVaporTemperatureMass_c_g,
    drainedOutside_g: condensation.drainedStep_g };
}

export function waterVaporReleasedHistoryG(vessel: VesselState): number {
  return vessel.waterVaporReleased_g ?? Math.max(0, (vessel.evaporated_ml ?? 0) + escapedWater(vessel)
    - (vessel.wallCondensation?.inner_g ?? 0) - (vessel.wallCondensation?.returned_g ?? 0)
    - (vessel.wallCondensation?.innerReleasedOnBreak_g ?? 0) - (vessel.condensedTransfer_g ?? 0));
}

export function finalizeWaterVaporOutflow(current: VesselState, previous: VesselState, available_g: number, dt: number,
  availableEnergy_J?: number, availableTemperatureMass_c_g?: number): VesselState {
  if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(available_g) || available_g < 0) return current;
  const recovered = Math.max(0, (current.condensedTransfer_g ?? 0) - (previous.condensedTransfer_g ?? 0));
  const released = Math.max(0, available_g - recovered);
  const historical = waterVaporReleasedHistoryG(previous);
  const env = { ...DEFAULT_LAB_ENVIRONMENT, ...current.environment, ...current.effectsEnvironment };
  const waterMol = released / 18.015, carrier = (current.waterVaporCarrier_mol_s ?? 0) * dt;
  return { ...current, waterVaporOutflow_g_s: released / dt, waterVaporReleased_g: historical + released,
    waterVaporTemperature_c: released > 0 && available_g > 0 && Number.isFinite(availableTemperatureMass_c_g)
      ? availableTemperatureMass_c_g! / available_g : undefined,
    waterVaporSpecificEnthalpy_J_g: released > 0 && available_g > 0 && Number.isFinite(availableEnergy_J)
      ? availableEnergy_J! / available_g : undefined,
    ...(Number.isFinite(availableEnergy_J) && availableEnergy_J! >= 0 ? {
      // Shared receivers split this uniform packet. A massless stream cannot
      // carry heat; avoid subtracting rounded lifetime energy counters here.
      waterVaporReleasedEnergy_J: (previous.waterVaporReleasedEnergy_J ?? 0)
        + (available_g > 0 ? availableEnergy_J! * (released / available_g) : 0),
    } : {}),
    waterVaporPartialPressure_Pa: waterMol > 0 ? env.pressure_atm * 101325 * waterMol / (waterMol + carrier) : 0 };
}

/** Chemical exhaust is a source-boundary history. Replace its gross H2O entry
 * by the final external water sink when making a post-recovery gas audit. */
export function postRecoveryExhaustG(vessel: VesselState): Record<string, number> {
  const gas = { ...vessel.escapedGas_g };
  if (vessel.waterVaporReleased_g === undefined) return gas;
  for (const formula of Object.keys(gas)) if (sameMolecularFormula(formula, 'H2O')) delete gas[formula];
  gas.H2O = vessel.waterVaporReleased_g;
  return gas;
}
