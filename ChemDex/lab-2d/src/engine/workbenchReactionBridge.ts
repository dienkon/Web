/**
 * Workbench Reaction Bridge (Lab-3D -> Lab-2D Parity)
 *
 * Launches any reaction from either the 131-equation THPT Vietnamese Curriculum library
 * or the 1,300-equation Shared Catalog directly onto the interactive 2D workbench:
 *   - Spawns appropriate glassware centered in view
 *   - Aligns a Bunsen burner directly underneath (`dx = 0`, `gap = 36px`) if heat/flame required
 *   - Doses stoichiometric reactants, solvents, catalysts & indicators cleanly
 *   - Activates real-time gradual kinetics (`realtimeKinetics = true`) and fits viewport
 */

import { useLabStore } from '../store/useLabStore';
import { findChemicalByFormula } from '../data/chemicals';
import { EquipmentType } from '../types/equipment';
import { soundEngine } from '../services/soundEngine';
import { getCompiledReactionById } from '../chemistry/reactions/curriculumAndCatalogCompiler';

export interface BridgeReactantSpec {
  formula: string;
  phase?: 'aq' | 's' | 'l' | 'g';
  coeff?: number;
  coefficient?: number;
  volume_ml?: number;
  mass_g?: number;
  colorHex?: string;
}

export interface BridgeReactionInput {
  id: string;
  title_vi?: string;
  equation: string;
  reactants: BridgeReactantSpec[];
  simulationDoses?: BridgeReactantSpec[];
  conditions?: {
    heating?: boolean;
    temperature_c?: number | null;
    catalyst?: string | null;
    activation?: string | null;
    description_vi?: string;
  };
  minTemp_c?: number;
  category?: string;
  family?: string;
}

export interface BridgeLaunchResult {
  vesselId: string;
  burnerId?: string;
  equation: string;
  mappedCount: number;
  fallbackCount: number;
  heated: boolean;
}

const FORMULA_ALIASES: Record<string, string> = {
  'D-GLUCOSE': 'C6H12O6',
  'GLUCOSE': 'C6H12O6',
  'CH3CHO': 'CH3CHO',
  'C2H5OH': 'C2H5OH',
  'CH3CH2OH': 'C2H5OH',
  'NH4OH': 'NH3',
  'AG(NH3)2OH': 'AgNO3',
  '[AG(NH3)2]OH': 'AgNO3',
  '[AG(NH3)2]+': 'AgNO3',
  'CUSO4.5H2O': 'CuSO4',
  '(C6H10O5)N': 'TinhBot',
  'C6H10O5': 'TinhBot',
  'STARCH': 'TinhBot',
  'C3H8O3': 'C3H5(OH)3',
  'NH2O': 'H2O',
};

