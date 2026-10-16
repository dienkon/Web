import type { SubstanceContent, VesselState } from '../types/chemistry';
import { identifySpecies, sameMolecularFormula } from '../science/speciesIdentity';

// OpenStax College Physics §14.3: water Lv at 100 °C, 1 atm.
// https://openstax.org/books/college-physics-2e/pages/14-3-phase-change-and-latent-heat
export const WATER_LATENT_HEAT_J_G = 2256;
export const WATER_CP_J_G_K = 4.184;

/** Water produced in an initially dry thermal reaction becomes a finite liquid
 * volume or vapor. Approximate rapid phase relaxation at 1 atm, using the same
 * glass heat-capacity assumption as the lumped thermal model.
 */
export function relaxGeneratedWater(contents: SubstanceContent[], temperature_c: number) {
  const water = contents.filter(item => sameMolecularFormula(item.formula, 'H2O') && item.phase === 'l' && item.mass_g > 0);
  const mass = water.reduce((sum, item) => sum + item.mass_g, 0);
  if (mass <= 0) return null;
  const capacity = 33.2 + mass * WATER_CP_J_G_K;
  const available = Math.max(0, temperature_c - 100) * capacity;
  const vaporMass = Math.min(mass, available / WATER_LATENT_HEAT_J_G);
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
  const finalTemperature = temperature_c <= 100 ? temperature_c : vaporMass < mass ? 100
    : 100 + Math.max(0, available - vaporMass * WATER_LATENT_HEAT_J_G) / 33.2;
  return { contents: result, volume_ml: mass - vaporMass, temperature_c: finalTemperature, vaporMass_g: vaporMass };
}

export function aqueousBoilingPoint(vessel: Pick<VesselState, 'contents' | 'volume_ml'>): number {
  const water = vessel.contents.filter(item => sameMolecularFormula(item.formula, 'H2O') && item.phase !== 'g');
  const waterMass = water.reduce((sum, item) => sum + item.mass_g, 0);
  const solventKg = Math.max(0.001, (waterMass || vessel.volume_ml * 0.95) / 1000);
  let osmoles = 0;
  for (const item of vessel.contents) {
    if (item.phase === 's' || item.phase === 'g' || sameMolecularFormula(item.formula, 'H2O')) continue;
    const formula = identifySpecies(item.formula).formula.toLowerCase();
    // Legacy effective factors retained as approximate concentrated-solution
    // parameters; no claim that this replaces measured activities/osmolality.
    const factor = ['nacl', 'ki', 'naoh', 'hcl'].includes(formula) ? 1.8
      : ['bacl2', 'na2so4', 'cacl2', 'h2so4', 'pb(no3)2'].includes(formula) ? 2.5
      : ['fecl3', 'al2(so4)3'].includes(formula) ? 3.2 : 1;
    osmoles += Math.max(0, item.moles) * factor;
  }
  return 100 + Math.min(18, 0.512 * osmoles / solventKg);
}

export interface ThermalStep extends Partial<VesselState> {
  temperature_c: number;
  volume_ml: number;
  mass_g: number;
  boilingPoint_c: number;
  evaporatedStep_g: number;
  sensibleEnergy_J: number;
  latentEnergy_J: number;
}

/** One heat budget and one solvent sink. No empirical ambient evaporation is
 * guessed without area/humidity/transfer data. Boiling model: open aqueous
 * vessels near atmospheric pressure; closed-vessel steam equilibrium is pending.
 */
