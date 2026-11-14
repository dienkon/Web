import { EquipmentState, EquipmentType } from '../types/equipment';
import { ChemicalDefinition, SimulationResult, SubstanceQuantity } from '../types/chemistry';
import { prepareVesselSimulation } from '../chemistry/reactions/kineticsSolver';
import { computeMolarMass } from '../chemistry/core/formula';
import { reactionRuntime2D } from '../vfx/ReactionRuntime2D';
import type { LabSnapshot, LabStoreState } from './labStoreTypes';

export const EQUIPMENT_SPECS: Record<
  EquipmentType,
  { name: string; name_vi: string; capacity_ml: number; width: number; height: number; tare_g: number; isContainer: boolean }
> = {
  beaker: { name: '250 mL Beaker', name_vi: 'Cốc thủy tinh 250 mL', capacity_ml: 250, width: 140, height: 160, tare_g: 95.0, isContainer: true },
  erlenmeyer_flask: { name: '250 mL Erlenmeyer Flask', name_vi: 'Bình tam giác 250 mL', capacity_ml: 250, width: 150, height: 180, tare_g: 110.0, isContainer: true },
  test_tube: { name: 'Test Tube', name_vi: 'Ống nghiệm', capacity_ml: 50, width: 50, height: 180, tare_g: 22.0, isContainer: true },
  graduated_cylinder: { name: '100 mL Graduated Cylinder', name_vi: 'Ống đong 100 mL', capacity_ml: 100, width: 70, height: 220, tare_g: 75.0, isContainer: true },
  burette: { name: '50 mL Burette & Stand', name_vi: 'Buret 50 mL và Giá đỡ', capacity_ml: 50, width: 110, height: 320, tare_g: 160.0, isContainer: true },
  analytical_balance: { name: 'Analytical Balance', name_vi: 'Cân điện tử phân tích', capacity_ml: 0, width: 220, height: 140, tare_g: 0, isContainer: false },
  bunsen_burner: { name: 'Bunsen Burner', name_vi: 'Đèn Bunsen', capacity_ml: 0, width: 100, height: 140, tare_g: 250.0, isContainer: false },
  hot_plate: { name: 'Hot Plate & Stirrer', name_vi: 'Bếp điện gia nhiệt', capacity_ml: 0, width: 180, height: 100, tare_g: 500.0, isContainer: false },
  funnel: { name: 'Filter Funnel with Paper', name_vi: 'Phễu lọc có giấy lọc', capacity_ml: 60, width: 90, height: 130, tare_g: 40.0, isContainer: true },
  pipette: { name: '10 mL Graduated Pipette', name_vi: 'Pipet chia vạch 10 mL', capacity_ml: 10, width: 30, height: 260, tare_g: 15.0, isContainer: true },
  dropper: { name: 'Dropper (Pasteur)', name_vi: 'Ống nhỏ giọt', capacity_ml: 3, width: 30, height: 140, tare_g: 8.0, isContainer: true },
  watch_glass: { name: 'Watch Glass', name_vi: 'Mặt kính đồng hồ', capacity_ml: 20, width: 100, height: 40, tare_g: 30.0, isContainer: true },
  evaporating_dish: { name: 'Evaporating Dish', name_vi: 'Bát sứ nung', capacity_ml: 80, width: 120, height: 70, tare_g: 85.0, isContainer: true },
  ph_meter: { name: 'Digital pH Meter Probe', name_vi: 'Bút đo pH điện tử', capacity_ml: 0, width: 40, height: 220, tare_g: 50.0, isContainer: false },
  thermometer: { name: 'Laboratory Thermometer', name_vi: 'Nhiệt kế phòng thí nghiệm', capacity_ml: 0, width: 30, height: 240, tare_g: 25.0, isContainer: false },
  stirring_rod: { name: 'Glass Stirring Rod', name_vi: 'Đũa thủy tinh', capacity_ml: 0, width: 20, height: 200, tare_g: 18.0, isContainer: false },
  spatula: { name: 'Chemical Spatula', name_vi: 'Muỗng xúc hóa chất', capacity_ml: 0, width: 30, height: 160, tare_g: 20.0, isContainer: false },
  reagent_bottle: { name: 'Reagent Bottle', name_vi: 'Lọ đựng hóa chất', capacity_ml: 150, width: 90, height: 150, tare_g: 90.0, isContainer: true },
  wash_bottle: { name: 'Wash Bottle (Distilled H2O)', name_vi: 'Bình tia nước cất', capacity_ml: 250, width: 90, height: 190, tare_g: 60.0, isContainer: true },
  test_tube_rack: { name: 'Test Tube Rack', name_vi: 'Giá để ống nghiệm', capacity_ml: 0, width: 200, height: 110, tare_g: 120.0, isContainer: false },
  separatory_funnel: { name: '250 mL Separatory Funnel', name_vi: 'Phễu chiết quả lê 250 mL', capacity_ml: 250, width: 130, height: 260, tare_g: 140.0, isContainer: true },
  ph_paper: { name: 'Universal pH Indicator Paper Strip', name_vi: 'Giấy quỳ tím & chỉ thị pH', capacity_ml: 0, width: 24, height: 120, tare_g: 2.0, isContainer: false },
  sponge: { name: 'Lab Cleaning Sponge', name_vi: 'Bọt biển lau hóa chất tràn', capacity_ml: 0, width: 56, height: 38, tare_g: 12.0, isContainer: false },
  condenser: { name: 'Liebig Reflux Condenser', name_vi: 'Ống sinh hàn hồi lưu (Liebig)', capacity_ml: 40, width: 84, height: 190, tare_g: 145.0, isContainer: false },
};