function sanitizeBridgeFormula(formula: string): string {
  const cleaned = formula.trim();
  if (cleaned === '(C6H10O5)n') return 'TinhBot';
  if (/^n[A-Z(]/.test(cleaned)) return cleaned.slice(1);
  return cleaned;
}

function normalizeLookupFormula(formula: string): string {
  const cleaned = sanitizeBridgeFormula(formula);
  const upper = cleaned.toUpperCase();
  return FORMULA_ALIASES[upper] || cleaned;
}

/**
 * Resolves and launches any curriculum or catalog reaction onto a clean 2D workbench setup.
 */
export function runReactionOnWorkbench2D(
  entry: BridgeReactionInput,
  options?: { vesselType?: EquipmentType; keepExisting?: boolean }
): BridgeLaunchResult {
  const store = useLabStore.getState();

  if (!options?.keepExisting) {
    store.resetWorkbench();
  }
  store.setRealtimeKinetics(true);
  store.setShowcaseActive(false);
  store.setActiveMode('free');

  const vesselType: EquipmentType =
    options?.vesselType ??
    (entry.reactants.some((r) => r.formula === 'C6H12O6' || r.formula === 'CH3CHO')
      ? 'test_tube'
      : 'beaker');

  const vesselX = vesselType === 'test_tube' ? 335 : 290;
  const vesselY = vesselType === 'test_tube' ? 105 : 130;
  const vesselId = store.addEquipment(vesselType, vesselX, vesselY);
  const vessel = useLabStore.getState().equipment[vesselId];

  const compiled = getCompiledReactionById(entry.id);
  const cond = entry.conditions || {};
  const condText = (cond.description_vi || '').toLowerCase();
  const needsHeat = Boolean(
    cond.heating ||
      compiled?.requiresHeating ||
      (typeof cond.temperature_c === 'number' && cond.temperature_c >= 45) ||
      cond.activation === 'heat' ||
      cond.activation === 'heating' ||
      cond.activation === 'flame' ||
      (entry.minTemp_c !== undefined && entry.minTemp_c >= 45) ||
      entry.family === 'thermal' ||
      entry.family === 'esterification' ||
      entry.family === 'combustion' ||
      condText.includes('đun nóng') ||
      condText.includes('đun nhẹ') ||
      condText.includes('bể nước') ||
      condText.includes('mồi cháy') ||
      condText.includes('lò nung')
  );

  let burnerId: string | undefined;
  if (needsHeat && vessel) {
    const burnerX = vessel.x + vessel.width / 2 - 50; // center align dx = 0 (burner width = 100)
    const burnerY = vessel.y + vessel.height + 36 - 42; // exact optimal flame plume gap = 36px
    burnerId = useLabStore.getState().addEquipment('bunsen_burner', burnerX, burnerY);
    useLabStore.getState().toggleHeat(burnerId);
  }

  const doses = entry.simulationDoses?.length ? entry.simulationDoses : entry.reactants;
  let mappedCount = 0;
  let fallbackCount = 0;
  let hasAqueousPhase = doses.some((d) => (d.phase ?? 'aq') === 'aq');

  const isConcHno3 = entry.id === 'cu_hno3_conc' || entry.equation.toLowerCase().includes('hno3(conc)');
  const isDilHno3 = entry.id === 'cu_hno3_dil' || entry.equation.toLowerCase().includes('hno3(dil)');
  const isConcH2so4 = entry.id === 'cu_conc_h2so4' || entry.id === 'kcl_conc_h2so4' || entry.equation.toLowerCase().includes('h2so4(conc)');

  // If reactants include soluble alkali/metal/acid-free aq pair and no explicit solvent, add distilled water first
  const hasWaterReactant = doses.some((d) => normalizeLookupFormula(d.formula).toUpperCase() === 'H2O');
  const isAlkaliOrSolidAcid = doses.some((d) => ['NA', 'K', 'CA', 'CAO', 'NA2O'].includes(normalizeLookupFormula(d.formula).toUpperCase()));
  if (isDilHno3 && !hasWaterReactant) {
    // Ensure sufficient water so HNO3 remains <= 2.5 M (dilute NO pathway)
    useLabStore.getState().addDistilledWater(vesselId, 45);
    hasAqueousPhase = true;
  } else if (!hasWaterReactant && !isConcHno3 && !isConcH2so4 && (isAlkaliOrSolidAcid || (!hasAqueousPhase && doses.length >= 2 && needsHeat === false))) {
    useLabStore.getState().addDistilledWater(vesselId, 45);
    hasAqueousPhase = true;
  }

  // Scale small 2mL 3D sample doses cleanly up to 16-35 mL on the 2D bench, honoring stoichiometric coeffs
  const maxDoseVol = Math.max(0, ...doses.map((d) => d.volume_ml ?? 0));
  const volScale = maxDoseVol > 0 && maxDoseVol < 8 ? (vesselType === 'test_tube' ? 6 : 10) : 1;

  for (const dose of doses) {
    const lookupFormula = normalizeLookupFormula(dose.formula);
    const upperLookup = lookupFormula.toUpperCase();
    const coeff = Math.max(1, Number(dose.coeff ?? dose.coefficient ?? 1));

    if (upperLookup === 'H2O') {
      const waterMl = Math.min(80, Math.max(20, (dose.volume_ml ?? 25) * volScale));
      useLabStore.getState().addDistilledWater(vesselId, waterMl);
      mappedCount++;
      continue;
    }
    if (upperLookup === 'O2') {
      // Ambient O2 is supplied dynamically by open-vessel combustion/oxidation or metered gas
      useLabStore.getState().injectCustomSubstance(vesselId, 'O2', 'g', 0, Math.max(1.2, coeff * 0.8), '#f8fafc');
      mappedCount++;
      continue;
    }

    const chem = findChemicalByFormula(lookupFormula);
    const phase = dose.phase ?? 'aq';

    if (isConcHno3 && upperLookup === 'HNO3') {
      useLabStore.getState().injectCustomSubstance(vesselId, 'HNO3', 'aq', 18, 0.22 * 63.01, '#f8fafc');
      mappedCount++;
      continue;
    }
    if (isDilHno3 && upperLookup === 'HNO3') {
      useLabStore.getState().injectCustomSubstance(vesselId, 'HNO3', 'aq', 30, 0.06 * 63.01, '#f8fafc');
      mappedCount++;
      continue;
    }
    if (isConcH2so4 && upperLookup === 'H2SO4') {
      useLabStore.getState().injectCustomSubstance(vesselId, 'H2SO4', 'aq', 15, 0.24 * 98.08, '#f8fafc');
      mappedCount++;
      continue;
    }

    if (chem) {
      mappedCount++;
      if (chem.phase_STP === 'solid' || phase === 's') {
        const defaultMass = Math.min(6, Math.max(0.8, 0.9 * coeff));
        const mass = dose.mass_g ? Math.min(6, Math.max(0.8, dose.mass_g * 5)) : defaultMass;
        useLabStore.getState().addChemicalToEquipment(vesselId, chem.id, undefined, mass);
      } else if (chem.phase_STP === 'gas' || phase === 'g') {
        const mass = dose.mass_g ? Math.max(0.4, dose.mass_g) : Math.min(3.5, 0.65 * coeff);
        useLabStore.getState().addChemicalToEquipment(vesselId, chem.id, undefined, mass);
      } else {
        const baseVol = dose.volume_ml ? dose.volume_ml * volScale : 10 * coeff;
        const vol = Math.min(vesselType === 'test_tube' ? 22 : 45, Math.max(8, baseVol));
        useLabStore.getState().addChemicalToEquipment(vesselId, chem.id, vol);
      }
    } else {
      fallbackCount++;
      const vol = phase === 's' || phase === 'g' ? 0 : Math.min(32, Math.max(10, (dose.volume_ml ?? 1.8 * coeff) * volScale));
      const mass = phase === 's' ? Math.max(1.0, (dose.mass_g ?? 0.6 * coeff) * 2) : Math.max(0.8, 0.6 * coeff);
      useLabStore.getState().injectCustomSubstance(vesselId, lookupFormula, phase, vol, mass, dose.colorHex);
    }
  }

  // Inject catalyst if specified directly or implied by curriculum/catalog metadata (e.g. H2SO4, MnO2, Ni)
  const effectiveCatalyst = cond.catalyst || compiled?.catalystFormula;
  if (effectiveCatalyst) {
    const catFormula = normalizeLookupFormula(effectiveCatalyst);
    const catChem = findChemicalByFormula(catFormula);
    if (catChem) {
      if (catChem.phase_STP === 'solid') {
        useLabStore.getState().addChemicalToEquipment(vesselId, catChem.id, undefined, 0.6);
      } else {
        useLabStore.getState().addChemicalToEquipment(vesselId, catChem.id, 6);
      }
    } else {
      useLabStore.getState().injectCustomSubstance(vesselId, catFormula, 's', 0, 0.5, '#64748b');
    }
  }

  // Add phenolphthalein automatically for invisible neutralization/alkali reactions so student sees pH transition
  const hasIndicatorCandidate =
    entry.family === 'neutralization' ||
    (doses.some((d) => ['HCL', 'HNO3', 'H2SO4', 'CH3COOH'].includes(d.formula.toUpperCase())) &&
      doses.some((d) => ['NAOH', 'KOH', 'NH3'].includes(d.formula.toUpperCase()))) ||
    doses.some((d) => ['NA', 'K'].includes(d.formula.toUpperCase()));
  if (hasIndicatorCandidate) {
    useLabStore.getState().addChemicalToEquipment(vesselId, 'chem-phenolphthalein', 2);
  }

  useLabStore.getState().selectEquipment(vesselId);
  useLabStore.getState().requestFitWorkbench();
  soundEngine.glassClink();

  return {
    vesselId,
    burnerId,
    equation: entry.equation,
    mappedCount,
    fallbackCount,
    heated: Boolean(burnerId),
  };
}
