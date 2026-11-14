import type { VesselState } from '../types/chemistry';
import { checkSaturation } from '../simulation/chemistry/SolubilityEngine';
import { identifySpecies, sameMolecularFormula } from '../science/speciesIdentity';
import { partitionDryStock, isContactSuspensionRow } from '../physical/stockLiquidContact';
import { transferSolidPhase } from './solidPhaseTransfer';

/** Formula-unit partition in a liquid-water carrier. Aqueous solutes remain
 * a water-curve proxy (no Pb/I complexation/activity model); organic/mixed
 * solvents and frozen/dry stocks have no supported solubility model here. */
export function partitionLeadIodide(vessel: VesselState, dt: number): Partial<VesselState> | null {
  // The generic beaker phase model cannot relocate retained filter cake.
  const isLeadIodide = (item: VesselState['contents'][number]) => sameMolecularFormula(item.formula, 'PbI2');
  if (vessel.contents.some(item => isLeadIodide(item) && item.location && item.location !== 'bulk')) return null;
  const allEntries = vessel.contents.filter(isLeadIodide);
  if (!Number.isFinite(dt) || dt <= 0) return null;
  if (!allEntries.length) return vessel.leadIodidePhaseHistory ? { leadIodidePhaseHistory: undefined } : null;
  if (!Number.isFinite(vessel.volume_ml) || vessel.volume_ml <= 0 || vessel.isShattered
    || !Number.isFinite(vessel.temperature_c) || vessel.temperature_c < 0 || vessel.temperature_c > 100
    || (vessel.immiscibleOrganicVolume_ml ?? 0) > 0) return null;
  if (vessel.contents.some(item => !Number.isFinite(item.mass_g) || !Number.isFinite(item.moles)
    || item.mass_g < 0 || item.moles < 0)) return null;
  const bulk = vessel.contents.filter(item => item.mass_g > 0 && (!item.location || item.location === 'bulk'));
  const phase = (item: VesselState['contents'][number]) => item.phase ?? identifySpecies(item.formula).phase;
  if (!bulk.some(item => sameMolecularFormula(item.formula, 'H2O') && phase(item) === 'l')
    || bulk.some(item => phase(item) === 'l' && !sameMolecularFormula(item.formula, 'H2O'))
    || allEntries.some(item => phase(item) !== 's' && phase(item) !== 'aq')) return null;
  // A dry macrostock cannot supply the water-phase pool. Keep its row/pose
  // while dissolved inventory and tagged bulk suspension continue to evolve.
  const { reactiveContents, inertContents } = partitionDryStock(vessel);
  const entries = reactiveContents.filter(isLeadIodide);
  const totalMass = entries.reduce((sum, item) => sum + item.mass_g, 0);
  const totalMoles = entries.reduce((sum, item) => sum + item.moles, 0);
  if (totalMass <= 0 || totalMoles <= 0) return null;
  const currentSolid = entries.filter(item => phase(item) === 's').reduce((sum, item) => sum + item.mass_g, 0);
  const stocks = entries.filter(item => phase(item) === 's' && !isContactSuspensionRow(vessel, item));
  const currentPrecipitate = currentSolid - stocks.reduce((sum, item) => sum + item.mass_g, 0);
  const saturation = checkSaturation('PbI2', totalMass, vessel.volume_ml, vessel.temperature_c);
  const targetSolid = saturation.excessPrecipitate_g;
  const difference = targetSolid - currentSolid;
  const previous = vessel.leadIodidePhaseHistory;
  const wholeMass = allEntries.reduce((sum, item) => sum + item.mass_g, 0);
  const history = { temperature_c: vessel.temperature_c, totalMass_g: wholeMass };
  // Cooling plus growth from an existing dissolved inventory. Added solid or
  // a freshly mixed cold sample is not evidence of thermal recrystallization.
  const coolingGrowth = previous && vessel.temperature_c < previous.temperature_c - 1e-6
    && Math.abs(previous.totalMass_g - wholeMass) < Math.max(1e-9, wholeMass * 1e-6)
    && difference > 1e-9 && totalMass - currentSolid > 1e-9;
  const morphology = coolingGrowth || (previous && currentSolid > 1e-9
    && (vessel.precipitateMorphology === 'CRYSTAL_PLATE' || entries.some(c => c.precipitateFormation === 'CRYSTAL_PLATE'))) ? 'CRYSTAL_PLATE' : 'FINE_POWDER';
  if (Math.abs(difference) < 1e-12
    && Math.abs((vessel.precipitateAmount_g ?? 0) - currentPrecipitate) < 1e-9
    && previous?.temperature_c === history.temperature_c && previous?.totalMass_g === wholeMass
    && vessel.precipitateMorphology === morphology) return null;
  // Exact held-endpoint exponential: longer accepted frames must not discard
  // elapsed chemistry time. These rates remain illustrative, not measured.
  const response = -Math.expm1(-dt * (difference < 0 ? 1.2 : 0.35));
  const solidMass = Math.abs(difference) < Math.max(1e-9, totalMass * 1e-6) ? targetSolid
    : Math.max(0, Math.min(totalMass, currentSolid + difference * response));
  const solidMoles = totalMoles * solidMass / totalMass;
  // Wet dissolution shrinks an existing stock; it does not turn its remainder
  // into a precipitate and thereby erase the next frame's contact constraint.
  const normalized = reactiveContents.map(item => !isLeadIodide(item) ? item : {
    ...item, phase: phase(item), ...(phase(item) === 's' && isContactSuspensionRow(vessel, item)
      ? { solidOrigin: 'precipitate' as const, precipitateFormation: morphology } : {}),
  });
  const contents = [...transferSolidPhase(normalized, 'PbI2', totalMoles - solidMoles, vessel.volume_ml, morphology), ...inertContents];
  const precipitateMass = contents.filter(item => isLeadIodide(item) && item.solidOrigin === 'precipitate' && item.phase === 's')
    .reduce((sum, item) => sum + item.mass_g, 0);
  return {
    contents,
    hasPrecipitate: precipitateMass > 1e-9,
    precipitateAmount_g: precipitateMass,
    precipitateColor: '#f5c518',
    precipitateSubstance: precipitateMass > 1e-9 ? 'PbI2' : undefined,
    precipitateMorphology: morphology,
    leadIodidePhaseHistory: history,
    liquidColor: '#f8fafc',
    turbidity: Math.min(0.45, precipitateMass / Math.max(0.01, vessel.volume_ml) * 5),
  };
}
