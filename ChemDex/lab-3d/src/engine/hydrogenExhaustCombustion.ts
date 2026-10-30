import type { BurnerState, VesselState } from '../types/chemistry';
import { DEFAULT_LAB_ENVIRONMENT } from '../science/labEnvironment';
import { sodiumMetalMass, SODIUM_DENSITY_G_ML } from '../science/sodiumWater';
import { contourRadius, vesselInterior } from '../science/vesselDimensions';
import { postRecoveryExhaustG } from './waterVaporRouting';

export const HYDROGEN_MOLAR_MASS = 2.016;
export const OXYGEN_MOLAR_MASS = 31.998;
export const WATER_VAPOR_MOLAR_MASS = 18.015;
/** NIST WebBook/CODATA: H2 + 1/2 O2 -> H2O(g), 298.15 K.
 * https://webbook.nist.gov/cgi/cbook.cgi?ID=C7732185&Mask=821 */
export const HYDROGEN_COMBUSTION_J_MOL = 241826;

export interface HydrogenExhaustCombustion {
  model: 'open_exhaust_diffusion_flame';
  sourceHydrogen_g: number;
  burnedHydrogen_g: number;
  unburnedHydrogen_g: number;
  oxygenConsumed_g: number;
  waterVaporProduced_g: number;
  releasedHeat_J: number;
  heatToEnvironment_J: number;
  power_W: number;
  oxygenSupply_mol_s: number;
  burning: boolean;
}

/** Local exhaust anchor at the open mouth, never inside/under the glass. */
export function hydrogenExhaustAnchor(vessel: VesselState, localPoint: [number, number] = [0, 0]): [number, number, number] {
  const interior = vesselInterior(vessel.type);
  const r = contourRadius(interior.points, interior.topY) * 0.8;
  const distance = Math.hypot(...localPoint);
  const scale = distance > r && distance > 0 ? r / distance : 1;
  return [localPoint[0] * scale, interior.topY + 0.02, localPoint[1] * scale];
}

/** Explicit contact with an existing fueled flame at the external exhaust.
 * A flame below the mouth cannot ignite hydrogen through the glass wall. */
export function sodiumExternalIgnition(vessel: VesselState, burners: Record<string, BurnerState>,
  localPoint: [number, number] = [0, 0]): boolean {
  if (vessel.isSealed || vessel.isShattered) return false;
  const [x, y, z] = hydrogenExhaustAnchor(vessel, localPoint);
  return Object.values(burners).some(b => b.isOn && Number.isFinite(b.intensity) && b.intensity > 0 && (b.fuelLevel_ml ?? 120) > 0
    && (b.ethanolVolumeFraction ?? 0.96) > 0
    && Math.hypot(vessel.position[0] + x - b.position[0],
      vessel.position[2] + z - b.position[2]) < 0.25
    && b.position[1] + 1.1 >= vessel.position[1] + y - 0.03
    && b.position[1] + 1.1 <= vessel.position[1] + y + 0.35);
}

/** Finite O2 entrainment at the *external* hydrogen diffusion-flame boundary.
 * A mixing radius of 3 pellet radii and 0.1 m/s natural entrainment are explicit
 * illustrative closures, not measured ignition/rupture thresholds. Room air
 * is an open reservoir; only its metered O2 consumption crosses this boundary. */
export function hydrogenFlameOxygenSupply(vessel: VesselState, sodiumReferenceMass_g: number): number {
  const env = { ...DEFAULT_LAB_ENVIRONMENT, ...vessel.environment, ...vessel.effectsEnvironment };
  if (![sodiumReferenceMass_g, env.temperature_c, env.pressure_atm, env.oxygenFraction, env.airSpeed_m_s].every(Number.isFinite)
    || sodiumReferenceMass_g <= 0 || env.temperature_c <= -273.15 || env.pressure_atm <= 0
    || env.oxygenFraction <= 0 || env.oxygenFraction > 1 || env.airSpeed_m_s < 0) return 0;
  const pelletRadius_m = Math.cbrt(3 * sodiumReferenceMass_g / SODIUM_DENSITY_G_ML * 1e-6 / (4 * Math.PI));
  const area_m2 = Math.PI * (3 * pelletRadius_m) ** 2;
  const air_m3_s = area_m2 * (0.1 + env.airSpeed_m_s);
  return air_m3_s * env.pressure_atm * 101325 / (8.314462618 * (env.temperature_c + 273.15)) * env.oxygenFraction;
}

