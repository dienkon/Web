/**
 * Dynamic Equilibrium Acid-Base & Conductometric Titration Engine.
 * Computes exact charge-balance titration S-curves, 1st derivative peaks (dpH/dV),
 * equivalence volumes, half-equivalence buffer regions, indicator transitions,
 * and conductometric titration profiles (kappa in mS/cm) from arbitrary mixtures.
 */

import { IndicatorType, SubstanceQuantity } from '../../types/chemistry';
import { EquipmentState } from '../../types/equipment';
import { calculateSolutionPh, getIndicatorColor } from './acidBase';
import { calculateSolutionConductivity } from './analyticalTelemetry';
import { detectIndicatorType } from '../optics/indicatorAppearance';
import { computeMolarMass } from '../core/formula';

export interface TitrationPoint {
  volumeAdded_ml: number;
  ph: number;
  /** Signed first derivative dpH/dV (pH units per mL). */
  dpH_dV: number;
  /** Specific electrical conductivity kappa (mS/cm) along the titration. */
  conductivity_mS_cm: number;
  colorHex: string;
}

export interface EquivalencePointInfo {
  volume_ml: number;
  ph: number;
  slopeAbs_dpH_dV: number;
  index: number;
}

export interface BufferRegionInfo {
  halfEquivalenceVolume_ml: number;
  phAtHalfEq: number;
  effectiveConstantLabel: string;
}

export interface TitrationSimulationInput {
  analyteContents: readonly SubstanceQuantity[];
  analyteVolume_ml: number;
  titrantContents: readonly SubstanceQuantity[];
  /** Volume (mL) that `titrantContents` moles occupy (defaults to summing water/solution volume or 1000 mL). */
  titrantBatchVolume_ml?: number;
  /** Maximum added titrant volume (mL) to simulate; auto-estimated if omitted. */
  maxTitrantAdded_ml?: number;
  indicator?: IndicatorType | null;
  temperature_c?: number;
  analyteLabel?: string;
  titrantLabel?: string;
}

export interface TitrationSimulationResult {
  points: TitrationPoint[];
  equivalencePoints: EquivalencePointInfo[];
  halfEquivalence: BufferRegionInfo | null;
  initialPh: number;
  finalPh: number;
  maxVolume_ml: number;
  detectedIndicator: IndicatorType | null;
  analyteLabel: string;
  titrantLabel: string;
}

export interface TitrationPresetSpec {
  id: string;
  name_en: string;
  name_vi: string;
  analyteFormula: string;
  analyteChemicalId: string;
  analyteMolarity_M: number;
  analyteVolume_ml: number;
  titrantFormula: string;
  titrantChemicalId: string;
  titrantMolarity_M: number;
  titrantVolume_ml: number;
  indicatorFormula: string;
  indicatorChemicalId: string;
  indicatorType: IndicatorType;
  suggestedMax_ml: number;
  notes_vi: string;
  notes_en: string;
}

