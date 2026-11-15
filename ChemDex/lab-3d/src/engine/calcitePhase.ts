import type { SubstanceContent, VesselState } from '../types/chemistry';
import { sameMolecularFormula } from '../science/speciesIdentity';
import { solveAqueousEquilibrium, aqueousModelFields, type AqueousEquilibrium } from '../science/aqueousEquilibrium';
import { carbonateConstantsAtTemperature } from '../science/carbonateEquilibrium';
import { partitionDryStock, stockLiquidContactFraction } from '../physical/stockLiquidContact';
import { precipitateComponents, withLegacyPrecipitateOrigins } from '../science/precipitateInventory';
import { transferSolidPhase } from './solidPhaseTransfer';
import { allocateStockConsumption } from '../physical/stockConsumption';

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
  const { reactiveContents: reactive, inertContents, reactiveVessel } = partitionDryStock(vessel);
  // Retain the equilibrium cache key when the contact partition excludes no
  // material. The immutable contents array already identifies composition.
  const reactiveContents = inertContents.length ? reactive : vessel.contents;
  const target = calciteEquilibriumTarget(reactiveContents, vessel.volume_ml, vessel.temperature_c);
  if (!target) return null;
  const dissolved = reactiveContents.filter(item => calcite(item) && item.phase === 'aq').reduce((sum, item) => sum + item.moles, 0);
  const difference = target.dissolvedMoles - dissolved;
  const tolerance = Math.max(1e-14, target.totalMoles * 1e-9);
  if (Math.abs(difference) < tolerance) return null;
  const contact = difference > 0 ? stockLiquidContactFraction(reactiveVessel, 'CaCO3') : 1;
  if (!(contact > 0)) return null;
  const response = -Math.expm1(-0.3 * (stirred ? 3 : 1) * (vessel.isPulverized ? 2 : 1) * contact * dt);
  const next = Math.abs(difference) < target.totalMoles * 1e-7 ? target.dissolvedMoles : dissolved + difference * response;
  const normalized = withLegacyPrecipitateOrigins({ ...vessel, contents: reactiveContents,
    hasPrecipitate: vessel.hasPrecipitate && !vessel.stockMotion?.grains.some(pose => sameMolecularFormula(pose.formula, 'CaCO3')) });
  const contents = [...transferSolidPhase(normalized, 'CaCO3', next, vessel.volume_ml), ...inertContents];
  const solidMass = precipitateComponents(contents).filter(component => sameMolecularFormula(component.formula, 'CaCO3'))
    .reduce((sum, component) => sum + component.mass_g, 0);
  const equilibrium = solveAqueousEquilibrium(contents, vessel.volume_ml, vessel.temperature_c) as AqueousEquilibrium;
  const suspended = /powder|colloid|fine/i.test(vessel.precipitateMorphology ?? '') || (vessel.turbidity ?? 0) > 0;
  return { contents, stockMotion: allocateStockConsumption(vessel, contents),
    substances: [...new Set(contents.filter(item => item.moles > 0).map(item => item.formula))],
    ph: equilibrium.ph, ...aqueousModelFields(equilibrium),
    hasPrecipitate: solidMass > 1e-9, precipitateAmount_g: solidMass,
    precipitateSubstance: solidMass > 1e-9 ? 'CaCO3' : undefined, precipitateColor: solidMass > 1e-9 ? '#ffffff' : undefined,
    turbidity: suspended ? Math.min(0.9, solidMass / vessel.volume_ml * 20) : 0 };
}
