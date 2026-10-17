/**
 * ledger.ts — Physical Conservation Ledger & Stoichiometric Accounting Engine
 * 
 * "Bảo toàn, Mất đi, Còn lại"
 * Tracks modeled species amounts, product phases and mass transferred to sinks.
 * Reaction enthalpy, solution activities and optical parameters are approximate;
 * conserving formula atoms does not establish experimental calibration.
 */

import { VesselState, SubstanceContent } from '../types/chemistry';
import { ReactionProgram } from '../shared/programSchema';
import { Phase, PrecipMorphology, GasSpecies, GAS_SPECIES_TABLE } from '../vfx/catalog/vocab';
import { assessProgramConditions } from '../science/conditions';
import { identifySpecies, sameMolecularFormula } from '../science/speciesIdentity';
import { solveAqueousEquilibrium } from '../science/aqueousEquilibrium';
import { applyThermalEnergy, sealedGasPressure } from './thermalState';
import { indicatorColor, solutionIndicatorColor } from '../science/indicatorAppearance';

// Standard Atomic Weights (IUPAC)
export const ATOMIC_WEIGHTS: Record<string, number> = {
  H: 1.008,
  He: 4.0026,
  Li: 6.94,
  Be: 9.0122,
  B: 10.81,
  C: 12.011,
  N: 14.007,
  O: 15.999,
  F: 18.998,
  Ne: 20.180,
  Na: 22.990,
  Mg: 24.305,
  Al: 26.982,
  Si: 28.085,
  P: 30.974,
  S: 32.06,
  Cl: 35.45,
  Ar: 39.948,
  K: 39.098,
  Ca: 40.078,
  Sc: 44.956,
  Ti: 47.867,
  V: 50.942,
  Cr: 51.996,
  Mn: 54.938,
  Fe: 55.845,
  Co: 58.933,
  Ni: 58.693,
  Cu: 63.546,
  Zn: 65.38,
  Ga: 69.723,
  Ge: 72.63,
  As: 74.922,
  Se: 78.971,
  Br: 79.904,
  Rb: 85.468,
  Sr: 87.62,
  Ag: 107.868,
  Cd: 112.414,
  Sn: 118.71,
  Sb: 121.76,
  I: 126.904,
  Ba: 137.327,
  Pt: 195.084,
  Au: 196.967,
  Hg: 200.592,
  Pb: 207.2,
  Bi: 208.9804,
};

/**
 * Parses a chemical formula into its constitutive elemental atom counts.
 * Handles:
 * - Parentheses: Ca(OH)2 -> { Ca: 1, O: 2, H: 2 }, Al2(SO4)3 -> { Al: 2, S: 3, O: 12 }
 * - Brackets: [Cu(NH3)4]SO4 -> { Cu: 1, N: 4, H: 12, S: 1, O: 4 }
 * - Hydrates: CuSO4·5H2O or FeSO4.7H2O -> { Cu: 1, S: 1, O: 9, H: 10 }
 */
