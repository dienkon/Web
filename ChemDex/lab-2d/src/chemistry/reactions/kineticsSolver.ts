/**
 * Continuous Chemical Kinetics Solver for Lab-2D (Lab-3D Parity)
 *
 * Transforms synchronous stoichiometric endpoint calculation (`runSimulationCycle`) into
 * smooth, physically realistic time-stepped conversion (`progress: 0 -> 1`) governed by:
 *   - Kinetic reaction class (aqueous_fast, precipitation_crystal, surface_slow,
 *     alkali_water, silver_mirror, heat_activated, catalytic, clock_induction)
 *   - Arrhenius thermal acceleration factor: Q10 ≈ 2^((T - 25) / 10)
 *   - Mechanical stirring transport boost: (1 + 1.4 * stirIntensity)
 *   - Element-conserving convex stoichiometric interpolation: C(t+dt) = (1-λ)C(t) + λC_eq
 *   - Induction periods for clock / autocatalytic reactions & unmet condition diagnostics
 */

import { EquipmentState } from '../../types/equipment';
import {
  IndicatorType,
  PrecipitateMorphology,
  ReactionDefinition,
  ReactionExecutionRecord,
  SimulationResult,
  SubstanceQuantity,
} from '../../types/chemistry';
import { runSimulationCycle } from './engine';
import { REACTION_DATABASE } from './reactionDatabase';
import {
  buildPhysicalSolidAndPrecipitateStates,
  resolveControllerIdForReaction,
} from './instantRuleSolver';
import { calculateSolutionPh, getIndicatorColor } from '../equilibrium/acidBase';
import { blendHexLinear, calculateMixtureOptics } from '../optics/liquidOptics';
import { calculateMixturePhysicalProperties } from '../physical/substanceProps';
import { computeMolarMass, normalizeFormula } from '../core/formula';

export type KineticClass =
  | 'aqueous_fast'
  | 'precipitation_crystal'
  | 'surface_slow'
  | 'alkali_water'
  | 'silver_mirror'
  | 'heat_activated'
  | 'catalytic'
  | 'clock_induction';

export interface KineticProfile {
  kineticClass: KineticClass;
  baseDuration_s: number;
  inductionDelay_s: number;
  stageLabels_vi: [string, string, string, string];
  stageLabels_en: [string, string, string, string];
}

export interface KineticJobState {
  vesselId: string;
  reactionId: string;
  equation: string;
  profile: KineticProfile;
  elapsed_s: number;
  progress: number; // 0..1
  completed: boolean;
  startColorHex: string;
  startTemp_c: number;
  remainingDeltaT_c: number;
  remainingEscapedGas_g: Record<string, number>;
  targetResult: SimulationResult;
  fingerprint: string;
}

export interface KineticPreparationOutput {
  simResult: SimulationResult;
  activeReactionLabel?: string;
  activeReactionProgress?: number;
  silverMirrorProgress?: number;
  startedJob?: KineticJobState;
  unmetCondition?: {
    reactionId: string;
    equation: string;
    minTemp_c: number;
    label_vi: string;
    label_en: string;
  };
}

export interface KineticTickOutput {
  changed: boolean;
  simPartial?: Partial<EquipmentState>;
  completedReactions: ReactionExecutionRecord[];
  stepEscapedGas_g?: Record<string, number>;
  shouldPlayFizz?: boolean;
  shouldPlaySuccess?: boolean;
}

const INDICATOR_FORMULA_MAP: Record<string, IndicatorType> = {
  PHENOLPHTHALEIN: 'phenolphthalein',
  METHYL_ORANGE: 'methyl_orange',
  METHYLORANGE: 'methyl_orange',
  THYMOLPHTHALEIN: 'thymolphthalein',
  BROMOTHYMOL_BLUE: 'bromothymol_blue',
  UNIVERSAL_INDICATOR: 'universal',
  LITMUS: 'litmus',
};

function computeInventoryFingerprint(contents: SubstanceQuantity[]): string {
  return contents
    .filter((c) => c.moles > 1e-6)
    .map((c) => `${normalizeFormula(c.formula)}:${c.state}:${c.moles.toFixed(4)}`)
    .sort()
    .join('|');
}

function getStageText(profile: KineticProfile, progress: number, vi: boolean): string {
  const labels = vi ? profile.stageLabels_vi : profile.stageLabels_en;
  if (progress < 0.25) return labels[0];
  if (progress < 0.55) return labels[1];
  if (progress < 0.9) return labels[2];
  return labels[3];
}

/**
 * Classifies a triggered reaction bundle into a slow, authentic Lab-3D kinetic curve
 * with descriptive multi-stage labels.
 */
