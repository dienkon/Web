import type { VesselState } from '../types/chemistry';
import { sameMolecularFormula } from '../science/speciesIdentity';

export const FOAM_SURFACTANT = 'C12H25NaO4S';
// Illustrative retention/drainage parameters, not measured detergent kinetics.
const DRAIN_TIME_S = 4;
const OXYGEN_MOLAR_MASS = 31.998;
const RETENTION_FRACTION = 0.6;
const EPS_MASS_G = 1e-10;
const foamOxygen = (vessel: VesselState) => vessel.contents.filter(item => item.location === 'foam'
  && item.phase === 'g' && sameMolecularFormula(item.formula, 'O2')).reduce((sum, item) => sum + item.mass_g, 0);

/** Retain a finite share of newly generated O2 in liquid films stabilized by
 * explicitly inventoried surfactant. foam_ml is additional gas displacement;
 * film water is already in liquid volume, not newly manufactured liquid.
 * Cumulative escaped+retained gas lets baseline replay and normal ticks share
 * the same budget without capturing an old gas batch twice.
 */
export function stepFoamInventory(current: VesselState, previous: VesselState, dt: number): Partial<VesselState> | null {
  if (current.id.startsWith('lesson_vessel_')) return null;
  const currentHeld = foamOxygen(current), previousHeld = foamOxygen(previous);
  if (current.isSealed) {
    if (currentHeld <= 0 && !(current.foam_ml! > 0)) return null;
    return { contents: current.contents.map(item => item.location === 'foam' ? { ...item, location: 'bulk' } : item), foam_ml: 0 };
  }
  const liquidWater = current.contents.filter(item => sameMolecularFormula(item.formula, 'H2O')
    && item.phase === 'l').reduce((sum, item) => sum + item.mass_g, 0);
  const surfactant = current.contents.filter(item => sameMolecularFormula(item.formula, FOAM_SURFACTANT)
    && item.phase === 'aq').reduce((sum, item) => sum + item.mass_g, 0);
  const enabled = !current.isShattered && current.volume_ml > 0.05 && liquidWater > 0 && surfactant > 0;
  const grossCurrent = (current.escapedGas_g?.O2 ?? 0) + currentHeld;
  const grossPrevious = (previous.escapedGas_g?.O2 ?? 0) + previousHeld;
  const difference = grossCurrent - grossPrevious;
  if (previousHeld <= 0 && currentHeld <= 0 && !(current.foam_ml! > 0) && (!enabled || difference <= 0)) return null;
  const elapsed = Number.isFinite(dt) && dt > 0 ? dt : 0;
  const decay = Math.exp(-elapsed / DRAIN_TIME_S);
  const previousAvailable = Math.max(0, previousHeld + Math.min(0, difference));
  const capture = enabled ? RETENTION_FRACTION * Math.min(1, surfactant / (liquidWater * 0.005)) : 0;
  const uniformSupply = elapsed > 0 ? -Math.expm1(-elapsed / DRAIN_TIME_S) * DRAIN_TIME_S / elapsed : 0;
  let retained = enabled ? previousAvailable * decay + Math.max(0, difference) * capture * uniformSupply : 0;
  const molarVolume_ml = 0.082057 * Math.max(1, current.temperature_c + 273.15) * 1000;
  const headspace_ml = Math.max(0, current.capacity_ml - current.volume_ml);
  // Excess gas vents; no liquid spill is fabricated from gas volume.
  retained = Math.min(retained, grossCurrent, headspace_ml / molarVolume_ml * OXYGEN_MOLAR_MASS);
  if (retained < EPS_MASS_G) retained = 0;
  const contents = current.contents.filter(item => !(item.location === 'foam' && item.phase === 'g'
    && sameMolecularFormula(item.formula, 'O2')));
  if (retained > 0) contents.push({ formula: 'O2', phase: 'g', location: 'foam',
    moles: retained / OXYGEN_MOLAR_MASS, mass_g: retained });
  return { contents, substances: [...new Set(contents.filter(item => item.moles > 1e-12).map(item => item.formula))],
    mass_g: current.mass_g - currentHeld + retained,
    escapedGas_g: { ...current.escapedGas_g, O2: Math.max(0, grossCurrent - retained) },
    foam_ml: retained / OXYGEN_MOLAR_MASS * molarVolume_ml };
}