/** Transform only H2 newly vented during this accepted physical step. The
 * vessel's escapedGas_g remains its source-boundary exhaust history; a flame
 * downstream transforms part of that history into water vapor. No old escaped
 * hydrogen is ignited again. Heat is exported to the room in this open-flame
 * approximation; no secondary heat is silently injected into the vessel.
 * This models neither confined combustion nor Coulomb fragmentation of metal. */
export function stepHydrogenExhaustCombustion(current: VesselState, previous: VesselState,
  dt: number, sourceEnabled: boolean, externalIgnition: boolean,
  sodiumReferenceMass_g = Math.max(sodiumMetalMass(current), sodiumMetalMass(previous))): HydrogenExhaustCombustion | null {
  if (!Number.isFinite(dt) || dt <= 0 || current.id.startsWith('lesson_vessel_')) return null;
  const old = previous.hydrogenCombustion;
  const gross = current.escapedGas_g?.H2 ?? 0, earlier = previous.escapedGas_g?.H2 ?? 0;
  if (![gross, earlier].every(Number.isFinite) || gross < 0 || earlier < 0) return null;
  const supplied_g = sourceEnabled && !current.isSealed && !current.isShattered ? Math.max(0, gross - earlier) : 0;
  if (!old && supplied_g <= 0) return null;
  const ledger: HydrogenExhaustCombustion = { model: 'open_exhaust_diffusion_flame', sourceHydrogen_g: 0,
    burnedHydrogen_g: 0, unburnedHydrogen_g: 0, oxygenConsumed_g: 0, waterVaporProduced_g: 0,
    releasedHeat_J: 0, heatToEnvironment_J: 0, power_W: 0, oxygenSupply_mol_s: 0, burning: false, ...old };
  const oxygenRate = hydrogenFlameOxygenSupply(current, sodiumReferenceMass_g);
  const ignition = externalIgnition || old?.burning === true;
  const burned_mol = ignition ? Math.min(supplied_g / HYDROGEN_MOLAR_MASS, 2 * oxygenRate * dt) : 0;
  const burned_g = burned_mol * HYDROGEN_MOLAR_MASS;
  const heat_J = burned_mol * HYDROGEN_COMBUSTION_J_MOL;
  ledger.sourceHydrogen_g += supplied_g;
  ledger.burnedHydrogen_g += burned_g;
  ledger.unburnedHydrogen_g += Math.max(0, supplied_g - burned_g);
  ledger.oxygenConsumed_g += burned_mol / 2 * OXYGEN_MOLAR_MASS;
  ledger.waterVaporProduced_g += burned_mol * WATER_VAPOR_MOLAR_MASS;
  ledger.releasedHeat_J += heat_J;
  ledger.heatToEnvironment_J += heat_J;
  ledger.power_W = heat_J / dt;
  ledger.oxygenSupply_mol_s = oxygenRate;
  ledger.burning = burned_mol > 1e-15;
  return ledger;
}

/** End-of-boundary gas amounts after the modeled flame. Do not add the source
 * exhaust and its transformed products together in a whole-system audit. */
export function postCombustionExhaustG(vessel: VesselState): Record<string, number> {
  const gas = postRecoveryExhaustG(vessel), c = vessel.hydrogenCombustion;
  if (!c) return gas;
  gas.H2 = Math.max(0, (gas.H2 ?? 0) - c.burnedHydrogen_g);
  gas.H2O = (gas.H2O ?? 0) + c.waterVaporProduced_g;
  return gas;
}