export function classifyKineticProfile(sim: SimulationResult): KineticProfile {
  const rxList = sim.reactionsOccurred;
  const primaryId = (rxList[0]?.reactionId || '').toLowerCase();
  const hasMirror = Boolean(sim.hasSilverMirror) || primaryId.includes('silver_mirror') || primaryId.includes('tollens');

  if (hasMirror) {
    return {
      kineticClass: 'silver_mirror',
      baseDuration_s: 7.5,
      inductionDelay_s: 0.7,
      stageLabels_vi: [
        'Khử phức [Ag(NH₃)₂]⁺ tạo hạt mầm bạc',
        'Tinh thể Ag⁰ lắng bám lên thành thủy tinh',
        'Phủ dần lớp gương bạc phản chiếu',
        'Hoàn tất lớp tráng gương bạc Ag sáng bóng',
      ],
      stageLabels_en: [
        'Reducing [Ag(NH₃)₂]⁺ complex ions',
        'Nucleating silver Ag⁰ film on glass wall',
        'Growing specular silver mirror coating',
        'Mirror-bright silver coating complete',
      ],
    };
  }

  if (primaryId.includes('iodine_clock') || primaryId.includes('thiosulfate') || primaryId.includes('sulfur_clock')) {
    return {
      kineticClass: 'clock_induction',
      baseDuration_s: 5.5,
      inductionDelay_s: primaryId.includes('iodine_clock') ? 2.6 : 1.6,
      stageLabels_vi: [
        'Giai đoạn cảm ứng (trao đổi điện tử chậm)',
        'Tạo keo / iốt tự do đột ngột chuyển màu',
        'Phát triển mật độ màu đặc trưng toàn bình',
        'Ổn định hệ đồng hồ hóa học',
      ],
      stageLabels_en: [
        'Induction delay phase',
        'Sudden clock transition onset',
        'Bulk optical density transition',
        'Clock equilibrium reached',
      ],
    };
  }

  if (primaryId.includes('sodium_water') || primaryId.includes('potassium_water') || primaryId.includes('na_water') || primaryId.includes('k_water')) {
    return {
      kineticClass: 'alkali_water',
      baseDuration_s: 6.2,
      inductionDelay_s: 0.15,
      stageLabels_vi: [
        'Kim loại kiềm nóng chảy chạy trên mặt nước',
        'Thoát khí H₂ mạnh & loang bazơ OH⁻',
        'Nhiệt phản ứng tăng cao, dung dịch chuyển kiềm',
        'Kim loại tan hết — hoàn tất phản ứng',
      ],
      stageLabels_en: [
        'Alkali metal melts & skitters on surface',
        'Vigorous H₂ evolution & hydroxide bloom',
        'Exothermic rise & alkaline stabilization',
        'Metal completely reacted',
      ],
    };
  }

  if (primaryId.includes('h2o2') || primaryId.includes('kmno4_oxalic') || primaryId.includes('autocatalytic')) {
    return {
      kineticClass: 'catalytic',
      baseDuration_s: 6.4,
      inductionDelay_s: primaryId.includes('kmno4') ? 1.1 : 0.2,
      stageLabels_vi: [
        'Hoạt hóa trên bề mặt xúc tác',
        'Tốc độ phản ứng tự xúc tác tăng mạnh',
        'Phân hủy ổn định, thoát khí / mất màu dần',
        'Hoàn tất phản ứng xúc tác',
      ],
      stageLabels_en: [
        'Catalytic surface activation',
        'Autocatalytic rate acceleration',
        'Steady decomposition & color shift',
        'Catalytic reaction complete',
      ],
    };
  }

  const precipFormula = sim.precipitateInfo?.formula || '';
  if (
    primaryId.includes('pbi2') ||
    precipFormula === 'PbI2' ||
    sim.hasPrecipitate
  ) {
    const isPbI2 = primaryId.includes('pbi2') || precipFormula === 'PbI2';
    return {
      kineticClass: 'precipitation_crystal',
      baseDuration_s: isPbI2 ? 3.8 : 3.2,
      inductionDelay_s: 0.2,
      stageLabels_vi: isPbI2
        ? [
            'Ion Pb²⁺ tiếp xúc I⁻ tạo độ đục nhẹ',
            'Kết tinh mầm vảy vàng PbI₂ lơ lửng',
            'Mưa vàng PbI₂ rơi lấp lánh khắp bình',
            'Tinh thể PbI₂ lắng dần xuống đáy',
          ]
        : [
            `Trộn dung dịch & tạo mầm ${precipFormula || 'kết tủa'}`,
            `Kết tủa ${precipFormula || ''} lan tỏa trong dung dịch`,
            `Hạt kết tủa ${precipFormula || ''} kết tụ lớn dần`,
            `Lắng lớp kết tủa ${precipFormula || ''} xuống đáy`,
          ],
      stageLabels_en: isPbI2
        ? [
            'Pb²⁺ meets I⁻ forming early nuclei',
            'Suspending shimmering yellow PbI₂ micro-plates',
            'Golden rain PbI₂ cascading down vessel',
            'Golden PbI₂ crystals settling to bottom',
          ]
        : [
            `Mixing ions & nucleating ${precipFormula || 'precipitate'}`,
            `Precipitate ${precipFormula || ''} spreading`,
            `Coagulation of ${precipFormula || ''} particles`,
            `Settling ${precipFormula || ''} sediment bed`,
          ],
    };
  }

  if (
    primaryId.includes('decomp') ||
    primaryId.includes('thermal') ||
    primaryId.includes('sublimation')
  ) {
    return {
      kineticClass: 'heat_activated',
      baseDuration_s: 5.0,
      inductionDelay_s: 0.3,
      stageLabels_vi: [
        'Hấp thụ nhiệt phá vỡ liên kết',
        'Chuyển pha / nhiệt phân chất rắn từ từ',
        'Thoát hơi nước & ổn định sản phẩm bền nhiệt',
        'Hoàn tất quá trình nhiệt phân',
      ],
      stageLabels_en: [
        'Thermal bond activation',
        'Gradual decomposition / dehydration',
        'Vapor release & phase stabilization',
        'Thermal decomposition complete',
      ],
    };
  }

  if (sim.gasInfo || primaryId.includes('cu_hno3') || primaryId.includes('zn_') || primaryId.includes('fe_') || primaryId.includes('mg_')) {
    return {
      kineticClass: 'surface_slow',
      baseDuration_s: 6.8,
      inductionDelay_s: 0.25,
      stageLabels_vi: [
        'Bề mặt rắn tiếp xúc dung dịch axit/muối',
        'Bọt khí / ion hòa tan sinh ra đều đặn',
        'Chất rắn mòn dần & màu dung dịch đậm lên',
        'Ổn định cân bằng — phản ứng kết thúc',
      ],
      stageLabels_en: [
        'Reagent wets solid reaction surface',
        'Steady gas evolution & ion release',
        'Solid shrinks & solution color deepens',
        'Stoichiometric limit reached',
      ],
    };
  }

  return {
    kineticClass: 'aqueous_fast',
    baseDuration_s: 1.1,
    inductionDelay_s: 0,
    stageLabels_vi: [
      'Khuếch tán ion nhanh trong pha lỏng',
      'Trung hòa & dịch chuyển cân bằng pH',
      'Khuếch tán đồng nhất màu dung dịch',
      'Đạt trạng thái cân bằng ion',
    ],
    stageLabels_en: [
      'Rapid aqueous ion diffusion',
      'Neutralization & pH equilibration',
      'Homogenizing optical mixture',
      'Ionic equilibrium stabilized',
    ],
  };
}