export function mergeEscapedGasMaps(
  base?: Record<string, number>,
  delta?: Record<string, number>
): Record<string, number> {
  const next: Record<string, number> = { ...(base || {}) };
  if (!delta) return next;
  for (const [formula, grams] of Object.entries(delta)) {
    if (grams > 0) {
      next[formula] = Math.round(((next[formula] ?? 0) + grams) * 100000) / 100000;
    }
  }
  return next;
}

export function sumEscapedGas(delta?: Record<string, number>): number {
  if (!delta) return 0;
  return Object.values(delta).reduce((s, v) => s + (Number.isFinite(v) && v > 0 ? v : 0), 0);
}

export function updateInitialSolidMapOnAdd(
  baseMap: Record<string, number> | undefined,
  prevContents: SubstanceQuantity[],
  formula: string,
  addedMass_g: number,
  isSolid: boolean
): Record<string, number> | undefined {
  if (!isSolid || addedMass_g <= 0) return baseMap;
  const key = formula.toUpperCase();
  const prevItem = prevContents.find(c => c.formula.toUpperCase() === key && c.state === 's');
  const prevRemaining = prevItem ? prevItem.mass_g : 0;
  return {
    ...(baseMap || {}),
    [key]: Math.max(baseMap?.[key] ?? 0, prevRemaining + addedMass_g),
  };
}

export function detectExternalDeliveryMode(
  chem: ChemicalDefinition,
  amount_ml: number,
  isLiquid: boolean
): 'bottle' | 'dropper' | 'spatula' {
  if (!isLiquid) return 'spatula';
  const f = chem.formula.toUpperCase();
  if (
    chem.category === 'indicator' ||
    f.includes('PHENOLPHTHALEIN') ||
    f.includes('METHYL') ||
    f.includes('LITMUS') ||
    f === 'STARCH' ||
    amount_ml <= 4
  ) {
    return 'dropper';
  }
  return 'bottle';
}

/** Captures a full standalone snapshot (suitable for IndexedDB session export). */
export function captureSnapshot(state: LabStoreState): LabSnapshot {
  const {
    equipment,
    selectedEquipmentId,
    activeMode,
    activeExperiment,
    currentStepIndex,
    stepCompleted,
    history,
    spillPuddles,
    studentNotes,
  } = state;
  return structuredClone({
    equipment,
    selectedEquipmentId,
    activeMode,
    activeExperiment,
    currentStepIndex,
    stepCompleted,
    history,
    spillPuddles,
    studentNotes,
  });
}

/**
 * Lightweight undo snapshot: shares immutable references (history log entries,
 * static activeExperiment catalog entries) while deep-cloning mutable vessel and spill state.
 */
export function captureUndoSnapshot(state: LabStoreState): LabSnapshot {
  return {
    equipment: structuredClone(state.equipment),
    selectedEquipmentId: state.selectedEquipmentId,
    activeMode: state.activeMode,
    activeExperiment: state.activeExperiment,
    currentStepIndex: state.currentStepIndex,
    stepCompleted: state.stepCompleted,
    history: state.history,
    spillPuddles: structuredClone(state.spillPuddles),
    studentNotes: state.studentNotes,
  };
}

export function pushSnapshot(state: LabStoreState): { undoStack: LabSnapshot[]; redoStack: LabSnapshot[] } {
  return { undoStack: [...state.undoStack.slice(-49), captureUndoSnapshot(state)], redoStack: [] };
}

/**
 * Shared projection mapping simulation output (Beer-Lambert optics, physical properties,
 * precipitate morphology/layers, metal chunks, flames, fumes, escaped gases) uniformly onto EquipmentState.
 */