export function parseChemicalFormula(formula: string): Record<string, number> {
  const result: Record<string, number> = {};
  if (!formula || typeof formula !== 'string') return result;

  // Clean formula: remove state indicators like (s), (aq), (l), (g), (conc), (dil)
  let clean = formula.replace(/\s*\((?:s|l|g|aq|conc|dil)\)/gi, '').trim();

  // Split hydrate dot (· or .)
  const hydrateParts = clean.split(/[·\.]/);
  const mainPart = hydrateParts[0];

  function parseSubPart(str: string, multiplier: number = 1) {
    // Regex matching: (subpart)number or [subpart]number or ElementName+number
    let i = 0;
    while (i < str.length) {
      if (str[i] === '(' || str[i] === '[') {
        const closeChar = str[i] === '(' ? ')' : ']';
        let depth = 1;
        let j = i + 1;
        while (j < str.length && depth > 0) {
          if (str[j] === str[i]) depth++;
          else if (str[j] === closeChar) depth--;
          j++;
        }
        const inner = str.slice(i + 1, j - 1);
        // Look for trailing number after bracket
        const numMatch = str.slice(j).match(/^(\d+)/);
        const subMult = numMatch ? parseInt(numMatch[1], 10) : 1;
        parseSubPart(inner, multiplier * subMult);
        i = j + (numMatch ? numMatch[1].length : 0);
      } else {
        // Element + optional count
        const elMatch = str.slice(i).match(/^([A-Z][a-z]*)(\d*)/);
        if (elMatch) {
          const el = elMatch[1];
          const count = elMatch[2] ? parseInt(elMatch[2], 10) : 1;
          result[el] = (result[el] || 0) + count * multiplier;
          i += elMatch[0].length;
        } else {
          i++; // Skip unparsed character
        }
      }
    }
  }

  parseSubPart(mainPart, 1);

  // If hydrate part exists (e.g. 5H2O)
  if (hydrateParts.length > 1) {
    for (let k = 1; k < hydrateParts.length; k++) {
      const hydPart = hydrateParts[k].trim();
      const match = hydPart.match(/^(\d*)(.*)/);
      if (match) {
        const hydMult = match[1] ? parseInt(match[1], 10) : 1;
        const hydFormula = match[2];
        parseSubPart(hydFormula, hydMult);
      }
    }
  }

  return result;
}

/**
 * Computes standard molar mass in g/mol from a formula string.
 */
export function computeMolarMass(formula: string): number {
  const atoms = parseChemicalFormula(formula);
  let totalMass = 0;
  for (const [el, count] of Object.entries(atoms)) {
    const weight = ATOMIC_WEIGHTS[el] || 1.0;
    totalMass += weight * count;
  }
  return totalMass > 0 ? totalMass : 18.015;
}

// -------------------------------------------------------------
// Conservation Ledger Domain Contracts
// -------------------------------------------------------------

export type SpeciesLocation =
  | 'bulk'
  | 'bottom'
  | 'surface'
  | 'wall'
  | 'headspace'
  | 'filter'
  | 'stopper'
  | 'electrode';

export interface LedgerInventoryItem {
  speciesId: string;
  formula: string;
  moles: number;
  phase: Phase;
  location: SpeciesLocation;
  mass_g: number;
  molarMass_g_mol: number;
}

export interface LedgerSinks {
  escapedGas_g: Record<string, number>;
  evaporated_g: number;
  spilled_g: number;
  overflow_g: number;
  retainedOnSource_g: number;
  filterCake_g: number;
  condensedOnWalls_g: number;
  stainDeposit_g: number;
}

export interface LedgerEnergy {
  heatReleased_J: number;
  heatToSurroundings_J: number;
  latent_J: number;
}

export interface LedgerFields {
  T_c: number;
  pH: number;
  ionicStrength: number;
  turbidity: number;
  gasHoldup: number;
  foam_ml: number;
  headspacePressure_atm: number;
}

export interface LedgerAuditResult {
  massError_g: number;
  atomError: Record<string, number>;
  chargeError: number;
  isConserved: boolean;
}

export interface Ledger {
  vesselId: string;
  initialMass_g: number;
  initialAtoms: Record<string, number>;
  inventory: Record<string, LedgerInventoryItem>;
  sinks: LedgerSinks;
  energy: LedgerEnergy;
  fields: LedgerFields;
  rates: Record<string, number>; // mol/s signed
  audit: () => LedgerAuditResult;
}

// -------------------------------------------------------------
// Non-Ideal Solution Mixing & Excess Enthalpy
// -------------------------------------------------------------

export function calculateExcessVolume(
  substances: string[],
  contents: SubstanceContent[]
): number {
  // Volume contraction: Ethanol + Water contracts ~3.5% at 50 vol%
  const hasWater = contents.some(c => c.formula === 'H2O' || c.formula === 'water');
  const hasEthanol = contents.some(c => c.formula === 'C2H5OH' || c.formula === 'ethanol');
  const hasH2SO4 = contents.some(c => c.formula.toLowerCase().includes('h2so4'));

  let contractionFactor = 0;
  if (hasWater && hasEthanol) {
    contractionFactor = 0.035;
  } else if (hasWater && hasH2SO4) {
    contractionFactor = 0.045; // Concentrated acid mixing contraction
  }

  return contractionFactor;
}