/**
 * Checks REACTION_DATABASE for any reaction whose reactants are all present in sufficient
 * moles yet cannot fire because thermal activation temperature (`minTemp_c`) is not reached.
 */
export function detectUnmetReactionRequirement(
  contents: SubstanceQuantity[],
  temperature_c: number
): KineticPreparationOutput['unmetCondition'] | undefined {
  const presentMap = new Map<string, number>();
  for (const item of contents) {
    if (item.moles <= 1e-6) continue;
    const norm = normalizeFormula(item.formula);
    presentMap.set(norm, (presentMap.get(norm) ?? 0) + item.moles);
  }

  for (const rx of REACTION_DATABASE) {
    const reqTemp = rx.minTemp_c ?? (rx.requiresHeating ? 60 : undefined);
    if (!reqTemp || temperature_c >= reqTemp) continue;

    let allPresent = true;
    for (const r of rx.reactants) {
      const norm = normalizeFormula(r.formula);
      if (norm === 'H2O') continue;
      if ((presentMap.get(norm) ?? 0) < 1e-5) {
        allPresent = false;
        break;
      }
    }

    if (allPresent) {
      return {
        reactionId: rx.id,
        equation: rx.equation,
        minTemp_c: reqTemp,
        label_vi: `⏳ Cần đun ≥ ${reqTemp}°C (hiện ${temperature_c.toFixed(0)}°C) · ${rx.equation}`,
        label_en: `⏳ Heat to ≥ ${reqTemp}°C (now ${temperature_c.toFixed(0)}°C) · ${rx.equation}`,
      };
    }
  }

  return undefined;
}

function interpolateContentsLinear(
  current: SubstanceQuantity[],
  target: SubstanceQuantity[],
  lambda: number
): SubstanceQuantity[] {
  const clamped = Math.max(0, Math.min(1, lambda));
  if (clamped >= 0.9999) {
    return target.map((t) => ({ ...t }));
  }

  const map = new Map<string, SubstanceQuantity>();
  const keyFor = (s: SubstanceQuantity) => `${normalizeFormula(s.formula)}::${s.state}`;

  for (const item of current) {
    const key = keyFor(item);
    const moles = item.moles * (1 - clamped);
    const mass_g = item.mass_g * (1 - clamped);
    map.set(key, {
      ...item,
      moles,
      mass_g,
    });
  }

  for (const item of target) {
    const key = keyFor(item);
    const existing = map.get(key);
    const addMoles = item.moles * clamped;
    const addMass = item.mass_g * clamped;
    if (existing) {
      existing.moles += addMoles;
      existing.mass_g += addMass;
      if (item.concentration_M !== undefined) {
        existing.concentration_M = item.concentration_M;
      }
    } else {
      map.set(key, {
        ...item,
        moles: addMoles,
        mass_g: addMass,
      });
    }
  }

  const result: SubstanceQuantity[] = [];
  for (const val of map.values()) {
    if (val.moles <= 1e-7 && val.formula !== 'H2O') continue;
    const molarMass = computeMolarMass(val.formula) || 18;
    result.push({
      ...val,
      moles: Math.max(0, val.moles),
      mass_g: Math.max(0, val.mass_g > 0 ? val.mass_g : val.moles * molarMass),
    });
  }
  return result;
}

