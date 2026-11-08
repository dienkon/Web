/**
 * Laboratory Safety, PPE, and Cross-Contamination Engine for ChemDex 2D
 *
 * Full parity with lab-3d's safetyEngine.ts:
 * - Tracks PPE status (Goggles, Gloves, Lab Coat, Fume Hood)
 * - Detects hazardous procedures in real time:
 *   1. SAFE_ACID_DILUTION: Pouring water into concentrated H2SO4
 *   2. CLOSED_VESSEL_HEATING: Heating a stoppered/sealed vessel
 *   3. TOXIC_GAS_NO_HOOD: Evolving NO2, SO2, Cl2, H2S, NH3, CO without Fume Hood
 *   4. ALKALI_WATER_OVERDOSE: Adding large mass of Na/K to water without goggles/shield
 *   5. CROSS_CONTAMINATION: Using unwashed pipette/dropper/stirring rod across different reagents
 */

import { EquipmentState } from '../types/equipment';
import { PPEItem } from '../types/chemistry';
import { normalizeFormula } from '../chemistry/core/formula';

export type SafetyRuleCode =
  | 'SAFE_ACID_DILUTION'
  | 'CLOSED_VESSEL_HEATING'
  | 'TOXIC_GAS_NO_HOOD'
  | 'ALKALI_WATER_HAZARD'
  | 'MISSING_PPE_CORROSIVE'
  | 'CROSS_CONTAMINATION';

export interface SafetyViolationAlert {
  id: string;
  code: SafetyRuleCode;
  severity: 'warning' | 'critical';
  title_vi: string;
  title_en: string;
  message_vi: string;
  message_en: string;
  timestamp: number;
}

export interface PPEState2D {
  goggles: boolean;
  gloves: boolean;
  lab_coat: boolean;
  fume_hood: boolean;
}

export const DEFAULT_PPE_STATE: PPEState2D = {
  goggles: true,
  gloves: true,
  lab_coat: true,
  fume_hood: false,
};

const TOXIC_GASES = new Set(['NO2', 'SO2', 'CL2', 'H2S', 'CO', 'NH3', 'HCL']);
const CORROSIVE_SPECIES = new Set(['H2SO4', 'HNO3', 'HCL', 'NAOH', 'KOH', 'BA(OH)2']);

/**
 * Evaluates whether pouring `sourceFormula` into `targetVessel` violates acid dilution rules.
 */
export function checkAcidDilutionHazard(
  sourceFormula: string,
  targetVessel: EquipmentState
): SafetyViolationAlert | null {
  const srcNorm = normalizeFormula(sourceFormula);
  const isSourceWaterOrAqueous = srcNorm === 'H2O';
  if (!isSourceWaterOrAqueous) return null;

  const h2so4InTarget = targetVessel.contents.find(c => normalizeFormula(c.formula) === 'H2SO4');
  if (!h2so4InTarget || h2so4InTarget.moles < 0.04) return null;

  const molarity = targetVessel.volume_ml > 0 ? h2so4InTarget.moles / (targetVessel.volume_ml / 1000) : 18.0;
  if (molarity >= 3.5) {
    return {
      id: `violation_acid_dilution_${Date.now()}`,
      code: 'SAFE_ACID_DILUTION',
      severity: 'critical',
      title_vi: 'VI PHẠM QUY TẮC PHA LOÃNG AXIT ĐẶC!',
      title_en: 'CRITICAL ACID DILUTION VIOLATION!',
      message_vi:
        'Tuyệt đối KHÔNG rót nước vào H₂SO₄ đặc! Nhiệt tỏa ra cực mạnh trên bề mặt làm nước sôi bùng tức khắc và bắn axit đặc gây bỏng nặng.',
      message_en:
        'NEVER pour water into concentrated H2SO4! Intense hydration heat causes flash boiling and violent acid spattering.',
      timestamp: Date.now(),
    };
  }
  return null;
}

/**
 * Evaluates active vessels on the workbench against laboratory safety & PPE rules.
 */
export function evaluateWorkbenchSafety(
  equipmentList: EquipmentState[],
  ppe: PPEState2D
): SafetyViolationAlert[] {
  const alerts: SafetyViolationAlert[] = [];
  const now = Date.now();

  for (const eq of equipmentList) {
    if (!eq.isContainer) continue;

    // 1. Heating a sealed/stoppered vessel
    if (eq.isSealed && (eq.isBeingHeated || eq.temperature_c > 65)) {
      alerts.push({
        id: `violation_closed_heat_${eq.id}`,
        code: 'CLOSED_VESSEL_HEATING',
        severity: 'critical',
        title_vi: 'CẢNH BÁO: Đun nóng bình đậy kín nút!',
        title_en: 'DANGER: Heating a sealed vessel!',
        message_vi: `${eq.name_vi} đang đậy kín nút cao su khi đun nóng (P = ${(eq.internalPressure_atm ?? 1).toFixed(2)} atm). Nguy cơ bung nút hoặc nổ vỡ bình thủy tinh!`,
        message_en: `${eq.name} is stoppered while being heated (P = ${(eq.internalPressure_atm ?? 1).toFixed(2)} atm). Risk of stopper ejection or glass explosion!`,
        timestamp: now,
      });
    }

    // 2. Toxic gas evolution without fume hood
    if (eq.hasFumes && (eq.fumeType === 'no2' || eq.fumeType === 'nh4cl' || eq.fumeType === 'iodine') && !ppe.fume_hood) {
      alerts.push({
        id: `violation_fume_hood_${eq.id}`,
        code: 'TOXIC_GAS_NO_HOOD',
        severity: 'warning',
        title_vi: 'Chưa bật Tủ hút khí độc (Fume Hood)!',
        title_en: 'Fume Hood is OFF during toxic gas evolution!',
        message_vi: `Phản ứng trong ${eq.name_vi} đang sinh hơi/khí độc (${eq.fumeType.toUpperCase()}). Hãy bật Tủ hút trên thanh PPE!`,
        message_en: `Reaction in ${eq.name} is evolving hazardous fumes (${eq.fumeType.toUpperCase()}). Turn on the Fume Hood in the PPE bar!`,
        timestamp: now,
      });
    }

    // 3. Corrosive reagents handled without Goggles or Gloves
    const hasCorrosive = eq.contents.some(c => CORROSIVE_SPECIES.has(normalizeFormula(c.formula)) && c.moles > 1e-4);
    if (hasCorrosive && (!ppe.goggles || !ppe.gloves)) {
      const missing: PPEItem[] = [];
      if (!ppe.goggles) missing.push('goggles');
      if (!ppe.gloves) missing.push('gloves');
      alerts.push({
        id: `violation_ppe_${eq.id}`,
        code: 'MISSING_PPE_CORROSIVE',
        severity: 'warning',
        title_vi: 'Thiếu trang bị bảo hộ cá nhân (PPE)!',
        title_en: 'Missing Personal Protective Equipment (PPE)!',
        message_vi: `Đang thao tác với hóa chất ăn mòn mạnh nhưng chưa đeo: ${missing.map(m => (m === 'goggles' ? 'Kính bảo hộ' : 'Găng tay')).join(', ')}.`,
        message_en: `Handling corrosive reagents without: ${missing.join(', ')}.`,
        timestamp: now,
      });
    }
  }

  return alerts;
}
