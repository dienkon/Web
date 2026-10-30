import type { SubstanceContent, VesselState } from '../types/chemistry';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { solveAqueousEquilibrium, aqueousModelFields, type AqueousEquilibrium } from '../science/aqueousEquilibrium';
import { carbonateConstantsAtTemperature } from '../science/carbonateEquilibrium';

const calcite = (item: SubstanceContent) => sameMolecularFormula(item.formula, 'CaCO3')
  && (item.phase === 's' || item.phase === 'aq');
const cache = new WeakMap<readonly SubstanceContent[], { volume: number; temperature: number; result: ReturnType<typeof calculateTarget> }>();

/** Closed dissolved-carbon pool with ideal concentration/temperature fits.
 * Acetate-containing mixtures retain their documented 25 C reference. CO2(g) is not
 * dissolved CO2: gas/liquid transfer needs a separate finite contact model.
 * CaCO3(aq) is an analytical Ca/carbonate pool, whose actual aqueous species
 * are computed by charge balance; it is not a neutral-molecule assertion. */
function calculateTarget(contents: readonly SubstanceContent[], volume_ml: number, temperature_c: number) {
  const entries = contents.filter(calcite);
  const totalMoles = entries.reduce((sum, item) => sum + item.moles, 0);
  const totalMass_g = entries.reduce((sum, item) => sum + item.mass_g, 0);
  if (!entries.length || !(totalMoles > 0) || !(totalMass_g > 0) || !(volume_ml > 0)
    || entries.some(item => item.location === 'filter' || item.location === 'foam')
    || contents.some(item => !Number.isFinite(item.moles) || !Number.isFinite(item.mass_g) || item.moles < 0 || item.mass_g < 0)) return null;
  // Strong-acid conversion and competing solid reactions must run first.
  if (contents.some(item => item.moles > 1e-12 && ['HCl', 'HNO3', 'H2SO4'].some(formula => sameMolecularFormula(item.formula, formula)))) return null;
  if (!contents.some(item => sameMolecularFormula(item.formula, 'H2O') && item.phase === 'l' && item.mass_g > 0)) return null;
  const background = contents.filter(item => !calcite(item));
  const at = (dissolved: number) => {
    const trial: SubstanceContent[] = [...background,
      { formula: 'CaCO3', phase: 'aq', moles: dissolved, mass_g: totalMass_g * dissolved / totalMoles }];
    const equilibrium = solveAqueousEquilibrium(trial, volume_ml, temperature_c);
    return equilibrium ? { equilibrium, ionProduct: equilibrium.calcium_M * equilibrium.carbonate_M } : null;
  };
  const zero = at(0), full = at(totalMoles);
  if (!zero || !full) return null;
  const ksp = carbonateConstantsAtTemperature(zero.equilibrium.referenceTemperature_c)!.calciteKsp;
  // Precipitation from other formula-unit pools needs its own counterion
  // transaction; never manufacture CaCO3 by consuming untracked ions.
  if (zero.ionProduct > ksp * (1 + 1e-8)) return null;
  let dissolvedMoles = totalMoles, equilibrium = full.equilibrium;
  if (full.ionProduct > ksp) {
    let low = 0, high = totalMoles;
    for (let iteration = 0; iteration < 52; iteration++) {
      const middle = (low + high) / 2;
      const trial = at(middle)!;
      if (trial.ionProduct < ksp) low = middle;
      else high = middle;
    }
    dissolvedMoles = (low + high) / 2;
    equilibrium = at(dissolvedMoles)!.equilibrium;
  }
  return { dissolvedMoles, totalMoles, totalMass_g, equilibrium };
}

export function calciteEquilibriumTarget(contents: readonly SubstanceContent[], volume_ml: number, temperature_c = 25) {
  const previous = cache.get(contents);
  if (previous && previous.volume === volume_ml && previous.temperature === temperature_c) return previous.result;
  const result = calculateTarget(contents, volume_ml, temperature_c);
  cache.set(contents, { volume: volume_ml, temperature: temperature_c, result });
  return result;
}

/** Finite relaxation toward saturation. Approach speed is illustrative;
 * stirring changes approach, never the equilibrium amount. Reaction/phase
 * enthalpy for this coupled carbonate speciation is not yet parameterized. */
export function partitionCalcite(vessel: VesselState, dt: number, stirred = false): Partial<VesselState> | null {
  if (!(dt > 0) || !Number.isFinite(dt) || vessel.isShattered || (vessel.immiscibleOrganicVolume_ml ?? 0) > 0) return null;
  const target = calciteEquilibriumTarget(vessel.contents, vessel.volume_ml, vessel.temperature_c);
  if (!target) return null;
  const dissolved = vessel.contents.filter(item => calcite(item) && item.phase === 'aq').reduce((sum, item) => sum + item.moles, 0);
  const difference = target.dissolvedMoles - dissolved;
  const tolerance = Math.max(1e-14, target.totalMoles * 1e-9);
  if (Math.abs(difference) < tolerance) return null;
  const response = -Math.expm1(-0.3 * (stirred ? 3 : 1) * (vessel.isPulverized ? 2 : 1) * dt);
  const next = Math.abs(difference) < target.totalMoles * 1e-7 ? target.dissolvedMoles : dissolved + difference * response;
  const solidMoles = target.totalMoles - next;
  const dissolvedMass = target.totalMass_g * next / target.totalMoles;
  const solidMass = target.totalMass_g - dissolvedMass;
  const contents = vessel.contents.filter(item => !calcite(item));
  if (next > 0) contents.push({ formula: 'CaCO3', phase: 'aq', moles: next, mass_g: dissolvedMass,
    concentration_M: next / (vessel.volume_ml / 1000) });
  if (solidMoles > 0) contents.push({ formula: 'CaCO3', phase: 's', moles: solidMoles, mass_g: solidMass, solidOrigin: 'precipitate' });
  const equilibrium = solveAqueousEquilibrium(contents, vessel.volume_ml, vessel.temperature_c) as AqueousEquilibrium;
  const suspended = /powder|colloid|fine/i.test(vessel.precipitateMorphology ?? '') || (vessel.turbidity ?? 0) > 0;
  return { contents, substances: [...new Set(contents.filter(item => item.moles > 0).map(item => item.formula))],
    ph: equilibrium.ph, ...aqueousModelFields(equilibrium),
    hasPrecipitate: solidMass > 1e-9, precipitateAmount_g: solidMass,
    precipitateSubstance: 'CaCO3', precipitateColor: '#ffffff',
    turbidity: suspended ? Math.min(0.9, solidMass / vessel.volume_ml * 20) : 0 };
}