function computeIntermediateAppearance(
  contents: SubstanceQuantity[],
  volume_ml: number,
  startColorHex: string,
  targetSim: SimulationResult,
  progress: number
): {
  ph: number;
  liquidColorHex: string;
  liquidOpacity: number;
} {
  const ph = calculateSolutionPh(contents, Math.max(volume_ml, 1));
  const optics = calculateMixtureOptics(contents, Math.max(volume_ml, 1));

  // If any active acid-base indicator exists, evaluate live indicator tint at intermediate pH
  let indicatorHex: string | undefined;
  for (const item of contents) {
    if (item.moles <= 1e-8) continue;
    const indType = INDICATOR_FORMULA_MAP[normalizeFormula(item.formula)];
    if (indType) {
      indicatorHex = getIndicatorColor(indType, ph);
      break;
    }
  }

  const blendedTarget = blendHexLinear(startColorHex || '#f8fafc', targetSim.finalLiquidColorHex || '#f8fafc', progress);
  const liquidColorHex = indicatorHex
    ? blendHexLinear(blendedTarget, indicatorHex, 0.78)
    : optics.hasActiveChromophore
      ? blendHexLinear(optics.colorHex, blendedTarget, progress)
      : blendedTarget;

  return {
    ph,
    liquidColorHex,
    liquidOpacity: Math.max(optics.opacity, 0.72),
  };
}

class KineticRuntimeEngine2D {
  private jobs = new Map<string, KineticJobState>();

  public getJob(vesselId: string): KineticJobState | undefined {
    return this.jobs.get(vesselId);
  }

  public clearVessel(vesselId: string): void {
    this.jobs.delete(vesselId);
  }

  public resetAll(): void {
    this.jobs.clear();
  }

  public setJob(job: KineticJobState): void {
    this.jobs.set(job.vesselId, job);
  }
}

export const kineticRuntime2D = new KineticRuntimeEngine2D();

/**
 * Prepares chemical evaluation on vessel changes (`addChemicalToEquipment`, `transferMaterial`, etc.).
 * When `realtimeKinetics` is false (headless sync tests), returns full synchronous `runSimulationCycle`.
 * When `realtimeKinetics` is true (interactive 2D lab), preserves initial reactant composition at frame 0
 * and queues a smooth stoichiometric KineticJob executed incrementally inside `stepVesselKineticTick`.
 */
