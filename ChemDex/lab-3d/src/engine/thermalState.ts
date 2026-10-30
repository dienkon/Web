import type { SubstanceContent, VesselState } from '../types/chemistry';
import { identifySpecies, sameMolecularFormula } from '../science/speciesIdentity';
import { equilibrateWaterIce, materializeWaterVolume } from './waterPhase';
import { WATER_CP_J_G_K, ICE_CP_J_G_K, waterLatentHeatJ_G } from './waterProperties';
import { waterBoilingPointAtPressure, DEFAULT_LAB_ENVIRONMENT } from '../science/labEnvironment';
import { exposedWaterAreaM2, supportsWaterSurface, waterMassFluxG_M2_S } from '../science/waterSurface';
import { evaporativeCooling } from '../science/evaporativeCooling';
import { wallThermalPaths } from './wallThermalPaths';
import { aqueousWaterBoundary } from '../science/aqueousWaterBoundary';
import { boilDiluteSolution } from '../science/solutionBoiling';
import { integrateThermalHeat } from '../science/thermalHeatIntegration';
export { WATER_CP_J_G_K, WATER_LATENT_HEAT_J_G } from './waterProperties';
export { sealedGasPressure } from './headspacePressure';
const PRESSURE_MODEL_LIMIT = 'Áp suất nằm ngoài miền cân bằng lỏng–hơi nước của mô hình.';
const EVAPORATION_MODEL_LIMIT = 'Chưa hội tụ tích phân nhiệt khi bay hơi; chưa chuyển lượng nước của bước này.';
const SOLUTION_MODEL_LIMIT = 'Chưa giải VLE/hoạt độ cho hỗn hợp này';
const HEAT_PATH_MODEL_LIMIT = 'Chưa hội tụ tích phân nhiệt theo trạng thái chuyển pha; giữ nguyên vật chất.';

// Constant liquid/ice Cp, but phase-change enthalpy follows IAPWS L(T).



/** Water produced in an initially dry thermal reaction becomes a finite liquid
 * volume or vapor. Approximate rapid phase relaxation at the specified pressure
 * (default 1 atm), using the same
 * glass heat-capacity assumption as the lumped thermal model.
 */
export function relaxGeneratedWater(contents: SubstanceContent[], temperature_c: number, pressure_atm = 1) {
  const water = contents.filter(item => sameMolecularFormula(item.formula, 'H2O') && item.phase === 'l' && item.mass_g > 0);
  const mass = water.reduce((sum, item) => sum + item.mass_g, 0);
  if (mass <= 0) return null;
  const boilingPoint = waterBoilingPointAtPressure(pressure_atm);
  const latent = waterLatentHeatJ_G(boilingPoint);
  if (!(latent > 0) || !Number.isFinite(temperature_c)) return null;
  const capacity = 33.2 + mass * WATER_CP_J_G_K;
  const available = Math.max(0, temperature_c - boilingPoint) * capacity;
  const vaporMass = Math.min(mass, available / latent);
  const fraction = vaporMass / mass;
  const entries = new Set(water);
  let vaporMoles = 0;
  const result = contents.map(item => {
    if (!entries.has(item)) return { ...item };
    vaporMoles += item.moles * fraction;
    return { ...item, moles: item.moles * (1 - fraction), mass_g: item.mass_g * (1 - fraction) };
  }).filter(item => item.moles > 1e-12);
  if (vaporMass > 0) {
    const existing = result.find(item => sameMolecularFormula(item.formula, 'H2O') && item.phase === 'g');
    if (existing) { existing.moles += vaporMoles; existing.mass_g += vaporMass; }
    else result.push({ formula: 'H2O', phase: 'g', moles: vaporMoles, mass_g: vaporMass });
  }
  const finalTemperature = temperature_c <= boilingPoint ? temperature_c : vaporMass < mass ? boilingPoint
    : boilingPoint + Math.max(0, available - vaporMass * latent) / 33.2;
  return { contents: result, volume_ml: mass - vaporMass, temperature_c: finalTemperature, vaporMass_g: vaporMass };
}

