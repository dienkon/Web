import type { VesselState } from '../types/chemistry';
import { identifySpecies, sameMolecularFormula } from '../science/speciesIdentity';
import { bruciteKsp, magnesiumMixturePh } from '../science/magnesiumHydroxidePrecipitation';
import { aqueousConstantsAtTemperature } from '../science/aqueousTemperature';

/** Finite partition of the existing Mg(OH)2 formula pool. Ideal concentrations;
 * 0.3/s is an illustrative approach rate, not experimental dissolution data. */
export function partitionMagnesiumHydroxide(v: VesselState, dt: number): Partial<VesselState> | null {
  const ksp = bruciteKsp(v.temperature_c), kw = aqueousConstantsAtTemperature(v.temperature_c)?.waterKw;
  if (ksp === null || kw === undefined || !(dt > 0) || !Number.isFinite(dt)
    || !(v.volume_ml > 0) || !Number.isFinite(v.volume_ml) || v.isShattered
    || (v.immiscibleOrganicVolume_ml ?? 0) > 0) return null;
  let mg = 0, base = 0, water = false;
  const pool = v.contents.filter(c => sameMolecularFormula(c.formula, 'Mg(OH)2'));
  if (!pool.length) return null;
  for (const c of v.contents) {
    if (!Number.isFinite(c.moles) || !Number.isFinite(c.mass_g) || c.moles < 0 || c.mass_g < 0
      || (c.location && c.location !== 'bulk')) return null;
    if (c.moles === 0) continue;
    const f = identifySpecies(c.formula).formula;
    if (f === 'H2O' && c.phase === 'l') { water = true; continue; }
    if (f === 'Mg(OH)2' && ['aq', 's'].includes(c.phase ?? '')) continue;
    if (c.phase !== 'aq') return null;
    if (f === 'MgCl2') mg += c.moles;
    else if (f === 'NaOH') base += c.moles;
    else if (f !== 'NaCl') return null;
  }
  const total = pool.reduce((s, c) => s + c.moles, 0), mass = pool.reduce((s, c) => s + c.mass_g, 0);
  if (!water || !(total > 0) || !(mass > 0)) return null;
  const liters = v.volume_ml / 1000;
  const product = (n: number) => {
    const a = (base + 2 * n) / liters, oh = (a + Math.sqrt(a * a + 4 * kw)) / 2;
    return (mg + n) / liters * oh * oh;
  };
  if (product(0) > ksp * (1 + 1e-10)) return null;
  let low = 0, high = total;
  if (product(total) > ksp) {
    for (let i = 0; i < 60; i++) {
      const mid = (low + high) / 2;
      if (product(mid) < ksp) low = mid; else high = mid;
    }
  } else low = high;
  const target = (low + high) / 2;
  const dissolved = pool.filter(c => c.phase === 'aq').reduce((s, c) => s + c.moles, 0);
  const difference = target - dissolved;
  if (difference === 0 || (target < total && Math.abs(difference) < Math.max(1e-15, total * 1e-10))) return null;
  const next = Math.abs(difference) <= Math.max(1e-15, total * 1e-8) ? target
    : dissolved + difference * -Math.expm1(-0.3 * dt);
  const dissolvedMass = mass * next / total, solidMass = mass - dissolvedMass;
  const contents = v.contents.filter(c => !sameMolecularFormula(c.formula, 'Mg(OH)2'));
  if (next > 0) contents.push({ formula: 'Mg(OH)2', phase: 'aq', moles: next, mass_g: dissolvedMass });
  if (next < total) contents.push({ formula: 'Mg(OH)2', phase: 's', moles: total - next, mass_g: solidMass, solidOrigin: 'precipitate' });
  return { contents, substances: [...new Set(contents.map(c => c.formula))],
    ph: magnesiumMixturePh(contents, v.volume_ml, v.temperature_c)!,
    phModel: v.temperature_c === 25 ? 'ideal_aqueous_25c' : 'ideal_aqueous_temperature',
    phReferenceTemperature_c: v.temperature_c, hasPrecipitate: solidMass > 1e-9,
    precipitateAmount_g: solidMass, precipitateSubstance: 'Mg(OH)2', precipitateColor: '#f8fafc',
    precipitateMorphology: 'FINE_POWDER', ...(solidMass <= 1e-9 ? { turbidity: 0 } : {}) };
}