export function prepareVesselSimulation(
  vessel: EquipmentState,
  nextContents: SubstanceQuantity[],
  nextVolume_ml: number,
  nextTemp_c: number,
  isHeating: boolean,
  isOpenVessel: boolean,
  envContext?: { oxygenFraction?: number },
  realtimeKinetics = false
): KineticPreparationOutput {
  const simOptions = {
    oxygenFraction: envContext?.oxygenFraction,
    initialSolidMassByFormula: vessel.initialSolidMassByFormula,
  };
  const probeSim = runSimulationCycle(
    nextContents,
    nextVolume_ml,
    nextTemp_c,
    isHeating,
    isOpenVessel,
    simOptions
  );

  if (!realtimeKinetics) {
    return {
      simResult: probeSim,
      silverMirrorProgress: probeSim.hasSilverMirror ? 1 : vessel.silverMirrorProgress ?? 0,
    };
  }

  if (probeSim.reactionsOccurred.length === 0) {
    kineticRuntime2D.clearVessel(vessel.id);
    const unmetCondition = detectUnmetReactionRequirement(nextContents, nextTemp_c);
    return {
      simResult: probeSim,
      activeReactionLabel: unmetCondition?.label_vi,
      activeReactionProgress: undefined,
      silverMirrorProgress: vessel.silverMirrorProgress ?? 0,
      unmetCondition,
    };
  }

  const existingJob = kineticRuntime2D.getJob(vessel.id);
  const primaryRxId = probeSim.reactionsOccurred[0].reactionId;
  if (existingJob && !existingJob.completed && existingJob.reactionId === primaryRxId) {
    // Preserve ongoing reaction progress during continuous pours / dropwise addition
    const nextFp = computeInventoryFingerprint(nextContents);
    const addedNewMaterial = nextFp !== existingJob.fingerprint;
    existingJob.targetResult = probeSim;
    existingJob.remainingDeltaT_c = probeSim.finalTemperature_c - nextTemp_c;
    existingJob.remainingEscapedGas_g = { ...(probeSim.escapedGas_g ?? {}) };
    existingJob.fingerprint = nextFp;
    if (addedNewMaterial) {
      existingJob.progress = Math.min(existingJob.progress, 0.72);
    }
    const stageText = getStageText(existingJob.profile, existingJob.progress, true);
    const pct = Math.round(existingJob.progress * 100);
    const partialApp = computeIntermediateAppearance(
      nextContents,
      nextVolume_ml,
      existingJob.startColorHex,
      probeSim,
      existingJob.progress
    );
    const { solidChunks, precipitateLayers } = buildPhysicalSolidAndPrecipitateStates(
      nextContents,
      undefined,
      undefined,
      {
        fluidDensity_g_ml: probeSim.density_g_ml ?? vessel.density_g_ml ?? 1.0,
        hasGas: Boolean(vessel.hasGas),
        viscosity_mPa_s: vessel.viscosity_mPa_s ?? 0.89,
        initialSolidMassByFormula: vessel.initialSolidMassByFormula,
      }
    );
    return {
      simResult: {
        updatedContents: nextContents.map((c) => ({ ...c })),
        finalTemperature_c: nextTemp_c,
        finalPh: partialApp.ph,
        finalLiquidColorHex: partialApp.liquidColorHex,
        liquidOpacity: partialApp.liquidOpacity,
        reactionsOccurred: [],
        hasPrecipitate: Boolean(vessel.hasPrecipitate),
        precipitateInfo: vessel.hasPrecipitate && vessel.precipitateSubstance
          ? {
              formula: vessel.precipitateSubstance,
              colorHex: vessel.precipitateColorHex || '#ffffff',
              mass_g: vessel.precipitateMass_g || 0,
              morphology: (vessel.precipitateMorphology || 'powder') as PrecipitateMorphology,
            }
          : undefined,
        hasGas: Boolean(vessel.hasGas),
        isBoiling: nextTemp_c >= 100,
        isExplosion: false,
        isDangerous: false,
        hasPhaseSeparation: probeSim.hasPhaseSeparation,
        organicLayerVolume_ml: probeSim.organicLayerVolume_ml,
        organicLayerColorHex: probeSim.organicLayerColorHex,
        hasFumes: Boolean(vessel.hasFumes),
        turbidity: vessel.turbidity ?? 0,
        foamHead_mm: vessel.foamHead_mm ?? 0,
        hasSilverMirror: Boolean(vessel.hasSilverMirror),
        flameTestColorHex: probeSim.flameTestColorHex,
        activeControllerIds: probeSim.activeControllerIds,
        solidChunks,
        precipitateLayers,
      },
      activeReactionLabel: `${stageText} (${pct}%)`,
      activeReactionProgress: existingJob.progress,
      silverMirrorProgress: vessel.silverMirrorProgress ?? 0,
      startedJob: existingJob,
    };
  }

  const profile = classifyKineticProfile(probeSim);
  const startColorHex = vessel.liquidColorHex || '#f8fafc';
  const startPh = calculateSolutionPh(nextContents, Math.max(nextVolume_ml, 1));
  const baselineOptics = calculateMixtureOptics(nextContents, Math.max(nextVolume_ml, 1));

  // If aqueous fast reaction has an indicator, preserve indicator tint at initial pH before conversion finishes
  let initColorHex = baselineOptics.hasActiveChromophore ? baselineOptics.colorHex : startColorHex;
  for (const item of nextContents) {
    if (item.moles <= 1e-8) continue;
    const indType = INDICATOR_FORMULA_MAP[normalizeFormula(item.formula)];
    if (indType) {
      initColorHex = getIndicatorColor(indType, startPh);
      break;
    }
  }

  const job: KineticJobState = {
    vesselId: vessel.id,
    reactionId: probeSim.reactionsOccurred[0].reactionId,
    equation: probeSim.reactionsOccurred.map((r) => r.equation).join(' + '),
    profile,
    elapsed_s: 0,
    progress: 0,
    completed: false,
    startColorHex: initColorHex,
    startTemp_c: nextTemp_c,
    remainingDeltaT_c: probeSim.finalTemperature_c - nextTemp_c,
    remainingEscapedGas_g: { ...(probeSim.escapedGas_g ?? {}) },
    targetResult: probeSim,
    fingerprint: computeInventoryFingerprint(nextContents),
  };

  kineticRuntime2D.setJob(job);

  // Return initial t = 0 state so reactants are NOT vanished instantly
  const { solidChunks, precipitateLayers } = buildPhysicalSolidAndPrecipitateStates(
    nextContents,
    undefined,
    undefined,
    {
      fluidDensity_g_ml: probeSim.density_g_ml ?? vessel.density_g_ml ?? 1.0,
      hasGas: Boolean(vessel.hasGas),
      viscosity_mPa_s: vessel.viscosity_mPa_s ?? 0.89,
      initialSolidMassByFormula: vessel.initialSolidMassByFormula,
    }
  );
  const stageText = getStageText(profile, 0, true);

  const deferredSim: SimulationResult = {
    updatedContents: nextContents.map((c) => ({ ...c })),
    finalTemperature_c: nextTemp_c,
    finalPh: startPh,
    finalLiquidColorHex: initColorHex,
    liquidOpacity: Math.max(baselineOptics.opacity, 0.72),
    reactionsOccurred: [],
    hasPrecipitate: Boolean(vessel.hasPrecipitate),
    precipitateInfo: vessel.hasPrecipitate && vessel.precipitateSubstance
      ? {
          formula: vessel.precipitateSubstance,
          colorHex: vessel.precipitateColorHex || '#ffffff',
          mass_g: vessel.precipitateMass_g || 0,
          morphology: (vessel.precipitateMorphology || 'powder') as PrecipitateMorphology,
        }
      : undefined,
    hasGas: false,
    isBoiling: nextTemp_c >= 100,
    isExplosion: false,
    isDangerous: false,
    hasPhaseSeparation: probeSim.hasPhaseSeparation,
    organicLayerVolume_ml: probeSim.organicLayerVolume_ml,
    organicLayerColorHex: probeSim.organicLayerColorHex,
    hasFumes: false,
    turbidity: vessel.turbidity ?? 0,
    foamHead_mm: vessel.foamHead_mm ?? 0,
    hasSilverMirror: Boolean(vessel.hasSilverMirror),
    flameTestColorHex: probeSim.flameTestColorHex,
    activeControllerIds: probeSim.activeControllerIds,
    solidChunks,
    precipitateLayers,
  };

  return {
    simResult: deferredSim,
    activeReactionLabel: `${stageText} (0%)`,
    activeReactionProgress: 0,
    silverMirrorProgress: vessel.silverMirrorProgress ?? 0,
    startedJob: job,
  };
}