export function aqueousBoilingPoint(vessel: Pick<VesselState, 'contents' | 'volume_ml' | 'environment' | 'effectsEnvironment'>): number {
  return aqueousWaterBoundary(vessel).boiling_c;
}

export interface ThermalStep extends Partial<VesselState> {
  temperature_c: number;
  volume_ml: number;
  mass_g: number;
  boilingPoint_c: number;
  evaporatedStep_g: number;
  sensibleEnergy_J: number;
  latentEnergy_J: number;
  /** Outgoing liquid-reference sensible enthalpy, Cp*integral T dm, J. */
  vaporSensibleEnergy_J: number;
  storedSensibleEnergyChange_J: number;
  /** Internal handoff: undo only this already-integrated wet share of dry cooling. */
  wallThermalDryCredit_J?: number;
  wallThermalEligible?: boolean;
}

/** One heat budget and one solvent sink. Boiling model: open aqueous
 * vessels near atmospheric pressure; closed-vessel steam equilibrium is pending.
 */
export function sampleHeatCapacity(vessel: Pick<VesselState, 'volume_ml' | 'mass_g'> & Partial<Pick<VesselState, 'contents'>>): number {
  if (vessel.contents?.length) {
    let capacity = 33.2;
    for (const item of vessel.contents) {
      const phase = item.phase ?? item.state ?? identifySpecies(item.formula).phase
        ?? (sameMolecularFormula(item.formula, 'H2O') ? 'l' : undefined);
      if (phase === 'aq' || phase === 'l') capacity += Math.max(0, item.mass_g) * WATER_CP_J_G_K;
      else if (phase === 's' && sameMolecularFormula(item.formula, 'H2O')) capacity += Math.max(0, item.mass_g) * ICE_CP_J_G_K;
    }
    return capacity;
  }
  return 33.2 + (vessel.volume_ml > 0 ? Math.max(0, vessel.mass_g) * WATER_CP_J_G_K : 0);
}