export function stepVesselThermal(vessel: VesselState, dt: number, absorbedPower_W = 0, ambient_c = 25): ThermalStep {
  const boilingPoint = aqueousBoilingPoint(vessel);
  const base: ThermalStep = { temperature_c: vessel.temperature_c, volume_ml: vessel.volume_ml,
    mass_g: vessel.mass_g, boilingPoint_c: boilingPoint, evaporatedStep_g: 0, sensibleEnergy_J: 0, latentEnergy_J: 0 };
  if (!Number.isFinite(dt) || dt <= 0 || !Number.isFinite(absorbedPower_W)) return base;
  const water = vessel.contents.filter(item => sameMolecularFormula(item.formula, 'H2O')
    && (item.phase ?? item.state ?? identifySpecies(item.formula).phase) !== 'g' && item.moles > 0);
  const waterMass = water.reduce((sum, item) => sum + Math.max(0, item.mass_g), 0);
  const liquidMass = vessel.volume_ml > 0.05 ? Math.max(0, vessel.mass_g) : 0;
  const heatCapacity = 33.2 + liquidMass * WATER_CP_J_G_K;
  const cooling = vessel.volume_ml > 1 ? 0.35 : 0.18;
  // Exact Newton cooling for constant power/Cp prevents overshooting ambient
  // and retains sub-0.1-degree increments at high frame rates.
  const steady = ambient_c + Math.max(0, absorbedPower_W) / cooling;
  const unconstrained = steady + (vessel.temperature_c - steady) * Math.exp(-cooling * dt / heatCapacity);
  const netEnergy = (unconstrained - vessel.temperature_c) * heatCapacity;
  let temperature = unconstrained;
  let vaporized = 0;
  if (!vessel.isSealed && waterMass > 0 && unconstrained > boilingPoint) {
    const sensibleToBoil = Math.max(0, boilingPoint - vessel.temperature_c) * heatCapacity;
    const initialSuperheat = Math.max(0, vessel.temperature_c - boilingPoint) * heatCapacity;
    const latentAvailable = Math.max(0, netEnergy - sensibleToBoil + initialSuperheat);
    vaporized = Math.min(waterMass, vessel.volume_ml, Math.max(0, vessel.mass_g), latentAvailable / WATER_LATENT_HEAT_J_G);
    const leftover = Math.max(0, latentAvailable - vaporized * WATER_LATENT_HEAT_J_G);
    temperature = boilingPoint + (vaporized >= waterMass ? leftover / Math.max(33.2, heatCapacity - waterMass * WATER_CP_J_G_K) : 0);
  }
  const isBoiling = !vessel.isSealed && vaporized > 1e-12 && waterMass > vaporized;
  let contents = vessel.contents;
  if (vaporized > 0) {
    const keep = Math.max(0, 1 - vaporized / waterMass);
    const waterEntries = new Set(water);
    const newVolume = Math.max(0, vessel.volume_ml - vaporized);
    contents = vessel.contents.map(item => {
      if (waterEntries.has(item)) return { ...item, mass_g: item.mass_g * keep,
        moles: item.moles * keep };
      return { ...item, ...(item.phase === 'aq' && newVolume > 0 ? { concentration_M: item.moles / (newVolume / 1000) } : {}) };
    });
  }
  return { ...base, temperature_c: temperature, contents,
    volume_ml: Math.max(0, vessel.volume_ml - vaporized), mass_g: Math.max(0, vessel.mass_g - vaporized),
    volume: vessel.capacity_ml > 0 ? Math.max(0, (vessel.volume_ml - vaporized) / vessel.capacity_ml) : 0,
    evaporatedStep_g: vaporized, evaporated_ml: (vessel.evaporated_ml ?? 0) + vaporized,
    evaporationRate_g_s: vaporized / dt, boilingPoint_c: boilingPoint, isBoiling,
    boilingIntensity: isBoiling ? Math.min(1, vaporized / dt / 0.15) : 0,
    sensibleEnergy_J: netEnergy - vaporized * WATER_LATENT_HEAT_J_G,
    latentEnergy_J: vaporized * WATER_LATENT_HEAT_J_G,
  };
}

/** Finite retained gas plus an illustrative initial 1-atm dry-air headspace.
 * No pressure generation merely from a hasGas/isBoiling boolean.
 */
export function sealedGasPressure(vessel: VesselState): number {
  if (!vessel.isSealed) return 1;
  const kelvin = Math.max(1, vessel.temperature_c + 273.15);
  const headspace = Math.max(0.001, (vessel.capacity_ml - vessel.volume_ml) / 1000);
  const moles = vessel.contents.filter(item => item.phase === 'g').reduce((sum, item) => sum + Math.max(0, item.moles), 0);
  return kelvin / 298.15 + moles * 0.082057 * kelvin / headspace;
}
