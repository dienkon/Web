import type { VesselState } from '../types/chemistry';
import { DEFAULT_LAB_ENVIRONMENT, waterBoilingPointAtPressure } from '../science/labEnvironment';
import { waterDewPointC, waterMassFluxG_M2_S, waterPressureDrivenFluxG_M2_S, supportsWaterSurface, waterSaturationPressurePa } from '../science/waterSurface';
import { vesselInterior } from '../science/vesselDimensions';
import { vesselLiquidSurfaceY } from '../science/vesselGeometry';
import { vesselBodyTransform } from '../science/vesselScale';
import { occupiedLiquidVolume } from '../handling/solidOccupancy';
import { vesselContours } from '../science/vesselContours';
import { contourWallArea } from '../science/wallDropletGeometry';
import { transportWallBeads, type WallBead } from './wallDropletTransport';
import { waterLatentHeatJ_G } from '../science/waterThermodynamics';
import { applyThermalEnergy, aqueousBoilingPoint, sampleHeatCapacity } from './thermalState';
import { WATER_CP_J_G_K } from './waterProperties';
import { identifySpecies, sameMolecularFormula } from '../science/speciesIdentity';

export interface WallCondensationState {
  motionModel?: 'quasi-steady-cap/iapws2008-saturation-reference';
  innerMotionLimit?: string;
  outerMotionLimit?: string;
  massTransferModel?: 'pressure-driven-cap' | 'finite-film-pressure-driven-cap';
  innerMassTransferVaporEnergy_J?: number;
  outerMassTransferVaporEnergy_J?: number;
  innerDryingLimit?: string;
  outerDryingLimit?: string;
  outerDrainedSensibleEnergy_J?: number;
  condensationModel?: 'finite-wet-caps/isothermal-dry-glass';
  innerDryGlass_c?: number;
  outerDryGlass_c?: number;
  innerWetCondensed_g?: number;
  innerDryCondensed_g?: number;
  outerWetCondensed_g?: number;
  outerDryCondensed_g?: number;
  innerCondensationEnergyReceived_J?: number;
  ambientCondensationEnergyReceived_J?: number;
  innerCondensationLimit?: string;
  outerCondensationLimit?: string;
  innerGasWaterPressure_Pa?: number;
  innerEvaporationFlux_g_m2_s?: number;
  outerEvaporationFlux_g_m2_s?: number;
  innerMassTransferEvaporated_g?: number;
  outerMassTransferEvaporated_g?: number;
  innerReleasedOnBreak_g?: number;
  thermalStatus?: string;
  filmHeatFromSample_J?: number;
  filmHeatFromAir_J?: number;
  filmSensibleEnergyChange_J?: number;
  dryHeatReplaced_J?: number;
  innerThermalEvaporated_g?: number;
  outerThermalEvaporated_g?: number;
  innerThermalVaporEnergy_J?: number;
  outerThermalVaporEnergy_J?: number;
  outerReleasedOnBreak_g?: number;
  inner_g: number;
  outer_g: number;
  innerWall_c: number;
  outerWall_c: number;
  dewPoint_c: number;
  ambientCollected_g: number;
  ambientReleased_g: number;
  returned_g: number;
  /** Incoming liquid sensible enthalpy, constant Cp / 0 C reference. */
  returnedSensibleEnergy_J?: number;
  drainedOutside_g: number;
  heatRejected_J: number;
  heatTransferredToSample_J: number;
  innerBeads?: WallBead[];
  outerBeads?: WallBead[];
}

/** Two wall regions, not a temperature-triggered fog toggle. Inner headspace
 * captures only this step's finite water vapor; outer wall draws from the open
 * room boundary. Glass temperatures use a lumped resistance approximation.
 * Existing water retains incoming vapor enthalpy. Bare-glass condensation
 * keeps an explicit isothermal boundary pending finite glass inertia.
 * Bead mobility uses an assumed wetting
 * closure; neither contact angles nor frost are solved from surface chemistry. */
