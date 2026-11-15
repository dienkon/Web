import { NOMINAL_DROP_ML } from './doseTiming';
import { METERS_PER_SCENE_UNIT } from '../science/sceneUnits';

/** Use discrete drops only for microdoses; ordinary 1–2 mL transfers pour.
 * This is an interaction policy, not a laboratory drop calibration. */
export const DROPPER_CAPACITY_ML = 0.2;
export const DROPPER_TIP_LOCAL_Y = -1;
export const DROPPER_TIP_CLEARANCE = 0.18;
export function liquidDosePlan(amount_ml: number) {
  const amount = Number.isFinite(amount_ml) ? Math.max(0, amount_ml) : 0;
  const mode = amount > 0 && amount <= DROPPER_CAPACITY_ML ? 'dropper' as const : 'pour' as const;
  return { mode, amount_ml: amount, nominalDrop_ml: NOMINAL_DROP_ML,
    dropCount: mode === 'dropper' ? Math.ceil(amount / NOMINAL_DROP_ML - 1e-9) : 0 };
}

/** Last packet contains only the requested remainder, never a rounded-up drop. */
export function liquidDropAmount(amount_ml: number, index: number): number {
  if (!Number.isFinite(amount_ml) || amount_ml <= 0 || !Number.isInteger(index) || index < 0) return 0;
  return Math.max(0, Math.min(NOMINAL_DROP_ML, amount_ml - index * NOMINAL_DROP_ML));
}

/** Equivalent spherical volume in the shared scene scale. During flight an
 * axisymmetric stretch preserves this same volume. */
export function volumeDropRadius_scene(volume_ml: number): number {
  return Number.isFinite(volume_ml) && volume_ml > 0
    ? Math.cbrt(3 * volume_ml * 1e-6 / (4 * Math.PI)) / METERS_PER_SCENE_UNIT : 0;
}
