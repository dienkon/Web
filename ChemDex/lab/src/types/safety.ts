export type SafetySeverity = 'NOTICE' | 'WARNING' | 'CRITICAL';

export interface SafetyViolation {
  id: string;
  severity: SafetySeverity;
  titleVi: string;
  messageVi: string;
  blocked: boolean;
  preventionTipVi: string;
  timestamp: number;
}

export interface SafetyRule {
  id: string;
  nameVi: string;
  severity: SafetySeverity;
  descriptionVi: string;
  check: (context: SafetyEvaluationContext) => SafetyViolation | null;
}

export interface SafetyEvaluationContext {
  targetVesselContents: { chemicalId: string; amount: number; concentrationM?: number }[];
  addedChemicalId: string;
  addedAmount: number;
  isHeating: boolean;
  isOpen: boolean;
  targetVesselCapacityMl: number;
  currentVolumeMl: number;
}
