import { CHEMICAL_DATABASE } from '../../data/chemicals';
import { liquidDosePlan } from '../../handling/liquidDosePlan';
import { sameMolecularFormula, identifySpecies } from '../../science/speciesIdentity';
import type { SubstanceContent } from '../../types/chemistry';
import type { ReactionProgram } from '../../shared/programSchema';
import { createAutoSolidDose, type AutoSolidDose } from './autoSolid';
import { dropSchedule } from '../../handling/doseTiming';
import type { VerticalDropFlight } from '../../handling/dropFlight';

/** One finite packet keeps the source loss, airborne view and receiving event
 * on the same immutable path. Times use the experiment's absolute clock. */
export interface AutoLiquidDrop {
  volume_ml: number;
  mass_g: number;
  color: string;
  releaseAt: number;
  arrivalAt: number;
  flight: VerticalDropFlight;
  targetLocal: [number, number, number];
  contents: SubstanceContent[];
  arrived: boolean;
}

export interface AutoDonor {
  row: SubstanceContent;
  components: SubstanceContent[];
  color: string;
  remaining: number;
  totalMass_g: number;
  solutionVolume_ml: number;
  fraction: number;
  doseStartedAt?: number;
  dropStartedAt?: number;
  dropSchedule?: ReturnType<typeof dropSchedule>;
  dropFallHeight?: number;
  dropFlight?: VerticalDropFlight;
  liquidDrops?: AutoLiquidDrop[];
  doseMode: 'pour' | 'dropper';
  solid?: AutoSolidDose;
}

export interface AutoDonorPlan {
  donors: AutoDonor[];
  /** No source material is synthesized by donor preparation. */
  addedWater_g: 0;
  /** Existing H2O redistributed into the prepared aqueous donors. */
  waterAllocated_g: number;
  /** Existing H2O remaining in its own finite donor after preparation. */
  freeWater_g: number;
}

const positive = (value: number | undefined) => Number.isFinite(value) && (value ?? 0) > 0;
function matchingStock(formula: string) {
  const identity = identifySpecies(formula);
  const candidates = CHEMICAL_DATABASE.filter(chemical => chemical.type === 'liquid'
    && positive(chemical.defaultConcentration) && sameMolecularFormula(chemical.formula, identity.formula));
  if (!candidates.length) return undefined;
  const graded = candidates.filter(candidate => identifySpecies(candidate.formula).concentration === identity.concentration);
  if (identity.concentration) return graded[0];
  const exact = candidates.find(candidate => candidate.formula.trim().toLowerCase() === formula.trim().toLowerCase());
  if (exact) return exact;
  const ungraded = graded.find(candidate => identifySpecies(candidate.formula).concentration === null);
  const dilute = candidates.find(candidate => identifySpecies(candidate.formula).concentration === 'dilute');
  return ungraded ?? graded[0] ?? dilute ?? candidates[0];
}

function mergeContents(contents: readonly SubstanceContent[]) {
  const merged = new Map<string, SubstanceContent>();
  for (const row of contents) {
    if (!(row.mass_g > 1e-12 && row.moles > 1e-12)) continue;
    const identity = identifySpecies(row.formula);
    const key = `${identity.formula.toLowerCase()}|${identity.concentration ?? ''}|${row.phase ?? row.state ?? ''}`;
    const old = merged.get(key);
    if (old) {
      old.mass_g += row.mass_g;
      old.moles += row.moles;
    } else merged.set(key, { ...row });
  }
  return [...merged.values()];
}

