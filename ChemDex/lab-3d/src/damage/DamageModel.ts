/**
 * CHEMDEX LAB - Damage Model (K4.1 & K4.6)
 * Physical impact, thermal shock, and overpressure damage mechanics
 * for laboratory glassware, porcelain, plastic, and metal.
 */

export type VesselMaterial = 'borosilicate' | 'soda-lime' | 'plastic' | 'porcelain' | 'metal';

export interface MaterialSpec {
  material: VesselMaterial;
  wallThickness_mm: number;
  shockLimit_K: number;     // Thermal shock tolerance ΔT
  maxPressure_atm: number;  // Overpressure burst threshold
  critImpactEnergy_J: number; // Critical impact energy for shattering
  surfaceHardness: number;  // 1 = soft/rubber, 2 = wood/bench, 3 = stone/tile floor
}

export const MATERIAL_SPECS: Record<VesselMaterial, MaterialSpec> = {
  borosilicate: {
    material: 'borosilicate',
    wallThickness_mm: 2.0,
    shockLimit_K: 160,
    maxPressure_atm: 2.8,
    critImpactEnergy_J: 0.85,
    surfaceHardness: 2.0
  },
  'soda-lime': {
    material: 'soda-lime',
    wallThickness_mm: 1.2,
    shockLimit_K: 50,
    maxPressure_atm: 1.8,
    critImpactEnergy_J: 0.28,
    surfaceHardness: 2.0
  },
  plastic: {
    material: 'plastic',
    wallThickness_mm: 1.5,
    shockLimit_K: 90,
    maxPressure_atm: 3.5,
    critImpactEnergy_J: 99.0, // Plastic does not shatter on drops
    surfaceHardness: 1.2
  },
  porcelain: {
    material: 'porcelain',
    wallThickness_mm: 3.0,
    shockLimit_K: 280,
    maxPressure_atm: 4.0,
    critImpactEnergy_J: 1.2,
    surfaceHardness: 2.5
  },
  metal: {
    material: 'metal',
    wallThickness_mm: 1.5,
    shockLimit_K: 999,
    maxPressure_atm: 10.0,
    critImpactEnergy_J: 999.0, // Metal dents, never shatters
    surfaceHardness: 3.0
  }
};

export type DamageSeverity = 'none' | 'chipped' | 'cracked' | 'shattered';

export interface DamageEvaluationResult {
  severity: DamageSeverity;
  integrity: number; // 0..1 (1 = pristine, 0 = destroyed)
  shattered: boolean;
  crackHeight_norm: number; // 0..1 height where crack formed (leaks above this level)
  reason_en: string;
  reason_vi: string;
  energy_J?: number;
}

/**
 * Deterministic seeded pseudo-random variation within ±15%.
 */
function getVariance(seed: number): number {
  const x = Math.sin(seed * 12.9898 + 78.233) * 43758.5453;
  const unit = x - Math.floor(x);
  return 0.85 + unit * 0.30; // 0.85 to 1.15
}

/**
 * K4.1: Evaluates drop impact damage based on fall height, mass, and surface.
 */
export function evaluateDropImpact(
  fallHeight_m: number,
  mass_kg: number,
  material: VesselMaterial = 'borosilicate',
  surface: 'soft' | 'bench' | 'stone_floor' = 'bench',
  seed: number = 42
): DamageEvaluationResult {
  const spec = MATERIAL_SPECS[material] || MATERIAL_SPECS.borosilicate;
  if (material === 'metal' || material === 'plastic') {
    return {
      severity: 'none',
      integrity: 1.0,
      shattered: false,
      crackHeight_norm: 0,
      reason_en: `${material} survived drop without shattering.`,
      reason_vi: `${material} chịu va chạm không bị vỡ.`
    };
  }

  const g = 9.8;
  const vImpact = Math.sqrt(2 * g * Math.max(0, fallHeight_m));
  const rawEnergy_J = 0.5 * mass_kg * vImpact * vImpact;

  // Surface multiplier (stone floor exerts sharper impulse than wood/resin bench)
  const surfaceMultiplier = surface === 'stone_floor' ? 2.4 : surface === 'bench' ? 1.0 : 0.3;
  const effectiveEnergy = rawEnergy_J * surfaceMultiplier;

  const variance = getVariance(seed);
  const threshold = spec.critImpactEnergy_J * variance;

  if (effectiveEnergy >= threshold) {
    return {
      severity: 'shattered',
      integrity: 0.0,
      shattered: true,
      crackHeight_norm: 0.0,
      reason_en: `Shattered by drop impact (${(effectiveEnergy).toFixed(2)} J on ${surface})`,
      reason_vi: `Vỡ vụn do rơi va đập (${(effectiveEnergy).toFixed(2)} J xuống ${surface})`,
      energy_J: effectiveEnergy
    };
  } else if (effectiveEnergy >= threshold * 0.6) {
    return {
      severity: 'cracked',
      integrity: 0.45,
      shattered: false,
      crackHeight_norm: 0.35,
      reason_en: `Hairline crack formed from impact (${(effectiveEnergy).toFixed(2)} J)`,
      reason_vi: `Nứt rạn do va đập (${(effectiveEnergy).toFixed(2)} J)`,
      energy_J: effectiveEnergy
    };
  } else if (effectiveEnergy >= threshold * 0.35) {
    return {
      severity: 'chipped',
      integrity: 0.85,
      shattered: false,
      crackHeight_norm: 0.9,
      reason_en: `Rim chipped from minor fall`,
      reason_vi: `Mẻ miệng bình do va đập nhẹ`,
      energy_J: effectiveEnergy
    };
  }

  return {
    severity: 'none',
    integrity: 1.0,
    shattered: false,
    crackHeight_norm: 0.0,
    reason_en: 'Survived drop without damage.',
    reason_vi: 'Không bị tổn hại sau va chạm.',
    energy_J: effectiveEnergy
  };
}

/**
 * K4.1: Evaluates thermal shock when cold liquid hits hot glass or vice-versa.
 */
export function evaluateThermalShock(
  dT_K: number,
  material: VesselMaterial = 'borosilicate',
  seed: number = 42
): DamageEvaluationResult {
  const spec = MATERIAL_SPECS[material] || MATERIAL_SPECS.borosilicate;
  const variance = getVariance(seed);
  const allowed_dT = spec.shockLimit_K * variance;

  if (dT_K >= allowed_dT * 1.35) {
    return {
      severity: 'shattered',
      integrity: 0.0,
      shattered: true,
      crackHeight_norm: 0.0,
      reason_en: `Thermal shock burst (ΔT = ${Math.round(dT_K)} K > ${Math.round(allowed_dT)} K limit)`,
      reason_vi: `Vỡ sốc nhiệt (ΔT = ${Math.round(dT_K)} K vượt ngưỡng ${Math.round(allowed_dT)} K)`
    };
  } else if (dT_K >= allowed_dT) {
    return {
      severity: 'cracked',
      integrity: 0.4,
      shattered: false,
      crackHeight_norm: 0.25,
      reason_en: `Thermal stress fracture (ΔT = ${Math.round(dT_K)} K)`,
      reason_vi: `Nứt rạn do ứng suất nhiệt (ΔT = ${Math.round(dT_K)} K)`
    };
  }

  return {
    severity: 'none',
    integrity: 1.0,
    shattered: false,
    crackHeight_norm: 0.0,
    reason_en: `Resisted thermal change (ΔT = ${Math.round(dT_K)} K).`,
    reason_vi: `Chịu được biến thiên nhiệt độ (ΔT = ${Math.round(dT_K)} K).`
  };
}