export function applySimResultToEquipment(
  base: EquipmentState,
  volume_ml: number,
  mass_g: number,
  sim: SimulationResult,
  extras?: Partial<EquipmentState>
): EquipmentState {
  const stepEscapedTotal = sumEscapedGas(sim.escapedGas_g);
  const rawInitMap = extras?.initialSolidMassByFormula ?? base.initialSolidMassByFormula;
  let nextInitMap = rawInitMap ? { ...rawInitMap } : undefined;
  if (nextInitMap) {
    // Prune initial mass records once that solid species has completely dissolved/consumed
    for (const k of Object.keys(nextInitMap)) {
      const stillPresent = sim.updatedContents.some(
        c => c.formula.toUpperCase() === k && c.state === 's' && c.mass_g > 1e-4
      );
      if (!stillPresent) {
        delete nextInitMap[k];
      }
    }
    if (Object.keys(nextInitMap).length === 0) nextInitMap = undefined;
  }

  return {
    ...base,
    volume_ml: Math.round(volume_ml * 10) / 10,
    mass_g: Math.round(mass_g * 100) / 100,
    contents: sim.updatedContents,
    temperature_c: sim.finalTemperature_c,
    ph: sim.finalPh,
    liquidColorHex: sim.finalLiquidColorHex,
    liquidOpacity: sim.liquidOpacity,
    viscosity_mPa_s: sim.mixtureViscosity_mPa_s,
    surfaceTension_N_m: sim.surfaceTension_N_m,
    mixtureCp_J_kgK: sim.mixtureCp_J_kgK,
    density_g_ml: sim.density_g_ml,
    hasPrecipitate: sim.hasPrecipitate,
    precipitateColorHex: sim.precipitateInfo?.colorHex,
    precipitateSubstance: sim.precipitateInfo?.formula,
    precipitateMass_g: sim.precipitateInfo?.mass_g,
    precipitateMorphology: sim.precipitateInfo?.morphology,
    precipitateLayers: sim.precipitateLayers,
    solidChunks: sim.solidChunks,
    hasGas: sim.hasGas,
    gasColorHex: sim.gasInfo?.colorHex || '#ffffff',
    effervescenceSpeed: sim.gasInfo?.effervescenceSpeed,
    isBoiling: sim.isBoiling,
    hasPhaseSeparation: sim.hasPhaseSeparation,
    organicLayerVolume_ml: sim.organicLayerVolume_ml,
    organicLayerColorHex: sim.organicLayerColorHex,
    hasFumes: sim.hasFumes,
    fumeType: sim.fumeType,
    fumeColorHex: sim.fumeColorHex,
    turbidity: sim.turbidity,
    foamHead_mm: sim.foamHead_mm,
    flameTestColorHex: sim.flameTestColorHex,
    hasSilverMirror: sim.hasSilverMirror || base.hasSilverMirror,
    hasSublimation: sim.hasSublimation || base.hasSublimation,
    sublimationColorHex: sim.sublimationColorHex || base.sublimationColorHex,
    activeControllerIds: sim.activeControllerIds,
    escapedGas_g: stepEscapedTotal > 0 ? mergeEscapedGasMaps(base.escapedGas_g, sim.escapedGas_g) : base.escapedGas_g,
    totalEscapedGas_g: Math.round(((base.totalEscapedGas_g ?? 0) + stepEscapedTotal) * 100000) / 100000,
    ...extras,
    initialSolidMassByFormula: nextInitMap,
  };
}

