/**
 * CHEMDEX LAB — PROCEDURE-DRIVEN EXPERIMENT & VALIDATION ENGINE
 * 
 * Implements physically grounded laboratory experiment protocols,
 * real-time procedural step state machine, tolerance checking,
 * tool contamination tracking, and multi-tier difficulty modes:
 * (Guided, Standard, Practical, Exam).
 */

export type ProceduralActionType =
  | 'PICK_UP_TOOL'
  | 'PUT_DOWN_TOOL'
  | 'MEASURE_VOLUME'
  | 'MEASURE_MASS'
  | 'POUR'
  | 'DISPENSE_DROP'
  | 'ADD_SOLID'
  | 'STIR'
  | 'HEAT'
  | 'COOL'
  | 'WAIT'
  | 'OBSERVE'
  | 'MEASURE_TEMPERATURE'
  | 'MEASURE_PH'
  | 'CLEAN_TOOL'
  | 'DISPOSE';

export type ExperimentDifficultyMode = 'guided' | 'standard' | 'practical' | 'exam';

export interface ProceduralStep {
  stepNumber: number;
  action: ProceduralActionType;
  title_en: string;
  title_vi: string;
  instruction_en: string;
  instruction_vi: string;
  expectedResult_en: string;
  expectedResult_vi: string;
  targetVesselType?: 'beaker' | 'flask' | 'test_tube' | 'cylinder';
  targetChemical?: string;
  targetAmount?: number; // mL for liquids, g for solids, °C for heat, pH for acid/base
  tolerance?: number; // acceptable deviation +/- (e.g. 1.0 mL, 0.1 g, 2.0 °C)
  unit?: string;
  requiredTool?: 'none' | 'thermometer' | 'ph_meter' | 'balance' | 'pipette' | 'stirring_rod' | 'spatula';
  hints_en?: string[];
  hints_vi?: string[];
  validate?: (state: ExperimentValidationState) => StepValidationResult;
}

export interface StepValidationResult {
  isValid: boolean;
  progress: number; // 0.0 to 1.0
  message_en: string;
  message_vi: string;
  currentValue?: number;
  targetValue?: number;
  toleranceError?: number;
  isWithinTolerance?: boolean;
}

export interface ExperimentValidationState {
  vessels: Record<string, any>;
  burners: Record<string, any>;
  activeTool: string;
  spatulaState: { chemical: string | null; mass_g: number };
  contaminatedTools: Record<string, string | null>;
  recentActions: string[];
}

export interface ToolContaminationRecord {
  tool: 'pipette' | 'stirring_rod' | 'spatula';
  lastChemical: string | null;
  isContaminated: boolean;
}

export interface ExamReportCard {
  experimentId: string;
  mode: ExperimentDifficultyMode;
  score: number; // 0 - 100
  letterGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  durationSeconds: number;
  procedureScore: number; // / 40
  accuracyScore: number; // / 25
  hygieneScore: number; // / 15
  quizScore: number; // / 20
  feedback_en: string[];
  feedback_vi: string[];
  timestamp: string;
}

export class ExperimentEngine {
  private toolContamination: Record<string, string | null> = {
    pipette: null,
    stirring_rod: null,
    spatula: null,
  };

  private contaminationLog: Array<{ tool: string; chemical: string; timestamp: number }> = [];

  /**
   * Tracks chemical contact with a tool and checks for cross-contamination.
   * Returns true if cross-contamination occurred (tool used in new chemical without washing).
   */
  public touchChemical(tool: 'pipette' | 'stirring_rod' | 'spatula', chemical: string): { isCrossContaminated: boolean; previousChemical: string | null } {
    const prev = this.toolContamination[tool];
    if (prev && prev !== chemical && prev !== 'H2O') {
      const now = typeof performance !== 'undefined' ? performance.now() : Date.now();
      this.contaminationLog.push({ tool, chemical: prev, timestamp: now });
      this.toolContamination[tool] = chemical;
      return { isCrossContaminated: true, previousChemical: prev };
    }
    this.toolContamination[tool] = chemical;
    return { isCrossContaminated: false, previousChemical: null };
  }