export const TITRATION_PRESETS: readonly TitrationPresetSpec[] = [
  {
    id: 'hcl_naoh',
    name_en: 'Strong Acid + Strong Base (HCl + NaOH)',
    name_vi: 'Axit mạnh + Bazơ mạnh (HCl 0.1M + NaOH 0.1M)',
    analyteFormula: 'HCl',
    analyteChemicalId: 'chem-hcl',
    analyteMolarity_M: 0.1,
    analyteVolume_ml: 25,
    titrantFormula: 'NaOH',
    titrantChemicalId: 'chem-naoh',
    titrantMolarity_M: 0.1,
    titrantVolume_ml: 50,
    indicatorFormula: 'Phenolphthalein',
    indicatorChemicalId: 'chem-phenolphthalein',
    indicatorType: 'phenolphthalein',
    suggestedMax_ml: 50,
    notes_vi: 'Điểm tương đương sắc nét tại V = 25.0 mL, pH = 7.00; bước nhảy dài pH 3.3–10.7.',
    notes_en: 'Sharp equivalence point at V = 25.0 mL, pH = 7.00 with wide pH 3.3–10.7 inflection.',
  },
  {
    id: 'ch3cooh_naoh',
    name_en: 'Weak Acid + Strong Base (CH₃COOH + NaOH)',
    name_vi: 'Axit yếu + Bazơ mạnh (CH₃COOH 0.1M + NaOH 0.1M)',
    analyteFormula: 'CH3COOH',
    analyteChemicalId: 'chem-ch3cooh',
    analyteMolarity_M: 0.1,
    analyteVolume_ml: 25,
    titrantFormula: 'NaOH',
    titrantChemicalId: 'chem-naoh',
    titrantMolarity_M: 0.1,
    titrantVolume_ml: 50,
    indicatorFormula: 'Phenolphthalein',
    indicatorChemicalId: 'chem-phenolphthalein',
    indicatorType: 'phenolphthalein',
    suggestedMax_ml: 50,
    notes_vi: 'Vùng đệm quanh V₁/₂ = 12.5 mL (pH ≈ pKa = 4.74); điểm tương đương ở pH ≈ 8.72.',
    notes_en: 'Buffer region around V₁/₂ = 12.5 mL (pH ≈ pKa = 4.74); basic equivalence at pH ≈ 8.72.',
  },
  {
    id: 'nh3_hcl',
    name_en: 'Weak Base + Strong Acid (NH₃ + HCl)',
    name_vi: 'Bazơ yếu + Axit mạnh (NH₃ 0.1M + HCl 0.1M)',
    analyteFormula: 'NH3',
    analyteChemicalId: 'chem-nh3',
    analyteMolarity_M: 0.1,
    analyteVolume_ml: 25,
    titrantFormula: 'HCl',
    titrantChemicalId: 'chem-hcl',
    titrantMolarity_M: 0.1,
    titrantVolume_ml: 50,
    indicatorFormula: 'Methyl Orange',
    indicatorChemicalId: 'chem-methyl-orange',
    indicatorType: 'methyl_orange',
    suggestedMax_ml: 50,
    notes_vi: 'Dung dịch muối NH₄Cl thủy phân axit tại V = 25.0 mL (pH ≈ 5.28), thích hợp Methyl Da Cam.',
    notes_en: 'Acidic NH₄⁺ hydrolysis shifts equivalence to pH ≈ 5.28; Methyl Orange matches inflection.',
  },
  {
    id: 'na2co3_hcl',
    name_en: 'Diprotic Carbonate Base (Na₂CO₃ + HCl)',
    name_vi: 'Chuẩn độ 2 nấc Na₂CO₃ 0.1M + HCl 0.1M',
    analyteFormula: 'Na2CO3',
    analyteChemicalId: 'chem-na2co3',
    analyteMolarity_M: 0.1,
    analyteVolume_ml: 25,
    titrantFormula: 'HCl',
    titrantChemicalId: 'chem-hcl',
    titrantMolarity_M: 0.1,
    titrantVolume_ml: 50,
    indicatorFormula: 'Methyl Orange',
    indicatorChemicalId: 'chem-methyl-orange',
    indicatorType: 'methyl_orange',
    suggestedMax_ml: 70,
    notes_vi: 'Hai bước nhảy rõ: nấc 1 tại 25.0 mL (CO₃²⁻ → HCO₃⁻, pH ≈ 8.3) và nấc 2 tại 50.0 mL (pH ≈ 3.8).',
    notes_en: 'Two equivalence steps: 25.0 mL (CO₃²⁻ → HCO₃⁻, pH ≈ 8.3) and 50.0 mL (HCO₃⁻ → H₂CO₃).',
  },
  {
    id: 'h3po4_naoh',
    name_en: 'Polyprotic Acid (H₃PO₄ + NaOH)',
    name_vi: 'Chuẩn độ đa axit H₃PO₄ 0.1M + NaOH 0.1M',
    analyteFormula: 'H3PO4',
    analyteChemicalId: 'chem-h3po4',
    analyteMolarity_M: 0.1,
    analyteVolume_ml: 25,
    titrantFormula: 'NaOH',
    titrantChemicalId: 'chem-naoh',
    titrantMolarity_M: 0.1,
    titrantVolume_ml: 50,
    indicatorFormula: 'UniversalIndicator',
    indicatorChemicalId: 'chem-universal-indicator',
    indicatorType: 'universal',
    suggestedMax_ml: 75,
    notes_vi: 'Hai điểm tương đương rõ tại 25.0 mL (pH ≈ 4.7) và 50.0 mL (pH ≈ 9.7) từ hệ cân bằng Ka₁–Ka₃.',
    notes_en: 'Displays Ka₁ and Ka₂ equivalence jumps at 25.0 mL (pH ≈ 4.7) and 50.0 mL (pH ≈ 9.7).',
  },
];