export function applyThermalEnergy(vessel: VesselState, netEnergy: number, dt = 0, surfaceEvaporation_g = 0): ThermalStep {
  if (!Number.isFinite(netEnergy)) return { temperature_c: vessel.temperature_c, volume_ml: vessel.volume_ml,
    mass_g: vessel.mass_g, boilingPoint_c: aqueousBoilingPoint(vessel), evaporatedStep_g: 0, sensibleEnergy_J: 0, latentEnergy_J: 0,
    vaporSensibleEnergy_J: 0, storedSensibleEnergyChange_J: 0 };
  const originalEnergy = netEnergy;
  const initialStoredSensible = sampleHeatCapacity(vessel) * vessel.temperature_c;
  const phase = equilibrateWaterIce(vessel, netEnergy);
  const fusionEnergy = phase?.fusionEnergy_J ?? 0;
  let outsideModel = phase?.outsideModel_J ?? 0;
  if (phase) {
    vessel = { ...vessel, ...phase };
    netEnergy = 0;
  }
  vessel = materializeWaterVolume(vessel);
  const boundary = aqueousWaterBoundary(vessel), boilingPoint = boundary.boiling_c;
  const boilingLatent = waterLatentHeatJ_G(boilingPoint);
  const base: ThermalStep = { temperature_c: vessel.temperature_c, volume_ml: vessel.volume_ml,
    mass_g: vessel.mass_g, boilingPoint_c: boilingPoint, evaporatedStep_g: 0, sensibleEnergy_J: 0, latentEnergy_J: 0,
    vaporSensibleEnergy_J: 0, storedSensibleEnergyChange_J: 0 };
  if (!Number.isFinite(netEnergy)) return base;
  const water = vessel.contents.filter(item => sameMolecularFormula(item.formula, 'H2O')
    && (item.phase ?? item.state ?? identifySpecies(item.formula).phase ?? 'l') === 'l' && item.moles > 0);
  const waterMass = water.reduce((sum, item) => sum + Math.max(0, item.mass_g), 0);
  const availableWaterMass = Math.min(waterMass, Math.max(0, vessel.volume_ml), Math.max(0, vessel.mass_g));
  const heatCapacity = sampleHeatCapacity(vessel);
  const unconstrained = vessel.temperature_c + netEnergy / heatCapacity;
  let temperature = Math.max(-273.15, unconstrained);
  outsideModel += (unconstrained - temperature) * heatCapacity;
  let vaporized = 0;
  let vaporizationEnergy = 0;
  let vaporSensibleEnergy_J = 0;
  let solutionLimit: string | undefined = boundary.reason && boundary.reason !== 'unsupported-pressure'
    ? `${SOLUTION_MODEL_LIMIT}: ${boundary.reason}.` : undefined;
  const supportedEvaporation = boundary.particle_mol > 0
    ? Math.min(availableWaterMass, Math.max(0, waterMass - boundary.minimumSupportedWater_g)) : availableWaterMass;
  if (!vessel.isSealed && availableWaterMass > 0 && boilingLatent > 0 && unconstrained > boilingPoint) {
    const sensibleToBoil = Math.max(0, boilingPoint - vessel.temperature_c) * heatCapacity;
    const initialSuperheat = Math.max(0, vessel.temperature_c - boilingPoint) * heatCapacity;
    const latentAvailable = Math.max(0, netEnergy - sensibleToBoil + initialSuperheat);
    if (boundary.particle_mol > 0) {
      const boiling = boilDiluteSolution({ water_g: waterMass, particle_mol: boundary.particle_mol,
        capacity_J_K: heatCapacity, pressure_Pa: boundary.pressure_Pa, availableHeat_J: latentAvailable,
        maxEvaporated_g: supportedEvaporation });
      if (boiling.valid) {
        vaporized = boiling.evaporated_g; vaporizationEnergy = boiling.latentEnergy_J;
        vaporSensibleEnergy_J = boiling.vaporSensibleEnergy_J;
        temperature = boiling.temperature_c;
        outsideModel += boiling.remainingHeat_J;
        if (boiling.limited) solutionLimit = `${SOLUTION_MODEL_LIMIT}: đã tới biên nồng độ dung dịch loãng.`;
      } else {
        temperature = boilingPoint; outsideModel += latentAvailable;
        solutionLimit = `${SOLUTION_MODEL_LIMIT}: chưa hội tụ tích phân sôi của dung dịch.`;
      }
    } else {
      vaporized = Math.min(availableWaterMass, latentAvailable / boilingLatent);
      vaporizationEnergy = vaporized * boilingLatent;
      vaporSensibleEnergy_J = vaporized * WATER_CP_J_G_K * boilingPoint;
      const leftover = Math.max(0, latentAvailable - vaporizationEnergy);
      temperature = boilingPoint + (vaporized >= availableWaterMass
        ? leftover / Math.max(33.2, heatCapacity - vaporized * WATER_CP_J_G_K) : 0);
    }
  }
  const isBoiling = !solutionLimit && !vessel.isSealed && vaporized > 1e-12 && availableWaterMass > vaporized;
  // Sub-boiling mass transfer shares the same latent-energy and solvent sink.
  // Limit cooling to 0 °C; sublimation/freezing mixtures need another closure.
  let evaporationLimit: string | undefined;
  if (boilingLatent > 0 && !isBoiling && !vessel.isSealed && temperature > 0 && surfaceEvaporation_g > 0) {
    const available = Math.min(Math.max(0, waterMass - vaporized), Math.max(0, vessel.volume_ml - vaporized),
      Math.max(0, vessel.mass_g - vaporized), Math.max(0, supportedEvaporation - vaporized));
    const cooling = evaporativeCooling(temperature, heatCapacity - vaporized * WATER_CP_J_G_K, available,
      Math.min(surfaceEvaporation_g, available));
    vaporized += cooling.evaporated_g;
    vaporizationEnergy += cooling.latentEnergy_J;
    vaporSensibleEnergy_J += cooling.vaporSensibleEnergy_J;
    temperature = cooling.temperature_c;
    if (cooling.limitedBy === 'unsupported') evaporationLimit = EVAPORATION_MODEL_LIMIT;
    if (boundary.particle_mol > 0 && vaporized >= supportedEvaporation) {
      solutionLimit = `${SOLUTION_MODEL_LIMIT}: đã tới biên nồng độ dung dịch loãng.`;
    }
  }
  let contents = vessel.contents;
  // Contents are authoritative at complete depletion. Repeated subtraction
  // from the aggregate mass/volume can leave a few ulps after the last water
  // packet has gone; retain every real non-water inventory, however small.
  const waterEntries = new Set(water);
  const completelyDryWater = waterMass > 0 && vaporized >= waterMass
    && vessel.contents.every(item => waterEntries.has(item) || item.mass_g === 0);
  const remainingVolume = completelyDryWater ? 0 : Math.max(0, vessel.volume_ml - vaporized);
  const remainingMass = completelyDryWater ? 0 : Math.max(0, vessel.mass_g - vaporized);
  if (vaporized > 0) {
    const keep = Math.max(0, 1 - vaporized / waterMass);
    const newVolume = remainingVolume;
    contents = vessel.contents.map(item => {
      if (waterEntries.has(item)) return { ...item, mass_g: item.mass_g * keep,
        moles: item.moles * keep };
      return { ...item, ...(item.phase === 'aq' && newVolume > 0 ? { concentration_M: item.moles / (newVolume / 1000) } : {}) };
    });
  }
  return { ...base, temperature_c: temperature, contents,
    volume_ml: remainingVolume, mass_g: remainingMass,
    volume: vessel.capacity_ml > 0 ? remainingVolume / vessel.capacity_ml : 0,
    evaporatedStep_g: vaporized, evaporated_ml: (vessel.evaporated_ml ?? 0) + vaporized,
    thermalVaporEnthalpy_J: (vessel.thermalVaporEnthalpy_J ?? 0) + vaporizationEnergy + vaporSensibleEnergy_J,
    thermalVaporSensibleEnthalpy_J: (vessel.thermalVaporSensibleEnthalpy_J ?? 0) + vaporSensibleEnergy_J,
    evaporationRate_g_s: dt > 0 ? vaporized / dt : 0,
    boilingPoint_c: aqueousWaterBoundary({ ...vessel, contents }).boiling_c, isBoiling,
    boilingIntensity: isBoiling ? dt > 0 ? Math.min(1, vaporized / dt / 0.15) : 1 : 0,
    iceVolume_ml: phase?.iceVolume_ml ?? vessel.iceVolume_ml ?? 0,
    thermalEnergyOutsideModel_J: (vessel.thermalEnergyOutsideModel_J ?? 0) + outsideModel,
    thermalModelLimit: solutionLimit ?? evaporationLimit ?? (!(boilingLatent > 0) ? PRESSURE_MODEL_LIMIT
      : outsideModel !== 0 ? 'Năng lượng vượt miền nhiệt độ của mô hình.'
      : !phase && temperature < 0 ? 'Chưa giải cân bằng đông đặc của hỗn hợp hoặc bình kín này.'
        : vessel.thermalModelLimit === PRESSURE_MODEL_LIMIT || vessel.thermalModelLimit === EVAPORATION_MODEL_LIMIT
          || vessel.thermalModelLimit === HEAT_PATH_MODEL_LIMIT
          || vessel.thermalModelLimit?.startsWith(SOLUTION_MODEL_LIMIT)
          ? undefined : vessel.thermalModelLimit),
    sensibleEnergy_J: originalEnergy - fusionEnergy - vaporizationEnergy - outsideModel,
    latentEnergy_J: fusionEnergy + vaporizationEnergy,
    vaporSensibleEnergy_J,
    storedSensibleEnergyChange_J: (heatCapacity - vaporized * WATER_CP_J_G_K) * temperature - initialStoredSensible,
  };
}