export function applyChemicalDoseDeltaOnVessel(
  eq: EquipmentState,
  chem: ChemicalDefinition,
  addMl: number,
  addG: number,
  contactXNorm: number,
  env: { oxygenFraction: number },
  realtimeKinetics: boolean,
  triggerVisualBurst: boolean,
  vfx: Pick<typeof reactionRuntime2D, 'triggerColorMixing' | 'triggerController'> = reactionRuntime2D
): {
  updatedVessel: EquipmentState;
  simResult: SimulationResult;
  volumeAdded: number;
  massAdded: number;
  isLiquid: boolean;
  overflow_ml: number;
  prevColor: string;
} {
  const isLiquid = chem.phase_STP === 'aqueous' || chem.phase_STP === 'liquid';
  const headroom = Math.max(0, eq.capacity_ml - eq.volume_ml);
  const volumeAdded = isLiquid ? Math.min(Math.max(0, addMl), headroom) : 0;
  const overflow_ml = isLiquid ? Math.max(0, addMl - headroom) : 0;
  const density = chem.density_g_ml || 1.0;
  const massAdded = isLiquid ? volumeAdded * density : Math.max(0, addG);

  const molesAdded =
    chem.phase_STP === 'aqueous' && chem.defaultConcentration_M !== undefined
      ? chem.defaultConcentration_M * (volumeAdded / 1000.0)
      : massAdded / Math.max(1e-6, chem.molarMass_g_mol);

  const soluteMass = chem.phase_STP === 'aqueous' ? molesAdded * chem.molarMass_g_mol : massAdded;
  const solventMass = chem.phase_STP === 'aqueous' ? Math.max(0, massAdded - soluteMass) : 0;
  const newVolume = Math.min(eq.capacity_ml, eq.volume_ml + volumeAdded);

  const newContents: SubstanceQuantity[] = structuredClone(eq.contents);
  const existing = newContents.find((c) => c.formula.toUpperCase() === chem.formula.toUpperCase());

  if (existing) {
    existing.moles += molesAdded;
    existing.mass_g += soluteMass;
    if (isLiquid && newVolume > 0) {
      existing.concentration_M = existing.moles / (newVolume / 1000.0);
    }
  } else {
    newContents.push({
      formula: chem.formula,
      moles: molesAdded,
      mass_g: soluteMass,
      volume_ml: chem.phase_STP === 'liquid' ? volumeAdded : undefined,
      concentration_M: isLiquid && newVolume > 0 ? molesAdded / (newVolume / 1000.0) : undefined,
      state:
        chem.phase_STP === 'gas'
          ? 'g'
          : chem.phase_STP === 'aqueous'
            ? 'aq'
            : chem.phase_STP === 'liquid'
              ? 'l'
              : 's',
    });
  }

  if (solventMass > 0) {
    const solvent = newContents.find((item) => item.formula === 'H2O');
    const waterMoles = solventMass / computeMolarMass('H2O');
    if (solvent) {
      solvent.mass_g += solventMass;
      solvent.moles += waterMoles;
    } else {
      newContents.push({ formula: 'H2O', moles: waterMoles, mass_g: solventMass, state: 'l' });
    }
  }

  const nextInitSolidMap = updateInitialSolidMapOnAdd(
    eq.initialSolidMassByFormula,
    eq.contents,
    chem.formula,
    soluteMass,
    chem.phase_STP === 'solid'
  );
  const vesselWithInitMap: EquipmentState = {
    ...eq,
    initialSolidMassByFormula: nextInitSolidMap,
  };

  const prevColor = eq.liquidColorHex || '#f8fafc';
  const addPrep = prepareVesselSimulation(
    vesselWithInitMap,
    newContents,
    newVolume,
    eq.temperature_c,
    eq.isOn || false,
    !eq.isSealed,
    { oxygenFraction: env.oxygenFraction },
    realtimeKinetics
  );
  const simResult = addPrep.simResult;
  const totalContentMass = simResult.updatedContents.reduce((sum, c) => sum + c.mass_g, 0);
  const newTotalMass = (eq.tare_g || 0) + totalContentMass;

  const hasPhenol = newContents.some((c) => c.formula.toLowerCase().includes('phenolphthalein'));
  const isTransientBasicPlume =
    hasPhenol &&
    ['NAOH', 'KOH', 'NH3', 'BA(OH)2', 'CA(OH)2'].includes(chem.formula.toUpperCase()) &&
    simResult.finalLiquidColorHex === '#f8fafc';
  const dropColor = isTransientBasicPlume ? '#ec4899' : chem.colorHex || '#38bdf8';
  const clampedX = Math.max(-0.85, Math.min(0.85, contactXNorm));

  const wasEmpty = eq.volume_ml <= 0.01 && eq.contents.length === 0;
  const updatedVessel = applySimResultToEquipment(eq, newVolume, newTotalMass, simResult, {
    initialSolidMassByFormula: nextInitSolidMap,
    pourContactX: clampedX,
    mixedness: wasEmpty ? 1 : Math.min(eq.mixedness ?? 0.6, 0.35),
    activeReactionLabel: addPrep.activeReactionLabel,
    activeReactionProgress: addPrep.activeReactionProgress,
    silverMirrorProgress: addPrep.silverMirrorProgress,
  });

  if (triggerVisualBurst || simResult.finalLiquidColorHex !== prevColor) {
    vfx.triggerColorMixing(updatedVessel, prevColor, simResult.finalLiquidColorHex, clampedX, dropColor);
  }
  if (simResult.activeControllerIds?.length) {
    for (const cid of simResult.activeControllerIds) {
      vfx.triggerController(updatedVessel, cid, {
        hasPhenolphthalein: hasPhenol,
        targetColorHex: simResult.finalLiquidColorHex,
      });
    }
  }

  return {
    updatedVessel,
    simResult,
    volumeAdded,
    massAdded,
    isLiquid,
    overflow_ml,
    prevColor,
  };
}