function cleanFormula(formula: string): string {
  return formula.replace(/\s*\((?:s|l|g|aq|conc|dil)\)/gi, '').trim();
}

export function buildPresetSimulationInput(preset: TitrationPresetSpec): TitrationSimulationInput {
  const analyteMoles = (preset.analyteMolarity_M * preset.analyteVolume_ml) / 1000;
  const titrantMoles = (preset.titrantMolarity_M * preset.titrantVolume_ml) / 1000;
  return {
    analyteContents: [
      {
        formula: 'H2O',
        moles: preset.analyteVolume_ml / 18.015,
        mass_g: preset.analyteVolume_ml,
        state: 'l',
      },
      {
        formula: preset.analyteFormula,
        moles: analyteMoles,
        mass_g: analyteMoles * computeMolarMass(preset.analyteFormula),
        state: 'aq',
        concentration_M: preset.analyteMolarity_M,
      },
    ],
    analyteVolume_ml: preset.analyteVolume_ml,
    titrantContents: [
      {
        formula: 'H2O',
        moles: preset.titrantVolume_ml / 18.015,
        mass_g: preset.titrantVolume_ml,
        state: 'l',
      },
      {
        formula: preset.titrantFormula,
        moles: titrantMoles,
        mass_g: titrantMoles * computeMolarMass(preset.titrantFormula),
        state: 'aq',
        concentration_M: preset.titrantMolarity_M,
      },
    ],
    titrantBatchVolume_ml: preset.titrantVolume_ml,
    maxTitrantAdded_ml: preset.suggestedMax_ml,
    indicator: preset.indicatorType,
    analyteLabel: `${preset.analyteFormula} ${preset.analyteMolarity_M}M (${preset.analyteVolume_ml} mL)`,
    titrantLabel: `${preset.titrantFormula} ${preset.titrantMolarity_M}M`,
  };
}

/** Counts reactive H+/OH- equivalents per mole for auto-estimating titration sweep range. */
function speciesProticity(formula: string): number {
  const f = cleanFormula(formula).toLowerCase();
  if (f === 'h2so4' || f === 'na2co3' || f === 'k2co3' || f === 'ca(oh)2' || f === 'ba(oh)2') return 2;
  if (f === 'h3po4' || f === 'na3po4' || f === 'k3po4') return 3;
  if (f === 'h2co3' || f === 'na2hpo4') return 2;
  return 1;
}

function estimateBatchVolumeMl(contents: readonly SubstanceQuantity[], explicit?: number): number {
  if (explicit && explicit > 0) return explicit;
  const water = contents.find((c) => cleanFormula(c.formula).toLowerCase() === 'h2o');
  if (water && water.mass_g > 0) return water.mass_g;
  const volSum = contents.reduce((s, c) => s + (c.volume_ml ?? 0), 0);
  return volSum > 0 ? volSum : 50;
}

function summarizeSolutionLabel(contents: readonly SubstanceQuantity[], volume_ml: number): string {
  const safeVol_L = Math.max(1e-6, volume_ml / 1000);
  const solutes = contents.filter(
    (c) => c.moles > 1e-8 && cleanFormula(c.formula).toLowerCase() !== 'h2o' && !detectIndicatorType(c.formula)
  );
  if (solutes.length === 0) return `H2O (${Math.round(volume_ml)} mL)`;
  return solutes
    .slice(0, 2)
    .map((s) => `${cleanFormula(s.formula)} ${(s.moles / safeVol_L).toFixed(2)}M`)
    .join(' + ');
}

function mergeQuantitiesScaled(
  base: readonly SubstanceQuantity[],
  titrant: readonly SubstanceQuantity[],
  titrantScale: number
): SubstanceQuantity[] {
  const map = new Map<string, SubstanceQuantity>();
  const addItem = (item: SubstanceQuantity, scale: number) => {
    if (!(item.moles > 0)) return;
    const key = cleanFormula(item.formula).toUpperCase();
    const prev = map.get(key);
    const m = item.moles * scale;
    const g = item.mass_g * scale;
    if (prev) {
      prev.moles += m;
      prev.mass_g += g;
    } else {
      map.set(key, { ...item, moles: m, mass_g: g });
    }
  };
  for (const b of base) addItem(b, 1);
  if (titrantScale > 0) {
    for (const t of titrant) addItem(t, titrantScale);
  }
  return [...map.values()];
}