export function stepVesselThermal(vessel: VesselState, dt: number, absorbedPower_W = 0,
  ambient_c = vessel.effectsEnvironment?.temperature_c ?? vessel.environment?.temperature_c
    ?? DEFAULT_LAB_ENVIRONMENT.temperature_c): ThermalStep {
  if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(absorbedPower_W) || !Number.isFinite(ambient_c)) return {
    temperature_c: vessel.temperature_c, volume_ml: vessel.volume_ml, mass_g: vessel.mass_g,
    boilingPoint_c: aqueousBoilingPoint(vessel), evaporatedStep_g: 0, sensibleEnergy_J: 0, latentEnergy_J: 0,
    vaporSensibleEnergy_J: 0, storedSensibleEnergyChange_J: 0 };
  const capacity = sampleHeatCapacity(vessel);
  const paths = wallThermalPaths(vessel, ambient_c), cooling = paths.baseline_W_K;
  const exponent = cooling * dt / capacity;
  const temperature = vessel.temperature_c + (ambient_c - vessel.temperature_c) * -Math.expm1(-exponent)
    + Math.max(0, absorbedPower_W) * dt / capacity * (exponent === 0 ? 1 : -Math.expm1(-exponent) / exponent);
  const env = { ...DEFAULT_LAB_ENVIRONMENT, ...vessel.environment, ...vessel.effectsEnvironment };
  let heat = (temperature - vessel.temperature_c) * capacity;
  let endpoint = applyThermalEnergy(vessel, heat, dt);
  let integrationFailed = false;
  // The exponential sensible solution is exact only while T(E) is linear.
  // Latent plateaux, changing solution Tb and model boundaries need their
  // actual temperature path when integrating wall/air heat exchange.
  if (endpoint.latentEnergy_J !== 0 || Math.abs(endpoint.temperature_c - temperature) > 1e-9
    || (endpoint.thermalEnergyOutsideModel_J ?? 0) !== (vessel.thermalEnergyOutsideModel_J ?? 0)) {
    const cache = new Map<number, number>();
    const integrated = integrateThermalHeat({ duration_s: dt, inputPower_W: Math.max(0, absorbedPower_W),
      conductance_W_K: cooling, ambient_c, temperatureAtHeat: energy => {
        if (!cache.has(energy)) cache.set(energy, applyThermalEnergy(vessel, energy).temperature_c);
        return cache.get(energy)!;
      } });
    if (integrated !== undefined) {
      heat = integrated; endpoint = applyThermalEnergy(vessel, heat, dt);
    } else integrationFailed = true;
  }
  const surfaceLoss = !integrationFailed && supportsWaterSurface(vessel) ? exposedWaterAreaM2(vessel) * dt
    * Math.max(0, waterMassFluxG_M2_S(Math.max(0, (endpoint.temperature_c + vessel.temperature_c) / 2), ambient_c,
      env.relativeHumidity ?? 0.5, env.airSpeed_m_s, aqueousWaterBoundary(vessel).activity ?? NaN)) : 0;
  const result = surfaceLoss > 0 ? applyThermalEnergy(vessel, heat, dt, surfaceLoss) : endpoint;
  if (integrationFailed) {
    // Hold material on failure and explicitly meter the unresolved heat, using
    // the held body's temperature for environmental exchange.
    const unresolved = (Math.max(0, absorbedPower_W) - cooling * (vessel.temperature_c - ambient_c)) * dt;
    return { temperature_c: vessel.temperature_c, volume_ml: vessel.volume_ml, mass_g: vessel.mass_g,
      boilingPoint_c: aqueousBoilingPoint(vessel), evaporatedStep_g: 0, sensibleEnergy_J: 0, latentEnergy_J: 0,
      vaporSensibleEnergy_J: 0, storedSensibleEnergyChange_J: 0,
      thermalHeatingPower_W: Math.max(0, absorbedPower_W),
      thermalHeatingEnergy_J: (vessel.thermalHeatingEnergy_J ?? 0) + Math.max(0, absorbedPower_W) * dt,
      thermalEnergyOutsideModel_J: (vessel.thermalEnergyOutsideModel_J ?? 0) + unresolved,
      thermalModelLimit: HEAT_PATH_MODEL_LIMIT };
  }
  return { ...result,
    thermalHeatingPower_W: Math.max(0, absorbedPower_W),
    thermalHeatingEnergy_J: (vessel.thermalHeatingEnergy_J ?? 0) + Math.max(0, absorbedPower_W) * dt,
    wallThermalEligible: paths.patches.length > 0,
    wallThermalDryCredit_J: cooling > 0 ? (Math.max(0, absorbedPower_W) * dt - heat)
      * (cooling - paths.dry_W_K) / cooling : 0 };
}
