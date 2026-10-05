/**
 * CHEMDEX LAB - Grip Points & Hand Pose (K1.2 & K1.3)
 * Declares anchor pivots, preferred grip posture, and deterministic safety/thermal grip checks.
 */

import { VesselType } from '../types/chemistry';
import { PPEState } from '../safety/Ppe';

export type GripKind = 'body' | 'neck' | 'rim' | 'handle' | 'base' | 'tongs' | 'two-hand';

export interface GripAnchor {
  id: string;
  kind: GripKind;
  localPos: [number, number, number];
}

export interface VesselGripSpec {
  anchors: GripAnchor[];
  preferred: GripKind;
  requiresTongsAtTemp_c?: number;
}

export const VESSEL_GRIP_SPECS: Record<string, VesselGripSpec> = {
  beaker: {
    anchors: [
      { id: 'body', kind: 'body', localPos: [0, 0, 0] },
      { id: 'rim', kind: 'rim', localPos: [0, 1.0, 0] },
      { id: 'base', kind: 'base', localPos: [0, -0.96, 0] }
    ],
    preferred: 'body',
    requiresTongsAtTemp_c: 60
  },
  flask: {
    anchors: [
      { id: 'neck', kind: 'neck', localPos: [0, 1.0, 0] },
      { id: 'body', kind: 'body', localPos: [0, -0.2, 0] },
      { id: 'base', kind: 'base', localPos: [0, -0.96, 0] }
    ],
    preferred: 'neck',
    requiresTongsAtTemp_c: 60
  },
  test_tube: {
    anchors: [
      { id: 'neck', kind: 'neck', localPos: [0, 0.8, 0] }, // Fingers near the top
      { id: 'body', kind: 'body', localPos: [0, 0, 0] },
      { id: 'base', kind: 'base', localPos: [0, -0.95, 0] }
    ],
    preferred: 'neck',
    requiresTongsAtTemp_c: 55
  },
  cylinder: {
    anchors: [
      { id: 'body', kind: 'body', localPos: [0, 0.2, 0] },
      { id: 'base', kind: 'base', localPos: [0, -0.87, 0] }
    ],
    preferred: 'body',
    requiresTongsAtTemp_c: 60
  },
  crucible: {
    anchors: [
      { id: 'body', kind: 'body', localPos: [0, 0, 0] },
      { id: 'rim', kind: 'rim', localPos: [0, 0.4, 0] }
    ],
    preferred: 'tongs', // Crucible should always prefer tongs
    requiresTongsAtTemp_c: 50
  },
  evaporating_dish: {
    anchors: [
      { id: 'rim', kind: 'rim', localPos: [0, 0.3, 0] },
      { id: 'base', kind: 'base', localPos: [0, -0.3, 0] }
    ],
    preferred: 'tongs',
    requiresTongsAtTemp_c: 50
  },
  wash_bottle: {
    anchors: [
      { id: 'body', kind: 'body', localPos: [0, 0, 0] }
    ],
    preferred: 'body',
    requiresTongsAtTemp_c: 65
  },
  mortar_pestle: {
    anchors: [
      { id: 'base', kind: 'base', localPos: [0, -0.4, 0] }
    ],
    preferred: 'two-hand',
    requiresTongsAtTemp_c: 70
  },
  retort_stand: {
    anchors: [
      { id: 'base', kind: 'base', localPos: [0, 0, 0] },
      { id: 'neck', kind: 'neck', localPos: [0.42, 1.5, 0] }
    ],
    preferred: 'body'
  },
  retort_clamp: {
    anchors: [
      { id: 'body', kind: 'body', localPos: [0, 0, 0] }
    ],
    preferred: 'body'
  },
  stopper: {
    anchors: [
      { id: 'body', kind: 'body', localPos: [0, 0, 0] }
    ],
    preferred: 'body'
  },
  pneumatic_trough: {
    anchors: [
      { id: 'base', kind: 'base', localPos: [0, 0, 0] }
    ],
    preferred: 'two-hand'
  },
  hot_plate: {
    anchors: [
      { id: 'base', kind: 'base', localPos: [0, 0, 0] }
    ],
    preferred: 'two-hand',
    requiresTongsAtTemp_c: 50
  }
};

