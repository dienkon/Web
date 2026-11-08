/**
 * Deterministic Stoichiometric, Multi-Stage Equilibrium, and Instant Rule-Derived Reaction Engine
 * Core scientific simulator strictly decoupled from UI and animation.
 * Achieves full parity with lab-3d's 5-tier reaction resolution architecture.
 */

import {
  SubstanceQuantity,
  SimulationResult,
  ReactionExecutionRecord,
} from '../../types/chemistry';
import { getReactionCandidates, REACTION_DATABASE } from './reactionDatabase';
import { normalizeFormula, computeMolarMass } from '../core/formula';
import { calculateSolutionPh, getIndicatorColor } from '../equilibrium/acidBase';
import { calculateReactionDeltaT } from '../thermodynamics/calorimetry';
import { calculateBeerLambertColor } from '../core/ledger';
import {
  resolveInstantRulesAndEquilibria,
  buildPhysicalSolidAndPrecipitateStates,
  resolveControllerIdForReaction,
} from './instantRuleSolver';

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
  let gasInfoFinal = undefined as SimulationResult['gasInfo'];

  // Maximum passes to prevent infinite cycles while supporting multi-stage cascades
  // (e.g. CuSO4 + 2NH3 -> Cu(OH)2, then Cu(OH)2 + 4NH3 -> [Cu(NH3)4]2+)
  const MAX_CYCLES = 6;
  let cycle = 0;

  while (cycle < MAX_CYCLES) {
    cycle++;
    let matchedReactionThisPass = false;

    const candidateFormulas = workingContents
      .filter(content => content.moles > 1e-6)
      .map(content => content.formula);
    const candidateReactions = getReactionCandidates(candidateFormulas);

    for (const rx of candidateReactions) {
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
          existing.state = p.state;
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

        // Handle gas emission
        if (p.state === 'g') {
          hasGasOccurred = true;
          const prevMoles = gasInfoFinal ? gasInfoFinal.molesReleased : 0;
          gasInfoFinal = {
            formula: p.formula,
            molesReleased: prevMoles + molesAdded,
            effervescenceSpeed: rx.visual.gas?.effervescenceSpeed || 'vigorous',
            colorHex: rx.visual.gas?.colorHex,
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

      const controllerId =
        rx.controllerId ||
        resolveControllerIdForReaction(rx.id, rx.visual.gas?.formula, rx.visual.precipitate?.formula);

      reactionsOccurred.push({
        reactionId: rx.id,
        name_en: rx.name_en,
        name_vi: rx.name_vi,
        equation: rx.equation,
        ionic_equation: rx.ionic_equation,
        extent_moles: Math.round(xi * 100000) / 100000,
        heatReleased_J: thermalResult.heatReleased_J,
        limitingReactant: limitingReactantFormula,
        excessReactants,
        observable_en: rx.observable_en,
        observable_vi: rx.observable_vi,
        tier: 'handcrafted',
        archetype: rx.archetype,
        controllerId,
      });

      matchedReactionThisPass = true;
      break; // Restart loop to check next cascade reactions
    }

    if (!matchedReactionThisPass) break;
  }

  // --- TIER 1 MULTI-STAGE EQUILIBRIA & TIER 2 INSTANT RULE-DERIVED SOLVER ---
  const ruleOutput = resolveInstantRulesAndEquilibria(
    workingContents,
    reactionsOccurred,
    volume_ml,
    temp_c,
    isHeated,
    isOpenVessel
  );
  temp_c = ruleOutput.temperature_c;
  if (ruleOutput.isBoiling) isBoiling = true;
  if (ruleOutput.hasGas && ruleOutput.gasInfo) {
    hasGasOccurred = true;
    gasInfoFinal = ruleOutput.gasInfo;
  }

  // Also keep general acid-base neutralization fallback if still no reaction matched
  if (ruleOutput.reactionsOccurred.length === 0 && workingContents.length >= 2) {
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

        const waterItem = workingContents.find(c => normalizeFormula(c.formula) === 'H2O');
        if (waterItem) {
          waterItem.moles += extentM;
          waterItem.mass_g = waterItem.moles * 18.015;
        }

        const solutionMass = Math.max(10.0, volume_ml);
        const thermalResult = calculateReactionDeltaT(extentM, -57.1, solutionMass, temp_c);
        temp_c = thermalResult.finalTemp_c;
        if (thermalResult.isBoiling) isBoiling = true;

        ruleOutput.activeControllerIds.push('neutralization_thermal_schlieren');
        ruleOutput.reactionsOccurred.push({
          reactionId: `rx_heuristic_neutralization_${Date.now()}`,
          name_en: `Neutralization of ${acidItem.formula} and ${baseItem.formula}`,
          name_vi: `Phản ứng trung hòa giữa ${acidItem.formula} và ${baseItem.formula}`,
          equation: `${acidItem.formula} + ${baseItem.formula} → Muối + H₂O`,
          ionic_equation: 'H⁺(aq) + OH⁻(aq) → H₂O(l)',
          extent_moles: Math.round(extentM * 10000) / 10000,
          heatReleased_J: thermalResult.heatReleased_J,
          limitingReactant: availableH < availableOH ? acidItem.formula : baseItem.formula,
          excessReactants: {
            [acidItem.formula]: acidItem.moles,
            [baseItem.formula]: baseItem.moles,
          },
          observable_en: `Exothermic neutralization between ${acidItem.formula} and ${baseItem.formula}.`,
          observable_vi: `Phản ứng trung hòa tỏa nhiệt giữa ${acidItem.formula} và ${baseItem.formula}.`,
          tier: 'rule-derived',
          archetype: 'acid_base_neutralization',
          controllerId: 'neutralization_thermal_schlieren',
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

  // Check precipitate existence among solid products (excluding discrete metal chunks)
  let hasPrecipitate = false;
  let precipitateInfo: SimulationResult['precipitateInfo'] = ruleOutput.precipitateOverride;

  if (!precipitateInfo) {
    for (const item of updatedContents) {
      const norm = normalizeFormula(item.formula);
      if (['FE', 'ZN', 'MG', 'CU', 'AL', 'NA', 'K', 'CA'].includes(norm)) continue;
      if (item.state === 's' && item.mass_g > 0.001) {
        hasPrecipitate = true;
        const matchedRx = REACTION_DATABASE.find(r =>
          r.products.some(p => p.state === 's' && normalizeFormula(p.formula) === norm)
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
  } else {
    hasPrecipitate = true;
  }

  // Build physical solid chunks (Fe nail, Zn granule, Mg ribbon, CaCO3 chips, Na/K floating pellets)
  // and Stokes-settling precipitate layers
  const { solidChunks, precipitateLayers } = buildPhysicalSolidAndPrecipitateStates(
    updatedContents,
    ruleOutput.surfacePlating,
    precipitateInfo
  );

  // Determine liquid color (taking indicators, complexes, redox, and thermochromism into account)
  let finalLiquidColorHex = calculateBeerLambertColor(updatedContents, volume_ml, '#f8fafc');

  const hasPhenol = initialContents.some(c => c.formula.toLowerCase().includes('phenolphthalein'));
  const hasLitmus = initialContents.some(c => c.formula.toLowerCase().includes('litmus'));
  const hasUniversal = initialContents.some(c => c.formula.toLowerCase().includes('universal'));
  const hasMethylOrange = initialContents.some(
    c => c.formula.toLowerCase().includes('methyl_orange') || c.formula.toLowerCase().includes('methyl')
  );
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
  const hasIodine = updatedContents.some(
    c => (c.formula.toUpperCase() === 'I2' || c.formula.toUpperCase() === 'I3-') && c.moles > 1e-5
  );
  if (hasStarch && hasIodine) {
    if (temp_c >= 60.0) {
      finalLiquidColorHex = '#fef08a'; // Pale yellow free iodine upon thermal dissociation
    } else {
      finalLiquidColorHex = '#1e1b4b'; // Deep midnight blue-black complex
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

  // Emerald green solution when Cu reacts with conc. HNO3
  if (ruleOutput.reactionsOccurred.some(r => r.reactionId.includes('cu_hno3'))) {
    finalLiquidColorHex = '#059669'; // Emerald green Cu(NO3)2 in conc. acid
  }

  // Permanganate deep purple color if KMnO4 remains
  const kmno4Item = updatedContents.find(c => normalizeFormula(c.formula) === 'KMNO4' && c.moles > 1e-5);
  if (kmno4Item) {
    finalLiquidColorHex = '#701a75'; // Royal purple
  }

  // Dichromate / Chromate pH equilibrium color
  const cr2o7Item = updatedContents.find(
    c => normalizeFormula(c.formula) === 'K2CR2O7' || c.formula.includes('Cr2O7')
  );
  const cro4Item = updatedContents.find(
    c => normalizeFormula(c.formula) === 'K2CRO4' || c.formula.includes('CrO4')
  );
  if (cr2o7Item && finalPh < 6.5) {
    finalLiquidColorHex = '#ea580c'; // Orange dichromate
  } else if (cro4Item || (cr2o7Item && finalPh >= 6.5)) {
    finalLiquidColorHex = '#facc15'; // Yellow chromate
  }

  // Characteristic flame test emission detection when heated over flame
  let flameTestColorHex: string | undefined = undefined;
  const hasCu = updatedContents.some(c => c.formula.toUpperCase().includes('CU') && c.moles > 1e-5);
  const hasNa = updatedContents.some(c => c.formula.toUpperCase().includes('NA') && c.moles > 1e-5);
  const hasK = updatedContents.some(
    c => c.formula.toUpperCase().includes('K') && c.moles > 1e-5 && normalizeFormula(c.formula) !== 'H2O'
  );
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
    turbidity = Math.max(turbidity, 0.92);
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
  const hasSilverMirror = ruleOutput.reactionsOccurred.some(
    r => r.reactionId.includes('silver_mirror') || r.reactionId.includes('tollens')
  );

  // Check for immiscible phase separation (e.g. ester layer floating on water)
  const esterItem = updatedContents.find(
    c => c.formula.toUpperCase().includes('CH3COOC2H5') || c.formula.toUpperCase().includes('EST')
  );
  const hasPhaseSeparation = Boolean(esterItem && esterItem.mass_g > 0.05 && volume_ml > 5);
  const organicLayerVolume_ml = hasPhaseSeparation
    ? Math.max(3, Math.min(volume_ml * 0.45, esterItem!.mass_g / 0.9))
    : undefined;

  // Check for fumes / smoke effects
  let hasFumes = false;
  let fumeType: 'steam' | 'no2' | 'nh4cl' | 'iodine' | undefined = undefined;
  let fumeColorHex = '#cbd5e1';

  if (ruleOutput.hasSublimation) {
    hasFumes = true;
    fumeType = 'iodine';
    fumeColorHex = ruleOutput.sublimationColorHex || '#9333ea';
  } else if (gasInfoFinal?.formula === 'NO2') {
    hasFumes = true;
    fumeType = 'no2';
    fumeColorHex = '#b45309'; // Red-brown NO2 gas
  } else if (ruleOutput.reactionsOccurred.some(r => r.reactionId === 'rx_nh3_hcl_smoke')) {
    hasFumes = true;
    fumeType = 'nh4cl';
    fumeColorHex = '#ffffff'; // Dense white smoke
  } else if (isBoiling || temp_c >= 75.0) {
    hasFumes = true;
    fumeType = 'steam';
    fumeColorHex = '#e2e8f0'; // Steam wisps
  }

  const isExplosion =
    Boolean(ruleOutput.isExplosion) ||
    ruleOutput.reactionsOccurred.some(
      r => r.reactionId === 'rx_na_water_reaction' || r.reactionId === 'rx_sodium_water_pyrotechnic'
    );
  const isDangerous =
    Boolean(ruleOutput.isDangerous) ||
    isExplosion ||
    ruleOutput.reactionsOccurred.some(r => r.reactionId.includes('dangerous') || r.reactionId.includes('na_water'));

  return {
    reactionsOccurred: ruleOutput.reactionsOccurred,
    updatedContents,
    finalTemperature_c: temp_c,
    finalPh,
    finalLiquidColorHex,
    hasPrecipitate,
    precipitateInfo,
    precipitateLayers,
    solidChunks,
    hasGas: hasGasOccurred,
    gasInfo: gasInfoFinal,
    isBoiling,
    isExplosion,
    isDangerous,
    warning_en: ruleOutput.warning_en,
    warning_vi: ruleOutput.warning_vi,
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
    activeControllerIds: ruleOutput.activeControllerIds,
    surfacePlating: ruleOutput.surfacePlating,
    hasSublimation: ruleOutput.hasSublimation,
    sublimationColorHex: ruleOutput.sublimationColorHex,
  };
}