function detectFirstIndicator(contents: readonly SubstanceQuantity[]): IndicatorType | null {
  for (const item of contents) {
    if (item.moles <= 1e-10 && !(item.concentration_M && item.concentration_M > 0)) continue;
    const ind = detectIndicatorType(item.formula);
    if (ind) return ind;
  }
  return null;
}

function estimateMaxSweepMl(
  analyte: readonly SubstanceQuantity[],
  titrant: readonly SubstanceQuantity[],
  titrantBatchVol_ml: number
): number {
  let analyteEquiv = 0;
  for (const a of analyte) {
    const k = cleanFormula(a.formula).toLowerCase();
    if (k === 'h2o' || detectIndicatorType(k)) continue;
    analyteEquiv += a.moles * speciesProticity(k);
  }
  let titrantEquivPerMl = 0;
  for (const t of titrant) {
    const k = cleanFormula(t.formula).toLowerCase();
    if (k === 'h2o' || detectIndicatorType(k)) continue;
    titrantEquivPerMl += (t.moles / Math.max(0.1, titrantBatchVol_ml)) * speciesProticity(k);
  }
  if (analyteEquiv > 1e-6 && titrantEquivPerMl > 1e-6) {
    const vEq = analyteEquiv / titrantEquivPerMl;
    const target = Math.ceil((vEq * 1.8) / 5) * 5;
    return Math.max(25, Math.min(100, target));
  }
  return 50;
}

/**
 * Computes a complete theoretical acid-base & conductometric titration curve using
 * exact charge-balance aqueous equilibria and Kohlrausch ionic conductivities.
 */