export function getVesselGripSpec(type: string): VesselGripSpec {
  return VESSEL_GRIP_SPECS[type] || {
    anchors: [{ id: 'body', kind: 'body', localPos: [0, 0, 0] }],
    preferred: 'body',
    requiresTongsAtTemp_c: 60
  };
}

export interface GripSafetyResult {
  canGrip: boolean;
  dropped: boolean;
  warning: string | null;
  warning_vi: string | null;
  hazardType: 'none' | 'hot_burn' | 'hot_warning' | 'frostbite_warning' | 'slip';
}

/**
 * Seeded deterministic pseudo-random number generator [0..1).
 */
function seededRng(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

/**
 * K1.3: Hot-object & hazard grip rules
 * Evaluates whether bare hands or gloves can safely hold an object.
 */
export function evaluateGripSafety(
  vessel: { temperature_c: number; type: string; stainIntensity?: number },
  ppe: PPEState,
  isGrippedWithTongs: boolean = false,
  seed: number = 42
): GripSafetyResult {
  // If holding with metal tongs, safe from direct thermal conduction
  if (isGrippedWithTongs) {
    return {
      canGrip: true,
      dropped: false,
      warning: null,
      warning_vi: null,
      hazardType: 'none'
    };
  }

  const T = vessel.temperature_c ?? 25;

  // 1. Extreme Heat (> 60 °C bare-handed or > 85 °C with gloves)
  const maxBareT = 60;
  const maxGloveT = 85;

  if (!ppe.gloves && T > maxBareT) {
    return {
      canGrip: false,
      dropped: true,
      warning: `Vessel is too hot (${Math.round(T)} °C)! Pain reflex caused drop. Use tongs or heat-resistant gloves.`,
      warning_vi: `Dụng cụ quá nóng (${Math.round(T)} °C)! Phản xạ bỏng làm rơi bình. Cần dùng kẹp hoặc găng tay cách nhiệt.`,
      hazardType: 'hot_burn'
    };
  }

  if (ppe.gloves && T > maxGloveT) {
    return {
      canGrip: false,
      dropped: true,
      warning: `Temperature exceeds glove thermal rating (${Math.round(T)} °C)! Use tongs.`,
      warning_vi: `Nhiệt độ vượt quá giới hạn chịu nhiệt của găng tay (${Math.round(T)} °C)! Cần dùng kẹp gắp.`,
      hazardType: 'hot_burn'
    };
  }

  // 2. Heat Warning (> 45 °C bare-handed)
  if (!ppe.gloves && T > 45) {
    return {
      canGrip: true,
      dropped: false,
      warning: `Caution: Warm vessel (${Math.round(T)} °C). Recommend wearing gloves or using tongs.`,
      warning_vi: `Chú ý: Bình ấm nóng (${Math.round(T)} °C). Nên đeo găng tay hoặc dùng kẹp.`,
      hazardType: 'hot_warning'
    };
  }

  // 3. Extreme Cold (< -20 °C)
  if (T < -20) {
    return {
      canGrip: ppe.gloves,
      dropped: !ppe.gloves,
      warning: `Cryogenic danger (${Math.round(T)} °C)! Bare skin can stick to glass and freeze.`,
      warning_vi: `Nguy hiểm đóng băng (${Math.round(T)} °C)! Da trần có thể dính chặt vào thủy tinh lạnh.`,
      hazardType: 'frostbite_warning'
    };
  }

  // 4. Slippery / Wet glass without gloves
  const wetness = vessel.stainIntensity || 0;
  if (!ppe.gloves && wetness > 0.6) {
    const roll = seededRng(seed + Math.round(wetness * 100));
    if (roll < 0.25) {
      return {
        canGrip: false,
        dropped: true,
        warning: `Wet / oily glass slipped from bare fingers! Wear gloves for secure grip.`,
        warning_vi: `Bình trơn ướt trượt khỏi ngón tay! Cần đeo găng tay để bám chắc.`,
        hazardType: 'slip'
      };
    }
  }

  return {
    canGrip: true,
    dropped: false,
    warning: null,
    warning_vi: null,
    hazardType: 'none'
  };
}
