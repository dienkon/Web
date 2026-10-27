import type { SubstanceContent, VesselState } from '../types/chemistry';
import { identifySpecies } from '../science/speciesIdentity';
import { computeMolarMass } from './ledger';

const gas = (c: SubstanceContent) => ['g', 'gas'].includes(c.phase ?? c.state ?? '');
function totals(record: Record<string, number> = {}) {
  const result: Record<string, number> = {};
  for (const [formula, mass] of Object.entries(record)) {
    const key = identifySpecies(formula).formula;
    result[key] = (result[key] ?? 0) + mass;
  }
  return result;
}

/** Reconcile a cumulative stoichiometric replay with the irreversible gas
 * sink since its baseline. A recipe's original open/sealed flag determines
 * neither the present boundary nor permission to recover escaped molecules.
 * Foam is reconciled afterwards from the same gross retained+escaped budget. */
export function reconcileReplayGas(result: Partial<VesselState>, baseline: VesselState, current: VesselState) {
  const entries = result.contents ?? baseline.contents;
  const oldOut = totals(baseline.escapedGas_g), rawOut = totals(result.escapedGas_g ?? baseline.escapedGas_g);
  const actualOut = totals(current.escapedGas_g), rawHeld: Record<string, number> = {};
  const templates = new Map<string, SubstanceContent>();
  for (const item of entries) if (gas(item)) {
    const key = identifySpecies(item.formula).formula;
    rawHeld[key] = (rawHeld[key] ?? 0) + item.mass_g;
    if (item.mass_g > 0 && item.moles > 0) templates.set(key, item);
  }
  const keys = new Set([...Object.keys(oldOut), ...Object.keys(rawOut), ...Object.keys(actualOut), ...Object.keys(rawHeld)]);
  const contents = entries.filter(c => !gas(c)).map(c => ({ ...c }));
  const escaped: Record<string, number> = {};
  let rawMass = 0, keptMass = 0;
  for (const key of keys) {
    const before = oldOut[key] ?? 0, rawEscaped = rawOut[key] ?? 0, out = actualOut[key] ?? before, held = rawHeld[key] ?? 0;
    if (![before, rawEscaped, out, held].every(Number.isFinite) || Math.min(before, rawEscaped, out, held) < 0) return null;
    const budget = held + Math.max(0, rawEscaped - before), alreadyLost = Math.max(0, out - before);
    // A replay cannot consume gas which already crossed the boundary. This
    // also prevents an extent rewind from resurrecting an old exhaust batch.
    if (alreadyLost > budget + Math.max(1e-12, budget * 1e-10)) return null;
    const lost = current.isSealed ? alreadyLost : Math.max(alreadyLost, budget);
    const retained = Math.max(0, budget - lost), cumulative = before + lost;
    rawMass += held; keptMass += retained;
    if (cumulative > 0) escaped[key] = cumulative;
    if (retained > 0) {
      const template = templates.get(key);
      const mm = template ? template.mass_g / template.moles : computeMolarMass(key);
      if (!Number.isFinite(mm) || mm <= 0) return null;
      contents.push({ ...template, formula: key, phase: 'g', state: 'g', location: 'bulk',
        mass_g: retained, moles: retained / mm });
    }
  }
  return { contents, escapedGas_g: escaped,
    mass_g: Math.max(0, (result.mass_g ?? baseline.mass_g) + keptMass - rawMass) };
}