export function simulateEquilibriumTitration(
  input: TitrationSimulationInput
): TitrationSimulationResult {
  const temperature_c = input.temperature_c ?? 25;
  const analyteVol = Math.max(1, input.analyteVolume_ml);
  const titrantBatchVol = estimateBatchVolumeMl(input.titrantContents, input.titrantBatchVolume_ml);
  const maxVol = Math.max(
    10,
    input.maxTitrantAdded_ml ?? estimateMaxSweepMl(input.analyteContents, input.titrantContents, titrantBatchVol)
  );
  const detectedIndicator =
    input.indicator !== undefined
      ? input.indicator
      : detectFirstIndicator(input.analyteContents) ?? detectFirstIndicator(input.titrantContents);

  const evaluateAt = (vAdded: number) => {
    const scale = vAdded / titrantBatchVol;
    const mixture = mergeQuantitiesScaled(input.analyteContents, input.titrantContents, scale);
    const totalVol = analyteVol + vAdded;
    const ph = calculateSolutionPh(mixture, totalVol, temperature_c);
    const conductivity = calculateSolutionConductivity(mixture, totalVol, temperature_c);
    const colorHex = detectedIndicator ? getIndicatorColor(detectedIndicator, ph) : '#38bdf8';
    return {
      volumeAdded_ml: Math.round(vAdded * 1000) / 1000,
      ph,
      conductivity_mS_cm: conductivity.conductivity_mS_cm,
      colorHex,
    };
  };

  // Pass 1: coarse grid to find steep inflection windows
  const coarseStep = maxVol <= 60 ? 0.5 : 1.0;
  const gridSet = new Set<number>([0]);
  for (let v = coarseStep; v < maxVol - 1e-6; v += coarseStep) {
    gridSet.add(Math.round(v * 100) / 100);
  }
  gridSet.add(Math.round(maxVol * 100) / 100);

  const coarseVolumes = [...gridSet].sort((a, b) => a - b);
  const coarseEval = coarseVolumes.map(evaluateAt);

  // Adaptive 0.1 mL refinement inside any steep delta-pH window for razor-sharp V_eq
  for (let i = 1; i < coarseEval.length; i++) {
    const dv = coarseEval[i].volumeAdded_ml - coarseEval[i - 1].volumeAdded_ml;
    const dPh = Math.abs(coarseEval[i].ph - coarseEval[i - 1].ph);
    if (dPh / Math.max(0.05, dv) >= 0.38) {
      const start = Math.max(0, coarseEval[i - 1].volumeAdded_ml - 0.5);
      const end = Math.min(maxVol, coarseEval[i].volumeAdded_ml + 0.5);
      for (let v = start; v <= end + 1e-6; v += 0.1) {
        gridSet.add(Math.round(v * 10) / 10);
      }
    }
  }

  const allVolumes = [...gridSet].sort((a, b) => a - b);
  const rawPoints = allVolumes.map(evaluateAt);

  // Centered finite difference dpH/dV
  const points: TitrationPoint[] = rawPoints.map((pt, idx) => {
    let dpH_dV = 0;
    if (idx === 0 && rawPoints.length > 1) {
      const dv = rawPoints[1].volumeAdded_ml - pt.volumeAdded_ml;
      dpH_dV = dv > 0 ? (rawPoints[1].ph - pt.ph) / dv : 0;
    } else if (idx === rawPoints.length - 1 && rawPoints.length > 1) {
      const prev = rawPoints[idx - 1];
      const dv = pt.volumeAdded_ml - prev.volumeAdded_ml;
      dpH_dV = dv > 0 ? (pt.ph - prev.ph) / dv : 0;
    } else if (rawPoints.length > 2) {
      const prev = rawPoints[idx - 1];
      const next = rawPoints[idx + 1];
      const dv = next.volumeAdded_ml - prev.volumeAdded_ml;
      dpH_dV = dv > 0 ? (next.ph - prev.ph) / dv : 0;
    }
    return {
      ...pt,
      dpH_dV: Math.round(dpH_dV * 1000) / 1000,
    };
  });

  // Detect true derivative local maxima (>= 0.42 pH/mL), de-clustered within 3.0 mL
  const candidatePeaks: EquivalencePointInfo[] = [];
  for (let i = 1; i < points.length - 1; i++) {
    const curr = Math.abs(points[i].dpH_dV);
    const prev = Math.abs(points[i - 1].dpH_dV);
    const next = Math.abs(points[i + 1].dpH_dV);
    if (curr >= 0.42 && curr >= prev && curr > next) {
      candidatePeaks.push({
        volume_ml: points[i].volumeAdded_ml,
        ph: points[i].ph,
        slopeAbs_dpH_dV: curr,
        index: i,
      });
    }
  }

  // Filter closely spaced duplicates: keep strongest peak within 3.0 mL window
  candidatePeaks.sort((a, b) => b.slopeAbs_dpH_dV - a.slopeAbs_dpH_dV);
  const equivalencePoints: EquivalencePointInfo[] = [];
  for (const peak of candidatePeaks) {
    if (equivalencePoints.every((kept) => Math.abs(kept.volume_ml - peak.volume_ml) >= 3.0)) {
      equivalencePoints.push(peak);
    }
  }
  equivalencePoints.sort((a, b) => a.volume_ml - b.volume_ml);

  // Detect half-equivalence buffer region for weak acid/base when pKa/pKb plateau exists
  let halfEquivalence: BufferRegionInfo | null = null;
  if (equivalencePoints.length > 0 && points.length > 4) {
    const vHalf = equivalencePoints[0].volume_ml / 2;
    if (vHalf >= 1.5) {
      let bestIdx = 0;
      let bestDist = Infinity;
      for (let i = 0; i < points.length; i++) {
        const dist = Math.abs(points[i].volumeAdded_ml - vHalf);
        if (dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      const pHalf = points[bestIdx];
      // A buffer region shows small |dpH/dV| (< 0.12 pH/mL) and intermediate pH (2.5..11.5)
      if (Math.abs(pHalf.dpH_dV) < 0.12 && pHalf.ph > 2.5 && pHalf.ph < 11.5) {
        const isAcidAnalyte = points[0].ph < 6.5;
        halfEquivalence = {
          halfEquivalenceVolume_ml: Math.round(vHalf * 100) / 100,
          phAtHalfEq: Math.round(pHalf.ph * 100) / 100,
          effectiveConstantLabel: isAcidAnalyte
            ? `pKa ≈ ${pHalf.ph.toFixed(2)}`
            : `pKb ≈ ${(14 - pHalf.ph).toFixed(2)}`,
        };
      }
    }
  }

  return {
    points,
    equivalencePoints,
    halfEquivalence,
    initialPh: points[0]?.ph ?? 7,
    finalPh: points[points.length - 1]?.ph ?? 7,
    maxVolume_ml: maxVol,
    detectedIndicator,
    analyteLabel: input.analyteLabel ?? summarizeSolutionLabel(input.analyteContents, analyteVol),
    titrantLabel: input.titrantLabel ?? summarizeSolutionLabel(input.titrantContents, titrantBatchVol),
  };
}

/**
 * Shared selector finding active burette and its receiving vessel on the workbench.
 */
export function findTitrationPair(
  allEquipment: readonly EquipmentState[],
  selectedItem: EquipmentState | null
): { burette: EquipmentState | null; vessel: EquipmentState | null } {
  const burette =
    (selectedItem?.type === 'burette' ? selectedItem : null) ??
    allEquipment.find((e) => e.type === 'burette') ??
    null;

  const vesselUnderBurette = burette
    ? allEquipment.find(
        (e) =>
          e.id !== burette.id &&
          e.isContainer &&
          Math.abs(e.x + e.width / 2 - (burette.x + burette.width / 2)) < 85 &&
          e.y > burette.y
      ) ?? null
    : null;

  const fallbackVessel =
    vesselUnderBurette ??
    (selectedItem && selectedItem.isContainer && selectedItem.type !== 'burette'
      ? selectedItem
      : null) ??
    allEquipment.find((e) => e.type === 'erlenmeyer_flask' || e.type === 'beaker') ??
    null;

  return { burette, vessel: fallbackVessel };
}

export interface TitrationTraceSample {
  timestamp: number;
  vesselId: string;
  buretteId: string;
  volumeAdded_ml: number;
  ph: number;
  conductivity_mS_cm: number;
  colorHex: string;
}

/**
 * Pure helper appending burette dispensing samples (including a V=0 baseline point
 * on the first aliquot) with adaptive decimation for 60 FPS continuous drips.
 */
export function appendBuretteTrace(
  trace: readonly TitrationTraceSample[],
  prevBurette: EquipmentState,
  preDropTarget: EquipmentState,
  updatedTarget: EquipmentState,
  dropAmount_ml: number,
  now = Date.now()
): { nextTrace: TitrationTraceSample[]; nextCumulative_ml: number } {
  const prevCum = prevBurette.cumulativeTitrated_ml ?? 0;
  const nextCumulative_ml = Math.round((prevCum + dropAmount_ml) * 1000) / 1000;
  let nextTrace: TitrationTraceSample[] = [...trace];

  const last = nextTrace[nextTrace.length - 1];
  const isNewPair =
    !last || last.vesselId !== updatedTarget.id || last.buretteId !== prevBurette.id;

  if (prevCum === 0 && isNewPair) {
    const baseCond = calculateSolutionConductivity(
      preDropTarget.contents,
      preDropTarget.volume_ml,
      preDropTarget.temperature_c
    );
    nextTrace.push({
      timestamp: now,
      vesselId: updatedTarget.id,
      buretteId: prevBurette.id,
      volumeAdded_ml: 0,
      ph: Math.round(preDropTarget.ph * 100) / 100,
      conductivity_mS_cm: Math.round(baseCond.conductivity_mS_cm * 1000) / 1000,
      colorHex: preDropTarget.liquidColorHex || '#f8fafc',
    });
  }

  const latest = nextTrace[nextTrace.length - 1];
  const samePair =
    latest && latest.vesselId === updatedTarget.id && latest.buretteId === prevBurette.id;
  const dv = samePair ? nextCumulative_ml - latest.volumeAdded_ml : Infinity;
  const dPh = samePair ? Math.abs(updatedTarget.ph - latest.ph) : Infinity;

  if (!samePair || dv >= 0.25 || dPh >= 0.06) {
    const cond = calculateSolutionConductivity(
      updatedTarget.contents,
      updatedTarget.volume_ml,
      updatedTarget.temperature_c
    );
    nextTrace.push({
      timestamp: now,
      vesselId: updatedTarget.id,
      buretteId: prevBurette.id,
      volumeAdded_ml: nextCumulative_ml,
      ph: Math.round(updatedTarget.ph * 100) / 100,
      conductivity_mS_cm: Math.round(cond.conductivity_mS_cm * 1000) / 1000,
      colorHex: updatedTarget.liquidColorHex || '#f8fafc',
    });
    if (nextTrace.length > 400) {
      nextTrace = nextTrace.slice(-400);
    }
  }

  return { nextTrace, nextCumulative_ml };
}