/**
 * Advances active kinetic reaction progression for one vessel during a simulation tick (`dt`).
 */
export function stepVesselKineticTick(
  eq: EquipmentState,
  dt: number,
  isOpenVessel: boolean,
  envContext?: { oxygenFraction?: number }
): KineticTickOutput {
  if (!eq.isContainer || eq.volume_ml <= 0 && eq.contents.length === 0) {
    kineticRuntime2D.clearVessel(eq.id);
    if (eq.activeReactionLabel || eq.activeReactionProgress !== undefined) {
      return {
        changed: true,
        simPartial: {
          activeReactionLabel: undefined,
          activeReactionProgress: undefined,
        },
        completedReactions: [],
      };
    }
    return { changed: false, completedReactions: [] };
  }

  let job = kineticRuntime2D.getJob(eq.id);
  const currentFp = computeInventoryFingerprint(eq.contents);

  // Detect newly unlocked thermal / mixing reaction when no active job exists (or reactants changed externally)
  const simOptions = {
    oxygenFraction: envContext?.oxygenFraction,
    initialSolidMassByFormula: eq.initialSolidMassByFormula,
  };
  if (!job || job.completed) {
    const probe = runSimulationCycle(
      eq.contents,
      eq.volume_ml,
      eq.temperature_c,
      Boolean(eq.isOn || eq.isBeingHeated),
      isOpenVessel,
      simOptions
    );

    if (probe.reactionsOccurred.length > 0) {
      const profile = classifyKineticProfile(probe);
      job = {
        vesselId: eq.id,
        reactionId: probe.reactionsOccurred[0].reactionId,
        equation: probe.reactionsOccurred.map((r) => r.equation).join(' + '),
        profile,
        elapsed_s: 0,
        progress: 0,
        completed: false,
        startColorHex: eq.liquidColorHex || '#f8fafc',
        startTemp_c: eq.temperature_c,
        remainingDeltaT_c: probe.finalTemperature_c - eq.temperature_c,
        remainingEscapedGas_g: { ...(probe.escapedGas_g ?? {}) },
        targetResult: probe,
        fingerprint: currentFp,
      };
      kineticRuntime2D.setJob(job);
    } else {
      const unmet = detectUnmetReactionRequirement(eq.contents, eq.temperature_c);
      const nextLabel = unmet?.label_vi;
      if (eq.activeReactionLabel !== nextLabel || eq.activeReactionProgress !== undefined) {
        return {
          changed: true,
          simPartial: {
            activeReactionLabel: nextLabel,
            activeReactionProgress: undefined,
          },
          completedReactions: [],
        };
      }
      return { changed: false, completedReactions: [] };
    }
  } else if (job.fingerprint !== currentFp && currentFp.length > 0 && job.progress < 0.99) {
    // Re-probe if vessel temperature crossed new reaction threshold (e.g. Tollens after pre-reaction)
    const reProbe = runSimulationCycle(
      eq.contents,
      eq.volume_ml,
      eq.temperature_c,
      Boolean(eq.isOn || eq.isBeingHeated),
      isOpenVessel,
      simOptions
    );
    if (reProbe.reactionsOccurred.length > 0 && reProbe.reactionsOccurred[0].reactionId !== job.reactionId) {
      const profile = classifyKineticProfile(reProbe);
      job = {
        vesselId: eq.id,
        reactionId: reProbe.reactionsOccurred[0].reactionId,
        equation: reProbe.reactionsOccurred.map((r) => r.equation).join(' + '),
        profile,
        elapsed_s: 0,
        progress: 0,
        completed: false,
        startColorHex: eq.liquidColorHex || '#f8fafc',
        startTemp_c: eq.temperature_c,
        remainingDeltaT_c: reProbe.finalTemperature_c - eq.temperature_c,
        remainingEscapedGas_g: { ...(reProbe.escapedGas_g ?? {}) },
        targetResult: reProbe,
        fingerprint: currentFp,
      };
      kineticRuntime2D.setJob(job);
    }
  }

  job.elapsed_s += dt;
  const { profile, targetResult } = job;

  // Still inside clock/autocatalytic induction delay?
  if (job.elapsed_s < profile.inductionDelay_s) {
    const waitLeft = Math.max(0.1, profile.inductionDelay_s - job.elapsed_s);
    const label = `${profile.stageLabels_vi[0]} (${waitLeft.toFixed(1)}s)`;
    return {
      changed: eq.activeReactionLabel !== label,
      simPartial: {
        activeReactionLabel: label,
        activeReactionProgress: 0,
      },
      completedReactions: [],
    };
  }

  // Arrhenius acceleration + mechanical stirring transport speedup + surface depletion fade
  const tempFactor = Math.max(0.35, Math.min(3.2, Math.pow(2, (eq.temperature_c - 25) / 12)));
  const stirFactor = 1 + Math.min(1, eq.stirIntensity ?? (eq.isStirred ? 0.85 : 0)) * 1.4;
  const depletionFade =
    profile.kineticClass === 'surface_slow'
      ? Math.max(0.28, Math.pow(Math.max(0.02, 1 - job.progress), 0.35))
      : 1;
  const rawStep = (dt / Math.max(0.45, profile.baseDuration_s)) * tempFactor * stirFactor * depletionFade;

  const prevProgress = job.progress;
  const nextProgress = Math.min(1, prevProgress + rawStep);
  const dProgress = nextProgress - prevProgress;
  const remaining = Math.max(1e-5, 1 - prevProgress);
  const lambda = nextProgress >= 0.9995 ? 1 : Math.min(1, dProgress / remaining);

  const nextContentsRaw = interpolateContentsLinear(eq.contents, targetResult.updatedContents, lambda);
  const isDone = nextProgress >= 0.9995;
  const nextContents = isDone
    ? nextContentsRaw.filter((c) => c.moles > 1e-6 || normalizeFormula(c.formula) === 'H2O')
    : nextContentsRaw;

  // Liquid water consumption shrinks solution volume proportionally (e.g. Na/K + H2O, CaO + H2O)
  const sumWaterMass = (list: SubstanceQuantity[]) =>
    list.reduce((s, c) => (normalizeFormula(c.formula) === 'H2O' ? s + c.mass_g : s), 0);
  const waterConsumed_g = Math.max(0, sumWaterMass(eq.contents) - sumWaterMass(nextContents));
  const nextVolume_ml = waterConsumed_g > 1e-4 ? Math.max(0, eq.volume_ml - waterConsumed_g) : eq.volume_ml;

  // Track escaped gas mass per step in open vessels
  const stepEscapedGas_g: Record<string, number> = {};
  const nextEscapedGas_g: Record<string, number> = { ...(eq.escapedGas_g ?? {}) };
  let addedGas_g = 0;
  for (const [gasFormula, remGrams] of Object.entries(job.remainingEscapedGas_g)) {
    const release = isDone ? remGrams : remGrams * lambda;
    if (release > 1e-7) {
      stepEscapedGas_g[gasFormula] = release;
      nextEscapedGas_g[gasFormula] = (nextEscapedGas_g[gasFormula] ?? 0) + release;
      addedGas_g += release;
    }
    job.remainingEscapedGas_g[gasFormula] = Math.max(0, remGrams - release);
  }

  const appliedDeltaT = job.remainingDeltaT_c * lambda;
  job.remainingDeltaT_c -= appliedDeltaT;
  const nextTemp_c = Math.max(0, eq.temperature_c + appliedDeltaT);
  job.progress = nextProgress;
  job.fingerprint = computeInventoryFingerprint(nextContents);

  const appearance = computeIntermediateAppearance(
    nextContents,
    nextVolume_ml,
    job.startColorHex,
    targetResult,
    nextProgress
  );

  // Compute proportional precipitate / gas / fume / silver mirror visibility
  const precipItem = targetResult.precipitateInfo
    ? nextContents.find(
        (c) => normalizeFormula(c.formula) === normalizeFormula(targetResult.precipitateInfo!.formula) && c.state === 's'
      )
    : undefined;
  const precipMass_g = precipItem?.mass_g ?? (targetResult.hasPrecipitate ? targetResult.precipitateInfo!.mass_g * nextProgress : 0);
  const showPrecipitate = Boolean(targetResult.hasPrecipitate && nextProgress >= 0.08 && precipMass_g > 0.002);

  const showGas = Boolean(!isDone && targetResult.hasGas && nextProgress >= 0.04);

  const nextSilverMirrorProgress = targetResult.hasSilverMirror
    ? Math.max(eq.silverMirrorProgress ?? 0, Math.min(1, Math.max(0, (nextProgress - 0.14) / 0.86)))
    : eq.silverMirrorProgress;
  const showSilverMirror = Boolean(
    eq.hasSilverMirror || (targetResult.hasSilverMirror && (nextSilverMirrorProgress ?? 0) >= 0.12)
  );

  const physProps = calculateMixturePhysicalProperties(nextContents, Math.max(1, nextVolume_ml), nextTemp_c);

  const { solidChunks, precipitateLayers } = buildPhysicalSolidAndPrecipitateStates(
    nextContents,
    targetResult.surfacePlating
      ? {
          ...targetResult.surfacePlating,
          progress: Math.min(1, (targetResult.surfacePlating.progress ?? 1) * nextProgress),
        }
      : undefined,
    showPrecipitate && targetResult.precipitateInfo
      ? { ...targetResult.precipitateInfo, mass_g: precipMass_g }
      : undefined,
    {
      fluidDensity_g_ml: physProps.density_g_ml,
      hasGas: showGas,
      viscosity_mPa_s: physProps.viscosity_mPa_s,
      initialSolidMassByFormula: eq.initialSolidMassByFormula,
    }
  );

  const pct = Math.round(nextProgress * 100);
  const stageLabel = isDone
    ? `✓ ${profile.stageLabels_vi[3]}`
    : `${getStageText(profile, nextProgress, true)} (${pct}%)`;

  const gasFade = showGas
    ? nextProgress < 0.2
      ? 'slow'
      : nextProgress > 0.82
        ? 'slow'
        : targetResult.gasInfo?.effervescenceSpeed || 'vigorous'
    : undefined;

  const simPartial: Partial<EquipmentState> = {
    contents: nextContents,
    volume_ml: Math.round(nextVolume_ml * 10) / 10,
    temperature_c: nextTemp_c,
    ph: isDone ? targetResult.finalPh : appearance.ph,
    liquidColorHex: isDone ? targetResult.finalLiquidColorHex : appearance.liquidColorHex,
    liquidOpacity: isDone ? targetResult.liquidOpacity : appearance.liquidOpacity,
    density_g_ml: physProps.density_g_ml,
    viscosity_mPa_s: physProps.viscosity_mPa_s,
    surfaceTension_N_m: physProps.surfaceTension_N_m,
    mixtureCp_J_kgK: physProps.cp_J_kgK,
    turbidity: targetResult.turbidity ? targetResult.turbidity * Math.min(1, nextProgress * 1.25) : eq.turbidity,
    foamHead_mm: isDone ? 0 : (targetResult.foamHead_mm ?? 0) * Math.min(1, nextProgress * 1.5) * Math.max(0.25, 1 - Math.max(0, nextProgress - 0.7) * 2.5),
    hasPrecipitate: showPrecipitate,
    precipitateColorHex: showPrecipitate ? targetResult.precipitateInfo?.colorHex : eq.precipitateColorHex,
    precipitateSubstance: showPrecipitate ? targetResult.precipitateInfo?.formula : eq.precipitateSubstance,
    precipitateMass_g: showPrecipitate ? precipMass_g : eq.precipitateMass_g,
    precipitateMorphology: showPrecipitate ? targetResult.precipitateInfo?.morphology : eq.precipitateMorphology,
    hasGas: showGas,
    gasColorHex: showGas ? targetResult.gasInfo?.colorHex : undefined,
    effervescenceSpeed: gasFade,
    hasFumes: isDone
      ? Boolean(nextTemp_c >= 75)
      : Boolean(targetResult.hasFumes && nextProgress >= 0.12),
    fumeType: isDone
      ? nextTemp_c >= 75 ? 'steam' : undefined
      : targetResult.hasFumes && nextProgress >= 0.12 ? targetResult.fumeType : eq.fumeType,
    fumeColorHex: targetResult.hasFumes && nextProgress >= 0.12 ? targetResult.fumeColorHex : eq.fumeColorHex,
    hasSilverMirror: showSilverMirror,
    silverMirrorProgress: nextSilverMirrorProgress,
    flameTestColorHex: targetResult.flameTestColorHex ?? eq.flameTestColorHex,
    activeControllerIds: isDone ? [] : (targetResult.activeControllerIds ?? eq.activeControllerIds),
    solidChunks,
    precipitateLayers,
    escapedGas_g: Object.keys(nextEscapedGas_g).length > 0 ? nextEscapedGas_g : eq.escapedGas_g,
    totalEscapedGas_g: (eq.totalEscapedGas_g ?? 0) + addedGas_g,
    activeReactionLabel: isDone ? undefined : stageLabel,
    activeReactionProgress: isDone ? undefined : nextProgress,
    mass_g: Math.round(((eq.tare_g || 0) + nextContents.reduce((s, c) => s + c.mass_g, 0)) * 100) / 100,
  };

  let completedReactions: ReactionExecutionRecord[] = [];
  if (isDone) {
    job.completed = true;
    completedReactions = targetResult.reactionsOccurred;
  }

  return {
    changed: true,
    simPartial,
    completedReactions,
    stepEscapedGas_g: addedGas_g > 0 ? stepEscapedGas_g : undefined,
    shouldPlayFizz: Boolean(prevProgress === 0 && showGas),
    shouldPlaySuccess: isDone && !showGas,
  };
}

/**
 * Resolves a single visual controller ID if applicable (exported convenience wrapper).
 */
export function resolvePrimaryController(rx: ReactionDefinition, gas?: string, precip?: string): string {
  return resolveControllerIdForReaction(rx.id, gas, precip);
}