export function stepWallCondensation(vessel: VesselState, dt: number, vapor_g: number,
  source: { headspaceWaterPressure_Pa?: number; vaporSpecificEnthalpy_J_g?: number;
    wallTemperatures?: { innerWall_c?: number; outerWall_c?: number };
    dryWallTemperatures?: { innerWall_c?: number; outerWall_c?: number } } = {}) {
  const env = { ...DEFAULT_LAB_ENVIRONMENT, ...vessel.environment, ...vessel.effectsEnvironment };
  const old = vessel.wallCondensation;
  const innerWall_c = source.wallTemperatures?.innerWall_c ?? (old && old.inner_g > 0
    ? old.innerWall_c : env.temperature_c + 0.35 * (vessel.temperature_c - env.temperature_c));
  const outerWall_c = source.wallTemperatures?.outerWall_c ?? (old && old.outer_g > 0
    ? old.outerWall_c : env.temperature_c + 0.9 * (vessel.temperature_c - env.temperature_c));
  const dryInner_c = source.dryWallTemperatures?.innerWall_c ?? source.wallTemperatures?.innerWall_c
    ?? env.temperature_c + 0.35 * (vessel.temperature_c - env.temperature_c);
  const dryOuter_c = source.dryWallTemperatures?.outerWall_c ?? source.wallTemperatures?.outerWall_c
    ?? env.temperature_c + 0.9 * (vessel.temperature_c - env.temperature_c);
  const dewPoint_c = waterDewPointC(env.temperature_c, env.relativeHumidity ?? 0.5);
  const wall: WallCondensationState = { inner_g: 0, outer_g: 0, ambientCollected_g: 0,
    ambientReleased_g: 0, returned_g: 0, returnedSensibleEnergy_J: 0, drainedOutside_g: 0, heatRejected_J: 0, heatTransferredToSample_J: 0,
    ...old, innerWall_c, outerWall_c, dewPoint_c };
  if (!(dt > 0) || !Number.isFinite(dt) || !Number.isFinite(vapor_g) || vapor_g < 0 || vessel.isShattered
    || ![vessel.temperature_c, env.temperature_c, env.airSpeed_m_s, env.relativeHumidity ?? 0.5].every(Number.isFinite)
    || env.airSpeed_m_s < 0 || (env.relativeHumidity ?? 0.5) < 0 || (env.relativeHumidity ?? 0.5) > 1) {
    return { wall: old ? { ...old } : wall, availableVapor_g: Number.isFinite(vapor_g) ? Math.max(0, vapor_g) : 0,
      returnedStep_g: 0, returnedTemperature_c: innerWall_c, drainedStep_g: 0, latentHeatToSample_J: 0,
      wallEvaporatedStep_g: 0, wallEvaporatedEnergy_J: 0, wallEvaporatedTemperatureMass_c_g: 0 };
  }
  const interior = vesselInterior(vessel.type);
  const liquidY = vesselLiquidSurfaceY(vessel);
  const outerPoints = vesselContours(vessel.type).outer;
  const METERS_PER_SCENE_UNIT = vesselBodyTransform(vessel).metersPerLocalUnit;
  const headArea = contourWallArea(interior.points, liquidY, interior.topY) * METERS_PER_SCENE_UNIT ** 2;
  const wetArea = contourWallArea(outerPoints, interior.floorY, liquidY) * METERS_PER_SCENE_UNIT ** 2;
  const innerLatent = waterLatentHeatJ_G(innerWall_c);
  // With no incoming stream, the open headspace exchanges with room humidity;
  // zero emitted vapor is not evidence of perfectly dry air. Explicit stream
  // pressure (including zero for a dry gas) remains authoritative.
  const innerGasPressure = source.headspaceWaterPressure_Pa ?? (vapor_g > 0
    ? waterSaturationPressurePa(vessel.temperature_c)
    : (env.relativeHumidity ?? 0.5) * waterSaturationPressurePa(env.temperature_c));
  const innerDryingFlux = !vessel.isSealed && innerLatent > 0
    ? Math.max(0, waterPressureDrivenFluxG_M2_S(innerWall_c, vessel.temperature_c, innerGasPressure, env.airSpeed_m_s)) : 0;
  // Exterior condensation is restricted to liquid water, not subzero frost.
  const outerFluxDensity = outerWall_c >= 0 ? -waterMassFluxG_M2_S(outerWall_c, env.temperature_c,
    env.relativeHumidity ?? 0.5, env.airSpeed_m_s) : 0;
  const referenceT = Math.min(vessel.temperature_c, waterBoilingPointAtPressure(env.pressure_atm));
  const innerH = source.vaporSpecificEnthalpy_J_g ?? WATER_CP_J_G_K * referenceT + waterLatentHeatJ_G(referenceT)
    + 1.86 * (vessel.temperature_c - referenceT);
  const ambientH = WATER_CP_J_G_K * env.temperature_c + waterLatentHeatJ_G(env.temperature_c);
  const outerTransport = transportWallBeads({ previous: wall.outerBeads, initialMass_g: wall.outer_g,
    metersPerLocalUnit: METERS_PER_SCENE_UNIT,
    deposited_g: 0, evaporated_g: 0, evaporationFlux_g_m2_s: 0, dt, points: outerPoints,
    condensationBoundary: { gasTemperature_c: env.temperature_c,
      waterPressure_Pa: (env.relativeHumidity ?? 0.5) * waterSaturationPressurePa(env.temperature_c), airSpeed_m_s: env.airSpeed_m_s,
      regionArea_m2: wetArea, dryWallTemperature_c: dryOuter_c, vaporSpecificEnthalpy_J_g: ambientH },
    evaporationBoundary: { gasTemperature_c: env.temperature_c,
      waterPressure_Pa: (env.relativeHumidity ?? 0.5) * waterSaturationPressurePa(env.temperature_c), airSpeed_m_s: env.airSpeed_m_s },
    bottom: interior.floorY, top: liquidY, temperature_c: outerWall_c, inner: false });
  // Drying latent work comes from finite film storage, not an extra debit to
  // the sample or an isothermal room source. Condensation keeps its own path.
  const collected = outerTransport.condensed_g;
  const latentHeatToSample_J = outerTransport.condensationBoundaryHeat_J;
  // The real route applies this heat packet before accepting returned water.
  // Preview the same pure operation so freezing/flash cannot overfill the
  // receiver after the bead inventory has already been debited.
  const returnTarget = latentHeatToSample_J === 0 ? vessel
    : { ...vessel, ...applyThermalEnergy(vessel, latentHeatToSample_J, dt) };
  const availableReturn = wall.inner_g + (!vessel.isSealed ? vapor_g : 0);
  // Coldest incoming liquid bounds occupancy; use a fast path only if ALL of
  // it fits. Otherwise admit each real enthalpy receipt, including prior drops.
  const allReturnsFit = wallReturnCapacityG(returnTarget, 0, availableReturn) >= availableReturn;
  const admissionCache = new Map<string, number>();
  const admitDrain = !validReturnTarget(returnTarget, innerWall_c) ? () => 0
    : allReturnsFit ? undefined : (requested: number, drained: number, sensible: number, temperature: number) => {
    const key = `${requested},${drained},${sensible},${temperature}`;
    if (admissionCache.has(key)) return admissionCache.get(key)!;
    const fits = (extra: number) => {
      const mass = drained + extra; if (mass === 0) return true;
      const mean = (sensible + extra * WATER_CP_J_G_K * temperature) / (WATER_CP_J_G_K * mass);
      const preview = returnWallWater(returnTarget, mass, mean);
      return preview !== returnTarget && occupiedLiquidVolume(preview) <= returnTarget.capacity_ml;
    };
    let accepted = requested;
    if (!fits(requested)) {
      let low = 0, high = requested;
      for (let i = 0; i < 44; i++) { const mid = (low + high) / 2; if (fits(mid)) low = mid; else high = mid; }
      accepted = low;
    }
    admissionCache.set(key, accepted); return accepted;
  };
  const innerTransport = transportWallBeads({ previous: wall.innerBeads, initialMass_g: wall.inner_g,
    metersPerLocalUnit: METERS_PER_SCENE_UNIT,
    deposited_g: 0, evaporated_g: 0, evaporationFlux_g_m2_s: 0, dt, points: interior.points,
    condensationBoundary: !vessel.isSealed && vapor_g > 0 && (supportsWaterSurface(vessel) || source.headspaceWaterPressure_Pa !== undefined)
      ? { gasTemperature_c: vessel.temperature_c, waterPressure_Pa: innerGasPressure, airSpeed_m_s: env.airSpeed_m_s,
        regionArea_m2: headArea, dryWallTemperature_c: dryInner_c, vaporSpecificEnthalpy_J_g: innerH, availableVapor_g: vapor_g } : undefined,
    evaporationBoundary: !vessel.isSealed ? { gasTemperature_c: vessel.temperature_c,
      waterPressure_Pa: innerGasPressure, airSpeed_m_s: env.airSpeed_m_s } : undefined,
    bottom: liquidY, top: interior.topY, temperature_c: innerWall_c, inner: true,
    maximumDrain_g: availableReturn, admitDrain });
  wall.innerBeads = innerTransport.beads;
  wall.outerBeads = outerTransport.beads;
  wall.inner_g = innerTransport.retained_g;
  wall.outer_g = outerTransport.retained_g;
  wall.motionModel = outerTransport.motionModel;
  wall.innerMotionLimit = innerTransport.motionModelLimit;
  wall.outerMotionLimit = outerTransport.motionModelLimit;
  wall.innerWall_c = innerTransport.temperature_c; wall.outerWall_c = outerTransport.temperature_c;
  const capture = innerTransport.condensed_g;
  wall.massTransferModel = 'finite-film-pressure-driven-cap';
  wall.condensationModel = 'finite-wet-caps/isothermal-dry-glass';
  wall.innerDryGlass_c = dryInner_c; wall.outerDryGlass_c = dryOuter_c;
  wall.innerWetCondensed_g = (wall.innerWetCondensed_g ?? 0) + innerTransport.wetCondensed_g;
  wall.innerDryCondensed_g = (wall.innerDryCondensed_g ?? 0) + innerTransport.dryCondensed_g;
  wall.outerWetCondensed_g = (wall.outerWetCondensed_g ?? 0) + outerTransport.wetCondensed_g;
  wall.outerDryCondensed_g = (wall.outerDryCondensed_g ?? 0) + outerTransport.dryCondensed_g;
  wall.innerCondensationEnergyReceived_J = (wall.innerCondensationEnergyReceived_J ?? 0) + innerTransport.condensationReceivedEnergy_J;
  wall.ambientCondensationEnergyReceived_J = (wall.ambientCondensationEnergyReceived_J ?? 0) + outerTransport.condensationReceivedEnergy_J;
  wall.innerCondensationLimit = innerTransport.condensationThermalLimit;
  wall.outerCondensationLimit = outerTransport.condensationThermalLimit;
  wall.innerGasWaterPressure_Pa = innerGasPressure;
  wall.innerEvaporationFlux_g_m2_s = innerDryingFlux;
  wall.outerEvaporationFlux_g_m2_s = Math.max(0, -outerFluxDensity);
  wall.innerMassTransferEvaporated_g = (wall.innerMassTransferEvaporated_g ?? 0) + innerTransport.evaporated_g;
  wall.outerMassTransferEvaporated_g = (wall.outerMassTransferEvaporated_g ?? 0) + outerTransport.evaporated_g;
  wall.innerMassTransferVaporEnergy_J = (wall.innerMassTransferVaporEnergy_J ?? 0) + innerTransport.vaporEnergy_J;
  wall.outerMassTransferVaporEnergy_J = (wall.outerMassTransferVaporEnergy_J ?? 0) + outerTransport.vaporEnergy_J;
  wall.innerDryingLimit = innerTransport.evaporationThermalLimit;
  wall.outerDryingLimit = outerTransport.evaporationThermalLimit;
  wall.ambientCollected_g += collected;
  wall.ambientReleased_g += outerTransport.evaporated_g;
  const returnedStep_g = innerTransport.drained_g;
  const drainedStep_g = outerTransport.drained_g;
  wall.returned_g += returnedStep_g;
  wall.returnedSensibleEnergy_J = (wall.returnedSensibleEnergy_J ?? 0)
    + innerTransport.drainedSensibleEnergy_J;
  wall.outerDrainedSensibleEnergy_J = (wall.outerDrainedSensibleEnergy_J ?? 0) + outerTransport.drainedSensibleEnergy_J;
  wall.drainedOutside_g += drainedStep_g;
  wall.heatTransferredToSample_J += latentHeatToSample_J;
  wall.heatRejected_J += innerTransport.condensationBoundaryHeat_J;
  return { wall, availableVapor_g: Math.max(0, vapor_g - capture + innerTransport.evaporated_g), returnedStep_g,
    returnedTemperature_c: returnedStep_g > 0 ? innerTransport.drainedSensibleEnergy_J / (WATER_CP_J_G_K * returnedStep_g) : wall.innerWall_c, drainedStep_g,
    latentHeatToSample_J, wallEvaporatedStep_g: innerTransport.evaporated_g,
    wallEvaporatedEnergy_J: innerTransport.vaporEnergy_J,
    wallEvaporatedTemperatureMass_c_g: innerTransport.vaporTemperatureMass_c_g,
    capturedStep_g: capture };
}