export function calculateNonIdealExcessVolume_ml(volWater_ml: number, volSolvent_ml: number, solvent: string): number {
  if (solvent.toLowerCase().includes('ethanol') || solvent.toLowerCase().includes('c2h5oh')) {
    return -(volWater_ml + volSolvent_ml) * 0.035;
  }
  return 0;
}

// -------------------------------------------------------------
// Beer-Lambert Liquid Color Calculation
// -------------------------------------------------------------

export interface SpeciesAbsorbance {
  epsR: number; // M^-1 cm^-1
  epsG: number;
  epsB: number;
}

export const SPECIES_ABSORBANCE_TABLE: Record<string, SpeciesAbsorbance> = {
  'Cu2+': { epsR: 12.0, epsG: 3.5, epsB: 0.2 },      // Absorbs red/yellow -> cyan-blue
  'CuSO4': { epsR: 12.0, epsG: 3.5, epsB: 0.2 },
  'Fe3+': { epsR: 0.5, epsG: 3.0, epsB: 15.0 },     // Absorbs blue -> yellow-brown
  'FeCl3': { epsR: 0.5, epsG: 3.0, epsB: 15.0 },
  'Fe(SCN)2+': { epsR: 0.2, epsG: 18.0, epsB: 25.0 }, // Blood red
  'MnO4-': { epsR: 18.0, epsG: 32.0, epsB: 2.0 },    // Deep intense purple
  'KMnO4': { epsR: 18.0, epsG: 32.0, epsB: 2.0 },
  'Cr2O72-': { epsR: 1.0, epsG: 12.0, epsB: 28.0 },  // Rich orange
  'K2Cr2O7': { epsR: 1.0, epsG: 12.0, epsB: 28.0 },
  'CrO42-': { epsR: 0.5, epsG: 5.0, epsB: 24.0 },   // Lemon yellow
  'K2CrO4': { epsR: 0.5, epsG: 5.0, epsB: 24.0 },
  'Ni2+': { epsR: 10.0, epsG: 0.5, epsB: 8.0 },     // Emerald green
  'Co2+': { epsR: 1.0, epsG: 9.0, epsB: 5.0 },      // Pale pink/magenta
  'I2': { epsR: 2.0, epsG: 10.0, epsB: 22.0 },      // Amber-brown iodine
  'Phenolphthalein_basic': { epsR: 0.5, epsG: 28.0, epsB: 4.0 }, // Vivid magenta
};

