/**
 * Deterministic Stoichiometric, Multi-Stage Equilibrium, and Instant Rule-Derived Reaction Engine
 * Core scientific simulator strictly decoupled from UI and animation.
 * Achieves full parity with lab-3d's 5-tier reaction resolution architecture.
 */

import { ReactionDefinition, SubstanceQuantity, SimulationResult, ReactionExecutionRecord } from '../../types/chemistry';
import { getReactionCandidates, REACTION_DATABASE } from './reactionDatabase';
import { getCompiledReactionCandidates } from './curriculumAndCatalogCompiler';
import { normalizeFormula, computeMolarMass } from '../core/formula';
import { calculateSolutionPh, getIndicatorColor } from '../equilibrium/acidBase';
import { calculateReactionDeltaT } from '../thermodynamics/calorimetry';
import { calculateMixtureOptics, computeLiquidOpacity } from '../optics/liquidOptics';
import { computeIndicatorAbsorbanceRGB } from '../optics/indicatorAppearance';
import { calculateMixturePhysicalProperties } from '../physical/substanceProps';
import {
  resolveInstantRulesAndEquilibria,
  resolveExtendedCatalogFamilies,
  buildPhysicalSolidAndPrecipitateStates,
  resolveControllerIdForReaction,
} from './instantRuleSolver';