function validReturnTarget(vessel: VesselState, temperature_c: number): boolean {
  return Number.isFinite(temperature_c) && temperature_c >= 0 && temperature_c < 373.946 && !vessel.isShattered
    && [vessel.temperature_c, vessel.volume_ml, vessel.mass_g, vessel.capacity_ml, sampleHeatCapacity(vessel)].every(Number.isFinite)
    && vessel.temperature_c >= -273.15 && vessel.mass_g >= 0 && vessel.volume_ml >= 0 && vessel.capacity_ml > 0
    && vessel.contents.every(c => Number.isFinite(c.mass_g) && c.mass_g >= 0 && Number.isFinite(c.moles) && c.moles >= 0);
}

/** Explicit liquid receipt, already debited from the wall by its caller. No
 * new condensation/latent credit: only incoming Cp*m*T enthalpy is added.
 * The shared thermal solver may melt/freeze or flash water after mixing. */
export function returnWallWater(vessel: VesselState, mass_g: number,
  temperature_c = vessel.wallCondensation?.innerWall_c ?? NaN): VesselState {
  if (!Number.isFinite(mass_g) || !(mass_g > 0) || !validReturnTarget(vessel, temperature_c)) return vessel;
  const contents = vessel.contents.map(c => ({ ...c }));
  const water = contents.find(c => sameMolecularFormula(c.formula, 'H2O')
    && (c.phase ?? c.state ?? identifySpecies(c.formula).phase ?? 'l') === 'l');
  if (water) { water.mass_g += mass_g; water.moles += mass_g / 18.015; }
  else contents.push({ formula: 'H2O', phase: 'l', mass_g, moles: mass_g / 18.015 });
  const volume_ml = vessel.volume_ml + mass_g;
  for (const c of contents) if (c.phase === 'aq') c.concentration_M = c.moles / (volume_ml / 1000);
  const combined = { ...vessel, contents, substances: [...new Set([...vessel.substances, 'H2O'])],
    mass_g: vessel.mass_g + mass_g, volume_ml, volume: volume_ml / vessel.capacity_ml };
  // New mass is temporarily referenced at the bulk temperature. Correct its
  // sensible enthalpy to the actual incoming temperature exactly once.
  const heat = mass_g * WATER_CP_J_G_K * (temperature_c - vessel.temperature_c);
  const expectedCapacity = sampleHeatCapacity(vessel) + mass_g * WATER_CP_J_G_K;
  if (![heat, combined.mass_g, volume_ml, expectedCapacity].every(Number.isFinite)
    || Math.abs(sampleHeatCapacity(combined) - expectedCapacity) > expectedCapacity * 1e-10) return vessel;
  const thermal = applyThermalEnergy(combined, heat);
  const next = { ...combined, ...thermal };
  return { ...next, isBoiling: (vessel.isBoiling || thermal.isBoiling === true)
    && next.temperature_c >= aqueousBoilingPoint(next) - 1e-8 };
}

/** Equilibrium occupancy admission. Keeps unaccepted water in the bead pool;
 * preview includes ice expansion/melting and thermal flash, not just 1 g/mL. */
export function wallReturnCapacityG(vessel: VesselState, temperature_c: number, available_g: number): number {
  if (!Number.isFinite(available_g) || available_g <= 0 || !validReturnTarget(vessel, temperature_c)) return 0;
  const fits = (mass: number) => {
    const result = returnWallWater(vessel, mass, temperature_c);
    const occupied = occupiedLiquidVolume(result);
    return result !== vessel && Number.isFinite(occupied) && occupied <= vessel.capacity_ml;
  };
  if (fits(available_g)) return available_g;
  let low = 0, high = available_g;
  for (let i = 0; i < 44; i++) {
    const mid = (low + high) / 2;
    if (fits(mid)) low = mid; else high = mid;
  }
  return low;
}