export function calculateBeerLambertColor(
  contents: SubstanceContent[],
  volume_ml: number,
  baseColor: string = '#ffffff'
): string {
  if (volume_ml <= 0.1 || !contents || contents.length === 0) return baseColor;

  const pathLength_cm = Math.cbrt(volume_ml / Math.PI) * 2.0; // Estimate vessel diameter
  let optDensityR = 0;
  let optDensityG = 0;
  let optDensityB = 0;

  for (const item of contents) {
    const conc_M = item.concentration_M || (item.moles / (volume_ml / 1000));
    if (conc_M <= 1e-5) continue;

    const abs = SPECIES_ABSORBANCE_TABLE[item.formula];
    if (abs) {
      optDensityR += abs.epsR * conc_M * pathLength_cm;
      optDensityG += abs.epsG * conc_M * pathLength_cm;
      optDensityB += abs.epsB * conc_M * pathLength_cm;
    }
  }

  // Transmittance T = 10^(-A)
  const transR = Math.max(0.02, Math.min(1.0, Math.pow(10, -optDensityR * 0.15)));
  const transG = Math.max(0.02, Math.min(1.0, Math.pow(10, -optDensityG * 0.15)));
  const transB = Math.max(0.02, Math.min(1.0, Math.pow(10, -optDensityB * 0.15)));

  if (optDensityR < 0.01 && optDensityG < 0.01 && optDensityB < 0.01) {
    return baseColor;
  }

  const r = Math.round(transR * 255);
  const g = Math.round(transG * 255);
  const b = Math.round(transB * 255);

  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

// -------------------------------------------------------------
// Ledger Construction & Execution Engine
// -------------------------------------------------------------

export class LedgerEngine {
  public static createLedger(vessel: VesselState): Ledger {
    return this.createLedgerFromVessel(vessel);
  }

  public static createLedgerFromVessel(vessel: VesselState): Ledger {
    const inventory: Record<string, LedgerInventoryItem> = {};
    const initialAtoms: Record<string, number> = {};
    let totalMass_g = 0;

    if (vessel.contents && vessel.contents.length > 0) {
      for (const c of vessel.contents) {
        const mm = computeMolarMass(c.formula);
        const mass = c.mass_g || c.moles * mm;
        inventory[c.formula] = {
          speciesId: c.formula,
          formula: c.formula,
          moles: c.moles,
          phase: (c.state as Phase) || (c.formula === 'H2O' ? 'l' : 'aq'),
          location: 'bulk',
          mass_g: mass,
          molarMass_g_mol: mm
        };
        totalMass_g += mass;

        const atoms = parseChemicalFormula(c.formula);
        for (const [el, count] of Object.entries(atoms)) {
          initialAtoms[el] = (initialAtoms[el] || 0) + count * c.moles;
        }
      }
    } else if (vessel.substances && vessel.substances.length > 0) {
      // Fallback: estimate from substances and volume
      const vol_ml = vessel.volume_ml || 50;
      const molesPerSub = (vol_ml / 1000) * 0.5;
      for (const s of vessel.substances) {
        const mm = computeMolarMass(s);
        const mass = molesPerSub * mm;
        inventory[s] = {
          speciesId: s,
          formula: s,
          moles: molesPerSub,
          phase: s === 'H2O' ? 'l' : 'aq',
          location: 'bulk',
          mass_g: mass,
          molarMass_g_mol: mm
        };
        totalMass_g += mass;

        const atoms = parseChemicalFormula(s);
        for (const [el, count] of Object.entries(atoms)) {
          initialAtoms[el] = (initialAtoms[el] || 0) + count * molesPerSub;
        }
      }
    }

    const sinks: LedgerSinks = {
      escapedGas_g: {},
      evaporated_g: 0,
      spilled_g: 0,
      overflow_g: 0,
      retainedOnSource_g: 0,
      filterCake_g: 0,
      condensedOnWalls_g: 0,
      stainDeposit_g: 0
    };

    const energy: LedgerEnergy = {
      heatReleased_J: 0,
      heatToSurroundings_J: 0,
      latent_J: 0
    };

    const fields: LedgerFields = {
      T_c: vessel.temperature_c ?? 25.0,
      pH: vessel.ph ?? 7.0,
      ionicStrength: 0.1,
      turbidity: vessel.hasPrecipitate ? 0.8 : 0.0,
      gasHoldup: vessel.hasGas ? 0.05 : 0.0,
      foam_ml: vessel.foam_ml ?? 0.0,
      headspacePressure_atm: 1.0
    };

    const rates: Record<string, number> = {};

    const ledger: Ledger = {
      vesselId: vessel.id,
      initialMass_g: totalMass_g,
      initialAtoms,
      inventory,
      sinks,
      energy,
      fields,
      rates,
      audit: () => {
        let currentInvMass = 0;
        const currentAtoms: Record<string, number> = {};

        for (const item of Object.values(inventory)) {
          currentInvMass += item.mass_g;
          const atoms = parseChemicalFormula(item.formula);
          for (const [el, count] of Object.entries(atoms)) {
            currentAtoms[el] = (currentAtoms[el] || 0) + count * item.moles;
          }
        }

        let sinksMass = sinks.evaporated_g + sinks.spilled_g + sinks.overflow_g +
          sinks.retainedOnSource_g + sinks.filterCake_g + sinks.condensedOnWalls_g + sinks.stainDeposit_g;
        for (const gMass of Object.values(sinks.escapedGas_g)) {
          sinksMass += gMass;
        }

        const totalAccountedMass = currentInvMass + sinksMass;
        const massError_g = Math.abs(totalAccountedMass - totalMass_g);

        const atomError: Record<string, number> = {};
        for (const [el, initCount] of Object.entries(initialAtoms)) {
          const curCount = currentAtoms[el] || 0;
          atomError[el] = Math.abs(curCount - initCount);
        }

        return {
          massError_g,
          atomError,
          chargeError: 0.0,
          isConserved: massError_g < 1e-5
        };
      }
    };

    return ledger;
  }
}

/**
 * Applies a ReactionProgram to a vessel's state and ledger.
 * Truthfully consumes reactants according to limiting reagent stoichiometry,
 * computes exact product yields, precipitate mass, gas volume, and energy release.
 */
export function applyProgramToLedger(
  program: ReactionProgram,
  vessel: VesselState,
  consumedExtent: number = 1.0, // 0.0 to 1.0 (fraction of limiting reagent reacted)
  options: { deferThermal?: boolean } = {},
): Partial<VesselState> {
  const assessment = assessProgramConditions(program, vessel.contents ?? [], {
    ignitedProgramId: vessel.ignitedProgramId,
    temperature_c: vessel.temperature_c, pH: vessel.ph, volume_ml: vessel.volume_ml,
    isHeated: vessel.temperature_c > 100,
  });
  if (!assessment.ready) return {
    contents: vessel.contents.map(item => ({ ...item })),
    hasGas: false,
    hasPrecipitate: vessel.hasPrecipitate,
    precipitateAmount_g: vessel.precipitateAmount_g ?? 0,
    liquidColor: vessel.liquidColor,
    temperature_c: vessel.temperature_c,
    mass_g: vessel.mass_g,
  };
  const reactants = program.chemistry.species.filter(s => s.role === 'reactant');
  const products = program.chemistry.species.filter(s => s.role === 'product');

  // Identify available moles of reactants in vessel contents
  const currentContents = vessel.contents ? vessel.contents.map(content => ({ ...content })) : [];
  // Empty quantitative inventory means no reactant amount. Do not manufacture
  // a 0.5 M solution from labels merely to make an animation run.

  // Find limiting reagent and maximal reaction extent (moles of reaction)
  let maxReactionMoles = Infinity;
  for (const r of reactants) {
    const found = currentContents.find(c => sameMolecularFormula(c.formula, r.formula) && (!c.phase || c.phase === r.phase));
    const available = found ? found.moles : 0;
    const possible = available / r.coeff;
    if (possible < maxReactionMoles) {
      maxReactionMoles = possible;
    }
  }

  if (products.length === 0 || program.provenance === 'fallback' || maxReactionMoles === Infinity || maxReactionMoles <= 0) {
    maxReactionMoles = 0;
  }

  const molesOfReaction = maxReactionMoles * Math.max(0, Math.min(1.0, consumedExtent));

  // 1. Consume reactants (only if reaction produces products)
  if (molesOfReaction > 0) {
    for (const r of reactants) {
      const consumeMoles = molesOfReaction * r.coeff;
      const found = currentContents.find(c => sameMolecularFormula(c.formula, r.formula) && (!c.phase || c.phase === r.phase));
      if (found) {
        found.moles = Math.max(0, found.moles - consumeMoles);
        const mm = computeMolarMass(found.formula);
        found.mass_g = found.moles * mm;
      }
    }
  }

  // 2. Generate products
  let totalPrecipitateG = vessel.precipitateAmount_g || 0;
  let hasGas = vessel.hasGas || false;
  let gasColor = vessel.gasColor;
  let precipitateColor = vessel.precipitateColor;
  let precipitateSubstance = vessel.precipitateSubstance;
  let precipitateMorphology = vessel.precipitateMorphology;
  let escapedGas_g = 0;
  const escapedByFormula = { ...vessel.escapedGas_g };
  let totalGasMolesProduced = 0;

  if (molesOfReaction > 0) {
    for (const p of products) {
      const produceMoles = molesOfReaction * p.coeff;
      const mm = p.molarMass_g_mol || computeMolarMass(p.formula);
      const produceMass = produceMoles * mm;

      if (p.phase === 's') {
        totalPrecipitateG += produceMass;
        precipitateSubstance = p.formula;
        if (p.colorHex) precipitateColor = p.colorHex;
        if (program.visual.after.precipitate?.morphology) {
          precipitateMorphology = program.visual.after.precipitate.morphology as any;
        }
      } else if (p.phase === 'g') {
        hasGas = true;
        totalGasMolesProduced += produceMoles;
        const gasInfo = GAS_SPECIES_TABLE[p.formula as GasSpecies];
        if (gasInfo) {
          gasColor = gasInfo.colorHex;
        }
        if (!vessel.isSealed) {
          escapedGas_g += produceMass;
          escapedByFormula[p.formula] = (escapedByFormula[p.formula] ?? 0) + produceMass;
          continue;
        }
      }

      const existing = currentContents.find(c => sameMolecularFormula(c.formula, p.formula) && c.phase === p.phase);
      if (existing) {
        existing.moles += produceMoles;
        existing.mass_g = existing.moles * mm;
      } else if (produceMoles > 1e-12) {
        currentContents.push({
          formula: p.formula,
          moles: produceMoles,
          mass_g: produceMass,
          volume_ml: undefined,
          concentration_M: p.phase === 'aq' && vessel.volume_ml > 0 ? produceMoles / (vessel.volume_ml / 1000) : undefined,
          state: p.phase,
          phase: p.phase
        });
      }
    }
  }

  // Recalculate concentration_M for aqueous species based on current vessel volume
  if (vessel.volume_ml && vessel.volume_ml > 0) {
    const vol_L = vessel.volume_ml / 1000.0;
    for (const item of currentContents) {
      if (item.state !== 's' && item.phase !== 's') {
        item.concentration_M = item.moles / vol_L;
      }
    }
  }

  // Enthalpy is per mole of reaction with coefficients exactly as written.
  const heat_J = Number.isFinite(program.chemistry.deltaH_kJ_per_mol)
    ? -(program.chemistry.deltaH_kJ_per_mol ?? 0) * 1000 * molesOfReaction : 0;
  const newMass_g = Math.max(0, vessel.mass_g - escapedGas_g);

  // 5. Update liquid color via Beer-Lambert
  const afterColor = program.visual.after.liquidColor;
  const equilibrium = solveAqueousEquilibrium(currentContents, vessel.volume_ml);
  const ph = equilibrium?.ph ?? vessel.ph;
  const dyeColor = equilibrium ? solutionIndicatorColor(currentContents, ph) : null;
  const observedIndicator = program.chemistry.representation === 'indicator' ? indicatorColor(program.id, ph) : null;
  const newColor = dyeColor ?? observedIndicator ?? calculateBeerLambertColor(currentContents, vessel.volume_ml || 50, afterColor);

  const state: Partial<VesselState> = {
    contents: currentContents,
    escapedGas_g: escapedByFormula,
    hasPrecipitate: currentContents.some(item => item.phase === 's' && item.formula === precipitateSubstance && item.moles > 1e-12),
    precipitateColor: precipitateColor || program.visual.after.precipitate?.color,
    precipitateSubstance: precipitateSubstance || program.visual.after.precipitate?.substance,
    precipitateMorphology: precipitateMorphology || (program.visual.after.precipitate?.morphology as any),
    precipitateAmount_g: currentContents.filter(item => item.phase === 's' && item.formula === precipitateSubstance).reduce((sum, item) => sum + item.mass_g, 0),
    hasGas: hasGas || (molesOfReaction > 0 && products.some(p => p.phase === 'g')),
    gasColor: gasColor || (program.visual.after.gasesOffgassed[0] ? GAS_SPECIES_TABLE[program.visual.after.gasesOffgassed[0].species as GasSpecies]?.colorHex : undefined),
    liquidColor: newColor,
    ph,
    phModel: equilibrium ? 'ideal_aqueous_25c' : undefined,
    temperature_c: vessel.temperature_c,
    programHeatApplied_J: (vessel.programHeatApplied_J ?? 0) + heat_J,
    mass_g: newMass_g,
  };
  const thermal = options.deferThermal ? {} : applyThermalEnergy({ ...vessel, ...state }, heat_J);
  return { ...state, ...thermal, internalPressure_atm: sealedGasPressure({ ...vessel, ...state, ...thermal }) };
}