export function runSimulationCycle(
  initialContents: SubstanceQuantity[],
  volume_ml: number,
  currentTemp_c = 25.0,
  isHeated = false,
  isOpenVessel = true,
  options?: {
    oxygenFraction?: number;
    initialSolidMassByFormula?: Record<string, number>;
  }
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
  const escapedGas_g: Record<string, number> = {};
  const supportsCombustion = (options?.oxygenFraction ?? 0.2095) >= 0.12;

  // Maximum passes to prevent infinite cycles while supporting multi-stage cascades
  // (e.g. CuSO4 + 2NH3 -> Cu(OH)2, then Cu(OH)2 + 4NH3 -> [Cu(NH3)4]2+)
const FORMULA_CANONICAL_ALIAS: Record<string, string> = {
  STARCH: 'TINHBOT',
  C6H10O5: 'TINHBOT',
  'C3H5(OH)3': 'C3H8O3',
  CH3CH2OH: 'C2H5OH',
  '(CU(NH3)4)SO4': 'CU(NH3)4SO4',
};

function canonicalFormulaKey(formula: string): string {
  const norm = normalizeFormula(formula).replace(/\[/g, '(').replace(/\]/g, ')');
  return FORMULA_CANONICAL_ALIAS[norm] ?? norm;
}

function getEffectiveAcidMolarity(item: SubstanceQuantity, currentVolume_ml: number): number {
  if (typeof item.concentration_M === 'number' && item.concentration_M > 0) {
    return item.concentration_M;
  }
  if (currentVolume_ml > 1e-4) {
    return item.moles / (currentVolume_ml / 1000);
  }
  return 1.0;
}
  const MAX_CYCLES = 6;

  const tryExecuteReactionPass = (
    fetchCandidates: (formulas: string[]) => ReactionDefinition[],
    ignoreSignatures?: Set<string>
  ) => {
    let cycle = 0;
    while (cycle < MAX_CYCLES) {
      cycle++;
      let matchedReactionThisPass = false;

      const candidateFormulas = workingContents
        .filter(content => content.moles > 1e-6)
        .flatMap(content => {
          const canon = canonicalFormulaKey(content.formula);
          const reverseAliases =
            canon === 'TINHBOT'
              ? ['Starch', 'TinhBot', 'C6H10O5']
              : canon === 'C3H8O3'
                ? ['C3H8O3', 'C3H5(OH)3']
                : canon === 'CU(NH3)4SO4'
                  ? ['Cu(NH3)4SO4', '[Cu(NH3)4]SO4']
                  : [];
          return [content.formula, canon, ...reverseAliases];
        });
      const candidateReactions = fetchCandidates(candidateFormulas);

      for (const rx of candidateReactions) {
        if (ignoreSignatures) {
          const sig = rx.reactants
            .map(r => canonicalFormulaKey(r.formula))
            .sort()
            .join('+');
          if (ignoreSignatures.has(sig)) continue;
        }
        // Check atmospheric oxygen requirement for open-air combustion
        if (!supportsCombustion && (rx.id.includes('combustion') || rx.id.includes('burn'))) {
          continue;
        }
        // Check temperature / heating prerequisites
        if (rx.requiresHeating && !isHeated && temp_c < (rx.minTemp_c || 60)) {
          continue;
        }
        // Check catalytic prerequisites (without consuming catalyst)
        const extRx = rx as { requiresCatalyst?: boolean; catalystFormula?: string };
        if (extRx.requiresCatalyst && extRx.catalystFormula) {
          const catKey = canonicalFormulaKey(extRx.catalystFormula);
          const hasCat = workingContents.some(c => {
            if (c.moles <= 1e-7) return false;
            const k = canonicalFormulaKey(c.formula);
            if (k === catKey) return true;
            if (catKey === 'H2SO4' && (k === 'HCL' || k === 'H2SO4')) return true;
            return false;
          });
          if (!hasCat) {
            continue;
          }
        }
        // Realistic concentration partitioning for Cu + HNO3 (conc NO2 vs dil NO) and Cu + conc H2SO4
        if (rx.id === 'rx_cu_hno3_gas' || rx.id === 'cu_hno3_conc') {
          const hno3 = workingContents.find(c => canonicalFormulaKey(c.formula) === 'HNO3' && c.moles > 1e-6);
          const hasDiluteAlt = candidateReactions.some(c => c.id === 'cu_hno3_dil');
          if (hno3 && hasDiluteAlt && getEffectiveAcidMolarity(hno3, volume_ml) < 5.0) {
            continue;
          }
        }
        if (rx.id === 'cu_conc_h2so4') {
          const h2so4 = workingContents.find(c => canonicalFormulaKey(c.formula) === 'H2SO4' && c.moles > 1e-6);
          if (h2so4 && getEffectiveAcidMolarity(h2so4, volume_ml) < 5.0) {
            continue;
          }
        }
        if (rx.id === 'rx_cuoh2_thermal_decomposition' || rx.id === 'cuoh2_decomp') {
          const hasReducingSugarOrAldehyde = workingContents.some(c => {
            if (c.moles <= 1e-6) return false;
            const k = canonicalFormulaKey(c.formula);
            return k === 'C6H12O6' || k === 'CH3CHO' || k === 'HCHO' || k === 'HCOOH';
          });
          if (hasReducingSugarOrAldehyde) {
            continue;
          }
        }
        // Defer plain catalytic H2O2 decomposition when an acidic/redox H2O2 reaction partner is present (e.g. Landolt Iodine Clock)
        if (rx.id === 'rx_h2o2_decomposition') {
          const keys = new Set(
            workingContents.filter(c => c.moles > 1e-6).map(c => canonicalFormulaKey(c.formula))
          );
          const hasAcid = keys.has('H2SO4') || keys.has('HCL') || keys.has('HNO3');
          const hasClockOrRedoxPartner =
            (hasAcid && (keys.has('KI') || keys.has('KMNO4') || keys.has('FESO4') || keys.has('NA2SO3'))) ||
            keys.has('H2SO3') ||
            keys.has('NA2SO3');
          if (hasClockOrRedoxPartner) {
            continue;
          }
        }

        // Check if all reactants are present in sufficient quantities
        const isOpenCombustionOrSynthesis =
          supportsCombustion &&
          isOpenVessel &&
          (rx.id.includes('combustion') || rx.id.includes('burn') || rx.archetype === 'combustion_flash' || Boolean(rx.requiresHeating && (isHeated || temp_c >= (rx.minTemp_c || 60))));
        let canReact = true;
        let minExtent = Infinity;
        let limitingReactantFormula = '';

        for (const r of rx.reactants) {
          const normR = canonicalFormulaKey(r.formula);
          const available = workingContents.find(
            c => canonicalFormulaKey(c.formula) === normR && c.moles > 1e-6
          );

          if (!available) {
            if (normR === 'O2' && isOpenCombustionOrSynthesis) {
              continue; // Atmospheric O2 supplies open-vessel combustion/oxidation
            }
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
          const normR = canonicalFormulaKey(r.formula);
          const item = workingContents.find(c => canonicalFormulaKey(c.formula) === normR);
          if (!item) continue; // Atmospheric O2 came from open ambient air
          const molesConsumed = xi * r.coefficient;
          item.moles = Math.max(0, item.moles - molesConsumed);
          const molarMass = computeMolarMass(item.formula);
          item.mass_g = Math.max(0, item.moles * molarMass);
          excessReactants[item.formula] = item.moles;
        }

        // Add products (record open-headspace evolved gases without clobbering existing liquid H2O)
        for (const p of rx.products) {
          const molesAdded = xi * p.coefficient;
          const normP = canonicalFormulaKey(p.formula);
          const molarMass = computeMolarMass(p.formula);

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
              const gramsEscaped = molesAdded * molarMass;
              if (gramsEscaped > 1e-8) {
                escapedGas_g[p.formula] = (escapedGas_g[p.formula] ?? 0) + gramsEscaped;
              }
              continue;
            }
          }

          const existing = workingContents.find(
            c => canonicalFormulaKey(c.formula) === normP && (p.state !== 'g' || c.state === 'g')
          );

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
        break;
      }

      if (!matchedReactionThisPass) break;
    }
  };

  // PASS 1: Authoritative Database (Handcrafted + Non-conflicting Curriculum)
  tryExecuteReactionPass(getReactionCandidates);

  // PASS 2: TIER 1 MULTI-STAGE EQUILIBRIA & TIER 2 INSTANT RULE-DERIVED SOLVER
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
  if (ruleOutput.escapedGas_g) {
    for (const [formula, grams] of Object.entries(ruleOutput.escapedGas_g)) {
      escapedGas_g[formula] = (escapedGas_g[formula] ?? 0) + grams;
    }
  }

  // PASS 3: Full 1,300+ Shared Catalog & Curriculum Fallback (skip if waiting on a cold heated reaction like Tollens)
  const presentKeys = new Set(workingContents.filter(c => c.moles > 1e-6).map(c => canonicalFormulaKey(c.formula)));
  const hasWaitingHeatedReaction =
    !isHeated &&
    getReactionCandidates(Array.from(presentKeys)).some(
      rx =>
        rx.requiresHeating &&
        temp_c < (rx.minTemp_c || 60) &&
        rx.reactants.every(r => presentKeys.has(canonicalFormulaKey(r.formula)))
    );

  if (ruleOutput.reactionsOccurred.length === 0 && !hasWaitingHeatedReaction) {
    const reservedCatalogSignatures = new Set(['H2O+K', 'H2O+NA', 'AGNO3+NH3', 'AGNO3+H2O+NH3']);
    tryExecuteReactionPass(getCompiledReactionCandidates, reservedCatalogSignatures);
    if (reactionsOccurred.length > 0) {
      for (const rx of reactionsOccurred) {
        if (!ruleOutput.reactionsOccurred.includes(rx)) {
          ruleOutput.reactionsOccurred.push(rx);
        }
        if (rx.controllerId && !ruleOutput.activeControllerIds.includes(rx.controllerId)) {
          ruleOutput.activeControllerIds.push(rx.controllerId);
        }
      }
    }
  }

  // Fallback rules for general oxide+acid & ammonium+base families when no catalog entry ran
  const extendedOutput = resolveExtendedCatalogFamilies(
    workingContents,
    ruleOutput.reactionsOccurred,
    volume_ml,
    temp_c,
    isHeated,
    isOpenVessel
  );
  temp_c = extendedOutput.temperature_c;
  if (extendedOutput.hasGas && extendedOutput.gasInfo) {
    hasGasOccurred = true;
    gasInfoFinal = extendedOutput.gasInfo;
  }
  for (const [formula, grams] of Object.entries(extendedOutput.escapedGas_g)) {
    escapedGas_g[formula] = (escapedGas_g[formula] ?? 0) + grams;
  }
  for (const cid of extendedOutput.activeControllerIds) {
    if (!ruleOutput.activeControllerIds.includes(cid)) {
      ruleOutput.activeControllerIds.push(cid);
    }
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

  // Filter out completely consumed species (except water solvent & trace indicators)
  const updatedContents = workingContents
    .filter(c => c.moles > 1e-8 || normalizeFormula(c.formula) === 'H2O')
    .map(c => {
      const conc = volume_ml > 0 && c.state === 'aq' ? c.moles / (volume_ml / 1000.0) : c.concentration_M;
      return {
        ...c,
        moles: Math.round(c.moles * 1e7) / 1e7,
        mass_g: Math.round(c.mass_g * 1e5) / 1e5,
        concentration_M: conc !== undefined ? Math.round(conc * 1e6) / 1e6 : undefined,
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

  const physPropsPre = calculateMixturePhysicalProperties(updatedContents, volume_ml, temp_c);

  // Build physical solid chunks (Fe nail, Zn granule, Mg ribbon, CaCO3 chips, Na/K floating pellets)
  // and Stokes-settling / buoyant precipitate layers
  const { solidChunks, precipitateLayers } = buildPhysicalSolidAndPrecipitateStates(
    updatedContents,
    ruleOutput.surfacePlating,
    precipitateInfo,
    {
      fluidDensity_g_ml: physPropsPre.density_g_ml,
      hasGas: hasGasOccurred,
      viscosity_mPa_s: physPropsPre.viscosity_mPa_s,
      initialSolidMassByFormula: options?.initialSolidMassByFormula,
    }
  );

  // Compute spectral Beer-Lambert optics + continuous Henderson-Hasselbalch indicator equilibria
  const baseOptics = calculateMixtureOptics(updatedContents, volume_ml, [0, 0, 0], 4.5, '#f8fafc');
  const indicatorInfo = computeIndicatorAbsorbanceRGB(initialContents.length > 0 ? initialContents : updatedContents, finalPh);
  let finalLiquidColorHex = baseOptics.colorHex;
  let liquidOpacity = baseOptics.opacity;

  if (indicatorInfo.indicator) {
    if (!baseOptics.hasActiveChromophore) {
      // Pure colorless background electrolytes + indicator -> crisp continuous Henderson-Hasselbalch curve
      finalLiquidColorHex = getIndicatorColor(indicatorInfo.indicator, finalPh);
      liquidOpacity = computeLiquidOpacity(finalLiquidColorHex, baseOptics.turbidityScatter, volume_ml);
    } else {
      // Colored transition metal ions + pH indicator coexist -> true spectral Beer-Lambert additive absorbance
      const combinedOptics = calculateMixtureOptics(updatedContents, volume_ml, indicatorInfo.absorbance_RGB, 4.5, '#f8fafc');
      finalLiquidColorHex = combinedOptics.colorHex;
      liquidOpacity = combinedOptics.opacity;
    }
  }

  // Starch-Iodine complex thermochromism
  const hasStarch = updatedContents.some(c => {
    const low = c.formula.toLowerCase();
    return (low.includes('starch') || low.includes('tinhbot') || canonicalFormulaKey(c.formula) === 'TINHBOT') && c.moles > 1e-5;
  });
  const hasIodine = updatedContents.some(
    c =>
      (c.formula.toUpperCase() === 'I2' ||
        c.formula.toUpperCase() === 'I3-' ||
        c.formula.toUpperCase() === 'TINHBOT-I2') &&
      c.moles > 1e-5
  );
  if (hasStarch && hasIodine) {
    if (temp_c >= 60.0) {
      finalLiquidColorHex = '#fef08a'; // Pale yellow free iodine upon thermal dissociation
    } else {
      finalLiquidColorHex = '#1e1b4b'; // Deep midnight blue-black complex
    }
    liquidOpacity = computeLiquidOpacity(finalLiquidColorHex, baseOptics.turbidityScatter, volume_ml);
  }

  // Iron(III) thiocyanate deep blood red complex [Fe(SCN)]2+ / Fe(SCN)3
  const hasFeSCNComplex = updatedContents.some(
    c => (c.formula.toUpperCase().includes('FE(SCN)') || c.formula.toUpperCase() === 'FE(SCN)3') && c.moles > 1e-5
  );
  if (hasFeSCNComplex) {
    finalLiquidColorHex = '#7f1d1d'; // Blood red
    liquidOpacity = computeLiquidOpacity(finalLiquidColorHex, baseOptics.turbidityScatter, volume_ml);
  }

  // Tetraamminecopper(II) complex [Cu(NH3)4]2+ royal azure blue
  const hasCuAmmonia = updatedContents.some(c => c.formula.toUpperCase().includes('CU(NH3)4') && c.moles > 1e-5);
  if (hasCuAmmonia) {
    const cuConc = updatedContents
      .filter(c => c.formula.toUpperCase().includes('CU(NH3)4'))
      .reduce((s, c) => s + c.moles, 0) / Math.max(0.001, volume_ml / 1000);
    if (cuConc >= 0.015) {
      finalLiquidColorHex = '#1d4ed8'; // Royal azure blue
    }
    liquidOpacity = computeLiquidOpacity(finalLiquidColorHex, baseOptics.turbidityScatter, volume_ml);
  }

  // Copper-glycerol / glucose deep blue chelate complex
  const hasCuGlycerol = updatedContents.some(c => {
    const u = c.formula.toUpperCase();
    return (u.includes('CU(C3H7O3)2') || u.includes('CU(C6H11O6)2') || u.includes('[C6H11O6]2CU')) && c.moles > 1e-5;
  });
  if (hasCuGlycerol) {
    finalLiquidColorHex = '#2563eb'; // Deep blue
    liquidOpacity = computeLiquidOpacity(finalLiquidColorHex, baseOptics.turbidityScatter, volume_ml);
  }

  const physProps = calculateMixturePhysicalProperties(updatedContents, volume_ml, temp_c);

  // Emerald green solution when Cu reacts with conc. HNO3; dilute HNO3 yields sky blue Cu(NO3)2
  if (ruleOutput.reactionsOccurred.some(r => r.reactionId === 'rx_cu_hno3_gas' || r.reactionId === 'cu_hno3_conc')) {
    finalLiquidColorHex = '#059669';
  } else if (ruleOutput.reactionsOccurred.some(r => r.reactionId === 'cu_hno3_dil')) {
    finalLiquidColorHex = '#0284c7';
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

  // Foam head / froth height (mm) on meniscus — scales physically with finite O2/gas release + surfactant (SDS/soap)
  const hasSurfactant = updatedContents.some(c => {
    const u = c.formula.toUpperCase();
    return (u === 'SDS' || u === 'C17H35COONA') && c.moles > 1e-6;
  });
  let foamHead_mm = 0;
  if (hasGasOccurred) {
    const gasMoles = Math.max(0, gasInfoFinal?.molesReleased ?? 0);
    if (hasSurfactant) {
      foamHead_mm = Math.min(36, Math.max(12, 10 + gasMoles * 280));
    } else if (gasInfoFinal?.effervescenceSpeed === 'instant' || gasInfoFinal?.effervescenceSpeed === 'vigorous') {
      foamHead_mm = 7.5;
    } else {
      foamHead_mm = 3.0;
    }
  }

  // Tollen's test silver mirror coat
  const hasSilverMirror = ruleOutput.reactionsOccurred.some(
    r => r.reactionId.includes('silver_mirror') || r.reactionId.includes('tollens')
  );

  // Check for immiscible phase separation (e.g. ethyl acetate, methyl acetate, hexane, CCl4, benzene, diethyl ether, aniline)
  const immiscibleOrganicItem = updatedContents.find(c => {
    const f = c.formula.toUpperCase();
    return (
      f.includes('CH3COOC2H5') ||
      f.includes('CH3COOCH3') ||
      f.includes('C2H5COOC2H5') ||
      f.includes('HCOOC2H5') ||
      f.includes('HCOOCH3') ||
      f.includes('C6H14') ||
      f.includes('CCL4') ||
      f.includes('CHCL3') ||
      f.includes('C6H6') ||
      f.includes('C2H5OC2H5') ||
      f.includes('C2H4BR2') ||
      f.includes('C2H2BR4') ||
      f.includes('EST')
    );
  });
  const hasPhaseSeparation = Boolean(immiscibleOrganicItem && immiscibleOrganicItem.mass_g > 0.05 && volume_ml > 5);
  const organicLayerVolume_ml = hasPhaseSeparation
    ? Math.max(3, Math.min(volume_ml * 0.45, immiscibleOrganicItem!.mass_g / 0.9))
    : undefined;
  const organicLayerColorHex = hasPhaseSeparation && hasIodine && immiscibleOrganicItem!.formula.toUpperCase().includes('CCL4')
    ? '#9333ea' // Iodine extracts purple into organic CCl4 / hexane phase!
    : hasPhaseSeparation && hasIodine
      ? '#a855f7'
      : '#f8fafc';

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
      r =>
        r.reactionId === 'rx_na_water_reaction' ||
        r.reactionId === 'rx_sodium_water_pyrotechnic' ||
        r.reactionId.includes('k_water') ||
        r.controllerId === 'k_water_skitter' ||
        r.controllerId === 'na_water_skitter'
    );
  const isDangerous =
    Boolean(ruleOutput.isDangerous) ||
    isExplosion ||
    ruleOutput.reactionsOccurred.some(
      r => r.reactionId.includes('dangerous') || r.reactionId.includes('na_water') || r.reactionId.includes('k_water')
    );

  return {
    reactionsOccurred: ruleOutput.reactionsOccurred,
    updatedContents,
    finalTemperature_c: temp_c,
    finalPh,
    finalLiquidColorHex,
    liquidOpacity: computeLiquidOpacity(finalLiquidColorHex, turbidity, volume_ml) || liquidOpacity,
    mixtureViscosity_mPa_s: physProps.viscosity_mPa_s,
    surfaceTension_N_m: physProps.surfaceTension_N_m,
    mixtureCp_J_kgK: physProps.cp_J_kgK,
    density_g_ml: physProps.density_g_ml,
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
    organicLayerColorHex,
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
    escapedGas_g: Object.keys(escapedGas_g).length > 0 ? escapedGas_g : undefined,
  };
}