  /**
   * Clean/Rinse tool in distilled water (H2O)
   */
  public cleanTool(tool: 'pipette' | 'stirring_rod' | 'spatula') {
    this.toolContamination[tool] = null;
  }

  public getContaminatedTools(): Record<string, string | null> {
    return { ...this.toolContamination };
  }

  public resetContamination() {
    this.toolContamination = {
      pipette: null,
      stirring_rod: null,
      spatula: null,
    };
    this.contaminationLog = [];
  }

  /**
   * Validates a procedural step against current lab state.
   */
  public validateStep(
    step: ProceduralStep,
    state: ExperimentValidationState,
    mode: ExperimentDifficultyMode = 'standard'
  ): StepValidationResult {
    // If step has custom validation function, execute it first
    if (step.validate) {
      return step.validate(state);
    }

    const vessels = Object.values(state.vessels);
    const modeMultiplier = mode === 'guided' ? 2.0 : mode === 'practical' || mode === 'exam' ? 0.75 : 1.0;
    const baseTolerance = (step.tolerance ?? 1.0) * modeMultiplier;

    switch (step.action) {
      case 'PICK_UP_TOOL': {
        const isToolActive = state.activeTool === step.requiredTool;
        return {
          isValid: isToolActive,
          progress: isToolActive ? 1.0 : 0.0,
          message_en: isToolActive ? `Tool ${step.requiredTool} is equipped.` : `Equip the ${step.requiredTool}.`,
          message_vi: isToolActive ? `Đã cầm công cụ ${step.requiredTool}.` : `Hãy cầm công cụ ${step.requiredTool}.`,
        };
      }

      case 'MEASURE_VOLUME': {
        const targetChem = step.targetChemical;
        const targetVol = step.targetAmount ?? 20;

        // Search vessels for matching volume and chemical
        for (const v of vessels) {
          if (step.targetVesselType && v.type !== step.targetVesselType) continue;
          const hasChem = !targetChem || v.substances.includes(targetChem) || v.substances.some((s: string) => s.includes(targetChem));
          if (hasChem && v.volume_ml > 0) {
            const diff = Math.abs(v.volume_ml - targetVol);
            const isWithin = diff <= baseTolerance;
            const progress = Math.max(0, Math.min(1.0, v.volume_ml / targetVol));

            return {
              isValid: isWithin,
              progress,
              currentValue: Math.round(v.volume_ml * 10) / 10,
              targetValue: targetVol,
              toleranceError: Math.round(diff * 10) / 10,
              isWithinTolerance: isWithin,
              message_en: isWithin
                ? `Measured ${v.volume_ml.toFixed(1)} mL (Target: ${targetVol} ± ${baseTolerance.toFixed(1)} mL).`
                : `Current volume: ${v.volume_ml.toFixed(1)} mL. Target: ${targetVol} ± ${baseTolerance.toFixed(1)} mL.`,
              message_vi: isWithin
                ? `Đã đong ${v.volume_ml.toFixed(1)} mL (Yêu cầu: ${targetVol} ± ${baseTolerance.toFixed(1)} mL).`
                : `Thể tích hiện tại: ${v.volume_ml.toFixed(1)} mL. Yêu cầu: ${targetVol} ± ${baseTolerance.toFixed(1)} mL.`,
            };
          }
        }

        return {
          isValid: false,
          progress: 0.0,
          currentValue: 0,
          targetValue: targetVol,
          toleranceError: targetVol,
          isWithinTolerance: false,
          message_en: `Pour ${targetVol} mL of ${targetChem || 'reagent'} into a vessel.`,
          message_vi: `Hãy đong ${targetVol} mL ${targetChem || 'hóa chất'} vào bình.`,
        };
      }

      case 'MEASURE_MASS': {
        const targetMass = step.targetAmount ?? 1.0;
        const targetChem = step.targetChemical;

        for (const v of vessels) {
          const hasChem = !targetChem || v.substances.includes(targetChem);
          const mass = v.mass_g || 0;
          if (hasChem && mass > 0) {
            const diff = Math.abs(mass - targetMass);
            const isWithin = diff <= baseTolerance;
            return {
              isValid: isWithin,
              progress: Math.min(1.0, mass / targetMass),
              currentValue: Math.round(mass * 10) / 10,
              targetValue: targetMass,
              toleranceError: Math.round(diff * 10) / 10,
              isWithinTolerance: isWithin,
              message_en: isWithin ? `Mass measured accurately: ${mass.toFixed(2)} g.` : `Measured: ${mass.toFixed(2)} g (Target: ${targetMass} g).`,
              message_vi: isWithin ? `Khối lượng đo chuẩn xác: ${mass.toFixed(2)} g.` : `Đo được: ${mass.toFixed(2)} g (Yêu cầu: ${targetMass} g).`,
            };
          }
        }

        return {
          isValid: false,
          progress: 0,
          currentValue: 0,
          targetValue: targetMass,
          isWithinTolerance: false,
          message_en: `Weigh ${targetMass} g of ${targetChem || 'solid'} on the digital balance.`,
          message_vi: `Cân ${targetMass} g ${targetChem || 'chất rắn'} trên cân điện tử.`,
        };
      }

      case 'ADD_SOLID': {
        const targetChem = step.targetChemical || 'Na';
        for (const v of vessels) {
          if (v.substances.includes(targetChem)) {
            return {
              isValid: true,
              progress: 1.0,
              message_en: `Added ${targetChem} into ${v.name}.`,
              message_vi: `Đã cho ${targetChem} vào ${v.name}.`,
            };
          }
        }
        return {
          isValid: false,
          progress: 0.0,
          message_en: `Use spatula to scoop ${targetChem} and add it into the vessel.`,
          message_vi: `Dùng thìa xúc ${targetChem} và cho vào bình phản ứng.`,
        };
      }

      case 'HEAT': {
        const targetTemp = step.targetAmount ?? 80;
        for (const v of vessels) {
          if (v.temperature_c >= targetTemp - baseTolerance) {
            return {
              isValid: true,
              progress: 1.0,
              currentValue: Math.round(v.temperature_c),
              targetValue: targetTemp,
              message_en: `Solution heated to ${v.temperature_c.toFixed(1)} °C.`,
              message_vi: `Dung dịch đã đạt nhiệt độ ${v.temperature_c.toFixed(1)} °C.`,
            };
          }
          if (v.temperature_c > 28) {
            const prog = Math.min(0.9, (v.temperature_c - 25) / (targetTemp - 25));
            return {
              isValid: false,
              progress: prog,
              currentValue: Math.round(v.temperature_c),
              targetValue: targetTemp,
              message_en: `Heating in progress: ${v.temperature_c.toFixed(1)} °C / ${targetTemp} °C.`,
              message_vi: `Đang đun nóng: ${v.temperature_c.toFixed(1)} °C / ${targetTemp} °C.`,
            };
          }
        }
        return {
          isValid: false,
          progress: 0.0,
          targetValue: targetTemp,
          message_en: `Ignite the alcohol burner and place vessel over flame to reach ${targetTemp} °C.`,
          message_vi: `Bật đèn cồn và đặt bình lên ngọn lửa để đun đến ${targetTemp} °C.`,
        };
      }

      case 'STIR': {
        const isStirring = state.activeTool === 'stirring_rod';
        return {
          isValid: isStirring,
          progress: isStirring ? 1.0 : 0.0,
          message_en: isStirring ? 'Stirring solution with glass rod.' : 'Select glass rod and stir solution in circles.',
          message_vi: isStirring ? 'Đang khuấy dung dịch bằng đũa thủy tinh.' : 'Chọn đũa thủy tinh và xoay tròn để khuấy dung dịch.',
        };
      }

      case 'OBSERVE': {
        // Checks for precipitate, gas evolution, or color change
        for (const v of vessels) {
          if (v.hasPrecipitate || v.hasGas || (v.ph > 8.5 && v.substances.includes('Phenolphthalein'))) {
            return {
              isValid: true,
              progress: 1.0,
              message_en: 'Reaction phenomenon observed successfully!',
              message_vi: 'Đã quan sát thấy hiện tượng phản ứng thành công!',
            };
          }
        }
        return {
          isValid: false,
          progress: 0.0,
          message_en: 'Wait and observe the chemical reaction phenomena in the vessel.',
          message_vi: 'Chờ và quan sát hiện tượng hóa học xảy ra trong bình.',
        };
      }

      case 'CLEAN_TOOL': {
        const tools = this.getContaminatedTools();
        const hasContamination = Object.values(tools).some(c => c !== null);
        return {
          isValid: !hasContamination,
          progress: hasContamination ? 0.0 : 1.0,
          message_en: hasContamination ? 'Rinse contaminated tools with distilled water (H2O).' : 'All tools clean and decontaminated.',
          message_vi: hasContamination ? 'Rửa các dụng cụ bị bẩn bằng nước cất (H2O).' : 'Tất cả dụng cụ đã sạch và sẵn sàng.',
        };
      }

      default:
        return {
          isValid: true,
          progress: 1.0,
          message_en: 'Step accomplished.',
          message_vi: 'Đã hoàn thành bước.',
        };
    }
  }

