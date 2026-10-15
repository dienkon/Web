/**
 * Deterministic Stoichiometric and Equilibrium Reaction Engine
 * Core scientific simulator strictly decoupled from UI and animation.
 */

import {
  SubstanceQuantity,
  SimulationResult,
  ReactionExecutionRecord,
  PrecipitateMorphology,
} from '../../types/chemistry';
import { REACTION_DATABASE } from './reactionDatabase';
import { normalizeFormula, computeMolarMass } from '../core/formula';
import { calculateSolutionPh, getIndicatorColor, IndicatorType } from '../equilibrium/acidBase';
import { calculateReactionDeltaT } from '../thermodynamics/calorimetry';
import { calculateBeerLambertColor } from '../core/ledger';

export function runSimulationCycle(
  initialContents: SubstanceQuantity[],
  volume_ml: number,
  currentTemp_c = 25.0,
  isHeated = false,
  isOpenVessel = true
): SimulationResult {
  // Deep clone initial working contents
  const workingContents: SubstanceQuantity[] = initialContents.map(c => ({
    ...c,
    moles: c.moles,
    mass_g: c.mass_g,
  }));

  const reactionsOccurred: ReactionExecutionRecord[] = [];
  let temp_c = currentTemp_c;
  let isBoiling = false;
  let hasGasOccurred = false;
  let gasInfoFinal: { formula: string; molesReleased: number; effervescenceSpeed: 'slow' | 'vigorous' | 'instant' } | undefined = undefined;

  // Maximum passes to prevent infinite cycles
  const MAX_CYCLES = 5;
  let cycle = 0;

  while (cycle < MAX_CYCLES) {
    cycle++;
    let matchedReactionThisPass = false;

    for (const rx of REACTION_DATABASE) {
      // Check temperature / heating prerequisites
      if (rx.requiresHeating && !isHeated && temp_c < (rx.minTemp_c || 60)) {
        continue;
      }

      // Check if all reactants are present in sufficient quantities
      let canReact = true;
      let minExtent = Infinity;
      let limitingReactantFormula = '';

      for (const r of rx.reactants) {
        const normR = normalizeFormula(r.formula);
        const available = workingContents.find(
          c => normalizeFormula(c.formula) === normR && c.moles > 1e-6
        );

        if (!available) {
          canReact = false;
          break;
        }

        const maxPossibleExtent = available.moles / r.coefficient;
        if (maxPossibleExtent < minExtent) {
          minExtent = maxPossibleExtent;
          limitingReactantFormula = available.formula;
        }
      }

      if (!canReact || minExtent <= 1e-6 || minExtent === Infinity) {
        continue;
      }

      // Execute stoichiometric conversion by extent xi = minExtent
      const xi = minExtent;

      // Deduct reactants
      const excessReactants: Record<string, number> = {};
      for (const r of rx.reactants) {
        const normR = normalizeFormula(r.formula);
        const item = workingContents.find(c => normalizeFormula(c.formula) === normR)!;
        const molesConsumed = xi * r.coefficient;
        item.moles = Math.max(0, item.moles - molesConsumed);
        const molarMass = computeMolarMass(item.formula);
        item.mass_g = Math.max(0, item.moles * molarMass);
        excessReactants[item.formula] = item.moles;
      }

      // Add products
      for (const p of rx.products) {
        const molesAdded = xi * p.coefficient;
        const normP = normalizeFormula(p.formula);
        const molarMass = computeMolarMass(p.formula);
        const existing = workingContents.find(c => normalizeFormula(c.formula) === normP);

        if (existing) {
          existing.moles += molesAdded;
          existing.mass_g = existing.moles * molarMass;
          if (p.state === 'aq' && volume_ml > 0) {
            existing.concentration_M = existing.moles / (volume_ml / 1000.0);
          }
        } else {
          workingContents.push({
            formula: p.formula,
            moles: molesAdded,
            mass_g: molesAdded * molarMass,
            state: p.state,
            concentration_M: p.state === 'aq' && volume_ml > 0 ? molesAdded / (volume_ml / 1000.0) : undefined,
          });
        }

        // Handle gas emission from open vessel
        if (p.state === 'g') {
          hasGasOccurred = true;
          gasInfoFinal = {
            formula: p.formula,
            molesReleased: molesAdded,
            effervescenceSpeed: rx.visual.gas?.effervescenceSpeed || 'vigorous',
          };

          if (isOpenVessel) {
            // In an open vessel, evolved gas leaves the vessel contents
            const gasItem = workingContents.find(c => normalizeFormula(c.formula) === normP);
            if (gasItem) {
              gasItem.moles = 0;
              gasItem.mass_g = 0;
            }
          }
        }
      }

      // Thermal calculations
      const solutionMass = Math.max(10.0, volume_ml);
      const thermalResult = calculateReactionDeltaT(xi, rx.deltaH_kJ_mol, solutionMass, temp_c);
      temp_c = thermalResult.finalTemp_c;
      if (thermalResult.isBoiling) isBoiling = true;

      reactionsOccurred.push({
        reactionId: rx.id,
        equation: rx.equation,
        extent_moles: Math.round(xi * 100000) / 100000,
        heatReleased_J: thermalResult.heatReleased_J,
        limitingReactant: limitingReactantFormula,
        excessReactants,
        observable_en: rx.observable_en,
        observable_vi: rx.observable_vi,
      });

      matchedReactionThisPass = true;
      break; // Restart loop to check next cascade reactions
    }

    if (!matchedReactionThisPass) break;
  }

  // Filter out completely consumed species (except water solvent)
  const updatedContents = workingContents
    .filter(c => c.moles > 1e-6 || normalizeFormula(c.formula) === 'H2O')
    .map(c => {
      const conc = volume_ml > 0 && c.state === 'aq' ? c.moles / (volume_ml / 1000.0) : c.concentration_M;
      return {
        ...c,
        moles: Math.round(c.moles * 10000) / 10000,
        mass_g: Math.round(c.mass_g * 1000) / 1000,
        concentration_M: conc !== undefined ? Math.round(conc * 1000) / 1000 : undefined,
      };
    });

  // Calculate final solution pH
  const finalPh = calculateSolutionPh(updatedContents, volume_ml);

  // Check precipitate existence among solid products
  let hasPrecipitate = false;
  let precipitateInfo: SimulationResult['precipitateInfo'] = undefined;

  for (const item of updatedContents) {
    if (item.state === 's' && item.mass_g > 0.001) {
      hasPrecipitate = true;
      // Find matching visual morphology from database
      const matchedRx = REACTION_DATABASE.find(r =>
        r.products.some(p => p.state === 's' && normalizeFormula(p.formula) === normalizeFormula(item.formula))
      );
      precipitateInfo = {
        formula: item.formula,
        colorHex: matchedRx?.visual.precipitate?.colorHex || '#ffffff',
        mass_g: item.mass_g,
        morphology: matchedRx?.visual.precipitate?.morphology || 'powder',
      };
      break;
    }
  }

  // Determine liquid color (taking indicators into account)
  let finalLiquidColorHex = calculateBeerLambertColor(updatedContents, volume_ml, '#f8fafc');

  const hasPhenol = initialContents.some(c => c.formula.toLowerCase().includes('phenolphthalein'));
  const hasLitmus = initialContents.some(c => c.formula.toLowerCase().includes('litmus'));
  const hasUniversal = initialContents.some(c => c.formula.toLowerCase().includes('universal'));

  if (hasPhenol) {
    finalLiquidColorHex = getIndicatorColor('phenolphthalein', finalPh);
  } else if (hasLitmus) {
    finalLiquidColorHex = getIndicatorColor('litmus', finalPh);
  } else if (hasUniversal) {
    finalLiquidColorHex = getIndicatorColor('universal', finalPh);
  }

  return {
    reactionsOccurred,
    updatedContents,
    finalTemperature_c: temp_c,
    finalPh,
    finalLiquidColorHex,
    hasPrecipitate,
    precipitateInfo,
    hasGas: hasGasOccurred,
    gasInfo: gasInfoFinal,
    isBoiling,
    isExplosion: false,
    isDangerous: false,
  };
}
