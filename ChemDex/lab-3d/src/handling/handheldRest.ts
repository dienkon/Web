import { LAB_PHYSICS } from '../engine/interactionEngine';

/** Furthest front-facing surface of each model after laying its stem along Z.
 * Includes bulbs/screens; a small clearance prevents z-fighting with the bench. */
const MODEL_DEPTH: Record<string, number> = {
  pipette: 0.13, thermometer: 0.09, ph_meter: 0.105, stirring_rod: 0.04, spatula: 0.045,
};
export function restingToolHeight(id: string, fallback: number): number {
  return MODEL_DEPTH[id] === undefined ? fallback : LAB_PHYSICS.TABLE_SURFACE_Y + MODEL_DEPTH[id] + 0.005;
}

export function toolVisible(active: boolean, dragging: boolean, moveMode: boolean): boolean {
  return active || dragging || moveMode;
}
