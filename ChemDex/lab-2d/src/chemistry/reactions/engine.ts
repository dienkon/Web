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
        name_en: rx.name_en,
        name_vi: rx.name_vi,
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

  // --- INSTANT HEURISTIC RULE-BASED SOLVER ---
  // If no predefined reaction was matched, but multiple active reagents meet,
  // resolve instantly by fundamental inorganic chemistry rules (Acid-Base, Precipitation, Gas evolution).
  if (reactionsOccurred.length === 0 && workingContents.length >= 2) {
    // 1. General Acid-Base Neutralization
    const acidFormulas: Record<string, { norm: string; protons: number; conjugate: string }> = {
      'HCL': { norm: 'HCL', protons: 1, conjugate: 'CL' },
      'HNO3': { norm: 'HNO3', protons: 1, conjugate: 'NO3' },
      'H2SO4': { norm: 'H2SO4', protons: 2, conjugate: 'SO4' },
      'CH3COOH': { norm: 'CH3COOH', protons: 1, conjugate: 'CH3COO' },
    };
    const baseFormulas: Record<string, { norm: string; hydroxides: number; cation: string }> = {
      'NAOH': { norm: 'NAOH', hydroxides: 1, cation: 'NA' },
      'KOH': { norm: 'KOH', hydroxides: 1, cation: 'K' },
      'BA(OH)2': { norm: 'BA(OH)2', hydroxides: 2, cation: 'BA' },
      'CA(OH)2': { norm: 'CA(OH)2', hydroxides: 2, cation: 'CA' },
      'NH3': { norm: 'NH3', hydroxides: 1, cation: 'NH4' },
    };

    const acidItem = workingContents.find(c => acidFormulas[normalizeFormula(c.formula)] && c.moles > 1e-6);
    const baseItem = workingContents.find(c => baseFormulas[normalizeFormula(c.formula)] && c.moles > 1e-6);

    if (acidItem && baseItem) {
      const aInfo = acidFormulas[normalizeFormula(acidItem.formula)];
      const bInfo = baseFormulas[normalizeFormula(baseItem.formula)];

      const availableH = acidItem.moles * aInfo.protons;
      const availableOH = baseItem.moles * bInfo.hydroxides;
      const extentM = Math.min(availableH, availableOH);

      if (extentM > 1e-6) {
        acidItem.moles = Math.max(0, acidItem.moles - extentM / aInfo.protons);
        acidItem.mass_g = acidItem.moles * computeMolarMass(acidItem.formula);

        baseItem.moles = Math.max(0, baseItem.moles - extentM / bInfo.hydroxides);
        baseItem.mass_g = baseItem.moles * computeMolarMass(baseItem.formula);

        // Water produced
        const waterItem = workingContents.find(c => normalizeFormula(c.formula) === 'H2O');
        if (waterItem) {
          waterItem.moles += extentM;
          waterItem.mass_g = waterItem.moles * 18.015;
        }

        // Exothermic neutralization DeltaH = -57.1 kJ/mol H+
        const solutionMass = Math.max(10.0, volume_ml);
        const thermalResult = calculateReactionDeltaT(extentM, -57.1, solutionMass, temp_c);
        temp_c = thermalResult.finalTemp_c;
        if (thermalResult.isBoiling) isBoiling = true;

        reactionsOccurred.push({
          reactionId: `rx_heuristic_neutralization_${Date.now()}`,
          name_en: `Neutralization of ${acidItem.formula} and ${baseItem.formula}`,
          name_vi: `Phản ứng trung hòa giữa ${acidItem.formula} và ${baseItem.formula}`,
          equation: `${acidItem.formula} + ${baseItem.formula} → Muối + H₂O`,
          extent_moles: Math.round(extentM * 10000) / 10000,
          heatReleased_J: thermalResult.heatReleased_J,
          limitingReactant: availableH < availableOH ? acidItem.formula : baseItem.formula,
          excessReactants: {
            [acidItem.formula]: acidItem.moles,
            [baseItem.formula]: baseItem.moles,
          },
          observable_en: `Exothermic neutralization between ${acidItem.formula} and ${baseItem.formula}.`,
          observable_vi: `Phản ứng trung hòa tỏa nhiệt giữa ${acidItem.formula} và ${baseItem.formula}.`,
        });
      }
    }
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

  // Determine liquid color (taking indicators, complexes, redox, and thermochromism into account)
  let finalLiquidColorHex = calculateBeerLambertColor(updatedContents, volume_ml, '#f8fafc');

  const hasPhenol = initialContents.some(c => c.formula.toLowerCase().includes('phenolphthalein'));
  const hasLitmus = initialContents.some(c => c.formula.toLowerCase().includes('litmus'));
  const hasUniversal = initialContents.some(c => c.formula.toLowerCase().includes('universal'));
  const hasMethylOrange = initialContents.some(c => c.formula.toLowerCase().includes('methyl_orange') || c.formula.toLowerCase().includes('methyl'));
  const hasThymolphthalein = initialContents.some(c => c.formula.toLowerCase().includes('thymolphthalein'));

  if (hasPhenol) {
    finalLiquidColorHex = getIndicatorColor('phenolphthalein', finalPh);
  } else if (hasLitmus) {
    finalLiquidColorHex = getIndicatorColor('litmus', finalPh);
  } else if (hasMethylOrange) {
    finalLiquidColorHex = getIndicatorColor('methyl_orange', finalPh);
  } else if (hasThymolphthalein) {
    finalLiquidColorHex = getIndicatorColor('thymolphthalein', finalPh);
  } else if (hasUniversal) {
    finalLiquidColorHex = getIndicatorColor('universal', finalPh);
  }

  // Starch-Iodine complex thermochromism
  const hasStarch = updatedContents.some(c => c.formula.toLowerCase().includes('starch') && c.moles > 1e-5);
  const hasIodine = updatedContents.some(c => (c.formula.toUpperCase() === 'I2' || c.formula.toUpperCase() === 'I3-') && c.moles > 1e-5);
  if (hasStarch && hasIodine) {
    if (temp_c >= 60.0) {
      // Reversible thermal dissociation of helical amylose-iodine complex
      finalLiquidColorHex = '#fef08a'; // Pale yellow free iodine
    } else {
      finalLiquidColorHex = '#1e1b4b'; // Deep dark blue-black complex
    }
  }

  // Iron(III) thiocyanate deep blood red complex [Fe(SCN)]2+ / Fe(SCN)3
  const hasFeSCNComplex = updatedContents.some(
    c => (c.formula.toUpperCase().includes('FE(SCN)') || c.formula.toUpperCase() === 'FE(SCN)3') && c.moles > 1e-5
  );
  if (hasFeSCNComplex) {
    finalLiquidColorHex = '#7f1d1d'; // Blood red
  }

  // Tetraamminecopper(II) complex [Cu(NH3)4]2+ royal azure blue
  const hasCuAmmonia = updatedContents.some(c => c.formula.toUpperCase().includes('CU(NH3)4') && c.moles > 1e-5);
  if (hasCuAmmonia) {
    finalLiquidColorHex = '#1d4ed8'; // Royal azure blue
  }

  // Copper-glycerol deep blue chelate complex
  const hasCuGlycerol = updatedContents.some(c => c.formula.toUpperCase().includes('CU(C3H7O3)2') && c.moles > 1e-5);
  if (hasCuGlycerol) {
    finalLiquidColorHex = '#2563eb'; // Deep blue
  }

  // Permanganate deep purple color if KMnO4 remains
  const kmno4Item = updatedContents.find(c => normalizeFormula(c.formula) === 'KMNO4' && c.moles > 1e-5);
  if (kmno4Item) {
    finalLiquidColorHex = '#701a75'; // Royal purple
  }

  // Dichromate / Chromate pH equilibrium color
  const cr2o7Item = updatedContents.find(c => normalizeFormula(c.formula) === 'K2CR2O7' || c.formula.includes('Cr2O7'));
  const cro4Item = updatedContents.find(c => normalizeFormula(c.formula) === 'K2CRO4' || c.formula.includes('CrO4'));
  if (cr2o7Item && finalPh < 6.5) {
    finalLiquidColorHex = '#ea580c'; // Orange dichromate
  } else if (cro4Item || (cr2o7Item && finalPh >= 6.5)) {
    finalLiquidColorHex = '#facc15'; // Yellow chromate
  }

  // Characteristic flame test emission detection when heated over flame
  let flameTestColorHex: string | undefined = undefined;
  const hasCu = updatedContents.some(c => c.formula.toUpperCase().includes('CU') && c.moles > 1e-5);
  const hasNa = updatedContents.some(c => c.formula.toUpperCase().includes('NA') && c.moles > 1e-5);
  const hasK = updatedContents.some(c => c.formula.toUpperCase().includes('K') && c.moles > 1e-5 && normalizeFormula(c.formula) !== 'H2O');
  const hasBa = updatedContents.some(c => c.formula.toUpperCase().includes('BA') && c.moles > 1e-5);
  const hasCa = updatedContents.some(c => c.formula.toUpperCase().includes('CA') && c.moles > 1e-5);

  if (hasCu) {
    flameTestColorHex = '#10b981'; // Emerald green flame
  } else if (hasNa) {
    flameTestColorHex = '#eab308'; // Intense persistent yellow-orange flame
  } else if (hasK) {
    flameTestColorHex = '#c084fc'; // Lilac / violet flame
  } else if (hasBa) {
    flameTestColorHex = '#84cc16'; // Pale apple green flame
  } else if (hasCa) {
    flameTestColorHex = '#f97316'; // Brick-red flame
  }

  // Turbidity / milkiness index
  let turbidity = 0;
  if (hasPrecipitate && precipitateInfo) {
    turbidity = precipitateInfo.morphology === 'milky' || precipitateInfo.morphology === 'floc' ? 0.85 : 0.65;
  }
  const hasColloidalSulfur = updatedContents.some(c => normalizeFormula(c.formula) === 'S' && c.state === 's');
  if (hasColloidalSulfur) {
    turbidity = Math.max(turbidity, 0.9);
  }

  // Foam head / froth height (mm) on meniscus
  let foamHead_mm = 0;
  if (hasGasOccurred) {
    if (gasInfoFinal?.effervescenceSpeed === 'instant' || gasInfoFinal?.effervescenceSpeed === 'vigorous') {
      foamHead_mm = 7.5;
    } else {
      foamHead_mm = 3.0;
    }
  }

  // Tollen's test silver mirror coat
  const hasSilverMirror = reactionsOccurred.some(r => r.reactionId.includes('silver_mirror') || r.reactionId.includes('tollens'));

  // Check for immiscible phase separation (e.g. ester layer floating on water)
  const esterItem = updatedContents.find(
    c => c.formula.toUpperCase().includes('CH3COOC2H5') || c.formula.toUpperCase().includes('EST')
  );
  const hasPhaseSeparation = Boolean(esterItem && esterItem.mass_g > 0.05 && volume_ml > 5);
  const organicLayerVolume_ml = hasPhaseSeparation
    ? Math.max(3, Math.min(volume_ml * 0.45, (esterItem!.mass_g / 0.9)))
    : undefined;

  // Check for fumes / smoke effects
  let hasFumes = false;
  let fumeType: 'steam' | 'no2' | 'nh4cl' | 'iodine' | undefined = undefined;
  let fumeColorHex = '#cbd5e1';

  if (gasInfoFinal?.formula === 'NO2') {
    hasFumes = true;
    fumeType = 'no2';
    fumeColorHex = '#b45309'; // Red-brown NO2 gas
  } else if (reactionsOccurred.some(r => r.reactionId === 'rx_nh3_hcl_smoke')) {
    hasFumes = true;
    fumeType = 'nh4cl';
    fumeColorHex = '#ffffff'; // Dense white smoke
  } else if (isBoiling || temp_c >= 75.0) {
    hasFumes = true;
    fumeType = 'steam';
    fumeColorHex = '#e2e8f0'; // Steam wisps
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
    isExplosion: reactionsOccurred.some(r => r.reactionId === 'rx_na_water_reaction'),
    isDangerous: reactionsOccurred.some(r => r.reactionId.includes('dangerous') || r.reactionId.includes('na_water')),
    hasPhaseSeparation,
    organicLayerVolume_ml,
    organicLayerColorHex: '#f8fafc',
    hasFumes,
    fumeType,
    fumeColorHex,
    turbidity,
    foamHead_mm,
    flameTestColorHex,
    hasSilverMirror,
  };
}