/** Turn authored inventories into finite physical transfers without inventing solvent. */
export function automaticDonors(contents: readonly SubstanceContent[], program: ReactionProgram): AutoDonorPlan {
  const rows = mergeContents(contents);
  const water = rows.find(row => sameMolecularFormula(row.formula, 'H2O') && (row.phase ?? row.state) === 'l');
  const preparations = rows.flatMap(row => {
    const phase = row.phase ?? row.state;
    if (phase !== 'aq' && !(phase === 'l' && !sameMolecularFormula(row.formula, 'H2O')
      && identifySpecies(row.formula).concentration === 'concentrated')) return [];
    const stock = matchingStock(row.formula);
    if (phase === 'l' && !stock) return [];
    return [{ row, stock }];
  });
  const preparedRows = new Set(preparations.map(item => item.row));
  const waterBudget_g = water?.mass_g ?? 0;
  const targets = preparations.map(({ row, stock }) => {
    const concentration_M = stock?.defaultConcentration ?? (positive(row.concentration_M) ? row.concentration_M : 0.1);
    const density_g_ml = stock?.density ?? 1;
    const targetVolume_ml = row.moles / concentration_M * 1000;
    const targetCarrier_g = Math.max(0, targetVolume_ml * density_g_ml - row.mass_g);
    const color = stock?.color ?? program.chemistry.species.find(species => sameMolecularFormula(species.formula, row.formula))?.colorHex ?? '#e2f1fc';
    return { row, stock, concentration_M, density_g_ml, targetVolume_ml, targetCarrier_g, color };
  });
  const requestedWater_g = targets.reduce((sum, item) => sum + item.targetCarrier_g, 0);
  const allocation = requestedWater_g > waterBudget_g && requestedWater_g > 0 ? waterBudget_g / requestedWater_g : 1;
  let allocatedWater_g = 0;
  const donors: AutoDonor[] = [];

  for (const item of targets) {
    const carrierWater_g = item.targetCarrier_g * allocation;
    allocatedWater_g += carrierWater_g;
    const carrier = carrierWater_g > 1e-12 ? { formula: 'H2O', phase: 'l', mass_g: carrierWater_g,
      moles: carrierWater_g / 18.015 } : undefined;
    const totalMass_g = item.row.mass_g + carrierWater_g;
    const solutionVolume_ml = totalMass_g / item.density_g_ml;
    const row = { ...item.row, concentration_M: solutionVolume_ml > 0 ? item.row.moles / (solutionVolume_ml / 1000) : undefined };
    donors.push({ row, components: [row, ...(carrier ? [carrier] : [])], color: item.color,
      remaining: totalMass_g, totalMass_g, solutionVolume_ml, fraction: 0,
      doseMode: liquidDosePlan(solutionVolume_ml).mode });
  }

  for (const row of rows) {
    const phase = row.phase ?? row.state;
    if (preparedRows.has(row)) continue;
    if (phase === 'l' && sameMolecularFormula(row.formula, 'H2O')) {
      const freeWater_g = Math.max(0, row.mass_g - allocatedWater_g);
      if (freeWater_g > 1e-12) {
        const freeWater = { ...row, mass_g: freeWater_g, moles: freeWater_g / 18.015 };
        donors.push({ row: freeWater, components: [freeWater], color: '#e2f1fc', remaining: freeWater_g,
          totalMass_g: freeWater_g, solutionVolume_ml: freeWater_g, fraction: 0,
          doseMode: liquidDosePlan(freeWater_g).mode });
      }
      continue;
    }
    const stock = phase === 'l' ? matchingStock(row.formula) : undefined;
    const density = stock?.density ?? 1;
    const solutionVolume_ml = phase === 'l' ? row.mass_g / density : 0;
    const color = stock?.color ?? program.chemistry.species.find(species => sameMolecularFormula(species.formula, row.formula))?.colorHex
      ?? CHEMICAL_DATABASE.find(chemical => chemical.type === 'solid' && sameMolecularFormula(chemical.formula, row.formula))?.color ?? '#e2f1fc';
    donors.push({ row, components: [row], color, remaining: row.mass_g, totalMass_g: row.mass_g,
      solutionVolume_ml, fraction: 0,
      doseMode: phase === 's' || phase === 'g' ? 'pour' : liquidDosePlan(solutionVolume_ml).mode,
      ...(phase === 's' ? { solid: createAutoSolidDose(row.formula, row.mass_g) } : {}) });
  }

  const order = (donor: AutoDonor) => donor.row.phase === 'l' && sameMolecularFormula(donor.row.formula, 'H2O') ? 0
    : donor.row.phase === 'g' ? 2 : 1;
  return { donors: donors.sort((a, b) => order(a) - order(b)), addedWater_g: 0,
    waterAllocated_g: allocatedWater_g, freeWater_g: Math.max(0, waterBudget_g - allocatedWater_g) };
}