  /**
   * Generates a comprehensive Exam Report Card with letter grade.
   */
  public generateReportCard(
    experimentId: string,
    mode: ExperimentDifficultyMode,
    stepsTotal: number,
    stepsCompleted: number,
    toleranceErrors: number[],
    contaminationCount: number,
    quizCorrect: number,
    quizTotal: number,
    durationSeconds: number
  ): ExamReportCard {
    // 1. Procedure score (40 max)
    const procedureScore = Math.round((stepsCompleted / Math.max(1, stepsTotal)) * 40);

    // 2. Accuracy score (25 max) based on average tolerance error
    const avgTolerance = toleranceErrors.length > 0
      ? toleranceErrors.reduce((a, b) => a + b, 0) / toleranceErrors.length
      : 0;
    const accuracyScore = Math.max(5, Math.round(25 - avgTolerance * 3));

    // 3. Hygiene & Safety score (15 max)
    const hygieneScore = Math.max(0, 15 - contaminationCount * 5);

    // 4. Quiz score (20 max)
    const quizScore = quizTotal > 0 ? Math.round((quizCorrect / quizTotal) * 20) : 20;

    const totalScore = Math.min(100, Math.max(0, procedureScore + accuracyScore + hygieneScore + quizScore));

    let letterGrade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F' = 'F';
    if (totalScore >= 95) letterGrade = 'A+';
    else if (totalScore >= 85) letterGrade = 'A';
    else if (totalScore >= 75) letterGrade = 'B';
    else if (totalScore >= 60) letterGrade = 'C';
    else if (totalScore >= 50) letterGrade = 'D';

    const feedback_en: string[] = [];
    const feedback_vi: string[] = [];

    if (procedureScore >= 35) {
      feedback_en.push('Excellent adherence to laboratory protocol.');
      feedback_vi.push('Tuân thủ xuất sắc quy trình thí nghiệm.');
    } else {
      feedback_en.push('Review missing or skipped experiment steps.');
      feedback_vi.push('Cần hoàn thiện đầy đủ các bước của thí nghiệm.');
    }

    if (hygieneScore === 15) {
      feedback_en.push('Pristine tool hygiene; zero cross-contamination.');
      feedback_vi.push('Vệ sinh dụng cụ hoàn hảo, không có nhiễm chéo hóa chất.');
    } else {
      feedback_en.push(`Detected ${contaminationCount} tool contamination events. Remember to rinse with distilled water.`);
      feedback_vi.push(`Phát hiện ${contaminationCount} lần bẩn dụng cụ. Hãy nhớ tráng nước cất trước khi dùng lại.`);
    }

    return {
      experimentId,
      mode,
      score: totalScore,
      letterGrade,
      durationSeconds,
      procedureScore,
      accuracyScore,
      hygieneScore,
      quizScore,
      feedback_en,
      feedback_vi,
      timestamp: new Date().toISOString(),
    };
  }
}

export const experimentEngine = new ExperimentEngine();
