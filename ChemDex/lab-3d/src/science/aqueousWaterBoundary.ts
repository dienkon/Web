import type { VesselState } from '../types/chemistry';
import { identifySpecies } from './speciesIdentity';
import { waterSaturationTemperatureC } from './waterSaturation';

export const WATER_MOLAR_MASS_G = 18.015;
/** Existing dilute-water envelope, not a universal ideal-solution accuracy bound. */
export const MAX_DILUTE_SOLUTE_FRACTION = 0.05;
// Ideal complete dissociation counts, explicitly NOT measured van't Hoff factors.
const particles: Record<string, number> = {
  nacl: 2, kcl: 2, ki: 2, kbr: 2, kno3: 2, nano3: 2, agno3: 2,
  naoh: 2, koh: 2, lioh: 2, bacl2: 3, cacl2: 3, mgcl2: 3, zncl2: 3,
  na2so4: 3, k2so4: 3, 'pb(no3)2': 3, 'ca(no3)2': 3, 'ba(no3)2': 3,
  cuso4: 2, feso4: 2, znso4: 2, mgso4: 2, fecl2: 3, fecl3: 4, alcl3: 4,
  'al2(so4)3': 5, 'ca(oh)2': 3, 'ba(oh)2': 3, na2co3: 3, k2co3: 3,
  c6h12o6: 1, c12h22o11: 1,
};

/** Ideal nonvolatile solute closure p_water = a_water * p_sat(T). Unknown,
 * volatile or concentrated mixtures require VLE/activity data, not a capped
 * colligative-temperature guess. Solids/gases are not dissolved particles. */
export function aqueousWaterBoundary(v: Pick<VesselState, 'contents' | 'environment' | 'effectsEnvironment'>) {
  let water_g = 0, solute_g = 0, particle_mol = 0, reason = '';
  for (const item of v.contents) {
    if (!Number.isFinite(item.mass_g) || !Number.isFinite(item.moles) || item.mass_g < 0 || item.moles < 0) {
      reason = 'invalid-inventory'; break;
    }
    if (item.mass_g === 0) continue;
    const identity = identifySpecies(item.formula), formula = identity.formula.toLowerCase();
    const rawPhase = item.phase ?? item.state ?? identity.phase ?? (formula === 'h2o' ? 'l' : undefined);
    const phase = ({ solid: 's', liquid: 'l', gas: 'g', aqueous: 'aq' } as Record<string, string>)[rawPhase ?? ''] ?? rawPhase;
    if (phase === 's' || phase === 'g') continue;
    if (formula === 'h2o' && (phase === 'l' || phase === 'aq')) { water_g += item.mass_g; continue; }
    if (phase !== 'aq' || !particles[formula] || identity.concentration === 'concentrated' || item.moles <= 0) {
      reason = 'unsupported-solute'; break;
    }
    solute_g += item.mass_g; particle_mol += particles[formula] * item.moles;
  }
  const pressure_Pa = (v.effectsEnvironment?.pressure_atm ?? v.environment?.pressure_atm ?? 1) * 101325;
  const pureBoiling_c = waterSaturationTemperatureC(pressure_Pa);
  if (!Number.isFinite(pureBoiling_c)) reason = 'unsupported-pressure';
  if (!reason && solute_g > 0 && !(water_g > 0)) reason = 'missing-solvent';
  if (!reason && solute_g > (water_g + solute_g) * MAX_DILUTE_SOLUTE_FRACTION * (1 + 16 * Number.EPSILON)) reason = 'concentrated-solution';
  const activityAt = (waterMass_g: number) => particle_mol === 0 ? 1
    : waterMass_g > 0 ? waterMass_g / (waterMass_g + particle_mol * WATER_MOLAR_MASS_G) : NaN;
  const activity = activityAt(water_g);
  const boilingAt = (waterMass_g: number) => waterSaturationTemperatureC(pressure_Pa / activityAt(waterMass_g));
  return { water_g, solute_g, particle_mol, pressure_Pa, pureBoiling_c, activityAt, boilingAt,
    activity: reason ? undefined : activity,
    boiling_c: reason ? NaN : boilingAt(water_g),
    model: reason ? 'unavailable' : particle_mol > 0 ? 'ideal-dilute-nonvolatile' : water_g > 0 ? 'pure-water' : 'water-reference', reason,
    minimumSupportedWater_g: solute_g * (1 - MAX_DILUTE_SOLUTE_FRACTION) / MAX_DILUTE_SOLUTE_FRACTION };
}
