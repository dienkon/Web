import type { VesselState } from '../types/chemistry';
import { identifySpecies, sameMolecularFormula } from '../science/speciesIdentity';
import { computeMolarMass } from './ledger';

export interface GasFlux {
  dt_s: number;
  generated_mol_s: Record<string, number>;
  escaped_mol_s: Record<string, number>;
}
function escapedMass(v: VesselState) {
  const result: Record<string, number> = {};
  for (const [formula, mass] of Object.entries(v.escapedGas_g ?? {})) {
    const key = identifySpecies(formula).formula;
    if (Number.isFinite(mass) && mass > 0) result[key] = (result[key] ?? 0) + mass;
  }
  return result;
}
function freeGasMass(v: VesselState, escaped: Record<string, number>) {
  const result = { ...escaped };
  for (const c of v.contents) {
    if ((c.phase ?? c.state) !== 'g' || c.location === 'foam' || !Number.isFinite(c.mass_g) || c.mass_g <= 0) continue;
    const key = identifySpecies(c.formula).formula;
    result[key] = (result[key] ?? 0) + c.mass_g;
  }
  return result;
}
function trappedGasMass(v: VesselState, key: string) {
  return v.contents.reduce((sum, c) => sum + ((c.phase ?? c.state) === 'g' && c.location === 'foam'
    && identifySpecies(c.formula).formula === key ? Math.max(0, c.mass_g) : 0), 0);
}

/** Source and exhaust are distinct: moving old headspace gas into escapedGas
 * produces an exhaust pulse, not another chemical generation event. Foam owns
 * its trapped gas; water has its own phase/routing system. No preset fallback. */
export function measureGasFlux(current: VesselState, previous: VesselState, dt: number): GasFlux {
  const result: GasFlux = { dt_s: dt, generated_mol_s: {}, escaped_mol_s: {} };
  if (!Number.isFinite(dt) || dt <= 0 || current.isShattered) return result;
  const out = escapedMass(current), oldOut = escapedMass(previous);
  const total = freeGasMass(current, out), oldTotal = freeGasMass(previous, oldOut);
  const keys = new Set([...Object.keys(total), ...Object.keys(oldTotal),
    ...Object.keys(previous.gasFlux?.escaped_mol_s ?? {})]);
  for (const key of keys) {
    if (sameMolecularFormula(key, 'H2O')) continue;
    const mm = computeMolarMass(key);
    if (!(mm > 0) || !Number.isFinite(mm)) continue;
    const trappedChange = trappedGasMass(current, key) - trappedGasMass(previous, key);
    const netNew = (total[key] ?? 0) - (oldTotal[key] ?? 0) + trappedChange;
    result.generated_mol_s[key] = Math.max(0, netNew - Math.max(0, trappedChange)) / mm / dt;
    result.escaped_mol_s[key] = current.isSealed ? 0 : Math.max(0, (out[key] ?? 0) - (oldOut[key] ?? 0)) / mm / dt;
  }
  return result;
}
